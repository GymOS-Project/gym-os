import { supabase } from "../supabase";

function toAmount(value: unknown) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? Math.round(numeric * 100) / 100 : 0;
}

export async function buildPayrollEntriesForRun(params: {
  adminId: string;
  gymId: string;
  payrollRunId: string;
}) {
  const { adminId, gymId, payrollRunId } = params;
  const { data: staffRecords, error } = await supabase
    .from("staff_accounts")
    .select("id, compensation_type, base_salary, per_session_rate, commission_percent")
    .eq("admin_id", adminId)
    .eq("gym_id", gymId)
    .eq("is_active", true);

  if (error) {
    throw new Error(error.message);
  }

  const entries = (staffRecords || []).map((staff) => {
    const compensationType = typeof staff.compensation_type === "string" ? staff.compensation_type : "fixed";
    const baseAmount = toAmount(staff.base_salary);
    const sessionRate = toAmount(staff.per_session_rate);
    const commissionPercent = toAmount(staff.commission_percent);
    const netAmount = compensationType === "per_session" ? 0 : baseAmount;

    return {
      admin_id: adminId,
      gym_id: gymId,
      payroll_run_id: payrollRunId,
      staff_id: String(staff.id),
      compensation_type: compensationType,
      base_amount: baseAmount,
      session_count: 0,
      session_rate: sessionRate,
      commission_percent: commissionPercent,
      commission_amount: 0,
      bonus_amount: 0,
      deductions: 0,
      net_amount: netAmount,
    };
  });

  if (entries.length === 0) {
    return [];
  }

  const insert = await supabase.from("payroll_entries").insert(entries).select("*");
  if (insert.error) {
    throw new Error(insert.error.message);
  }

  return insert.data || [];
}

export function calculatePayrollNet(params: {
  compensationType: string;
  baseAmount: number;
  sessionCount: number;
  sessionRate: number;
  commissionAmount: number;
  bonusAmount: number;
  deductions: number;
}) {
  const earned = params.compensationType === "per_session"
    ? params.sessionCount * params.sessionRate
    : params.baseAmount;
  return Math.round((earned + params.commissionAmount + params.bonusAmount - params.deductions) * 100) / 100;
}
