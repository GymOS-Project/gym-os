import { Router } from "express";
import { createFollowup, listFollowups, updateFollowup } from "../controllers/followups";
import { requireAuthenticatedAdmin } from "../middleware/sessionAuth.middleware";

const router = Router();

router.use(requireAuthenticatedAdmin);

router.get("/", listFollowups);
router.post("/", createFollowup);
router.put("/:id", updateFollowup);

export default router;
