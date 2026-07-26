import type { Response } from "express";

import type { AuthenticatedRequest } from "../middleware/sessionAuth.middleware";
import { supabase } from "../supabase";

export type GymScope = {
  selectedGymId: string | null;
  gymIds: string[];
};

function getSessionGymIds(req: AuthenticatedRequest) {
  if (req.sessionRole === "staff") {
    return req.staff?.gym_id ? [req.staff.gym_id] : [];
  }

  const gyms = Array.isArray(req.admin?.gyms) ? req.admin.gyms : [];
  const gymIds = gyms
    .map((gym) => (gym && typeof gym.id === "string" ? gym.id : null))
    .filter((gymId): gymId is string => Boolean(gymId));

  if (gymIds.length > 0) {
    return gymIds;
  }

  return req.admin?.id ? listAdminGyms(req.admin.id) : [];
}

export async function listAdminGyms(adminId: string) {
  const { data, error } = await supabase
    .from("gyms")
    .select("id")
    .eq("admin_id", adminId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((gym) => gym.id as string);
}

export async function resolveGymScope(req: AuthenticatedRequest, res: Response): Promise<GymScope | null> {
  const adminId = req.admin?.id;
  if (!adminId) {
    res.status(401).json({ message: "Not authenticated" });
    return null;
  }

  const gymIds = await getSessionGymIds(req);
  const requestedGymId = req.get("x-gym-id") || (typeof req.query.gym_id === "string" ? req.query.gym_id : null);

  if (requestedGymId && !gymIds.includes(requestedGymId)) {
    res.status(403).json({ message: "Invalid gym filter" });
    return null;
  }

  const selectedGymId = req.sessionRole === "staff"
    ? gymIds[0] || null
    : requestedGymId;

  return {
    selectedGymId,
    gymIds: selectedGymId ? [selectedGymId] : gymIds,
  };
}

export async function ensureGymBelongsToAdmin(adminId: string, gymId: string) {
  const { data, error } = await supabase
    .from("gyms")
    .select("id")
    .eq("id", gymId)
    .eq("admin_id", adminId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function resolveWriteGymId(req: AuthenticatedRequest, res: Response) {
  const adminId = req.admin?.id;
  if (!adminId) {
    res.status(401).json({ message: "Not authenticated" });
    return null;
  }

  const requestedGymId = typeof req.body?.gym_id === "string"
    ? req.body.gym_id
    : typeof req.get("x-gym-id") === "string" && req.get("x-gym-id")
      ? req.get("x-gym-id")!
    : typeof req.query.gym_id === "string"
      ? req.query.gym_id
      : typeof req.admin?.gym_id === "string"
        ? req.admin.gym_id
        : null;

  if (req.sessionRole === "staff") {
    const trainerGymId = req.staff?.gym_id || null;
    if (!trainerGymId) {
      res.status(403).json({ message: "Staff member is not assigned to a gym" });
      return null;
    }

    if (requestedGymId && requestedGymId !== trainerGymId) {
      res.status(403).json({ message: "Invalid gym" });
      return null;
    }

    return trainerGymId;
  }

  if (!requestedGymId) {
    res.status(400).json({ message: "gym_id is required" });
    return null;
  }

  try {
    const belongsToAdmin = await ensureGymBelongsToAdmin(adminId, requestedGymId);
    if (!belongsToAdmin) {
      res.status(403).json({ message: "Invalid gym" });
      return null;
    }
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "Failed to validate gym" });
    return null;
  }

  return requestedGymId;
}

export async function ensureMemberBelongsToGym(memberId: string, adminId: string, gymId: string) {
  const { data, error } = await supabase
    .from("members")
    .select("id")
    .eq("id", memberId)
    .eq("admin_id", adminId)
    .eq("gym_id", gymId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function ensureEnquiryBelongsToGym(enquiryId: string, adminId: string, gymId: string) {
  const { data, error } = await supabase
    .from("enquiries")
    .select("id")
    .eq("id", enquiryId)
    .eq("admin_id", adminId)
    .eq("gym_id", gymId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function listScopedMemberIds(adminId: string, gymIds: string[]) {
  if (gymIds.length === 0) {
    return [] as string[];
  }

  let query = supabase.from("members").select("id").eq("admin_id", adminId);
  query = gymIds.length === 1 ? query.eq("gym_id", gymIds[0]) : query.in("gym_id", gymIds);

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((member) => member.id as string);
}
