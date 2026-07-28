import type { Response } from "express";

import type { AuthenticatedRequest } from "../middleware/sessionAuth.middleware";
import { logActivity } from "../services/activityLog.service";
import { resolveGymScope, resolveWriteGymId } from "../services/gymScope.service";
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

export async function listShifts(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) {
    return;
  }

  let query = supabase
    .from("shifts")
    .select("*")
    .eq("admin_id", adminId)
    .order("created_at", { ascending: false });

  if (gymScope.selectedGymId) {
    query = query.eq("gym_id", gymScope.selectedGymId);
  }

  const { data, error } = await query;
  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.json(data || []);
}

export async function createShift(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymId = await resolveWriteGymId(req, res);
  if (!gymId) {
    return;
  }

  const name = normalizeOptionalString(req.body.name);
  const shiftType = normalizeOptionalString(req.body.shift_type) || "recurring";
  const description = normalizeOptionalString(req.body.description);
  const eventDate = normalizeOptionalString(req.body.event_date);
  const startTime = normalizeOptionalString(req.body.start_time);
  const endTime = normalizeOptionalString(req.body.end_time);

  if (!name) {
    return res.status(400).json({ message: "name is required" });
  }

  if (shiftType !== "recurring" && shiftType !== "one_time") {
    return res.status(400).json({ message: "shift_type must be recurring or one_time" });
  }

  const { data, error } = await supabase
    .from("shifts")
    .insert({
      admin_id: adminId,
      gym_id: gymId,
      name,
      shift_type: shiftType,
      description,
      event_date: shiftType === "one_time" ? eventDate : null,
      start_time: startTime,
      end_time: endTime,
    })
    .select("*")
    .single();

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  await logActivity(req, { action: "create", entityType: "shift", entityId: data.id, gymId, after: data });

  return res.status(201).json(data);
}

export async function updateShift(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) {
    return;
  }

  const updates: Record<string, unknown> = {};
  if (req.body.name !== undefined) updates.name = normalizeOptionalString(req.body.name);
  if (req.body.description !== undefined) updates.description = normalizeOptionalString(req.body.description);
  if (req.body.start_time !== undefined) updates.start_time = normalizeOptionalString(req.body.start_time);
  if (req.body.end_time !== undefined) updates.end_time = normalizeOptionalString(req.body.end_time);
  if (req.body.is_active !== undefined) updates.is_active = Boolean(req.body.is_active);

  const shiftType = req.body.shift_type !== undefined
    ? normalizeOptionalString(req.body.shift_type)
    : undefined;
  if (shiftType !== undefined) {
    if (shiftType !== "recurring" && shiftType !== "one_time") {
      return res.status(400).json({ message: "shift_type must be recurring or one_time" });
    }

    updates.shift_type = shiftType;
    if (shiftType === "recurring") {
      updates.event_date = null;
    }
  }

  if (req.body.event_date !== undefined || shiftType === "one_time") {
    updates.event_date = normalizeOptionalString(req.body.event_date);
  }

  if (req.body.gym_id !== undefined) {
    const gymId = normalizeOptionalString(req.body.gym_id);
    if (!gymId) {
      return res.status(400).json({ message: "gym_id cannot be empty" });
    }

    updates.gym_id = gymId;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: "No valid fields provided for update" });
  }

  updates.updated_at = new Date().toISOString();

  let query = supabase
    .from("shifts")
    .update(updates)
    .eq("id", req.params.id)
    .eq("admin_id", adminId);

  if (gymScope.selectedGymId) {
    query = query.eq("gym_id", gymScope.selectedGymId);
  }

  const existing = await supabase.from("shifts").select("*").eq("id", req.params.id).eq("admin_id", adminId).maybeSingle();
  if (existing.error) {
    return res.status(500).json({ message: existing.error.message });
  }
  if (!existing.data) {
    return res.status(404).json({ message: "Shift not found" });
  }

  const { data, error } = await query.select("*").single();
  if (error) {
    return res.status(500).json({ message: error.message });
  }

  await logActivity(req, { action: "update", entityType: "shift", entityId: data.id, gymId: data.gym_id, before: existing.data, after: data });

  return res.json(data);
}

export async function deleteShift(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) {
    return;
  }

  const existing = await supabase.from("shifts").select("*").eq("id", req.params.id).eq("admin_id", adminId).maybeSingle();
  if (existing.error) {
    return res.status(500).json({ message: existing.error.message });
  }
  if (!existing.data) {
    return res.status(404).json({ message: "Shift not found" });
  }

  let query = supabase.from("shifts").delete().eq("id", req.params.id).eq("admin_id", adminId);
  if (gymScope.selectedGymId) {
    query = query.eq("gym_id", gymScope.selectedGymId);
  }

  const { error } = await query;
  if (error) {
    return res.status(500).json({ message: error.message });
  }

  await logActivity(req, { action: "delete", entityType: "shift", entityId: String(req.params.id), gymId: existing.data.gym_id, before: existing.data });

  return res.status(204).send();
}
