import { Router } from "express";
import { createBranch, listBranches } from "../controllers/branches";
import { requireAuthenticatedAdmin } from "../middleware/sessionAuth.middleware";

const router = Router();

router.use(requireAuthenticatedAdmin);

router.get("/", listBranches);
router.post("/", createBranch);

export default router;
