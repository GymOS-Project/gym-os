import { Router } from "express";

import {
  createCollection,
  createCoupon,
  createMemberSale,
  deleteCollection,
  deactivateCoupon,
  getPaymentAnalytics,
  listCollections,
  listCoupons,
  listSales,
  refundCollection,
  updateCollection,
  updateCoupon,
  validateCoupon,
} from "../controllers/payments";
import { requireAdmin, requireAuthenticatedSession } from "../middleware/sessionAuth.middleware";

const router = Router();

router.use(requireAuthenticatedSession, requireAdmin);

router.get("/collections", listCollections);
router.post("/collections", createCollection);
router.put("/collections/:id", updateCollection);
router.delete("/collections/:id", deleteCollection);
router.post("/collections/:id/refund", refundCollection);
router.get("/sales", listSales);
router.get("/analytics", getPaymentAnalytics);
router.get("/coupons", listCoupons);
router.post("/coupons", createCoupon);
router.put("/coupons/:id", updateCoupon);
router.delete("/coupons/:id", deactivateCoupon);
router.post("/coupons/validate", validateCoupon);
router.post("/member-sales", createMemberSale);

export default router;
