import type { Request, Response } from "express";
import { supabase } from "../supabase";

export async function listBranches(req: Request, res: Response) {
  const admin_id = req.query.admin_id as string;

  let query = supabase.from("gyms").select("id, admin_id, gym_name, gym_type");
  if (admin_id) {
    query = query.eq("admin_id", admin_id);
  }

  const { data, error } = await query;
  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.json(data);
}
