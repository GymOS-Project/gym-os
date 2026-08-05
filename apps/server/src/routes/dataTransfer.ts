import { Router } from "express";

import { exportBackupJson, exportResourceCsv, importResourceCsv, inspectBackupJson, restoreBackupJson } from "../controllers/dataTransfer";
import { requireAdmin, requireAuthenticatedSession } from "../middleware/sessionAuth.middleware";

const router = Router();

router.use(requireAuthenticatedSession, requireAdmin);

router.get("/backup/export", exportBackupJson);
router.post("/backup/inspect", inspectBackupJson);
router.post("/backup/restore", restoreBackupJson);
router.get("/:resource/export", exportResourceCsv);
router.post("/:resource/import", importResourceCsv);

export default router;
