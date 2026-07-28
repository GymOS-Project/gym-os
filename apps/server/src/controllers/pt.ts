import type { Response } from "express";

import type { AuthenticatedRequest } from "../middleware/sessionAuth.middleware";
import { logActivity } from "../services/activityLog.service";
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

export async function listPtSessions(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) return;

  let query = supabase
    .from("pt_sessions")
    .select("*")
    .eq("admin_id", adminId)
    .order("scheduled_at", { ascending: false });

  if (gymScope.selectedGymId) query = query.eq("gym_id", gymScope.selectedGymId);

  const { data, error } = await query;
  if (error) return res.status(500).json({ message: error.message });
  return res.json(data || []);
}

export async function createPtSession(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const gymId = await resolveWriteGymId(req, res);
  if (!gymId) return;

  const trainerStaffId = normalizeOptionalString(req.body.trainer_staff_id);
  const memberId = normalizeOptionalString(req.body.member_id);
  const scheduledAt = normalizeOptionalString(req.body.scheduled_at);
  if (!trainerStaffId || !memberId || !scheduledAt) {
    return res.status(400).json({ message: "trainer_staff_id, member_id, and scheduled_at are required" });
  }

  const validMember = await ensureMemberBelongsToGym(memberId, adminId, gymId).catch((error) => {
    res.status(500).json({ message: error instanceof Error ? error.message : "Failed to validate member" });
    return null;
  });
  if (validMember === null) return;
  if (!validMember) return res.status(400).json({ message: "Selected member does not belong to this gym" });

  const trainer = await supabase
    .from("staff_accounts")
    .select("id")
    .eq("id", trainerStaffId)
    .eq("admin_id", adminId)
    .eq("gym_id", gymId)
    .maybeSingle();

  if (trainer.error) return res.status(500).json({ message: trainer.error.message });
  if (!trainer.data) return res.status(400).json({ message: "Trainer not found" });

  const insert = await supabase
    .from("pt_sessions")
    .insert({
      admin_id: adminId,
      gym_id: gymId,
      trainer_staff_id: trainerStaffId,
      member_id: memberId,
      scheduled_at: scheduledAt,
      duration_minutes: normalizeOptionalNumber(req.body.duration_minutes) || 60,
      status: normalizeOptionalString(req.body.status) || "scheduled",
      notes: normalizeOptionalString(req.body.notes),
    })
    .select("*")
    .single();

  if (insert.error) return res.status(500).json({ message: insert.error.message });
  await logActivity(req, { action: "create", entityType: "pt_session", entityId: insert.data.id, gymId, after: insert.data });
  return res.status(201).json(insert.data);
}

export async function updatePtSession(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) return;

  let existingQuery = supabase.from("pt_sessions").select("*").eq("id", req.params.id).eq("admin_id", adminId);
  if (gymScope.selectedGymId) existingQuery = existingQuery.eq("gym_id", gymScope.selectedGymId);

  const existing = await existingQuery.maybeSingle();
  if (existing.error) return res.status(500).json({ message: existing.error.message });
  if (!existing.data) return res.status(404).json({ message: "PT session not found" });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (req.body.trainer_staff_id !== undefined) updates.trainer_staff_id = normalizeOptionalString(req.body.trainer_staff_id);
  if (req.body.member_id !== undefined) updates.member_id = normalizeOptionalString(req.body.member_id);
  if (req.body.scheduled_at !== undefined) updates.scheduled_at = normalizeOptionalString(req.body.scheduled_at);
  if (req.body.duration_minutes !== undefined) updates.duration_minutes = normalizeOptionalNumber(req.body.duration_minutes) || 60;
  if (req.body.status !== undefined) updates.status = normalizeOptionalString(req.body.status) || "scheduled";
  if (req.body.notes !== undefined) updates.notes = normalizeOptionalString(req.body.notes);

  const update = await supabase
    .from("pt_sessions")
    .update(updates)
    .eq("id", req.params.id)
    .eq("admin_id", adminId)
    .select("*")
    .single();

  if (update.error) return res.status(500).json({ message: update.error.message });
  await logActivity(req, { action: "update", entityType: "pt_session", entityId: update.data.id, gymId: update.data.gym_id, before: existing.data, after: update.data });
  return res.json(update.data);
}

export async function deletePtSession(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const existing = await supabase.from("pt_sessions").select("*").eq("id", req.params.id).eq("admin_id", adminId).maybeSingle();
  if (existing.error) return res.status(500).json({ message: existing.error.message });
  if (!existing.data) return res.status(404).json({ message: "PT session not found" });

  const { error } = await supabase.from("pt_sessions").delete().eq("id", req.params.id).eq("admin_id", adminId);
  if (error) return res.status(500).json({ message: error.message });

  await logActivity(req, { action: "delete", entityType: "pt_session", entityId: String(req.params.id), gymId: existing.data.gym_id, before: existing.data });
  return res.status(204).send();
}
