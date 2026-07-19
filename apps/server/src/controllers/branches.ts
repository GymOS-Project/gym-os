import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/sessionAuth.middleware";
import { supabase } from "../supabase";

export async function listBranches(req: AuthenticatedRequest, res: Response) {
  const adminId = req.admin?.id;
  if (!adminId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const query = supabase
    .from("gyms")
    .select("id, admin_id, gym_name, gym_type, owner_name, phone, email, website, instagram_page, address, business_registration_name, owner_email, gym_photo_url, gym_photo_urls, logo_url, created_at, updated_at")
    .eq("admin_id", adminId)
    .order("created_at", { ascending: true });

  const { data, error } = await query;
  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.json(data);
}
