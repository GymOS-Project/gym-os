import { Router } from "express";
import multer from "multer";

import { createSignupCheckout, getSignupCheckoutStatus, handleDodoWebhook } from "../controllers/billing";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post("/public/signup-checkout", upload.any() as any, createSignupCheckout);
router.get("/public/signup-checkout/:id", getSignupCheckoutStatus);
router.post("/dodo/webhook", handleDodoWebhook);

export default router;
