import type { Response } from "express";

import type { AuthenticatedRequest } from "../middleware/sessionAuth.middleware";
import { resolveGymScope, resolveWriteGymId } from "../services/gymScope.service";
import { supabase } from "../supabase";

type PlanTable = "diet_plans" | "exercise_plans";

function getAdminId(req: AuthenticatedRequest, res: Response) {
  const adminId = req.admin?.id;
  if (!adminId) {
    res.status(401).json({ message: "Not authenticated" });
    return null;
  }

  return adminId;
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return value == null ? null : String(value);
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function createSharedPlanController(table: PlanTable) {
  return {
    list: async (req: AuthenticatedRequest, res: Response) => {
      const adminId = getAdminId(req, res);
      if (!adminId) {
        return;
      }

      const gymScope = await resolveGymScope(req, res);
      if (!gymScope) {
        return;
      }

      const requestedScope = typeof req.query.scope === "string" ? req.query.scope : "shared";
      let query = supabase.from(table).select("*").eq("admin_id", adminId);

      if (gymScope.selectedGymId) {
        query = query.eq("gym_id", gymScope.selectedGymId);
      }

      if (requestedScope === "shared" || requestedScope === "member_custom") {
        query = query.eq("plan_scope", requestedScope);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) {
        return res.status(500).json({ message: error.message });
      }

      return res.json(data || []);
    },
    get: async (req: AuthenticatedRequest, res: Response) => {
      const adminId = getAdminId(req, res);
      if (!adminId) {
        return;
      }

      const gymScope = await resolveGymScope(req, res);
      if (!gymScope) {
        return;
      }

      let query = supabase.from(table).select("*").eq("id", req.params.id).eq("admin_id", adminId);

      if (gymScope.selectedGymId) {
        query = query.eq("gym_id", gymScope.selectedGymId);
      }

      const { data, error } = await query.maybeSingle();
      if (error) {
        return res.status(500).json({ message: error.message });
      }
      if (!data) {
        return res.status(404).json({ message: "Plan not found" });
      }

      return res.json(data);
    },
    create: async (req: AuthenticatedRequest, res: Response) => {
      const adminId = getAdminId(req, res);
      if (!adminId) {
        return;
      }

      const gymId = await resolveWriteGymId(req, res);
      if (!gymId) {
        return;
      }

      const name = normalizeOptionalString(req.body.name);
      if (!name) {
        return res.status(400).json({ message: "name is required" });
      }

      const { data, error } = await supabase
        .from(table)
        .insert({
          admin_id: adminId,
          gym_id: gymId,
          name,
          description: normalizeOptionalString(req.body.description),
          content: normalizeOptionalString(req.body.content),
          tag: normalizeOptionalString(req.body.tag),
          created_by_type: req.sessionRole === "trainer" ? "trainer" : "admin",
          created_by_staff_id: req.sessionRole === "trainer" ? req.staff?.id || null : null,
          plan_scope: "shared",
        })
        .select("*")
        .single();

      if (error) {
        return res.status(500).json({ message: error.message });
      }

      return res.status(201).json(data);
    },
    update: async (req: AuthenticatedRequest, res: Response) => {
      const adminId = getAdminId(req, res);
      if (!adminId) {
        return;
      }

      const gymScope = await resolveGymScope(req, res);
      if (!gymScope) {
        return;
      }

      const updates: Record<string, unknown> = {};
      if (req.body.name !== undefined) updates.name = normalizeOptionalString(req.body.name);
      if (req.body.description !== undefined) updates.description = normalizeOptionalString(req.body.description);
      if (req.body.content !== undefined) updates.content = normalizeOptionalString(req.body.content);
      if (req.body.tag !== undefined) updates.tag = normalizeOptionalString(req.body.tag);
      if (req.body.is_active !== undefined) updates.is_active = Boolean(req.body.is_active);

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid fields provided for update" });
      }

      updates.updated_at = new Date().toISOString();

      let query = supabase.from(table).update(updates).eq("id", req.params.id).eq("admin_id", adminId);
      if (gymScope.selectedGymId) {
        query = query.eq("gym_id", gymScope.selectedGymId);
      }

      const { data, error } = await query.select("*").single();
      if (error) {
        return res.status(500).json({ message: error.message });
      }

      return res.json(data);
    },
    remove: async (req: AuthenticatedRequest, res: Response) => {
      const adminId = getAdminId(req, res);
      if (!adminId) {
        return;
      }

      const gymScope = await resolveGymScope(req, res);
      if (!gymScope) {
        return;
      }

      let query = supabase.from(table).delete().eq("id", req.params.id).eq("admin_id", adminId);
      if (gymScope.selectedGymId) {
        query = query.eq("gym_id", gymScope.selectedGymId);
      }

      const { error } = await query;
      if (error) {
        return res.status(500).json({ message: error.message });
      }

      return res.status(204).send();
    },
  };
}
