import type { Response } from "express";

import type { AuthenticatedRequest } from "../middleware/sessionAuth.middleware";
import { logActivity } from "../services/activityLog.service";
import { resolveGymScope, resolveWriteGymId } from "../services/gymScope.service";
import { buildPayrollEntriesForRun, calculatePayrollNet } from "../services/payroll.service";
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
  return Number.isFinite(numeric) ? Math.round(numeric * 100) / 100 : null;
}

export async function listPayrollRuns(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) return;

  let query = supabase.from("payroll_runs").select("*").eq("admin_id", adminId).order("period_start", { ascending: false });
  if (gymScope.selectedGymId) query = query.eq("gym_id", gymScope.selectedGymId);

  const { data, error } = await query;
  if (error) return res.status(500).json({ message: error.message });
  return res.json(data || []);
}

export async function createPayrollRun(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;
  const gymId = await resolveWriteGymId(req, res);
  if (!gymId) return;

  const title = normalizeOptionalString(req.body.title);
  const periodStart = normalizeOptionalString(req.body.period_start);
  const periodEnd = normalizeOptionalString(req.body.period_end);
  if (!title || !periodStart || !periodEnd) {
    return res.status(400).json({ message: "title, period_start, and period_end are required" });
  }

  const insert = await supabase
    .from("payroll_runs")
    .insert({
      admin_id: adminId,
      gym_id: gymId,
      title,
      period_start: periodStart,
      period_end: periodEnd,
      status: normalizeOptionalString(req.body.status) || "draft",
      notes: normalizeOptionalString(req.body.notes),
    })
    .select("*")
    .single();

  if (insert.error) return res.status(500).json({ message: insert.error.message });

  const entries = await buildPayrollEntriesForRun({ adminId, gymId, payrollRunId: insert.data.id }).catch((error) => {
    res.status(500).json({ message: error instanceof Error ? error.message : "Failed to build payroll entries" });
    return null;
  });
  if (entries === null) return;

  await logActivity(req, { action: "create", entityType: "payroll_run", entityId: insert.data.id, gymId, after: { ...insert.data, generated_entries: entries.length } });
  return res.status(201).json({ run: insert.data, entries });
}

export async function listPayrollEntries(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const { data, error } = await supabase
    .from("payroll_entries")
    .select("*")
    .eq("admin_id", adminId)
    .eq("payroll_run_id", req.params.id)
    .order("created_at", { ascending: true });

  if (error) return res.status(500).json({ message: error.message });
  return res.json(data || []);
}

export async function updatePayrollEntry(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const existing = await supabase.from("payroll_entries").select("*").eq("id", req.params.id).eq("admin_id", adminId).maybeSingle();
  if (existing.error) return res.status(500).json({ message: existing.error.message });
  if (!existing.data) return res.status(404).json({ message: "Payroll entry not found" });

  const compensationType = normalizeOptionalString(req.body.compensation_type) || existing.data.compensation_type;
  const baseAmount = req.body.base_amount !== undefined ? normalizeOptionalNumber(req.body.base_amount) || 0 : Number(existing.data.base_amount || 0);
  const sessionCount = req.body.session_count !== undefined ? Number(req.body.session_count || 0) : Number(existing.data.session_count || 0);
  const sessionRate = req.body.session_rate !== undefined ? normalizeOptionalNumber(req.body.session_rate) || 0 : Number(existing.data.session_rate || 0);
  const commissionAmount = req.body.commission_amount !== undefined ? normalizeOptionalNumber(req.body.commission_amount) || 0 : Number(existing.data.commission_amount || 0);
  const bonusAmount = req.body.bonus_amount !== undefined ? normalizeOptionalNumber(req.body.bonus_amount) || 0 : Number(existing.data.bonus_amount || 0);
  const deductions = req.body.deductions !== undefined ? normalizeOptionalNumber(req.body.deductions) || 0 : Number(existing.data.deductions || 0);

  const update = await supabase
    .from("payroll_entries")
    .update({
      compensation_type: compensationType,
      base_amount: baseAmount,
      session_count: sessionCount,
      session_rate: sessionRate,
      commission_percent: req.body.commission_percent !== undefined ? normalizeOptionalNumber(req.body.commission_percent) || 0 : existing.data.commission_percent,
      commission_amount: commissionAmount,
      bonus_amount: bonusAmount,
      deductions,
      net_amount: calculatePayrollNet({ compensationType, baseAmount, sessionCount, sessionRate, commissionAmount, bonusAmount, deductions }),
      notes: req.body.notes !== undefined ? normalizeOptionalString(req.body.notes) : existing.data.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", req.params.id)
    .eq("admin_id", adminId)
    .select("*")
    .single();

  if (update.error) return res.status(500).json({ message: update.error.message });
  await logActivity(req, { action: "update", entityType: "payroll_entry", entityId: update.data.id, gymId: update.data.gym_id, before: existing.data, after: update.data });
  return res.json(update.data);
}

export async function deletePayrollRun(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const existing = await supabase.from("payroll_runs").select("*").eq("id", req.params.id).eq("admin_id", adminId).maybeSingle();
  if (existing.error) return res.status(500).json({ message: existing.error.message });
  if (!existing.data) return res.status(404).json({ message: "Payroll run not found" });

  const { error } = await supabase.from("payroll_runs").delete().eq("id", req.params.id).eq("admin_id", adminId);
  if (error) return res.status(500).json({ message: error.message });
  await logActivity(req, { action: "delete", entityType: "payroll_run", entityId: String(req.params.id), gymId: existing.data.gym_id, before: existing.data });
  return res.status(204).send();
}
