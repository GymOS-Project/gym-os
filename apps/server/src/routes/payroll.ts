import { Router } from "express";

import { createPayrollRun, deletePayrollRun, listPayrollEntries, listPayrollRuns, updatePayrollEntry } from "../controllers/payroll";
import { requireAdmin, requireAuthenticatedSession } from "../middleware/sessionAuth.middleware";

const router = Router();

router.use(requireAuthenticatedSession, requireAdmin);

router.get("/runs", listPayrollRuns);
router.post("/runs", createPayrollRun);
router.get("/runs/:id/entries", listPayrollEntries);
router.put("/entries/:id", updatePayrollEntry);
router.delete("/runs/:id", deletePayrollRun);

export default router;
