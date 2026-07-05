import type { Request, Response } from "express";
import { supabase } from "../supabase";

export async function listPlans(req: Request, res: Response) {
  const admin_id = req.query.admin_id as string;
  if (!admin_id) {
    return res.status(400).json({ message: "admin_id is required" });
  }

  const { data, error } = await supabase
    .from("package_types")
    .select("*")
    .eq("admin_id", admin_id)
    .order("created_at");

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.json(data);
}

export async function createPlan(req: Request, res: Response) {
  const { admin_id, name, duration_months, duration_days, price, description } = req.body;

  if (!admin_id || !name || price == null) {
    return res.status(400).json({ message: "admin_id, name, and price are required" });
  }

  const { data, error } = await supabase
    .from("package_types")
    .insert({
      admin_id,
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

export async function updatePlan(req: Request, res: Response) {
  const { name, duration_months, duration_days, price, description, is_active } = req.body;

  const { data, error } = await supabase
    .from("package_types")
    .update({
      name,
      duration_months: duration_months || null,
      duration_days: duration_days || null,
      price,
      description: description || null,
      is_active,
    })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.json(data);
}

export async function deletePlan(req: Request, res: Response) {
  const { error } = await supabase.from("package_types").delete().eq("id", req.params.id);

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.status(204).send();
}
