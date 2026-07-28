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

export async function listClassSessions(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) return;

  let query = supabase
    .from("class_sessions")
    .select("*")
    .eq("admin_id", adminId)
    .order("session_date", { ascending: false });

  if (gymScope.selectedGymId) {
    query = query.eq("gym_id", gymScope.selectedGymId);
  }

  const { data, error } = await query;
  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.json(data || []);
}

export async function createClassSession(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const gymId = await resolveWriteGymId(req, res);
  if (!gymId) return;

  const name = normalizeOptionalString(req.body.name);
  const sessionDate = normalizeOptionalString(req.body.session_date);
  if (!name || !sessionDate) {
    return res.status(400).json({ message: "name and session_date are required" });
  }

  const payload = {
    admin_id: adminId,
    gym_id: gymId,
    name,
    description: normalizeOptionalString(req.body.description),
    trainer_staff_id: normalizeOptionalString(req.body.trainer_staff_id),
    capacity: normalizeOptionalNumber(req.body.capacity) || 0,
    session_date: sessionDate,
    start_time: normalizeOptionalString(req.body.start_time),
    end_time: normalizeOptionalString(req.body.end_time),
    recurrence_label: normalizeOptionalString(req.body.recurrence_label),
    is_active: req.body.is_active === undefined ? true : Boolean(req.body.is_active),
  };

  const { data, error } = await supabase.from("class_sessions").insert(payload).select("*").single();
  if (error) {
    return res.status(500).json({ message: error.message });
  }

  await logActivity(req, { action: "create", entityType: "class_session", entityId: data.id, gymId, after: data });
  return res.status(201).json(data);
}

export async function updateClassSession(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) return;

  let existingQuery = supabase.from("class_sessions").select("*").eq("id", req.params.id).eq("admin_id", adminId);
  if (gymScope.selectedGymId) {
    existingQuery = existingQuery.eq("gym_id", gymScope.selectedGymId);
  }

  const existing = await existingQuery.maybeSingle();
  if (existing.error) {
    return res.status(500).json({ message: existing.error.message });
  }
  if (!existing.data) {
    return res.status(404).json({ message: "Class session not found" });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (req.body.name !== undefined) updates.name = normalizeOptionalString(req.body.name);
  if (req.body.description !== undefined) updates.description = normalizeOptionalString(req.body.description);
  if (req.body.trainer_staff_id !== undefined) updates.trainer_staff_id = normalizeOptionalString(req.body.trainer_staff_id);
  if (req.body.capacity !== undefined) updates.capacity = normalizeOptionalNumber(req.body.capacity) || 0;
  if (req.body.session_date !== undefined) updates.session_date = normalizeOptionalString(req.body.session_date);
  if (req.body.start_time !== undefined) updates.start_time = normalizeOptionalString(req.body.start_time);
  if (req.body.end_time !== undefined) updates.end_time = normalizeOptionalString(req.body.end_time);
  if (req.body.recurrence_label !== undefined) updates.recurrence_label = normalizeOptionalString(req.body.recurrence_label);
  if (req.body.is_active !== undefined) updates.is_active = Boolean(req.body.is_active);

  const { data, error } = await supabase
    .from("class_sessions")
    .update(updates)
    .eq("id", req.params.id)
    .eq("admin_id", adminId)
    .select("*")
    .single();

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  await logActivity(req, { action: "update", entityType: "class_session", entityId: data.id, gymId: data.gym_id, before: existing.data, after: data });
  return res.json(data);
}

export async function deleteClassSession(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) return;

  let existingQuery = supabase.from("class_sessions").select("*").eq("id", req.params.id).eq("admin_id", adminId);
  if (gymScope.selectedGymId) existingQuery = existingQuery.eq("gym_id", gymScope.selectedGymId);

  const existing = await existingQuery.maybeSingle();
  if (existing.error) return res.status(500).json({ message: existing.error.message });
  if (!existing.data) return res.status(404).json({ message: "Class session not found" });

  const { error } = await supabase.from("class_sessions").delete().eq("id", req.params.id).eq("admin_id", adminId);
  if (error) return res.status(500).json({ message: error.message });

  await logActivity(req, { action: "delete", entityType: "class_session", entityId: String(req.params.id), gymId: existing.data.gym_id, before: existing.data });
  return res.status(204).send();
}

export async function listClassBookings(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const { data, error } = await supabase
    .from("class_bookings")
    .select("*")
    .eq("admin_id", adminId)
    .eq("class_session_id", req.params.id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ message: error.message });
  return res.json(data || []);
}

export async function createClassBooking(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const { data: classSession, error: classError } = await supabase
    .from("class_sessions")
    .select("*")
    .eq("id", req.params.id)
    .eq("admin_id", adminId)
    .maybeSingle();

  if (classError) return res.status(500).json({ message: classError.message });
  if (!classSession) return res.status(404).json({ message: "Class session not found" });

  const memberId = normalizeOptionalString(req.body.member_id);
  if (!memberId) return res.status(400).json({ message: "member_id is required" });

  const validMember = await ensureMemberBelongsToGym(memberId, adminId, classSession.gym_id).catch((error) => {
    res.status(500).json({ message: error instanceof Error ? error.message : "Failed to validate member" });
    return null;
  });
  if (validMember === null) return;
  if (!validMember) return res.status(400).json({ message: "Selected member does not belong to this gym" });

  const { count, error: countError } = await supabase
    .from("class_bookings")
    .select("id", { head: true, count: "exact" })
    .eq("admin_id", adminId)
    .eq("class_session_id", req.params.id)
    .neq("status", "cancelled");

  if (countError) return res.status(500).json({ message: countError.message });
  if (classSession.capacity > 0 && (count || 0) >= classSession.capacity) {
    return res.status(400).json({ message: "Class capacity reached" });
  }

  const insert = await supabase
    .from("class_bookings")
    .insert({
      admin_id: adminId,
      gym_id: classSession.gym_id,
      class_session_id: req.params.id,
      member_id: memberId,
      status: normalizeOptionalString(req.body.status) || "booked",
      notes: normalizeOptionalString(req.body.notes),
    })
    .select("*")
    .single();

  if (insert.error) return res.status(500).json({ message: insert.error.message });

  await logActivity(req, { action: "create", entityType: "class_booking", entityId: insert.data.id, gymId: classSession.gym_id, after: insert.data });
  return res.status(201).json(insert.data);
}

export async function deleteClassBooking(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const existing = await supabase
    .from("class_bookings")
    .select("*")
    .eq("id", req.params.bookingId)
    .eq("admin_id", adminId)
    .maybeSingle();

  if (existing.error) return res.status(500).json({ message: existing.error.message });
  if (!existing.data) return res.status(404).json({ message: "Booking not found" });

  const { error } = await supabase.from("class_bookings").delete().eq("id", req.params.bookingId).eq("admin_id", adminId);
  if (error) return res.status(500).json({ message: error.message });

  await logActivity(req, { action: "delete", entityType: "class_booking", entityId: String(req.params.bookingId), gymId: existing.data.gym_id, before: existing.data });
  return res.status(204).send();
}
