import { Router } from "express";
import { listPlans } from "../controllers/plans";

const router = Router();

router.get("/", listPlans);

export default router;
