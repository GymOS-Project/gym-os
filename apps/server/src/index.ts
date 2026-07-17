import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRouter from "./routes/auth";
import membersRouter from "./routes/members";
import plansRouter from "./routes/plans";
import followupsRouter from "./routes/followups";
import enquiriesRouter from "./routes/enquiries";
import reportsRouter from "./routes/reports";
import statsRouter from "./routes/stats";
import { createRateLimit } from "./middleware/rateLimit.middleware";

import { startSubscriptionWorker, scheduleSubscriptionReminder } from "./jobs/subscriptionNotifier";

dotenv.config();

const app: Express = express();
const port = Number(process.env.PORT) || 3001;
const trustProxy = process.env.TRUST_PROXY;

if (trustProxy === "true") {
  app.set("trust proxy", true);
} else if (trustProxy === "false" || !trustProxy) {
  app.set("trust proxy", false);
} else {
  app.set("trust proxy", Number(trustProxy) || false);
}

const apiRateLimiter = createRateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000,
  maxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 300,
  message: "Too many requests. Please try again later.",
  skip: (req) => req.method === "OPTIONS" || req.path === "/healthcheck",
});

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    optionsSuccessStatus: 200,
  })
);
app.use(apiRateLimiter);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());

app.get("/healthcheck", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/members", membersRouter);
app.use("/plans", plansRouter);
app.use("/followups", followupsRouter);
app.use("/enquiries", enquiriesRouter);
app.use("/reports", reportsRouter);
app.use("/stats", statsRouter);

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", message: "GymOS API running!" });
});

const host = "0.0.0.0";
app.listen(port, host, () => {
  console.log(`[server]: Server is running at http://${host}:${port}`);
});

startSubscriptionWorker();
scheduleSubscriptionReminder().catch(console.error);

export default app;
