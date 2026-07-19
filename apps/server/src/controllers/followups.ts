import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/sessionAuth.middleware";
import { attachMembersByMemberId } from "../services/relatedRecords.service";
import { ensureMemberBelongsToGym, resolveGymScope, resolveWriteGymId } from "../services/gymScope.service";
import { supabase } from "../supabase";

function getAdminId(req: AuthenticatedRequest, res: Response) {
  const adminId = req.admin?.id;
  if (!adminId) {
    res.status(401).json({ message: "Not authenticated" });
    return null;
  }

  return adminId;
}

export async function listFollowups(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) {
    return;
  }

  let query = supabase
    .from("followups")
    .select("*")
    .eq("admin_id", adminId);

  if (gymScope.selectedGymId) {
    query = query.eq("gym_id", gymScope.selectedGymId);
  }

  const type = req.query.type as string;
  if (type) {
    query = query.eq("type", type);
  }

  const { data, error } = await query.order("followup_date", { ascending: false });
  if (error) {
    return res.status(500).json({ message: error.message });
  }

  try {
    return res.json(await attachMembersByMemberId(data || []));
  } catch (attachError) {
    return res.status(500).json({ message: attachError instanceof Error ? attachError.message : "Failed to load followups" });
  }
}

export async function createFollowup(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymId = await resolveWriteGymId(req, res);
  if (!gymId) {
    return;
  }

  const { type, member_id, followup_date, next_followup_date, notes, status } = req.body;

  if (!followup_date) {
    return res.status(400).json({ message: "followup_date is required" });
  }

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
    .from("followups")
    .insert({
      admin_id: adminId,
      gym_id: gymId,
      type,
      member_id: member_id || null,
      followup_date,
      next_followup_date: next_followup_date || null,
      notes: notes || null,
      status: status || "pending",
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.status(201).json(data);
}

export async function updateFollowup(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) {
    return;
  }

  const { member_id, followup_date, next_followup_date, notes, status } = req.body;

  if (member_id && gymScope.selectedGymId) {
    const validMember = await ensureMemberBelongsToGym(member_id, adminId, gymScope.selectedGymId).catch((error) => {
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

  let query = supabase
    .from("followups")
    .update({
      member_id: member_id || null,
      followup_date,
      next_followup_date: next_followup_date || null,
      notes: notes || null,
      status,
    })
    .eq("id", req.params.id)
    .eq("admin_id", adminId);

  if (gymScope.selectedGymId) {
    query = query.eq("gym_id", gymScope.selectedGymId);
  }

  const { data, error } = await query.select().single();

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.json(data);
}
