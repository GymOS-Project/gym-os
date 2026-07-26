import type { Response } from "express";

import type { AuthenticatedRequest } from "../middleware/sessionAuth.middleware";
import { resolveGymScope, resolveWriteGymId } from "../services/gymScope.service";
import { hasOwn, hasPlanContentInput, normalizeOptionalBoolean, normalizeOptionalString, resolvePlanContentFields, type PlanTable } from "../services/planContent.service";
import { supabase } from "../supabase";

function getAdminId(req: AuthenticatedRequest, res: Response) {
  const adminId = req.admin?.id;
  if (!adminId) {
    res.status(401).json({ message: "Not authenticated" });
    return null;
  }

  return adminId;
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

      let contentFields;

      try {
        contentFields = await resolvePlanContentFields({
          adminId,
          gymId,
          table,
          body: req.body as Record<string, unknown>,
          file: req.file,
        });
      } catch (error) {
        return res.status(400).json({ message: error instanceof Error ? error.message : "Invalid plan content" });
      }

      const { data, error } = await supabase
        .from(table)
        .insert({
          admin_id: adminId,
          gym_id: gymId,
          name,
          description: normalizeOptionalString(req.body.description),
          tag: normalizeOptionalString(req.body.tag),
          created_by_type: req.sessionRole === "trainer" ? "trainer" : "admin",
          created_by_staff_id: req.sessionRole === "trainer" ? req.staff?.id || null : null,
          plan_scope: "shared",
          ...contentFields,
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
      const body = req.body as Record<string, unknown>;
      const hasPdfFile = Boolean(req.file);

      if (hasOwn(body, "name")) updates.name = normalizeOptionalString(body.name);
      if (hasOwn(body, "description")) updates.description = normalizeOptionalString(body.description);
      if (hasOwn(body, "tag")) updates.tag = normalizeOptionalString(body.tag);

      const normalizedIsActive = normalizeOptionalBoolean(body.is_active);
      if (normalizedIsActive !== undefined) {
        updates.is_active = normalizedIsActive;
      }

      if (hasPlanContentInput(body, req.file)) {
        const existingPlanResult = await supabase
          .from(table)
          .select("content_type, content, pdf_url, pdf_file_name")
          .eq("id", req.params.id)
          .eq("admin_id", adminId)
          .maybeSingle();

        if (existingPlanResult.error) {
          return res.status(500).json({ message: existingPlanResult.error.message });
        }

        if (!existingPlanResult.data) {
          return res.status(404).json({ message: "Plan not found" });
        }

        const resolvedGymId = typeof body.gym_id === "string" && body.gym_id
          ? body.gym_id
          : typeof gymScope.selectedGymId === "string" && gymScope.selectedGymId
            ? gymScope.selectedGymId
            : typeof req.admin?.gym_id === "string"
              ? req.admin.gym_id
              : null;

        if (!resolvedGymId) {
          return res.status(400).json({ message: "gym_id is required" });
        }

        try {
          const contentFields = await resolvePlanContentFields({
            adminId,
            gymId: resolvedGymId,
            table,
            body,
            file: req.file,
            existing: existingPlanResult.data,
          });
          Object.assign(updates, contentFields);
        } catch (error) {
          return res.status(400).json({ message: error instanceof Error ? error.message : "Invalid plan content" });
        }
      }

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
