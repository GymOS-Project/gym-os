import { Router } from "express";
import { createFollowup, deleteFollowup, listFollowups, updateFollowup } from "../controllers/followups";
import { requireAuthenticatedSession, requireSectionAccess } from "../middleware/sessionAuth.middleware";

const router = Router();

router.use(requireAuthenticatedSession, requireSectionAccess("followups"));

router.get("/", listFollowups);
router.post("/", createFollowup);
router.put("/:id", updateFollowup);
router.delete("/:id", deleteFollowup);

export default router;
