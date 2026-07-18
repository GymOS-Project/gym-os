import { Router } from "express";
import {
  createMember,
  deleteMember,
  getMember,
  listActiveMembers,
  listMembers,
  updateMember,
} from "../controllers/members";
import { requireAuthenticatedAdmin } from "../middleware/sessionAuth.middleware";

const router = Router();

router.use(requireAuthenticatedAdmin);

router.get("/", listMembers);
router.get("/active", listActiveMembers);
router.get("/:id", getMember);
router.post("/", createMember);
router.put("/:id", updateMember);
router.delete("/:id", deleteMember);

export default router;
