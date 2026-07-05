import { Router } from "express";
import { createPlan, deletePlan, listPlans, updatePlan } from "../controllers/plans";

const router = Router();

router.get("/", listPlans);
router.post("/", createPlan);
router.put("/:id", updatePlan);
router.delete("/:id", deletePlan);

export default router;
