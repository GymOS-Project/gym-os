import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/sessionAuth.middleware";
import { attachMemberPackages } from "../services/memberPackages.service";
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

  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("admin_id", adminId)
    .order("created_at", { ascending: false });
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

  const { data, error } = await supabase
    .from("members")
    .select("id, name, phone")
    .eq("admin_id", adminId)
    .eq("is_active", true);

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

  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("id", req.params.id)
    .eq("admin_id", adminId)
    .maybeSingle();

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
  if (!gymId) {
    return res.status(400).json({ message: "Admin is not linked to a gym" });
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
      gym_id: gymId,
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
  } = req.body;

  const { data: existing } = await supabase
    .from("members")
    .select("id")
    .eq("id", req.params.id)
    .eq("admin_id", adminId)
    .maybeSingle();

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

  const { data: existing } = await supabase
    .from("members")
    .select("id")
    .eq("id", req.params.id)
    .eq("admin_id", adminId)
    .maybeSingle();

  if (!existing) {
    return res.status(404).json({ message: "Member not found" });
  }

  const { error } = await supabase.from("members").delete().eq("id", req.params.id).eq("admin_id", adminId);
  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.status(204).send();
}
