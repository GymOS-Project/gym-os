import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/sessionAuth.middleware";
import { logActivity } from "../services/activityLog.service";
import { ensureMemberBelongsToGym, resolveGymScope, resolveWriteGymId } from "../services/gymScope.service";
import { addDays, attachMemberPackages, calculatePausedDays } from "../services/memberPackages.service";
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

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return value == null ? null : String(value);
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeOptionalNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
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
    return res.json(await attachMembersByMemberId(data || [], adminId, gymScope.gymIds));
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

export async function updateMemberPackage(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) return;

  let existingQuery = supabase.from("member_packages").select("*").eq("id", req.params.id).eq("admin_id", adminId);
  if (gymScope.selectedGymId) existingQuery = existingQuery.eq("gym_id", gymScope.selectedGymId);

  const existing = await existingQuery.maybeSingle();
  if (existing.error) return res.status(500).json({ message: existing.error.message });
  if (!existing.data) return res.status(404).json({ message: "Member package not found" });

  if (req.body.member_id !== undefined && req.body.member_id) {
    const validMember = await ensureMemberBelongsToGym(req.body.member_id, adminId, existing.data.gym_id).catch((error) => {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to validate member" });
      return null;
    });
    if (validMember === null) return;
    if (!validMember) return res.status(400).json({ message: "Selected member does not belong to this gym" });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (req.body.member_id !== undefined) updates.member_id = normalizeOptionalString(req.body.member_id);
  if (req.body.package_type_id !== undefined) updates.package_type_id = normalizeOptionalString(req.body.package_type_id);
  if (req.body.package_name !== undefined) updates.package_name = normalizeOptionalString(req.body.package_name);
  if (req.body.start_date !== undefined) updates.start_date = normalizeOptionalString(req.body.start_date);
  if (req.body.end_date !== undefined) updates.end_date = normalizeOptionalString(req.body.end_date);
  if (req.body.amount_paid !== undefined) updates.amount_paid = normalizeOptionalNumber(req.body.amount_paid) || 0;
  if (req.body.payment_mode !== undefined) updates.payment_mode = normalizeOptionalString(req.body.payment_mode);
  if (req.body.status !== undefined) updates.status = normalizeOptionalString(req.body.status) || "active";
  if (req.body.notes !== undefined) updates.notes = normalizeOptionalString(req.body.notes);

  const { data, error } = await supabase.from("member_packages").update(updates).eq("id", req.params.id).eq("admin_id", adminId).select("*").single();
  if (error) return res.status(500).json({ message: error.message });
  return res.json(data);
}

export async function deleteMemberPackage(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) return;

  let existingQuery = supabase.from("member_packages").select("*").eq("id", req.params.id).eq("admin_id", adminId);
  if (gymScope.selectedGymId) existingQuery = existingQuery.eq("gym_id", gymScope.selectedGymId);

  const existing = await existingQuery.maybeSingle();
  if (existing.error) return res.status(500).json({ message: existing.error.message });
  if (!existing.data) return res.status(404).json({ message: "Member package not found" });

  const { error } = await supabase.from("member_packages").delete().eq("id", req.params.id).eq("admin_id", adminId);
  if (error) return res.status(500).json({ message: error.message });
  return res.status(204).send();
}

async function loadScopedMemberPackage(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return null;
  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) return null;

  let query = supabase.from("member_packages").select("*").eq("id", req.params.id).eq("admin_id", adminId);
  if (gymScope.selectedGymId) query = query.eq("gym_id", gymScope.selectedGymId);
  const existing = await query.maybeSingle();
  if (existing.error) {
    res.status(500).json({ message: existing.error.message });
    return null;
  }
  if (!existing.data) {
    res.status(404).json({ message: "Member package not found" });
    return null;
  }
  return { adminId, existing: existing.data };
}

export async function pauseMemberPackage(req: AuthenticatedRequest, res: Response) {
  const loaded = await loadScopedMemberPackage(req, res);
  if (!loaded) return;
  if (loaded.existing.status !== "active") return res.status(400).json({ message: "Only active memberships can be paused" });

  const updates = {
    status: "paused",
    paused_at: new Date().toISOString(),
    lifecycle_notes: normalizeOptionalString(req.body.notes) || loaded.existing.lifecycle_notes || null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("member_packages").update(updates).eq("id", req.params.id).eq("admin_id", loaded.adminId).select("*").single();
  if (error) return res.status(500).json({ message: error.message });
  await logActivity(req, { action: "pause", entityType: "member_package", entityId: data.id, gymId: data.gym_id, before: loaded.existing, after: data });
  return res.json(data);
}

export async function resumeMemberPackage(req: AuthenticatedRequest, res: Response) {
  const loaded = await loadScopedMemberPackage(req, res);
  if (!loaded) return;
  if (loaded.existing.status !== "paused" || !loaded.existing.paused_at) return res.status(400).json({ message: "Only paused memberships can be resumed" });

  const resumedAt = new Date().toISOString();
  const pausedDays = calculatePausedDays(loaded.existing.paused_at, resumedAt);
  const totalPausedDays = Number(loaded.existing.paused_days_total || 0) + pausedDays;
  const updates = {
    status: "active",
    resumed_at: resumedAt,
    paused_days_total: totalPausedDays,
    end_date: addDays(loaded.existing.end_date, pausedDays),
    lifecycle_notes: normalizeOptionalString(req.body.notes) || loaded.existing.lifecycle_notes || null,
    updated_at: resumedAt,
  };
  const { data, error } = await supabase.from("member_packages").update(updates).eq("id", req.params.id).eq("admin_id", loaded.adminId).select("*").single();
  if (error) return res.status(500).json({ message: error.message });
  await logActivity(req, { action: "resume", entityType: "member_package", entityId: data.id, gymId: data.gym_id, before: loaded.existing, after: data });
  return res.json(data);
}

export async function cancelMemberPackage(req: AuthenticatedRequest, res: Response) {
  const loaded = await loadScopedMemberPackage(req, res);
  if (!loaded) return;
  if (loaded.existing.status === "cancelled") return res.status(400).json({ message: "Membership is already cancelled" });

  const updates = { status: "cancelled", lifecycle_notes: normalizeOptionalString(req.body.notes) || loaded.existing.lifecycle_notes || null, updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from("member_packages").update(updates).eq("id", req.params.id).eq("admin_id", loaded.adminId).select("*").single();
  if (error) return res.status(500).json({ message: error.message });
  await logActivity(req, { action: "cancel", entityType: "member_package", entityId: data.id, gymId: data.gym_id, before: loaded.existing, after: data });
  return res.json(data);
}

export async function renewMemberPackage(req: AuthenticatedRequest, res: Response) {
  const loaded = await loadScopedMemberPackage(req, res);
  if (!loaded) return;
  const startDate = normalizeOptionalString(req.body.start_date) || addDays(loaded.existing.end_date, 1);
  const endDate = normalizeOptionalString(req.body.end_date);
  if (!endDate) return res.status(400).json({ message: "end_date is required" });

  const payload = {
    admin_id: loaded.adminId,
    gym_id: loaded.existing.gym_id,
    member_id: loaded.existing.member_id,
    package_type_id: normalizeOptionalString(req.body.package_type_id) || loaded.existing.package_type_id,
    package_name: normalizeOptionalString(req.body.package_name) || loaded.existing.package_name,
    start_date: startDate,
    end_date: endDate,
    amount_paid: normalizeOptionalNumber(req.body.amount_paid) ?? loaded.existing.amount_paid,
    payment_mode: normalizeOptionalString(req.body.payment_mode) || loaded.existing.payment_mode,
    status: "active",
    renewed_from_package_id: loaded.existing.id,
    notes: normalizeOptionalString(req.body.notes),
  };
  const { data, error } = await supabase.from("member_packages").insert(payload).select("*").single();
  if (error) return res.status(500).json({ message: error.message });
  await logActivity(req, { action: "renew", entityType: "member_package", entityId: data.id, gymId: data.gym_id, before: loaded.existing, after: data });
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
    return res.json(await attachMembersByMemberId(data || [], adminId, gymScope.gymIds, "id, name, phone, email, shift"));
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
    return res.json(await attachMembersByMemberId(data || [], adminId, gymScope.gymIds));
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

export async function updateTransaction(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) return;

  let existingQuery = supabase.from("transactions").select("*").eq("id", req.params.id).eq("admin_id", adminId);
  if (gymScope.selectedGymId) existingQuery = existingQuery.eq("gym_id", gymScope.selectedGymId);

  const existing = await existingQuery.maybeSingle();
  if (existing.error) return res.status(500).json({ message: existing.error.message });
  if (!existing.data) return res.status(404).json({ message: "Transaction not found" });

  if (req.body.member_id !== undefined && req.body.member_id) {
    const validMember = await ensureMemberBelongsToGym(req.body.member_id, adminId, existing.data.gym_id).catch((error) => {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to validate member" });
      return null;
    });
    if (validMember === null) return;
    if (!validMember) return res.status(400).json({ message: "Selected member does not belong to this gym" });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (req.body.member_id !== undefined) updates.member_id = normalizeOptionalString(req.body.member_id);
  if (req.body.type !== undefined) updates.type = normalizeOptionalString(req.body.type);
  if (req.body.amount !== undefined) updates.amount = normalizeOptionalNumber(req.body.amount) || 0;
  if (req.body.payment_mode !== undefined) updates.payment_mode = normalizeOptionalString(req.body.payment_mode);
  if (req.body.description !== undefined) updates.description = normalizeOptionalString(req.body.description);
  if (req.body.transaction_date !== undefined) updates.transaction_date = normalizeOptionalString(req.body.transaction_date);

  const { data, error } = await supabase.from("transactions").update(updates).eq("id", req.params.id).eq("admin_id", adminId).select("*").single();
  if (error) return res.status(500).json({ message: error.message });
  return res.json(data);
}

export async function deleteTransaction(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) return;

  let existingQuery = supabase.from("transactions").select("*").eq("id", req.params.id).eq("admin_id", adminId);
  if (gymScope.selectedGymId) existingQuery = existingQuery.eq("gym_id", gymScope.selectedGymId);

  const existing = await existingQuery.maybeSingle();
  if (existing.error) return res.status(500).json({ message: existing.error.message });
  if (!existing.data) return res.status(404).json({ message: "Transaction not found" });

  const { error } = await supabase.from("transactions").delete().eq("id", req.params.id).eq("admin_id", adminId);
  if (error) return res.status(500).json({ message: error.message });
  return res.status(204).send();
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
    return res.json(await attachMembersByMemberId(data || [], adminId, gymScope.gymIds));
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

export async function updateReview(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) return;

  let existingQuery = supabase.from("reviews").select("*").eq("id", req.params.id).eq("admin_id", adminId);
  if (gymScope.selectedGymId) existingQuery = existingQuery.eq("gym_id", gymScope.selectedGymId);

  const existing = await existingQuery.maybeSingle();
  if (existing.error) return res.status(500).json({ message: existing.error.message });
  if (!existing.data) return res.status(404).json({ message: "Review not found" });

  if (req.body.member_id !== undefined && req.body.member_id) {
    const validMember = await ensureMemberBelongsToGym(req.body.member_id, adminId, existing.data.gym_id).catch((error) => {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to validate member" });
      return null;
    });
    if (validMember === null) return;
    if (!validMember) return res.status(400).json({ message: "Selected member does not belong to this gym" });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (req.body.member_id !== undefined) updates.member_id = normalizeOptionalString(req.body.member_id);
  if (req.body.rating !== undefined) updates.rating = normalizeOptionalNumber(req.body.rating) || 0;
  if (req.body.comment !== undefined) updates.comment = normalizeOptionalString(req.body.comment);
  if (req.body.review_date !== undefined) updates.review_date = normalizeOptionalString(req.body.review_date);

  const { data, error } = await supabase.from("reviews").update(updates).eq("id", req.params.id).eq("admin_id", adminId).select("*").single();
  if (error) return res.status(500).json({ message: error.message });
  return res.json(data);
}

export async function deleteReview(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) return;

  let existingQuery = supabase.from("reviews").select("*").eq("id", req.params.id).eq("admin_id", adminId);
  if (gymScope.selectedGymId) existingQuery = existingQuery.eq("gym_id", gymScope.selectedGymId);

  const existing = await existingQuery.maybeSingle();
  if (existing.error) return res.status(500).json({ message: existing.error.message });
  if (!existing.data) return res.status(404).json({ message: "Review not found" });

  const { error } = await supabase.from("reviews").delete().eq("id", req.params.id).eq("admin_id", adminId);
  if (error) return res.status(500).json({ message: error.message });
  return res.status(204).send();
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
  let refs: Array<{ id: string; name: string; phone: string }> = [];

  if (refIds.length > 0) {
    let refsQuery = supabase
      .from("members")
      .select("id, name, phone")
      .eq("admin_id", adminId)
      .in("id", refIds as string[]);

    if (gymScope.selectedGymId) {
      refsQuery = refsQuery.eq("gym_id", gymScope.selectedGymId);
    }

    const { data: refData, error: refError } = await refsQuery;
    if (refError) {
      return res.status(500).json({ message: refError.message });
    }

    refs = (refData || []) as Array<{ id: string; name: string; phone: string }>;
  }

  const refMap = Object.fromEntries(refs.map((ref) => [ref.id, ref]));
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
