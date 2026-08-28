import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/sessionAuth.middleware";
import { logActivity } from "../services/activityLog.service";
import { countAdminUsage, getAdminSubscriptionSummary, getBillingLimit } from "../services/billing.service";
import { sendMemberWelcomeEmail } from "../services/email.service";
import { queueEsslUserInfoForGymDevices } from "../services/esslDeviceCommands.service";
import { attachMemberPackages } from "../services/memberPackages.service";
import { hasOwn, hasPlanContentInput, normalizeOptionalString, resolvePlanContentFields, type PlanTable } from "../services/planContent.service";
import { ensureGymBelongsToAdmin, resolveGymScope, resolveWriteGymId } from "../services/gymScope.service";
import { supabase } from "../supabase";

type AssignmentTable = "member_diet_plan_assignments" | "member_exercise_plan_assignments";

function getAdminId(req: AuthenticatedRequest, res: Response) {
  const adminId = req.admin?.id;
  if (!adminId) {
    res.status(401).json({ message: "Not authenticated" });
    return null;
  }

  return adminId;
}

function normalizeBoolean(value: unknown) {
  return value === true || value === "true" || value === "1" || value === 1;
}

async function generateNextDeviceUserCode(adminId: string, gymId: string) {
  const [memberResult, staffResult] = await Promise.all([
    supabase
      .from("members")
      .select("external_user_code")
      .eq("admin_id", adminId)
      .eq("gym_id", gymId)
      .not("external_user_code", "is", null),
    supabase
      .from("staff_accounts")
      .select("external_user_code")
      .eq("admin_id", adminId)
      .eq("gym_id", gymId)
      .not("external_user_code", "is", null),
  ]);

  if (memberResult.error) throw new Error(memberResult.error.message);
  if (staffResult.error) throw new Error(staffResult.error.message);

  const maxCode = [...(memberResult.data || []), ...(staffResult.data || [])]
    .map((entry) => Number(String(entry.external_user_code || "").trim()))
    .filter((value) => Number.isInteger(value) && value > 0)
    .reduce((max, value) => Math.max(max, value), 1000);

  return String(maxCode + 1);
}

async function getScopedMember(
  adminId: string,
  memberId: string,
  selectedGymId: string | null,
) {
  let query = supabase
    .from("members")
    .select("*")
    .eq("id", memberId)
    .eq("admin_id", adminId);

  if (selectedGymId) {
    query = query.eq("gym_id", selectedGymId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function loadPlanAssignments(
  adminId: string,
  memberId: string,
  assignmentTable: AssignmentTable,
  planTable: PlanTable,
  foreignKey: "diet_plan_id" | "exercise_plan_id",
) {
  const { data: assignments, error: assignmentError } = await supabase
    .from(assignmentTable)
    .select("*")
    .eq("admin_id", adminId)
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });

  if (assignmentError) {
    throw new Error(assignmentError.message);
  }

  const planIds = (assignments || [])
    .map((assignment) => assignment[foreignKey] as string | null)
    .filter((planId): planId is string => Boolean(planId));

  if (planIds.length === 0) {
    return [];
  }

  const { data: plans, error: planError } = await supabase
    .from(planTable)
    .select("*")
    .eq("admin_id", adminId)
    .in("id", planIds);

  if (planError) {
    throw new Error(planError.message);
  }

  const planMap = new Map((plans || []).map((plan) => [plan.id as string, plan]));

  return (assignments || []).map((assignment) => ({
    ...assignment,
    plan: planMap.get(assignment[foreignKey] as string) || null,
  }));
}

async function attachMemberPlans<T extends { id: string }>(member: T, adminId: string) {
  const [dietPlanAssignments, exercisePlanAssignments] = await Promise.all([
    loadPlanAssignments(adminId, member.id, "member_diet_plan_assignments", "diet_plans", "diet_plan_id"),
    loadPlanAssignments(adminId, member.id, "member_exercise_plan_assignments", "exercise_plans", "exercise_plan_id"),
  ]);

  return {
    ...member,
    diet_plan_assignments: dietPlanAssignments,
    exercise_plan_assignments: exercisePlanAssignments,
  };
}

async function assignPlanToMember(
  req: AuthenticatedRequest,
  res: Response,
  assignmentTable: AssignmentTable,
  planTable: PlanTable,
  foreignKey: "diet_plan_id" | "exercise_plan_id",
) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) {
    return;
  }

  const member = await getScopedMember(adminId, String(req.params.id), gymScope.selectedGymId).catch((error) => {
    res.status(500).json({ message: error instanceof Error ? error.message : "Failed to load member" });
    return null;
  });

  if (member === null) {
    return;
  }

  if (!member) {
    return res.status(404).json({ message: "Member not found" });
  }

  const planId = typeof req.body.plan_id === "string" ? req.body.plan_id : null;
  if (!planId) {
    return res.status(400).json({ message: "plan_id is required" });
  }

  const { data: plan, error: planError } = await supabase
    .from(planTable)
    .select("id, gym_id, plan_scope, is_active")
    .eq("id", planId)
    .eq("admin_id", adminId)
    .maybeSingle();

  if (planError) {
    return res.status(500).json({ message: planError.message });
  }

  if (!plan || plan.gym_id !== member.gym_id) {
    return res.status(400).json({ message: "Selected plan does not belong to this member's gym" });
  }

  if (plan.plan_scope !== "shared") {
    return res.status(400).json({ message: "Only shared templates can be assigned" });
  }

  if (!plan.is_active) {
    return res.status(400).json({ message: "Only active plans can be assigned" });
  }

  const { data, error } = await supabase
    .from(assignmentTable)
    .insert({
      admin_id: adminId,
      gym_id: member.gym_id,
      member_id: member.id,
      [foreignKey]: planId,
      assigned_by_staff_id: req.staff?.id || null,
    })
    .select("*")
    .single();

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  const assignments = await loadPlanAssignments(adminId, member.id, assignmentTable, planTable, foreignKey).catch((loadError) => {
    res.status(500).json({ message: loadError instanceof Error ? loadError.message : "Failed to load assignments" });
    return null;
  });

  if (assignments === null) {
    return;
  }

  const updated = assignments.find((assignment) => assignment.id === data.id) || data;
  return res.status(201).json(updated);
}

async function updateAssignedPlan(
  req: AuthenticatedRequest,
  res: Response,
  assignmentTable: AssignmentTable,
  planTable: PlanTable,
  foreignKey: "diet_plan_id" | "exercise_plan_id",
) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) {
    return;
  }

  const member = await getScopedMember(adminId, String(req.params.id), gymScope.selectedGymId).catch((error) => {
    res.status(500).json({ message: error instanceof Error ? error.message : "Failed to load member" });
    return null;
  });

  if (member === null) {
    return;
  }

  if (!member) {
    return res.status(404).json({ message: "Member not found" });
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from(assignmentTable)
    .select("*")
    .eq("id", req.params.assignmentId)
    .eq("admin_id", adminId)
    .eq("member_id", member.id)
    .maybeSingle();

  if (assignmentError) {
    return res.status(500).json({ message: assignmentError.message });
  }

  if (!assignment) {
    return res.status(404).json({ message: "Assigned plan not found" });
  }

  const currentPlanId = assignment[foreignKey] as string;
  const { data: currentPlan, error: currentPlanError } = await supabase
    .from(planTable)
    .select("*")
    .eq("id", currentPlanId)
    .eq("admin_id", adminId)
    .maybeSingle();

  if (currentPlanError) {
    return res.status(500).json({ message: currentPlanError.message });
  }

  if (!currentPlan) {
    return res.status(404).json({ message: "Plan not found" });
  }

  const updates = {
    name: hasOwn(req.body as Record<string, unknown>, "name") ? normalizeOptionalString(req.body.name) : currentPlan.name,
    description: hasOwn(req.body as Record<string, unknown>, "description") ? normalizeOptionalString(req.body.description) : currentPlan.description,
    tag: hasOwn(req.body as Record<string, unknown>, "tag") ? normalizeOptionalString(req.body.tag) : currentPlan.tag,
  };

  const body = req.body as Record<string, unknown>;
  let contentFields = {
    content_type: currentPlan.content_type,
    content: currentPlan.content,
    pdf_url: currentPlan.pdf_url,
    pdf_file_name: currentPlan.pdf_file_name,
  };

  if (hasPlanContentInput(body, req.file)) {
    try {
      contentFields = await resolvePlanContentFields({
        adminId,
        gymId: member.gym_id,
        table: planTable,
        body,
        file: req.file,
        existing: currentPlan,
      });
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : "Invalid plan content" });
    }
  }

  let resolvedPlanId = currentPlan.id as string;

  if (currentPlan.plan_scope === "member_custom" && currentPlan.member_id === member.id) {
    const { error } = await supabase
      .from(planTable)
        .update({
          ...updates,
          ...contentFields,
          updated_at: new Date().toISOString(),
        })
      .eq("id", currentPlan.id)
      .eq("admin_id", adminId);

    if (error) {
      return res.status(500).json({ message: error.message });
    }
  } else {
    const { data: clonedPlan, error: cloneError } = await supabase
      .from(planTable)
        .insert({
          admin_id: adminId,
          gym_id: member.gym_id,
          member_id: member.id,
          source_plan_id: currentPlan.source_plan_id || currentPlan.id,
          created_by_type: req.sessionRole === "staff" ? "staff" : "admin",
          created_by_staff_id: req.staff?.id || null,
          plan_scope: "member_custom",
          is_active: true,
          ...updates,
          ...contentFields,
        })
        .select("*")
        .single();

    if (cloneError || !clonedPlan) {
      return res.status(500).json({ message: cloneError?.message || "Failed to clone plan" });
    }

    resolvedPlanId = clonedPlan.id;

    const { error: assignmentUpdateError } = await supabase
      .from(assignmentTable)
      .update({
        [foreignKey]: resolvedPlanId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", assignment.id)
      .eq("admin_id", adminId);

    if (assignmentUpdateError) {
      return res.status(500).json({ message: assignmentUpdateError.message });
    }
  }

  const assignments = await loadPlanAssignments(adminId, member.id, assignmentTable, planTable, foreignKey).catch((loadError) => {
    res.status(500).json({ message: loadError instanceof Error ? loadError.message : "Failed to load assignments" });
    return null;
  });

  if (assignments === null) {
    return;
  }

  const updatedAssignment = assignments.find((item) => item.id === assignment.id && item[foreignKey] === resolvedPlanId)
    || assignments.find((item) => item.id === assignment.id)
    || null;

  return res.json(updatedAssignment);
}

async function deleteAssignedPlan(
  req: AuthenticatedRequest,
  res: Response,
  assignmentTable: AssignmentTable,
  planTable: PlanTable,
  foreignKey: "diet_plan_id" | "exercise_plan_id",
) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) {
    return;
  }

  const member = await getScopedMember(adminId, String(req.params.id), gymScope.selectedGymId).catch((error) => {
    res.status(500).json({ message: error instanceof Error ? error.message : "Failed to load member" });
    return null;
  });

  if (member === null) {
    return;
  }

  if (!member) {
    return res.status(404).json({ message: "Member not found" });
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from(assignmentTable)
    .select("*")
    .eq("id", req.params.assignmentId)
    .eq("admin_id", adminId)
    .eq("member_id", member.id)
    .maybeSingle();

  if (assignmentError) {
    return res.status(500).json({ message: assignmentError.message });
  }

  if (!assignment) {
    return res.status(404).json({ message: "Assigned plan not found" });
  }

  const planId = assignment[foreignKey] as string;

  const { data: plan } = await supabase
    .from(planTable)
    .select("id, member_id, plan_scope")
    .eq("id", planId)
    .eq("admin_id", adminId)
    .maybeSingle();

  const { error } = await supabase
    .from(assignmentTable)
    .delete()
    .eq("id", assignment.id)
    .eq("admin_id", adminId);

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  if (plan?.plan_scope === "member_custom" && plan.member_id === member.id) {
    await supabase.from(planTable).delete().eq("id", planId).eq("admin_id", adminId);
  }

  return res.status(204).send();
}

export async function listMembers(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) {
    return;
  }

  let query = supabase
    .from("members")
    .select("*")
    .eq("admin_id", adminId);

  if (gymScope.selectedGymId) {
    query = query.eq("gym_id", gymScope.selectedGymId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) {
    return res.status(500).json({ message: error.message });
  }

  try {
    return res.json(await attachMemberPackages(data || [], adminId));
  } catch (attachError) {
    return res.status(500).json({ message: attachError instanceof Error ? attachError.message : "Failed to load members" });
  }
}

export async function listActiveMembers(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) {
    return;
  }

  let query = supabase
    .from("members")
    .select("id, name, phone, gym_id")
    .eq("admin_id", adminId)
    .eq("is_active", true);

  if (gymScope.selectedGymId) {
    query = query.eq("gym_id", gymScope.selectedGymId);
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.json(data);
}

export async function getMember(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) {
    return;
  }

  let query = supabase
    .from("members")
    .select("*")
    .eq("id", req.params.id)
    .eq("admin_id", adminId);

  if (gymScope.selectedGymId) {
    query = query.eq("gym_id", gymScope.selectedGymId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    return res.status(500).json({ message: error.message });
  }
  if (!data) {
    return res.status(404).json({ message: "Member not found" });
  }

  try {
    return res.json(await attachMemberPlans(data, adminId));
  } catch (attachError) {
    return res.status(500).json({ message: attachError instanceof Error ? attachError.message : "Failed to load member" });
  }
}

export async function createMember(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const requestedGymId = await resolveWriteGymId(req, res);
  if (!requestedGymId) {
    return;
  }

  const {
    name,
    email,
    phone,
    gender,
    date_of_birth,
    address,
    current_address,
    permanent_address,
    emergency_contact,
    aadhar_card_no,
    driving_license_no,
    pan_card_no,
    marital_status,
    shift,
    notes,
    reference_member_id,
    external_user_code,
    create_device_user,
  } = req.body;

  const resolvedCurrentAddress = normalizeOptionalString(current_address ?? address);
  const shouldCreateDeviceUser = normalizeBoolean(create_device_user);

  if (!name || !phone) {
    return res.status(400).json({ message: "name and phone are required" });
  }

  try {
    const subscription = await getAdminSubscriptionSummary(adminId);
    const currentMemberCount = await countAdminUsage(adminId, "members");
    if (currentMemberCount >= getBillingLimit(subscription, "max_active_members")) {
      return res.status(403).json({ message: `Your current plan allows up to ${getBillingLimit(subscription, "max_active_members")} members. Upgrade to add more.` });
    }
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to validate member limit" });
  }

  const { data: gymRecord, error: gymError } = await supabase
    .from("gyms")
    .select("gym_name")
    .eq("id", requestedGymId)
    .eq("admin_id", adminId)
    .single();

  if (gymError) {
    return res.status(500).json({ message: gymError.message });
  }

  let deviceUserCode = normalizeOptionalString(external_user_code);

  if (shouldCreateDeviceUser && !deviceUserCode) {
    try {
      deviceUserCode = await generateNextDeviceUserCode(adminId, requestedGymId);
    } catch (error) {
      return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to generate device user code" });
    }
  }

  const { data, error } = await supabase
    .from("members")
    .insert({
      name,
      email,
      phone,
      gender,
      date_of_birth,
      address: resolvedCurrentAddress,
      current_address: resolvedCurrentAddress,
      permanent_address: normalizeOptionalString(permanent_address),
      emergency_contact,
      aadhar_card_no: normalizeOptionalString(aadhar_card_no),
      driving_license_no: normalizeOptionalString(driving_license_no),
      pan_card_no: normalizeOptionalString(pan_card_no),
      marital_status: normalizeOptionalString(marital_status),
      shift,
      notes,
      reference_member_id,
      external_user_code: deviceUserCode,
      admin_id: adminId,
      gym_id: requestedGymId,
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  const memberEmail = normalizeOptionalString(email);
  if (memberEmail) {
    void sendMemberWelcomeEmail({
      to: memberEmail,
      fullName: String(name),
      gymName: gymRecord?.gym_name || "your gym",
    }).catch((emailError) => {
      console.error("Failed to send member welcome email", emailError);
    });
  }

  await logActivity(req, { action: "create", entityType: "member", entityId: data.id, gymId: requestedGymId, after: data });

  if (shouldCreateDeviceUser && deviceUserCode) {
    try {
      const queuedCommands = await queueEsslUserInfoForGymDevices({
        adminId,
        gymId: requestedGymId,
        pin: deviceUserCode,
        name: String(name),
      });

      if (queuedCommands.length > 0) {
        await logActivity(req, {
          action: "create",
          entityType: "essl_device_command",
          entityId: data.id,
          gymId: requestedGymId,
          after: { member_id: data.id, external_user_code: deviceUserCode, queued_count: queuedCommands.length },
        });
      }
    } catch (commandError) {
      return res.status(201).json({
        ...data,
        device_sync_warning: commandError instanceof Error ? commandError.message : "Member created, but device command could not be queued",
      });
    }
  }

  return res.status(201).json(data);
}

export async function updateMember(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) {
    return;
  }

  const {
    name,
    email,
    phone,
    gender,
    date_of_birth,
    address,
    current_address,
    permanent_address,
    emergency_contact,
    aadhar_card_no,
    driving_license_no,
    pan_card_no,
    marital_status,
    reference_member_id,
    shift,
    notes,
    is_active,
    gym_id,
    external_user_code,
  } = req.body;

  const resolvedCurrentAddress = current_address !== undefined || address !== undefined
    ? normalizeOptionalString(current_address ?? address)
    : undefined;

  if (gym_id && !(await ensureGymBelongsToAdmin(adminId, gym_id).catch(() => false))) {
    return res.status(403).json({ message: "Invalid gym" });
  }

  if (req.sessionRole === "staff" && gym_id && gym_id !== req.staff?.gym_id) {
    return res.status(403).json({ message: "Invalid gym" });
  }

  let existingQuery = supabase
    .from("members")
    .select("id")
    .eq("id", req.params.id)
    .eq("admin_id", adminId);

  if (gymScope.selectedGymId) {
    existingQuery = existingQuery.eq("gym_id", gymScope.selectedGymId);
  }

  const { data: existing } = await existingQuery.maybeSingle();

  if (!existing) {
    return res.status(404).json({ message: "Member not found" });
  }

  const { data, error } = await supabase
    .from("members")
    .update({
      name,
      email,
      phone,
      gender,
      date_of_birth,
      address: resolvedCurrentAddress,
      current_address: resolvedCurrentAddress,
      permanent_address,
      emergency_contact,
      aadhar_card_no,
      driving_license_no,
      pan_card_no,
      marital_status,
      reference_member_id,
        shift,
        notes,
        is_active,
        gym_id,
        external_user_code: normalizeOptionalString(external_user_code),
        updated_at: new Date().toISOString(),
      })
    .eq("id", req.params.id)
    .eq("admin_id", adminId)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  await logActivity(req, { action: "update", entityType: "member", entityId: data.id, gymId: data.gym_id, before: existing, after: data });

  return res.json(data);
}

export async function deleteMember(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) {
    return;
  }

  let existingQuery = supabase
    .from("members")
    .select("id")
    .eq("id", req.params.id)
    .eq("admin_id", adminId);

  if (gymScope.selectedGymId) {
    existingQuery = existingQuery.eq("gym_id", gymScope.selectedGymId);
  }

  const { data: existing } = await existingQuery.maybeSingle();

  if (!existing) {
    return res.status(404).json({ message: "Member not found" });
  }

  let deleteQuery = supabase.from("members").delete().eq("id", req.params.id).eq("admin_id", adminId);
  if (gymScope.selectedGymId) {
    deleteQuery = deleteQuery.eq("gym_id", gymScope.selectedGymId);
  }

  const { error } = await deleteQuery;
  if (error) {
    return res.status(500).json({ message: error.message });
  }

  await logActivity(req, { action: "delete", entityType: "member", entityId: String(req.params.id), before: existing });

  return res.status(204).send();
}

export async function assignDietPlan(req: AuthenticatedRequest, res: Response) {
  return assignPlanToMember(req, res, "member_diet_plan_assignments", "diet_plans", "diet_plan_id");
}

export async function updateAssignedDietPlan(req: AuthenticatedRequest, res: Response) {
  return updateAssignedPlan(req, res, "member_diet_plan_assignments", "diet_plans", "diet_plan_id");
}

export async function deleteAssignedDietPlan(req: AuthenticatedRequest, res: Response) {
  return deleteAssignedPlan(req, res, "member_diet_plan_assignments", "diet_plans", "diet_plan_id");
}

export async function assignExercisePlan(req: AuthenticatedRequest, res: Response) {
  return assignPlanToMember(req, res, "member_exercise_plan_assignments", "exercise_plans", "exercise_plan_id");
}

export async function updateAssignedExercisePlan(req: AuthenticatedRequest, res: Response) {
  return updateAssignedPlan(req, res, "member_exercise_plan_assignments", "exercise_plans", "exercise_plan_id");
}

export async function deleteAssignedExercisePlan(req: AuthenticatedRequest, res: Response) {
  return deleteAssignedPlan(req, res, "member_exercise_plan_assignments", "exercise_plans", "exercise_plan_id");
}
