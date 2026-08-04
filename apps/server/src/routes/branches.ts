import { Router } from "express";
import { createBranch, listBranches } from "../controllers/branches";
import { requirePlanFeature } from "../middleware/billing.middleware";
import { requireAdmin, requireAuthenticatedSession } from "../middleware/sessionAuth.middleware";

const router = Router();

router.use(requireAuthenticatedSession, requireAdmin, requirePlanFeature("multi_branch"));

router.get("/", listBranches);
router.post("/", createBranch);

export default router;
