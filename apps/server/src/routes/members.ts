import { Router } from "express";
import {
  createMember,
  deleteMember,
  getMember,
  listMembers,
  updateMember,
} from "../controllers/members";

const router = Router();

router.get("/", listMembers);
router.get("/:id", getMember);
router.post("/", createMember);
router.put("/:id", updateMember);
router.delete("/:id", deleteMember);

export default router;
