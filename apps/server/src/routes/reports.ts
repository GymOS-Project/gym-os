import { Router } from "express";
import {
  createMemberPackage,
  createReview,
  createTransaction,
  getNearToExpire,
  getShiftReport,
  listMemberPackages,
  listReferenceMembers,
  listReviews,
  listTransactions,
} from "../controllers/reports";

const router = Router();

router.get("/packages", listMemberPackages);
router.post("/packages", createMemberPackage);
router.get("/near-to-expire", getNearToExpire);
router.get("/transactions", listTransactions);
router.post("/transactions", createTransaction);
router.get("/reviews", listReviews);
router.post("/reviews", createReview);
router.get("/reference-members", listReferenceMembers);
router.get("/shift-report", getShiftReport);

export default router;
