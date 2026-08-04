import type { Request, Response } from "express";

import {
  buildAdmsHandshakeResponse,
  ingestEsslPunch,
  parseAdmsAttendanceBody,
} from "../services/essl.service";
import { supabase } from "../supabase";

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return value == null ? null : String(value);
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function formatAdmsDateTime(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function parseTextPairs(body: string) {
  const normalized = body.trim();
  if (!normalized || (!normalized.includes("=") && !normalized.includes("&"))) {
    return {} as Record<string, string>;
  }

  const params = new URLSearchParams(normalized.replace(/\r\n|\r|\n/g, "&"));
  return Object.fromEntries(params.entries());
}

function getRawBody(req: Request) {
  if (typeof req.body === "string") {
    return req.body;
  }

  const rawBody = (req as Request & { rawBody?: string }).rawBody;
  return typeof rawBody === "string" ? rawBody : "";
}

function collectPayload(req: Request) {
  const rawBody = getRawBody(req);
  const textPairs = parseTextPairs(rawBody);

  return {
    ...(req.query || {}),
    ...((req.body && typeof req.body === "object" && !Array.isArray(req.body)) ? req.body : {}),
    ...textPairs,
  } as Record<string, unknown>;
}

function getSerialNumber(payload: Record<string, unknown>) {
  return normalizeString(payload.SN) || normalizeString(payload.sn) || normalizeString(payload.serial_number);
}

async function markDeviceOnlineBySerial(serialNumber: string | null) {
  if (!serialNumber) return;

  await supabase
    .from("essl_devices")
    .update({
      status: "online",
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("serial_number", serialNumber);
}

export async function admsHandshake(req: Request, res: Response) {
  const payload = collectPayload(req);
  const serialNumber = getSerialNumber(payload);
  await markDeviceOnlineBySerial(serialNumber);

  return res.type("text/plain").send(buildAdmsHandshakeResponse(serialNumber));
}

export async function admsReceiveAttendance(req: Request, res: Response) {
  const payload = collectPayload(req);
  const serialNumber = getSerialNumber(payload);
  const table = (normalizeString(payload.table) || "ATTLOG").toUpperCase();
  const rawBody = getRawBody(req);

  await markDeviceOnlineBySerial(serialNumber);

  try {
    if (table === "ATTLOG" && rawBody.trim()) {
      const rows = parseAdmsAttendanceBody(rawBody);
      let processed = 0;

      for (const row of rows) {
        await ingestEsslPunch({
          SN: serialNumber,
          PIN: row.userCode,
          DateTime: row.punchAt,
          table,
          status: row.status,
          verify_mode: row.verifyMode,
          work_code: row.workCode,
          raw_line: row.rawLine,
        });
        processed += 1;
      }

      return res.type("text/plain").send(`OK: ${processed}`);
    }

    if (serialNumber && (payload.PIN || payload.pin || payload.user_id || payload.userid)) {
      await ingestEsslPunch(payload);
      return res.type("text/plain").send("OK: 1");
    }

    return res.type("text/plain").send("OK: 0");
  } catch (error) {
    console.error("Failed to ingest ADMS attendance payload", error);
    return res.status(500).type("text/plain").send("ERROR: 0");
  }
}

export async function admsGetTime(_req: Request, res: Response) {
  return res.type("text/plain").send(formatAdmsDateTime());
}

export async function admsAcknowledge(req: Request, res: Response) {
  const payload = collectPayload(req);
  await markDeviceOnlineBySerial(getSerialNumber(payload));
  return res.type("text/plain").send("OK");
}

export async function admsStatus(req: Request, res: Response) {
  const payload = collectPayload(req);
  await markDeviceOnlineBySerial(getSerialNumber(payload));
  return res.type("text/plain").send("OK");
}
