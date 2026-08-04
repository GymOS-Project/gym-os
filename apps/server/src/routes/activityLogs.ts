import { Router } from "express";

import { listActivityLogs } from "../controllers/activityLogs";
import { requirePlanFeature } from "../middleware/billing.middleware";
import { requireAdmin, requireAuthenticatedSession } from "../middleware/sessionAuth.middleware";

const router = Router();

router.use(requireAuthenticatedSession, requireAdmin, requirePlanFeature("activity_logs"));
router.get("/", listActivityLogs);

export default router;
