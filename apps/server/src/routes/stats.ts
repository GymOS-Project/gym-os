import { Router } from "express";
import { getDashboardStats } from "../controllers/stats";
import { requireAuthenticatedSession, requireSectionAccess } from "../middleware/sessionAuth.middleware";

const router = Router();

router.use(requireAuthenticatedSession, requireSectionAccess("reports"));

router.get("/dashboard", getDashboardStats);

export default router;
