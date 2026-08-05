import { Router } from "express";
import {
  createMemberPackage,
  createReview,
  createTransaction,
  cancelMemberPackage,
  deleteMemberPackage,
  deleteReview,
  deleteTransaction,
  getNearToExpire,
  getShiftReport,
  listMemberPackages,
  listReferenceMembers,
  listReviews,
  listTransactions,
  pauseMemberPackage,
  renewMemberPackage,
  resumeMemberPackage,
  updateMemberPackage,
  updateReview,
  updateTransaction,
} from "../controllers/reports";
import { requireAuthenticatedSession, requireSectionAccess } from "../middleware/sessionAuth.middleware";

const router = Router();

router.use(requireAuthenticatedSession, requireSectionAccess("reports"));

router.get("/packages", listMemberPackages);
router.post("/packages", createMemberPackage);
router.put("/packages/:id", updateMemberPackage);
router.delete("/packages/:id", deleteMemberPackage);
router.post("/packages/:id/pause", pauseMemberPackage);
router.post("/packages/:id/resume", resumeMemberPackage);
router.post("/packages/:id/cancel", cancelMemberPackage);
router.post("/packages/:id/renew", renewMemberPackage);
router.get("/near-to-expire", getNearToExpire);
router.get("/transactions", listTransactions);
router.post("/transactions", createTransaction);
router.put("/transactions/:id", updateTransaction);
router.delete("/transactions/:id", deleteTransaction);
router.get("/reviews", listReviews);
router.post("/reviews", createReview);
router.put("/reviews/:id", updateReview);
router.delete("/reviews/:id", deleteReview);
router.get("/reference-members", listReferenceMembers);
router.get("/shift-report", getShiftReport);

export default router;
