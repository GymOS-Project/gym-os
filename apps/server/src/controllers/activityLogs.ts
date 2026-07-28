import type { Response } from "express";

import type { AuthenticatedRequest } from "../middleware/sessionAuth.middleware";
import { resolveGymScope } from "../services/gymScope.service";
import { supabase } from "../supabase";

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") return value == null ? null : String(value);
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function listActivityLogs(req: AuthenticatedRequest, res: Response) {
  const adminId = req.admin?.id;
  if (!adminId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) return;

  let query = supabase
    .from("activity_logs")
    .select("*")
    .eq("admin_id", adminId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (gymScope.selectedGymId) query = query.eq("gym_id", gymScope.selectedGymId);
  const entityType = normalizeOptionalString(req.query.entity_type);
  if (entityType) query = query.eq("entity_type", entityType);
  const action = normalizeOptionalString(req.query.action);
  if (action) query = query.eq("action", action);

  const { data, error } = await query;
  if (error) return res.status(500).json({ message: error.message });
  return res.json(data || []);
}
