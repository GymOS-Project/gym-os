import { Router } from "express";

import { createDietPlan, deleteDietPlan, getDietPlan, listDietPlans, updateDietPlan } from "../controllers/dietPlans";
import { requireAuthenticatedSession, requireSectionAccess } from "../middleware/sessionAuth.middleware";

const router = Router();

router.use(requireAuthenticatedSession, requireSectionAccess("diet_plans"));

router.get("/", listDietPlans);
router.get("/:id", getDietPlan);
router.post("/", createDietPlan);
router.put("/:id", updateDietPlan);
router.delete("/:id", deleteDietPlan);

export default router;
