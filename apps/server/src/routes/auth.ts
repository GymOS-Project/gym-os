import { Router } from "express";
import multer from "multer";
import { login, me, signout, signup } from "../controllers/auth";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post("/signup", upload.single("gym_photo"), signup);
router.post("/login", login);
router.post("/signout", signout);
router.get("/me", me);

export default router;
