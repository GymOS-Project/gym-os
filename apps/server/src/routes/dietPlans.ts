import { Router } from "express";

import { createDietPlan, deleteDietPlan, getDietPlan, listDietPlans, updateDietPlan } from "../controllers/dietPlans";
import { requireAuthenticatedSession, requireSectionAccess } from "../middleware/sessionAuth.middleware";
import { planPdfUpload } from "../middleware/planUpload.middleware";

const router = Router();

router.use(requireAuthenticatedSession, requireSectionAccess("diet_plans"));

router.get("/", listDietPlans);
router.get("/:id", getDietPlan);
router.post("/", planPdfUpload.single("pdf_file"), createDietPlan);
router.put("/:id", planPdfUpload.single("pdf_file"), updateDietPlan);
router.delete("/:id", deleteDietPlan);

export default router;
