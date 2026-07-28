import type { Response } from "express";

import type { AuthenticatedRequest } from "../middleware/sessionAuth.middleware";
import { logActivity } from "../services/activityLog.service";
import { createAttendanceFromEsslPunch, normalizeEsslPayload, resolveEsslIdentity } from "../services/essl.service";
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
  if (typeof value !== "string") return value == null ? null : String(value);
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeOptionalNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export async function listEsslDevices(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;
  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) return;

  let query = supabase.from("essl_devices").select("*").eq("admin_id", adminId).order("created_at", { ascending: false });
  if (gymScope.selectedGymId) query = query.eq("gym_id", gymScope.selectedGymId);

  const { data, error } = await query;
  if (error) return res.status(500).json({ message: error.message });
  return res.json(data || []);
}

export async function createEsslDevice(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;
  const gymId = await resolveWriteGymId(req, res);
  if (!gymId) return;

  const deviceName = normalizeOptionalString(req.body.device_name);
  if (!deviceName) return res.status(400).json({ message: "device_name is required" });

  const insert = await supabase
    .from("essl_devices")
    .insert({
      admin_id: adminId,
      gym_id: gymId,
      device_name: deviceName,
      serial_number: normalizeOptionalString(req.body.serial_number),
      integration_mode: normalizeOptionalString(req.body.integration_mode) || "adms",
      ip_address: normalizeOptionalString(req.body.ip_address),
      port: normalizeOptionalNumber(req.body.port),
      server_address: normalizeOptionalString(req.body.server_address),
      server_port: normalizeOptionalNumber(req.body.server_port),
      status: normalizeOptionalString(req.body.status) || "inactive",
      is_active: req.body.is_active === undefined ? true : Boolean(req.body.is_active),
      notes: normalizeOptionalString(req.body.notes),
    })
    .select("*")
    .single();

  if (insert.error) return res.status(500).json({ message: insert.error.message });
  await logActivity(req, { action: "create", entityType: "essl_device", entityId: insert.data.id, gymId, after: insert.data });
  return res.status(201).json(insert.data);
}

export async function updateEsslDevice(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const existing = await supabase.from("essl_devices").select("*").eq("id", req.params.id).eq("admin_id", adminId).maybeSingle();
  if (existing.error) return res.status(500).json({ message: existing.error.message });
  if (!existing.data) return res.status(404).json({ message: "Device not found" });

  const update = await supabase
    .from("essl_devices")
    .update({
      device_name: req.body.device_name !== undefined ? normalizeOptionalString(req.body.device_name) : existing.data.device_name,
      serial_number: req.body.serial_number !== undefined ? normalizeOptionalString(req.body.serial_number) : existing.data.serial_number,
      integration_mode: req.body.integration_mode !== undefined ? normalizeOptionalString(req.body.integration_mode) : existing.data.integration_mode,
      ip_address: req.body.ip_address !== undefined ? normalizeOptionalString(req.body.ip_address) : existing.data.ip_address,
      port: req.body.port !== undefined ? normalizeOptionalNumber(req.body.port) : existing.data.port,
      server_address: req.body.server_address !== undefined ? normalizeOptionalString(req.body.server_address) : existing.data.server_address,
      server_port: req.body.server_port !== undefined ? normalizeOptionalNumber(req.body.server_port) : existing.data.server_port,
      status: req.body.status !== undefined ? normalizeOptionalString(req.body.status) : existing.data.status,
      is_active: req.body.is_active !== undefined ? Boolean(req.body.is_active) : existing.data.is_active,
      notes: req.body.notes !== undefined ? normalizeOptionalString(req.body.notes) : existing.data.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", req.params.id)
    .eq("admin_id", adminId)
    .select("*")
    .single();

  if (update.error) return res.status(500).json({ message: update.error.message });
  await logActivity(req, { action: "update", entityType: "essl_device", entityId: update.data.id, gymId: update.data.gym_id, before: existing.data, after: update.data });
  return res.json(update.data);
}

export async function deleteEsslDevice(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const existing = await supabase.from("essl_devices").select("*").eq("id", req.params.id).eq("admin_id", adminId).maybeSingle();
  if (existing.error) return res.status(500).json({ message: existing.error.message });
  if (!existing.data) return res.status(404).json({ message: "Device not found" });

  const { error } = await supabase.from("essl_devices").delete().eq("id", req.params.id).eq("admin_id", adminId);
  if (error) return res.status(500).json({ message: error.message });
  await logActivity(req, { action: "delete", entityType: "essl_device", entityId: String(req.params.id), gymId: existing.data.gym_id, before: existing.data });
  return res.status(204).send();
}

export async function listEsslRawLogs(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) return;

  let query = supabase.from("essl_raw_punch_logs").select("*").eq("admin_id", adminId).order("created_at", { ascending: false }).limit(250);
  if (gymScope.selectedGymId) query = query.eq("gym_id", gymScope.selectedGymId);

  const { data, error } = await query;
  if (error) return res.status(500).json({ message: error.message });
  return res.json(data || []);
}

export async function receiveEsslWebhook(req: AuthenticatedRequest, res: Response) {
  const payload = {
    ...(req.query || {}),
    ...((req.body && typeof req.body === "object") ? req.body : {}),
  } as Record<string, unknown>;
  const normalized = normalizeEsslPayload(payload);

  const deviceLookup = normalized.serialNumber
    ? await supabase.from("essl_devices").select("*").eq("serial_number", normalized.serialNumber).maybeSingle()
    : { data: null, error: null as any };

  if (deviceLookup.error) {
    return res.status(500).send("ERROR");
  }

  const device = deviceLookup.data;
  const resolvedIdentity = await resolveEsslIdentity({
    adminId: device?.admin_id ? String(device.admin_id) : null,
    gymId: device?.gym_id ? String(device.gym_id) : null,
    userCode: normalized.userCode,
  });

  const insert = await supabase
    .from("essl_raw_punch_logs")
    .insert({
      admin_id: device?.admin_id || null,
      gym_id: device?.gym_id || null,
      essl_device_id: device?.id || null,
      serial_number: normalized.serialNumber,
      user_code: normalized.userCode,
      punch_at: normalized.punchAt,
      payload,
      processing_status: resolvedIdentity.memberId || resolvedIdentity.staffId ? "mapped" : "received",
      resolved_member_id: resolvedIdentity.memberId,
      resolved_staff_id: resolvedIdentity.staffId,
    })
    .select("*")
    .single();

  if (insert.error) {
    return res.status(500).send("ERROR");
  }

  if (device?.id) {
    await supabase.from("essl_devices").update({ last_synced_at: new Date().toISOString(), status: "online", updated_at: new Date().toISOString() }).eq("id", device.id);
  }

  if (device?.admin_id && device?.gym_id) {
    await createAttendanceFromEsslPunch({
      adminId: String(device.admin_id),
      gymId: String(device.gym_id),
      memberId: resolvedIdentity.memberId,
      staffId: resolvedIdentity.staffId,
      punchAt: normalized.punchAt,
      externalPunchId: insert.data.id,
    }).catch((error) => {
      console.error("Failed to create attendance from eSSL punch", error);
    });
  }

  return res.send("OK");
}
