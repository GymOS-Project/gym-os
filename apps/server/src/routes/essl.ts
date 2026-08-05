import { Router } from "express";

import { createEsslDevice, deleteEsslDevice, listEsslDevices, listEsslRawLogs, listPublicEsslDebugLogs, receiveEsslWebhook, updateEsslDevice } from "../controllers/essl";
import { requirePlanFeature } from "../middleware/billing.middleware";
import { requireAdmin, requireAuthenticatedSession } from "../middleware/sessionAuth.middleware";

const router = Router();

router.post("/webhook", receiveEsslWebhook);
router.get("/public-debug", listPublicEsslDebugLogs);
router.use(requireAuthenticatedSession, requireAdmin, requirePlanFeature("essl_integrations"));

router.get("/devices", listEsslDevices);
router.post("/devices", createEsslDevice);
router.put("/devices/:id", updateEsslDevice);
router.delete("/devices/:id", deleteEsslDevice);
router.get("/raw-logs", listEsslRawLogs);

export default router;
