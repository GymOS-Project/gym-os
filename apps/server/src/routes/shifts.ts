import { Router } from "express";

import { createShift, deleteShift, listShifts, updateShift } from "../controllers/shifts";
import { requireAdmin, requireAuthenticatedSession } from "../middleware/sessionAuth.middleware";

const router = Router();

router.use(requireAuthenticatedSession, requireAdmin);

router.get("/", listShifts);
router.post("/", createShift);
router.put("/:id", updateShift);
router.delete("/:id", deleteShift);

export default router;
