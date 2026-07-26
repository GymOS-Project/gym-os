import { Router } from "express";

import { createExercisePlan, deleteExercisePlan, getExercisePlan, listExercisePlans, updateExercisePlan } from "../controllers/exercisePlans";
import { requireAuthenticatedSession, requireSectionAccess } from "../middleware/sessionAuth.middleware";

const router = Router();

router.use(requireAuthenticatedSession, requireSectionAccess("exercise_plans"));

router.get("/", listExercisePlans);
router.get("/:id", getExercisePlan);
router.post("/", createExercisePlan);
router.put("/:id", updateExercisePlan);
router.delete("/:id", deleteExercisePlan);

export default router;
