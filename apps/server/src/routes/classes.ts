import { Router } from "express";

import { createClassBooking, createClassSession, deleteClassBooking, deleteClassSession, listClassBookings, listClassSessions, updateClassSession } from "../controllers/classes";
import { requireAuthenticatedSession, requireSectionAccess } from "../middleware/sessionAuth.middleware";

const router = Router();

router.use(requireAuthenticatedSession, requireSectionAccess("classes"));

router.get("/", listClassSessions);
router.post("/", createClassSession);
router.put("/:id", updateClassSession);
router.delete("/:id", deleteClassSession);
router.get("/:id/bookings", listClassBookings);
router.post("/:id/bookings", createClassBooking);
router.delete("/:id/bookings/:bookingId", deleteClassBooking);

export default router;
