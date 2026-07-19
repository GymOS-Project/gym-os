import { Router } from "express";
import { listBranches } from "../controllers/branches";
import { requireAuthenticatedAdmin } from "../middleware/sessionAuth.middleware";

const router = Router();

router.use(requireAuthenticatedAdmin);

router.get("/", listBranches);

export default router;
