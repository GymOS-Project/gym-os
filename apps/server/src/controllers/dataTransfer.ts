import type { Response } from "express";

import type { AuthenticatedRequest } from "../middleware/sessionAuth.middleware";
import { BACKUP_TABLES, sanitizeBackupRows, validateBackupPayload } from "../services/backup.service";
import { parseCsv, toCsv } from "../services/csv.service";
import { resolveGymScope, resolveWriteGymId } from "../services/gymScope.service";
import { supabase } from "../supabase";

const CONFIG: Record<string, { table: string; columns: string[]; required: string[]; importable: boolean }> = {
  members: { table: "members", importable: true, required: ["name", "phone"], columns: ["id", "gym_id", "name", "email", "phone", "gender", "date_of_birth", "address", "shift", "notes", "is_active", "created_at"] },
  enquiries: { table: "enquiries", importable: true, required: ["name", "phone"], columns: ["id", "gym_id", "name", "phone", "email", "source", "interest", "status", "next_followup_date", "notes", "created_at"] },
  payments: { table: "transactions", importable: true, required: ["amount", "payment_mode"], columns: ["id", "gym_id", "member_id", "type", "amount", "payment_mode", "description", "transaction_date", "created_at"] },
  attendance: { table: "attendance_logs", importable: true, required: ["entity_type", "attendance_date"], columns: ["id", "gym_id", "entity_type", "member_id", "staff_account_id", "attendance_date", "check_in_at", "check_out_at", "source", "status", "notes", "created_at"] },
};

function getAdminId(req: AuthenticatedRequest, res: Response) {
  const adminId = req.admin?.id;
  if (!adminId) {
    res.status(401).json({ message: "Not authenticated" });
    return null;
  }
  return adminId;
}

function normalize(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function exportResourceCsv(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;
  const resource = Array.isArray(req.params.resource) ? req.params.resource[0] : req.params.resource;
  const config = CONFIG[resource];
  if (!config) return res.status(404).json({ message: "Unsupported export resource" });

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) return;

  let query = supabase.from(config.table).select(config.columns.join(",")).eq("admin_id", adminId);
  if (gymScope.selectedGymId) query = query.eq("gym_id", gymScope.selectedGymId);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return res.status(500).json({ message: error.message });

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${resource}.csv"`);
  return res.status(200).send(toCsv((data || []) as unknown as Record<string, unknown>[], config.columns));
}

export async function importResourceCsv(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;
  const resource = Array.isArray(req.params.resource) ? req.params.resource[0] : req.params.resource;
  const config = CONFIG[resource];
  if (!config?.importable) return res.status(404).json({ message: "Unsupported import resource" });

  const gymId = await resolveWriteGymId(req, res);
  if (!gymId) return;

  const csv = typeof req.body === "string" ? req.body : String((req as AuthenticatedRequest & { rawBody?: string }).rawBody || "");
  const rows = parseCsv(csv);
  if (rows.length === 0) return res.status(400).json({ message: "CSV has no rows" });

  let payload: Record<string, unknown>[];
  try {
    payload = rows.map((row, index) => {
    for (const field of config.required) {
      if (!normalize(String(row[field] || ""))) {
        throw new Error(`Row ${index + 2}: ${field} is required`);
      }
    }

    const record: Record<string, unknown> = { admin_id: adminId, gym_id: gymId };
    for (const column of config.columns) {
      if (["id", "admin_id", "gym_id", "created_at"].includes(column)) continue;
      if (row[column] !== undefined) record[column] = normalize(String(row[column]));
    }
    if (resource === "members" && record.is_active == null) record.is_active = true;
    if (resource === "enquiries" && !record.status) record.status = "new";
    if (resource === "payments") {
      record.type = record.type || "payment";
      record.amount = Number(record.amount || 0);
      record.transaction_date = record.transaction_date || new Date().toISOString().slice(0, 10);
    }
    if (resource === "attendance") {
      record.source = record.source || "import";
      record.status = record.status || "present";
    }
      return record;
    });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Invalid CSV" });
  }

  const { data, error } = await supabase.from(config.table).insert(payload).select("id");
  if (error) return res.status(500).json({ message: error.message });
  return res.status(201).json({ imported: data?.length || 0 });
}

export async function exportBackupJson(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) return;

  const backup: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    admin_id: adminId,
    selected_gym_id: gymScope.selectedGymId,
    tables: {},
  };

  for (const table of BACKUP_TABLES) {
    let query = supabase.from(table).select("*").eq("admin_id", adminId);
    if (gymScope.selectedGymId && table !== "gyms") query = query.eq("gym_id", gymScope.selectedGymId);
    if (gymScope.selectedGymId && table === "gyms") query = query.eq("id", gymScope.selectedGymId);

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ message: `Failed to export ${table}: ${error.message}` });
    }
    (backup.tables as Record<string, unknown>)[table] = data || [];
  }

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="gymos-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  return res.status(200).send(JSON.stringify(backup, null, 2));
}

export async function inspectBackupJson(req: AuthenticatedRequest, res: Response) {
  try {
    const { summary } = validateBackupPayload(req.body);
    return res.json({ summary });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Invalid backup" });
  }
}

export async function restoreBackupJson(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) return;

  let validated: ReturnType<typeof validateBackupPayload>;
  try {
    validated = validateBackupPayload(req.body);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Invalid backup" });
  }

  if (req.body?.confirm !== true) {
    return res.status(400).json({ message: "Set confirm=true to restore backup", summary: validated.summary });
  }

  const restored: Record<string, number> = {};
  for (const table of BACKUP_TABLES) {
    const rows = sanitizeBackupRows(validated.backup.tables?.[table], adminId, gymScope.selectedGymId);
    if (rows.length === 0) {
      restored[table] = 0;
      continue;
    }

    const { data, error } = await supabase.from(table).upsert(rows, { onConflict: "id" }).select("id");
    if (error) {
      return res.status(500).json({ message: `Failed to restore ${table}: ${error.message}`, restored });
    }
    restored[table] = data?.length || 0;
  }

  return res.json({ restored });
}
