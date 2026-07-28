import { Router } from "express";

import { listActivityLogs } from "../controllers/activityLogs";
import { requireAdmin, requireAuthenticatedSession } from "../middleware/sessionAuth.middleware";

const router = Router();

router.use(requireAuthenticatedSession, requireAdmin);
router.get("/", listActivityLogs);

export default router;
