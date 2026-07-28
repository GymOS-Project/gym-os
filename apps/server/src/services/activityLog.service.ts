import type { AuthenticatedRequest } from "../middleware/sessionAuth.middleware";
import { supabase } from "../supabase";

type ActivityLogInput = {
  gymId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
};

function resolveGymId(req: AuthenticatedRequest, input: ActivityLogInput) {
  if (input.gymId !== undefined) {
    return input.gymId;
  }

  if (req.staff?.gym_id) {
    return req.staff.gym_id;
  }

  return typeof req.admin?.gym_id === "string" ? req.admin.gym_id : null;
}

export async function logActivity(req: AuthenticatedRequest, input: ActivityLogInput) {
  const adminId = req.admin?.id;
  if (!adminId) {
    return;
  }

  const { error } = await supabase.from("activity_logs").insert({
    admin_id: adminId,
    gym_id: resolveGymId(req, input),
    actor_user_id: req.authUser?.id || null,
    actor_staff_id: req.staff?.id || null,
    actor_role: req.sessionRole || null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId || null,
    before_json: input.before ?? null,
    after_json: input.after ?? null,
    metadata_json: input.metadata ?? null,
  });

  if (error) {
    console.error("Failed to write activity log", error.message);
  }
}
