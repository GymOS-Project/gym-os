import { Router } from "express";

import { createStaff, listStaff, updateStaff } from "../controllers/staff";
import { requireAdmin, requireAuthenticatedSession } from "../middleware/sessionAuth.middleware";

const router = Router();

router.use(requireAuthenticatedSession, requireAdmin);

router.get("/trainers", listStaff);
router.post("/trainers", createStaff);
router.put("/trainers/:id", updateStaff);

export default router;
