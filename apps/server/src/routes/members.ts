import { Router } from "express";
import {
  assignDietPlan,
  assignExercisePlan,
  createMember,
  deleteAssignedDietPlan,
  deleteAssignedExercisePlan,
  deleteMember,
  getMember,
  listActiveMembers,
  listMembers,
  updateAssignedDietPlan,
  updateAssignedExercisePlan,
  updateMember,
} from "../controllers/members";
import { requireAuthenticatedSession, requireSectionAccess } from "../middleware/sessionAuth.middleware";

const router = Router();

router.use(requireAuthenticatedSession, requireSectionAccess("members"));

router.get("/", listMembers);
router.get("/active", listActiveMembers);
router.post("/:id/diet-plans", assignDietPlan);
router.put("/:id/diet-plans/:assignmentId", updateAssignedDietPlan);
router.delete("/:id/diet-plans/:assignmentId", deleteAssignedDietPlan);
router.post("/:id/exercise-plans", assignExercisePlan);
router.put("/:id/exercise-plans/:assignmentId", updateAssignedExercisePlan);
router.delete("/:id/exercise-plans/:assignmentId", deleteAssignedExercisePlan);
router.get("/:id", getMember);
router.post("/", createMember);
router.put("/:id", updateMember);
router.delete("/:id", deleteMember);

export default router;
