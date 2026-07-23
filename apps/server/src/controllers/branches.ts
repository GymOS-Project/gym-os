import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/sessionAuth.middleware";
import { getAdminByAuthId } from "../services/authSession.service";
import { supabase } from "../supabase";

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return value == null ? null : String(value);
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeRequiredString(value: unknown) {
  const normalized = normalizeOptionalString(value);
  return typeof normalized === "string" ? normalized : "";
}

function parseGymDetails(payload: Record<string, unknown>) {
  const gym = {
    gym_name: normalizeRequiredString(payload.gym_name),
    business_registration_name: normalizeOptionalString(payload.business_registration_name),
    gym_email: normalizeOptionalString(payload.gym_email),
    website: normalizeOptionalString(payload.website),
    instagram_page: normalizeOptionalString(payload.instagram_page),
    address: normalizeOptionalString(payload.address),
    owner_name: normalizeRequiredString(payload.owner_name),
    phone: normalizeRequiredString(payload.phone),
    owner_email: normalizeOptionalString(payload.owner_email),
  };

  if (!gym.gym_name || !gym.owner_name || !gym.phone || !gym.gym_email || !gym.address || !gym.owner_email || !gym.business_registration_name) {
    throw new Error("All branch fields are required");
  }

  return gym;
}

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

export async function createBranch(req: AuthenticatedRequest, res: Response) {
  const adminId = req.admin?.id;
  const userId = req.authUser?.id;

  if (!adminId || !userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  let branch;

  try {
    branch = parseGymDetails(req.body as Record<string, unknown>);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Invalid branch payload" });
  }

  const admin = await getAdminByAuthId(userId);

  if (!admin || admin.gym_type !== "branch" || !Array.isArray(admin.gyms) || admin.gyms.length < 2) {
    return res.status(400).json({ message: "Upgrade this account to branch mode before adding more gyms" });
  }

  const syncError = await supabase
    .from("gyms")
    .update({ gym_type: "branch", updated_at: new Date().toISOString() })
    .eq("admin_id", adminId)
    .neq("gym_type", "branch");

  if (syncError.error) {
    return res.status(500).json({ message: syncError.error.message });
  }

  const { data, error } = await supabase
    .from("gyms")
    .insert({
      admin_id: adminId,
      gym_type: "branch",
      gym_name: branch.gym_name,
      owner_name: branch.owner_name,
      phone: branch.phone,
      email: branch.gym_email,
      website: branch.website,
      instagram_page: branch.instagram_page,
      address: branch.address,
      business_registration_name: branch.business_registration_name,
      owner_email: branch.owner_email,
    })
    .select("id, admin_id, gym_name, gym_type, owner_name, phone, email, website, instagram_page, address, business_registration_name, owner_email, gym_photo_url, gym_photo_urls, logo_url, created_at, updated_at")
    .single();

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.status(201).json(data);
}
