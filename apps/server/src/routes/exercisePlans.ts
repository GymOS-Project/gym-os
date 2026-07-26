import { Router } from "express";

import { createExercisePlan, deleteExercisePlan, getExercisePlan, listExercisePlans, updateExercisePlan } from "../controllers/exercisePlans";
import { requireAuthenticatedSession, requireSectionAccess } from "../middleware/sessionAuth.middleware";
import { planPdfUpload } from "../middleware/planUpload.middleware";

const router = Router();

router.use(requireAuthenticatedSession, requireSectionAccess("exercise_plans"));

router.get("/", listExercisePlans);
router.get("/:id", getExercisePlan);
router.post("/", planPdfUpload.single("pdf_file"), createExercisePlan);
router.put("/:id", planPdfUpload.single("pdf_file"), updateExercisePlan);
router.delete("/:id", deleteExercisePlan);

export default router;
