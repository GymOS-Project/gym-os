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
  if (typeof value !== "string") return value == null ? null : String(value);
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

async function validateAttendanceSubject(req: AuthenticatedRequest, res: Response, adminId: string, gymId: string) {
  const entityType = normalizeOptionalString(req.body.entity_type) || "member";
  const memberId = normalizeOptionalString(req.body.member_id);
  const staffAccountId = normalizeOptionalString(req.body.staff_account_id);

  if (entityType === "member") {
    if (!memberId) {
      res.status(400).json({ message: "member_id is required for member attendance" });
      return null;
    }

    const validMember = await ensureMemberBelongsToGym(memberId, adminId, gymId).catch((error) => {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to validate member" });
      return null;
    });
    if (validMember === null) return null;
    if (!validMember) {
      res.status(400).json({ message: "Selected member does not belong to this gym" });
      return null;
    }
  } else {
    if (!staffAccountId) {
      res.status(400).json({ message: "staff_account_id is required for staff attendance" });
      return null;
    }

    const staff = await supabase
      .from("staff_accounts")
      .select("id")
      .eq("id", staffAccountId)
      .eq("admin_id", adminId)
      .eq("gym_id", gymId)
      .maybeSingle();

    if (staff.error) {
      res.status(500).json({ message: staff.error.message });
      return null;
    }
    if (!staff.data) {
      res.status(400).json({ message: "Selected staff member does not belong to this gym" });
      return null;
    }
  }

  return { entityType, memberId, staffAccountId };
}

export async function listAttendanceLogs(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) return;

  let query = supabase
    .from("attendance_logs")
    .select("*")
    .eq("admin_id", adminId)
    .order("attendance_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (gymScope.selectedGymId) query = query.eq("gym_id", gymScope.selectedGymId);
  const entityType = normalizeOptionalString(req.query.entity_type);
  if (entityType) query = query.eq("entity_type", entityType);
  const date = normalizeOptionalString(req.query.attendance_date);
  if (date) query = query.eq("attendance_date", date);

  const { data, error } = await query;
  if (error) return res.status(500).json({ message: error.message });
  return res.json(data || []);
}

export async function checkIn(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const gymId = await resolveWriteGymId(req, res);
  if (!gymId) return;

  const subject = await validateAttendanceSubject(req, res, adminId, gymId);
  if (!subject) return;

  const checkInAt = normalizeOptionalString(req.body.check_in_at) || new Date().toISOString();
  const attendanceDate = normalizeOptionalString(req.body.attendance_date) || checkInAt.slice(0, 10);

  const insert = await supabase
    .from("attendance_logs")
    .insert({
      admin_id: adminId,
      gym_id: gymId,
      entity_type: subject.entityType,
      member_id: subject.memberId,
      staff_account_id: subject.staffAccountId,
      class_session_id: normalizeOptionalString(req.body.class_session_id),
      pt_session_id: normalizeOptionalString(req.body.pt_session_id),
      attendance_date: attendanceDate,
      check_in_at: checkInAt,
      source: normalizeOptionalString(req.body.source) || "manual",
      status: normalizeOptionalString(req.body.status) || "present",
      notes: normalizeOptionalString(req.body.notes),
    })
    .select("*")
    .single();

  if (insert.error) return res.status(500).json({ message: insert.error.message });
  await logActivity(req, { action: "check_in", entityType: "attendance_log", entityId: insert.data.id, gymId, after: insert.data });
  return res.status(201).json(insert.data);
}

export async function checkOut(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const existing = await supabase.from("attendance_logs").select("*").eq("id", req.params.id).eq("admin_id", adminId).maybeSingle();
  if (existing.error) return res.status(500).json({ message: existing.error.message });
  if (!existing.data) return res.status(404).json({ message: "Attendance log not found" });

  const update = await supabase
    .from("attendance_logs")
    .update({
      check_out_at: normalizeOptionalString(req.body.check_out_at) || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      notes: req.body.notes !== undefined ? normalizeOptionalString(req.body.notes) : existing.data.notes,
    })
    .eq("id", req.params.id)
    .eq("admin_id", adminId)
    .select("*")
    .single();

  if (update.error) return res.status(500).json({ message: update.error.message });
  await logActivity(req, { action: "check_out", entityType: "attendance_log", entityId: update.data.id, gymId: update.data.gym_id, before: existing.data, after: update.data });
  return res.json(update.data);
}

export async function updateAttendanceLog(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const existing = await supabase.from("attendance_logs").select("*").eq("id", req.params.id).eq("admin_id", adminId).maybeSingle();
  if (existing.error) return res.status(500).json({ message: existing.error.message });
  if (!existing.data) return res.status(404).json({ message: "Attendance log not found" });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (req.body.attendance_date !== undefined) updates.attendance_date = normalizeOptionalString(req.body.attendance_date);
  if (req.body.check_in_at !== undefined) updates.check_in_at = normalizeOptionalString(req.body.check_in_at);
  if (req.body.check_out_at !== undefined) updates.check_out_at = normalizeOptionalString(req.body.check_out_at);
  if (req.body.status !== undefined) updates.status = normalizeOptionalString(req.body.status);
  if (req.body.notes !== undefined) updates.notes = normalizeOptionalString(req.body.notes);

  const update = await supabase
    .from("attendance_logs")
    .update(updates)
    .eq("id", req.params.id)
    .eq("admin_id", adminId)
    .select("*")
    .single();

  if (update.error) return res.status(500).json({ message: update.error.message });
  await logActivity(req, { action: "update", entityType: "attendance_log", entityId: update.data.id, gymId: update.data.gym_id, before: existing.data, after: update.data });
  return res.json(update.data);
}

export async function deleteAttendanceLog(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const existing = await supabase.from("attendance_logs").select("*").eq("id", req.params.id).eq("admin_id", adminId).maybeSingle();
  if (existing.error) return res.status(500).json({ message: existing.error.message });
  if (!existing.data) return res.status(404).json({ message: "Attendance log not found" });

  const { error } = await supabase.from("attendance_logs").delete().eq("id", req.params.id).eq("admin_id", adminId);
  if (error) return res.status(500).json({ message: error.message });

  await logActivity(req, { action: "delete", entityType: "attendance_log", entityId: String(req.params.id), gymId: existing.data.gym_id, before: existing.data });
  return res.status(204).send();
}
