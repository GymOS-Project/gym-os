import { Router } from "express";
import multer from "multer";
import { login, me, signout, signup } from "../controllers/auth";
import { createRateLimit } from "../middleware/rateLimit.middleware";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});
const authReadLimiter = createRateLimit({
  windowMs: Number(process.env.AUTH_READ_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  maxRequests: Number(process.env.AUTH_READ_RATE_LIMIT_MAX_REQUESTS) || 100,
  message: "Too many authentication requests. Please try again later.",
  skip: (req) => req.method === "OPTIONS",
});
const authWriteLimiter = createRateLimit({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  maxRequests: Number(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 20,
  message: "Too many authentication attempts. Please try again later.",
  skip: (req) => req.method === "OPTIONS",
});

router.use(authReadLimiter);

router.post("/signup", authWriteLimiter, upload.any(), signup);
router.post("/login", authWriteLimiter, login);
router.post("/signout", signout);
router.get("/me", me);

export default router;
