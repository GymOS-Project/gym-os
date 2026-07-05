import { Router } from "express";
import { createFollowup, listFollowups, updateFollowup } from "../controllers/followups";

const router = Router();

router.get("/", listFollowups);
router.post("/", createFollowup);
router.put("/:id", updateFollowup);

export default router;
