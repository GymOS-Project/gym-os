import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/sessionAuth.middleware";
import { ensureMemberBelongsToGym, resolveGymScope, resolveWriteGymId } from "../services/gymScope.service";
import { attachMemberPackages } from "../services/memberPackages.service";
import { attachMembersByMemberId } from "../services/relatedRecords.service";
import { supabase } from "../supabase";

function getAdminId(req: AuthenticatedRequest, res: Response) {
  const adminId = req.admin?.id;
  if (!adminId) {
    res.status(401).json({ message: "Not authenticated" });
    return null;
  }

  return adminId;
}

export async function listMemberPackages(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) {
    return;
  }

  let query = supabase
    .from("member_packages")
    .select("*")
    .eq("admin_id", adminId);

  if (gymScope.selectedGymId) {
    query = query.eq("gym_id", gymScope.selectedGymId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  try {
    return res.json(await attachMembersByMemberId(data || []));
  } catch (attachError) {
    return res.status(500).json({ message: attachError instanceof Error ? attachError.message : "Failed to load packages" });
  }
}

export async function createMemberPackage(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymId = await resolveWriteGymId(req, res);
  if (!gymId) {
    return;
  }

  const { member_id, package_type_id, package_name, start_date, end_date, amount_paid, payment_mode } = req.body;

  if (member_id) {
    const validMember = await ensureMemberBelongsToGym(member_id, adminId, gymId).catch((error) => {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to validate member" });
      return null;
    });

    if (validMember === null) {
      return;
    }

    if (!validMember) {
      return res.status(400).json({ message: "Selected member does not belong to this gym" });
    }
  }

  const { data, error } = await supabase
    .from("member_packages")
    .insert({
      admin_id: adminId,
      gym_id: gymId,
      member_id,
      package_type_id,
      package_name,
      start_date,
      end_date,
      amount_paid,
      payment_mode,
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.status(201).json(data);
}

export async function getNearToExpire(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  const days = parseInt(req.query.days as string, 10) || 7;

  if (!adminId) {
    return;
  }

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) {
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  const future = new Date(Date.now() + days * 86400000).toISOString().split("T")[0];

  let query = supabase
    .from("member_packages")
    .select("*")
    .eq("admin_id", adminId)
    .eq("status", "active")
    .gte("end_date", today)
    .lte("end_date", future);

  if (gymScope.selectedGymId) {
    query = query.eq("gym_id", gymScope.selectedGymId);
  }

  const { data, error } = await query.order("end_date");

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  try {
    return res.json(await attachMembersByMemberId(data || [], "id, name, phone, email, shift"));
  } catch (attachError) {
    return res.status(500).json({ message: attachError instanceof Error ? attachError.message : "Failed to load expiring packages" });
  }
}

export async function listTransactions(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) {
    return;
  }

  let query = supabase
    .from("transactions")
    .select("*")
    .eq("admin_id", adminId);

  if (gymScope.selectedGymId) {
    query = query.eq("gym_id", gymScope.selectedGymId);
  }

  const { data, error } = await query.order("transaction_date", { ascending: false });

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  try {
    return res.json(await attachMembersByMemberId(data || []));
  } catch (attachError) {
    return res.status(500).json({ message: attachError instanceof Error ? attachError.message : "Failed to load transactions" });
  }
}

export async function createTransaction(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymId = await resolveWriteGymId(req, res);
  if (!gymId) {
    return;
  }

  const { member_id, type, amount, payment_mode, description } = req.body;

  if (member_id) {
    const validMember = await ensureMemberBelongsToGym(member_id, adminId, gymId).catch((error) => {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to validate member" });
      return null;
    });

    if (validMember === null) {
      return;
    }

    if (!validMember) {
      return res.status(400).json({ message: "Selected member does not belong to this gym" });
    }
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      admin_id: adminId,
      gym_id: gymId,
      member_id,
      type,
      amount,
      payment_mode,
      description: description || null,
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.status(201).json(data);
}

export async function listReviews(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) {
    return;
  }

  let query = supabase
    .from("reviews")
    .select("*")
    .eq("admin_id", adminId);

  if (gymScope.selectedGymId) {
    query = query.eq("gym_id", gymScope.selectedGymId);
  }

  const { data, error } = await query.order("review_date", { ascending: false });

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  try {
    return res.json(await attachMembersByMemberId(data || []));
  } catch (attachError) {
    return res.status(500).json({ message: attachError instanceof Error ? attachError.message : "Failed to load reviews" });
  }
}

export async function createReview(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymId = await resolveWriteGymId(req, res);
  if (!gymId) {
    return;
  }

  const { member_id, rating, comment, review_date } = req.body;

  if (member_id) {
    const validMember = await ensureMemberBelongsToGym(member_id, adminId, gymId).catch((error) => {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to validate member" });
      return null;
    });

    if (validMember === null) {
      return;
    }

    if (!validMember) {
      return res.status(400).json({ message: "Selected member does not belong to this gym" });
    }
  }

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      admin_id: adminId,
      gym_id: gymId,
      member_id: member_id || null,
      rating,
      comment: comment || null,
      review_date,
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.status(201).json(data);
}

export async function listReferenceMembers(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) {
    return;
  }

  let query = supabase
    .from("members")
    .select("id, name, phone, reference_member_id")
    .eq("admin_id", adminId)
    .not("reference_member_id", "is", null);

  if (gymScope.selectedGymId) {
    query = query.eq("gym_id", gymScope.selectedGymId);
  }

  const { data: members, error } = await query;

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  const refIds = [...new Set((members || []).map((member) => member.reference_member_id))];
  const { data: refs } = refIds.length
    ? await supabase.from("members").select("id, name, phone").in("id", refIds as string[])
    : { data: [] };

  const refMap = Object.fromEntries((refs || []).map((ref) => [ref.id, ref]));
  const grouped: Record<string, { ref: unknown; referrals: unknown[] }> = {};

  (members || []).forEach((member) => {
    const refId = member.reference_member_id as string;
    if (!grouped[refId]) {
      grouped[refId] = { ref: refMap[refId], referrals: [] };
    }
    grouped[refId].referrals.push(member);
  });

  return res.json(Object.values(grouped));
}

export async function getShiftReport(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) {
    return;
  }

  let query = supabase
    .from("members")
    .select("id, name, phone, shift, is_active, gym_id")
    .eq("admin_id", adminId);

  if (gymScope.selectedGymId) {
    query = query.eq("gym_id", gymScope.selectedGymId);
  }

  const { data, error } = await query.order("shift");

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  try {
    return res.json(await attachMemberPackages(data || [], adminId));
  } catch (attachError) {
    return res.status(500).json({ message: attachError instanceof Error ? attachError.message : "Failed to load shift report" });
  }
}
