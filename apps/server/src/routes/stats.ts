import { Router } from "express";
import { getDashboardStats } from "../controllers/stats";

const router = Router();

router.get("/dashboard", getDashboardStats);

export default router;
