import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/sessionAuth.middleware";
import { resolveGymScope, resolveWriteGymId } from "../services/gymScope.service";
import { supabase } from "../supabase";

function getAdminId(req: AuthenticatedRequest, res: Response) {
  const adminId = req.admin?.id;
  if (!adminId) {
    res.status(401).json({ message: "Not authenticated" });
    return null;
  }

  return adminId;
}

export async function listPlans(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) {
    return;
  }

  let query = supabase
    .from("package_types")
    .select("*")
    .eq("admin_id", adminId);

  if (gymScope.selectedGymId) {
    query = query.eq("gym_id", gymScope.selectedGymId);
  }

  const { data, error } = await query.order("created_at");

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.json(data);
}

export async function createPlan(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymId = await resolveWriteGymId(req, res);
  if (!gymId) {
    return;
  }

  const { name, duration_months, duration_days, price, description } = req.body;

  if (!name || price == null) {
    return res.status(400).json({ message: "name and price are required" });
  }

  const { data, error } = await supabase
    .from("package_types")
    .insert({
      admin_id: adminId,
      gym_id: gymId,
      name,
      duration_months: duration_months || null,
      duration_days: duration_days || null,
      price,
      description: description || null,
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.status(201).json(data);
}

export async function updatePlan(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) {
    return;
  }

  const { name, duration_months, duration_days, price, description, is_active } = req.body;

  const updatePayload: Record<string, any> = {};
  if (name !== undefined) updatePayload.name = name;
  if (price !== undefined) updatePayload.price = price;

  if (duration_months !== undefined) updatePayload.duration_months = duration_months;
  if (duration_days !== undefined) updatePayload.duration_days = duration_days;
  if (description !== undefined) updatePayload.description = description;
  if (is_active !== undefined) updatePayload.is_active = is_active;

  if (Object.keys(updatePayload).length === 0) {
    return res.status(400).json({ message: "No valid fields provided for update" });
  }

  let query = supabase
    .from("package_types")
    .update(updatePayload)
    .eq("id", req.params.id)
    .eq("admin_id", adminId);

  if (gymScope.selectedGymId) {
    query = query.eq("gym_id", gymScope.selectedGymId);
  }

  const { data, error } = await query.select().single();

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.json(data);
}

export async function deletePlan(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) {
    return;
  }

  let query = supabase.from("package_types").delete().eq("id", req.params.id).eq("admin_id", adminId);

  if (gymScope.selectedGymId) {
    query = query.eq("gym_id", gymScope.selectedGymId);
  }

  const { error } = await query;

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.status(204).send();
}
