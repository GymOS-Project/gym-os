import { Router } from "express";
import { getDashboardStats } from "../controllers/stats";
import { requireAuthenticatedAdmin } from "../middleware/sessionAuth.middleware";

const router = Router();

router.use(requireAuthenticatedAdmin);

router.get("/dashboard", getDashboardStats);

export default router;
