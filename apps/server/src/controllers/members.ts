import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/sessionAuth.middleware";
import { attachMemberPackages } from "../services/memberPackages.service";
import { ensureGymBelongsToAdmin, resolveGymScope } from "../services/gymScope.service";
import { supabase } from "../supabase";

function getAdminId(req: AuthenticatedRequest, res: Response) {
  const adminId = req.admin?.id;
  if (!adminId) {
    res.status(401).json({ message: "Not authenticated" });
    return null;
  }

  return adminId;
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

  return res.json(data);
}

export async function createMember(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymId = typeof req.admin?.gym_id === "string" ? req.admin.gym_id : null;
  const requestedGymId = typeof req.body.gym_id === "string"
    ? req.body.gym_id
    : typeof req.query.gym_id === "string"
      ? req.query.gym_id
      : gymId;

  if (!requestedGymId) {
    return res.status(400).json({ message: "gym_id is required" });
  }

  const belongsToAdmin = await ensureGymBelongsToAdmin(adminId, requestedGymId).catch((error) => {
    res.status(500).json({ message: error instanceof Error ? error.message : "Failed to validate gym" });
    return null;
  });

  if (belongsToAdmin === null) {
    return;
  }

  if (!belongsToAdmin) {
    return res.status(403).json({ message: "Invalid gym" });
  }

  const {
    name,
    email,
    phone,
    gender,
    date_of_birth,
    address,
    emergency_contact,
    shift,
    notes,
    reference_member_id,
  } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ message: "name and phone are required" });
  }

  const { data, error } = await supabase
    .from("members")
    .insert({
      name,
      email,
      phone,
      gender,
      date_of_birth,
      address,
      emergency_contact,
      shift,
      notes,
      reference_member_id,
      admin_id: adminId,
      gym_id: requestedGymId,
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ message: error.message });
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
    emergency_contact,
    reference_member_id,
    shift,
    notes,
    is_active,
    gym_id,
  } = req.body;

  if (gym_id && !(await ensureGymBelongsToAdmin(adminId, gym_id).catch(() => false))) {
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
      address,
      emergency_contact,
      reference_member_id,
      shift,
      notes,
      is_active,
      gym_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", req.params.id)
    .eq("admin_id", adminId)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ message: error.message });
  }

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

  return res.status(204).send();
}
