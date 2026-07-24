import { Router } from "express";
import {
  createEnquiry,
  createEnquiryFollowup,
  deleteEnquiry,
  listEnquiries,
  listEnquiryFollowups,
  updateEnquiry,
} from "../controllers/enquiries";
import { requireAuthenticatedSession, requireSectionAccess } from "../middleware/sessionAuth.middleware";

const router = Router();

router.use(requireAuthenticatedSession, requireSectionAccess("enquiries"));

router.get("/", listEnquiries);
router.post("/", createEnquiry);
router.put("/:id", updateEnquiry);
router.delete("/:id", deleteEnquiry);
router.post("/:id/followups", createEnquiryFollowup);
router.get("/followup-list", listEnquiryFollowups);

export default router;
