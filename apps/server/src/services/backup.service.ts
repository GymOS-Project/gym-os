export const BACKUP_TABLES = [
  "gyms",
  "members",
  "member_packages",
  "package_types",
  "transactions",
  "enquiries",
  "enquiry_followups",
  "followups",
  "attendance_logs",
  "invoices",
  "staff_accounts",
  "shifts",
  "class_sessions",
  "class_bookings",
  "pt_sessions",
  "payroll_runs",
  "payroll_entries",
  "reviews",
  "activity_logs",
  "notification_deliveries",
] as const;

export type BackupTable = (typeof BACKUP_TABLES)[number];

export type BackupPayload = {
  exported_at?: string;
  admin_id?: string;
  selected_gym_id?: string | null;
  tables?: Record<string, unknown>;
};

export function parseBackupPayload(input: unknown): BackupPayload {
  if (typeof input === "string") {
    try {
      return JSON.parse(input) as BackupPayload;
    } catch {
      throw new Error("Invalid backup JSON");
    }
  }

  if (!input || typeof input !== "object") {
    throw new Error("Invalid backup payload");
  }

  return input as BackupPayload;
}

export function validateBackupPayload(input: unknown) {
  const backup = parseBackupPayload(input);
  if (!backup.tables || typeof backup.tables !== "object") {
    throw new Error("Backup payload must include a tables object");
  }

  const summary: Record<string, number> = {};
  for (const table of BACKUP_TABLES) {
    const rows = backup.tables[table];
    if (rows === undefined) {
      summary[table] = 0;
      continue;
    }
    if (!Array.isArray(rows)) {
      throw new Error(`Backup table ${table} must be an array`);
    }
    summary[table] = rows.length;
  }

  return { backup, summary };
}

export function sanitizeBackupRows(rows: unknown, adminId: string, selectedGymId?: string | null) {
  if (!Array.isArray(rows)) return [];

  return rows
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object" && !Array.isArray(row))
    .filter((row) => !selectedGymId || row.gym_id === selectedGymId || row.id === selectedGymId || row.gym_id == null)
    .map((row) => ({ ...row, admin_id: adminId }));
}
