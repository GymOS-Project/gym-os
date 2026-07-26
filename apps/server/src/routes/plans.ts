import { Router } from "express";
import { createPlan, deletePlan, listPlans, updatePlan } from "../controllers/plans";
import { requireAuthenticatedSession, requireSectionAccess } from "../middleware/sessionAuth.middleware";

const router = Router();

router.use(requireAuthenticatedSession, requireSectionAccess("packages"));

router.get("/", listPlans);
router.post("/", createPlan);
router.put("/:id", updatePlan);
router.delete("/:id", deletePlan);

export default router;
