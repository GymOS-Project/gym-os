import { Router } from "express";
import { login, me, signout, signup } from "../controllers/auth";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/signout", signout);
router.get("/me", me);

export default router;
