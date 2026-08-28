import { supabase } from "../supabase";

export type EsslDeviceCommandStatus = "queued" | "sent" | "acked" | "failed";

export type EsslDeviceCommand = {
  id: string;
  cmd_id: string | number;
  admin_id: string | null;
  gym_id: string | null;
  essl_device_id: string | null;
  serial_number: string | null;
  command: string;
  status: EsslDeviceCommandStatus;
  sent_at: string | null;
  acked_at: string | null;
  device_result: string | null;
  created_at: string;
  updated_at: string;
};

function isMissingRelationError(error: unknown, tableName: string) {
  const message = typeof (error as any)?.message === "string" ? String((error as any).message) : "";
  return message.toLowerCase().includes("does not exist") && message.includes(tableName);
}

export async function listQueuedEsslDeviceCommands(params: { serialNumber: string | null; limit?: number }) {
  const { serialNumber, limit = 5 } = params;
  if (!serialNumber) return [] as EsslDeviceCommand[];

  const query = supabase
    .from("essl_device_commands")
    .select("*")
    .eq("serial_number", serialNumber)
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(Math.max(1, Math.min(limit, 50)));

  const { data, error } = await query;
  if (error) {
    if (isMissingRelationError(error, "essl_device_commands")) return [] as EsslDeviceCommand[];
    throw new Error(error.message);
  }

  return (data || []) as EsslDeviceCommand[];
}

export async function listRecentEsslDeviceCommands(params: { adminId: string; gymId?: string | null; limit?: number }) {
  const { adminId, gymId, limit = 100 } = params;
  let query = supabase
    .from("essl_device_commands")
    .select("*")
    .eq("admin_id", adminId)
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(limit, 250)));

  if (gymId) {
    query = query.eq("gym_id", gymId);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingRelationError(error, "essl_device_commands")) return [] as EsslDeviceCommand[];
    throw new Error(error.message);
  }

  return (data || []) as EsslDeviceCommand[];
}

export async function markEsslDeviceCommandsSent(params: { commandIds: string[]; serialNumber: string | null }) {
  const { commandIds, serialNumber } = params;
  if (!serialNumber || commandIds.length === 0) return;

  const { error } = await supabase
    .from("essl_device_commands")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("serial_number", serialNumber)
    .in("id", commandIds);

  if (error) {
    if (isMissingRelationError(error, "essl_device_commands")) return;
    throw new Error(error.message);
  }
}

export async function acknowledgeEsslDeviceCommand(params: {
  serialNumber: string | null;
  cmdId: string | null;
  deviceResult: string | null;
}) {
  const { serialNumber, cmdId, deviceResult } = params;
  if (!serialNumber || !cmdId) return;

  const { error } = await supabase
    .from("essl_device_commands")
    .update({
      status: "acked",
      acked_at: new Date().toISOString(),
      device_result: deviceResult,
      updated_at: new Date().toISOString(),
    })
    .eq("serial_number", serialNumber)
    .eq("cmd_id", cmdId);

  if (error) {
    if (isMissingRelationError(error, "essl_device_commands")) return;
    throw new Error(error.message);
  }
}

export async function createEsslDeviceCommand(params: {
  adminId: string;
  gymId: string;
  esslDeviceId: string;
  serialNumber: string;
  command: string;
}) {
  const { adminId, gymId, esslDeviceId, serialNumber, command } = params;

  const trimmed = command.trim();
  if (!trimmed) {
    throw new Error("command is required");
  }

  const { data, error } = await supabase
    .from("essl_device_commands")
    .insert({
      admin_id: adminId,
      gym_id: gymId,
      essl_device_id: esslDeviceId,
      serial_number: serialNumber,
      command: trimmed,
      status: "queued",
      sent_at: null,
      acked_at: null,
      device_result: null,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    if (isMissingRelationError(error, "essl_device_commands")) {
      throw new Error("Missing DB table essl_device_commands (apply Supabase migrations first).");
    }
    throw new Error(error.message);
  }

  return data as EsslDeviceCommand;
}

function sanitizeDeviceUserName(value: string) {
  return value.replace(/[\t\r\n=]/g, " ").replace(/\s+/g, " ").trim().slice(0, 24);
}

export function buildEsslUserInfoCommand(params: { pin: string; name: string; card?: string | null }) {
  const pin = params.pin.trim();
  const name = sanitizeDeviceUserName(params.name) || pin;
  const card = params.card?.trim() || "";

  return [
    "DATA UPDATE USERINFO",
    `PIN=${pin}`,
    `Name=${name}`,
    "Pri=0",
    "Passwd=",
    `Card=${card}`,
    "Grp=1",
    "TZ=0000000100000000",
  ].join("\t");
}

export async function queueEsslUserInfoForGymDevices(params: {
  adminId: string;
  gymId: string;
  pin: string;
  name: string;
}) {
  const { adminId, gymId, pin, name } = params;
  const { data: devices, error } = await supabase
    .from("essl_devices")
    .select("id, serial_number")
    .eq("admin_id", adminId)
    .eq("gym_id", gymId)
    .eq("is_active", true)
    .not("serial_number", "is", null);

  if (error) {
    throw new Error(error.message);
  }

  const command = buildEsslUserInfoCommand({ pin, name });
  const queued: EsslDeviceCommand[] = [];

  for (const device of devices || []) {
    const serialNumber = typeof device.serial_number === "string" ? device.serial_number.trim() : "";
    if (!serialNumber) continue;

    queued.push(await createEsslDeviceCommand({
      adminId,
      gymId,
      esslDeviceId: String(device.id),
      serialNumber,
      command,
    }));
  }

  return queued;
}
