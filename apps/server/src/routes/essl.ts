import { Router } from "express";

import { createEsslDevice, deleteEsslDevice, listEsslDevices, listEsslRawLogs, receiveEsslWebhook, updateEsslDevice } from "../controllers/essl";
import { requireAdmin, requireAuthenticatedSession } from "../middleware/sessionAuth.middleware";

const router = Router();

router.post("/webhook", receiveEsslWebhook);
router.use(requireAuthenticatedSession, requireAdmin);

router.get("/devices", listEsslDevices);
router.post("/devices", createEsslDevice);
router.put("/devices/:id", updateEsslDevice);
router.delete("/devices/:id", deleteEsslDevice);
router.get("/raw-logs", listEsslRawLogs);

export default router;
