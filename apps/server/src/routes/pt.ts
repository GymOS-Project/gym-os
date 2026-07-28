import { Router } from "express";

import { createPtSession, deletePtSession, listPtSessions, updatePtSession } from "../controllers/pt";
import { requireAuthenticatedSession, requireSectionAccess } from "../middleware/sessionAuth.middleware";

const router = Router();

router.use(requireAuthenticatedSession, requireSectionAccess("pt"));

router.get("/", listPtSessions);
router.post("/", createPtSession);
router.put("/:id", updatePtSession);
router.delete("/:id", deletePtSession);

export default router;
