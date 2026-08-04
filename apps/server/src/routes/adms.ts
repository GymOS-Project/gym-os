import express, { Router } from "express";

import {
  admsAcknowledge,
  admsGetTime,
  admsHandshake,
  admsReceiveAttendance,
  admsStatus,
} from "../controllers/adms";

const router = Router();

router.use(express.text({ type: "*/*", limit: "10mb" }));

router.get("/cdata", admsHandshake);
router.post("/cdata", admsReceiveAttendance);
router.get("/getoptions", admsHandshake);
router.get("/gettime", admsGetTime);
router.get("/getrequest", admsAcknowledge);
router.get("/ping", admsStatus);
router.get("/info", admsStatus);
router.get("/status", admsStatus);
router.post("/device", admsAcknowledge);
router.post("/setoptions", admsAcknowledge);
router.post("/command", admsAcknowledge);
router.post("/devicecmd", admsAcknowledge);
router.get("/registry", admsHandshake);
router.post("/registry", admsAcknowledge);

export default router;
