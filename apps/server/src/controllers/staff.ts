import type { Response } from "express";

import type { AuthenticatedRequest } from "../middleware/sessionAuth.middleware";
import { logActivity } from "../services/activityLog.service";
import { countAdminUsage, getAdminSubscriptionSummary, getBillingLimit } from "../services/billing.service";
import { ensureGymBelongsToAdmin, resolveGymScope, resolveWriteGymId } from "../services/gymScope.service";
import { sendStaffAccountCreatedEmail } from "../services/email.service";
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

function normalizeSectionPermissions(value: unknown) {
  if (!Array.isArray(value)) {
    return ["members", "diet_plans", "exercise_plans"];
  }

  const permissions = value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
  return permissions.length > 0 ? permissions : ["members", "diet_plans", "exercise_plans"];
}

function normalizeOptionalNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric * 100) / 100 : 0;
}

export async function listStaff(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) {
    return;
  }

  let query = supabase
    .from("staff_accounts")
    .select("*")
    .eq("admin_id", adminId)
    .order("created_at", { ascending: false });

  if (gymScope.selectedGymId) {
    query = query.eq("gym_id", gymScope.selectedGymId);
  }

  const roleFilter = normalizeOptionalString(req.query.role);
  if (roleFilter) {
    query = query.eq("role", roleFilter);
  }

  const { data, error } = await query;
  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.json(data || []);
}

export async function createStaff(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymId = await resolveWriteGymId(req, res);
  if (!gymId) {
    return;
  }

  const fullName = normalizeOptionalString(req.body.full_name);
  const email = normalizeOptionalString(req.body.email);
  const password = normalizeOptionalString(req.body.password);
  const phone = normalizeOptionalString(req.body.phone);
  const specializations = normalizeOptionalString(req.body.specializations);
  const role = normalizeOptionalString(req.body.role) || "staff";
  const sectionPermissions = normalizeSectionPermissions(req.body.section_permissions);
  const externalUserCode = normalizeOptionalString(req.body.external_user_code);
  const compensationType = normalizeOptionalString(req.body.compensation_type) || "fixed";
  const baseSalary = normalizeOptionalNumber(req.body.base_salary);
  const perSessionRate = normalizeOptionalNumber(req.body.per_session_rate);
  const commissionPercent = normalizeOptionalNumber(req.body.commission_percent);

  if (!fullName || !email || !password) {
    return res.status(400).json({ message: "full_name, email, and password are required" });
  }

  try {
    const subscription = await getAdminSubscriptionSummary(adminId);
    const currentStaffCount = await countAdminUsage(adminId, "staff_accounts");
    if (currentStaffCount >= getBillingLimit(subscription, "max_staff_accounts")) {
      return res.status(403).json({ message: `Your current plan allows up to ${getBillingLimit(subscription, "max_staff_accounts")} staff accounts. Upgrade to add more.` });
    }
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to validate staff limit" });
  }

  const { data: gymRecord, error: gymError } = await supabase
    .from("gyms")
    .select("gym_name")
    .eq("id", gymId)
    .eq("admin_id", adminId)
    .single();

  if (gymError) {
    return res.status(500).json({ message: gymError.message });
  }

  const { data: authUserData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role,
      admin_id: adminId,
      gym_id: gymId,
    },
  });

  if (authError || !authUserData.user) {
    return res.status(500).json({ message: authError?.message || "Failed to create staff account" });
  }

  const { data, error } = await supabase
    .from("staff_accounts")
    .insert({
      admin_id: adminId,
      gym_id: gymId,
      auth_user_id: authUserData.user.id,
      role,
      full_name: fullName,
      email,
      phone,
      specializations,
      section_permissions: sectionPermissions,
      external_user_code: externalUserCode,
      compensation_type: compensationType,
      base_salary: baseSalary,
      per_session_rate: perSessionRate,
      commission_percent: commissionPercent,
    })
    .select("*")
    .single();

  if (error) {
    await supabase.auth.admin.deleteUser(authUserData.user.id).catch(() => {});
    return res.status(500).json({ message: error.message });
  }

  void sendStaffAccountCreatedEmail({
    to: email,
    fullName,
    gymName: gymRecord?.gym_name || "your gym",
    role,
  }).catch((emailError) => {
    console.error("Failed to send staff account email", emailError);
  });

  await logActivity(req, { action: "create", entityType: "staff_account", entityId: data.id, gymId, after: data });

  return res.status(201).json(data);
}

export async function updateStaff(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const updates: Record<string, unknown> = {};

  if (req.body.full_name !== undefined) updates.full_name = normalizeOptionalString(req.body.full_name);
  if (req.body.role !== undefined) updates.role = normalizeOptionalString(req.body.role) || "staff";
  if (req.body.phone !== undefined) updates.phone = normalizeOptionalString(req.body.phone);
  if (req.body.specializations !== undefined) updates.specializations = normalizeOptionalString(req.body.specializations);
  if (req.body.section_permissions !== undefined) updates.section_permissions = normalizeSectionPermissions(req.body.section_permissions);
  if (req.body.is_active !== undefined) updates.is_active = Boolean(req.body.is_active);
  if (req.body.external_user_code !== undefined) updates.external_user_code = normalizeOptionalString(req.body.external_user_code);
  if (req.body.compensation_type !== undefined) updates.compensation_type = normalizeOptionalString(req.body.compensation_type) || "fixed";
  if (req.body.base_salary !== undefined) updates.base_salary = normalizeOptionalNumber(req.body.base_salary);
  if (req.body.per_session_rate !== undefined) updates.per_session_rate = normalizeOptionalNumber(req.body.per_session_rate);
  if (req.body.commission_percent !== undefined) updates.commission_percent = normalizeOptionalNumber(req.body.commission_percent);

  if (req.body.gym_id !== undefined) {
    const gymId = normalizeOptionalString(req.body.gym_id);
    if (!gymId) {
      return res.status(400).json({ message: "gym_id cannot be empty" });
    }

    const belongsToAdmin = await ensureGymBelongsToAdmin(adminId, gymId).catch(() => false);
    if (!belongsToAdmin) {
      return res.status(403).json({ message: "Invalid gym" });
    }

    updates.gym_id = gymId;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: "No valid fields provided for update" });
  }

  updates.updated_at = new Date().toISOString();

  const existing = await supabase
    .from("staff_accounts")
    .select("*")
    .eq("id", req.params.id)
    .eq("admin_id", adminId)
    .maybeSingle();

  if (existing.error) {
    return res.status(500).json({ message: existing.error.message });
  }

  if (!existing.data) {
    return res.status(404).json({ message: "Staff member not found" });
  }

  const { data, error } = await supabase
    .from("staff_accounts")
    .update(updates)
    .eq("id", req.params.id)
    .eq("admin_id", adminId)
    .select("*")
    .single();

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  await logActivity(req, { action: "update", entityType: "staff_account", entityId: data.id, gymId: data.gym_id, before: existing.data, after: data });

  return res.json(data);
}

export async function deleteStaff(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const existing = await supabase
    .from("staff_accounts")
    .select("*")
    .eq("id", req.params.id)
    .eq("admin_id", adminId)
    .maybeSingle();

  if (existing.error) {
    return res.status(500).json({ message: existing.error.message });
  }

  if (!existing.data) {
    return res.status(404).json({ message: "Staff member not found" });
  }

  const { error } = await supabase
    .from("staff_accounts")
    .delete()
    .eq("id", req.params.id)
    .eq("admin_id", adminId);

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  if (existing.data.auth_user_id) {
    await supabase.auth.admin.deleteUser(existing.data.auth_user_id).catch(() => {});
  }

  await logActivity(req, { action: "delete", entityType: "staff_account", entityId: String(req.params.id), gymId: existing.data.gym_id, before: existing.data });

  return res.status(204).send();
}
