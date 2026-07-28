import { Router } from "express";

import { createInvoice, listInvoices, markInvoicePaid, updateInvoice } from "../controllers/invoices";
import { requireAdmin, requireAuthenticatedSession } from "../middleware/sessionAuth.middleware";

const router = Router();

router.use(requireAuthenticatedSession, requireAdmin);

router.get("/", listInvoices);
router.post("/", createInvoice);
router.put("/:id", updateInvoice);
router.post("/:id/mark-paid", markInvoicePaid);

export default router;
