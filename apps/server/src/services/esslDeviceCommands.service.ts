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

