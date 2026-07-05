import { Router } from "express";
import { listBranches } from "../controllers/branches";

const router = Router();

router.get("/", listBranches);

export default router;
