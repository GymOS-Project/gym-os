import type { Response } from "express";

import type { AuthenticatedRequest } from "../middleware/sessionAuth.middleware";
import { ensureGymBelongsToAdmin, resolveGymScope, resolveWriteGymId } from "../services/gymScope.service";
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
  const role = normalizeOptionalString(req.body.role) || "trainer";
  const sectionPermissions = normalizeSectionPermissions(req.body.section_permissions);

  if (role !== "trainer") {
    return res.status(400).json({ message: "Only trainer role is supported right now" });
  }

  if (!fullName || !email || !password) {
    return res.status(400).json({ message: "full_name, email, and password are required" });
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
    return res.status(500).json({ message: authError?.message || "Failed to create trainer account" });
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
    })
    .select("*")
    .single();

  if (error) {
    await supabase.auth.admin.deleteUser(authUserData.user.id).catch(() => {});
    return res.status(500).json({ message: error.message });
  }

  return res.status(201).json(data);
}

export async function updateStaff(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const updates: Record<string, unknown> = {};

  if (req.body.full_name !== undefined) updates.full_name = normalizeOptionalString(req.body.full_name);
  if (req.body.phone !== undefined) updates.phone = normalizeOptionalString(req.body.phone);
  if (req.body.specializations !== undefined) updates.specializations = normalizeOptionalString(req.body.specializations);
  if (req.body.section_permissions !== undefined) updates.section_permissions = normalizeSectionPermissions(req.body.section_permissions);
  if (req.body.is_active !== undefined) updates.is_active = Boolean(req.body.is_active);

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

  return res.json(data);
}
