import { Router } from "express";

import { checkIn, checkOut, deleteAttendanceLog, listAttendanceLogs, updateAttendanceLog } from "../controllers/attendance";
import { requireAuthenticatedSession, requireSectionAccess } from "../middleware/sessionAuth.middleware";

const router = Router();

router.use(requireAuthenticatedSession, requireSectionAccess("attendance"));

router.get("/", listAttendanceLogs);
router.post("/check-in", checkIn);
router.post("/:id/check-out", checkOut);
router.put("/:id", updateAttendanceLog);
router.delete("/:id", deleteAttendanceLog);

export default router;
