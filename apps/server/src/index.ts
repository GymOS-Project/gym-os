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
import branchesRouter from "./routes/branches";
import dietPlansRouter from "./routes/dietPlans";
import exercisePlansRouter from "./routes/exercisePlans";
import staffRouter from "./routes/staff";
import shiftsRouter from "./routes/shifts";
import paymentsRouter from "./routes/payments";
import classesRouter from "./routes/classes";
import ptRouter from "./routes/pt";
import attendanceRouter from "./routes/attendance";
import activityLogsRouter from "./routes/activityLogs";
import invoicesRouter from "./routes/invoices";
import payrollRouter from "./routes/payroll";
import esslRouter from "./routes/essl";
import billingRouter from "./routes/billing";
import admsRouter from "./routes/adms";
import { createRateLimit } from "./middleware/rateLimit.middleware";
import { startSubscriptionWorker, scheduleSubscriptionReminder } from "./jobs/subscriptionNotifier";

dotenv.config();

const app: Express = express();
const port = Number(process.env.PORT) || 3001;
const trustProxy = process.env.TRUST_PROXY ?? "false";

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

function normalizeOrigin(origin: string) {
  return origin.trim().replace(/\/$/, "");
}

function parseAllowedOrigins(value?: string) {
  if (!value) return [] as string[];
  return value
    .split(/[,\s]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map(normalizeOrigin);
}

const allowedOrigins = parseAllowedOrigins(process.env.FRONTEND_URL || process.env.CORS_ORIGINS);
const isProduction = process.env.NODE_ENV === "production";

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const normalized = normalizeOrigin(origin);

      if (allowedOrigins.length === 0) {
        if (isProduction) {
          return callback(new Error("CORS is not configured. Set FRONTEND_URL (or CORS_ORIGINS)."), false);
        }
        return callback(null, true);
      }

      if (allowedOrigins.includes(normalized)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS origin not allowed: ${normalized}`), false);
    },
    credentials: true,
    optionsSuccessStatus: 200,
  })
);
app.use(apiRateLimiter);
app.use(express.text({
  type: ["text/csv", "application/csv"],
  limit: "10mb",
  verify: (req, _res, buf) => {
    (req as Request & { rawBody?: string }).rawBody = buf.toString("utf8");
  },
}));
app.use(express.json({
  limit: "10mb",
  verify: (req, _res, buf) => {
    (req as Request & { rawBody?: string }).rawBody = buf.toString("utf8");
  },
}));
app.use(express.urlencoded({
  limit: "10mb",
  extended: true,
  verify: (req, _res, buf) => {
    (req as Request & { rawBody?: string }).rawBody = buf.toString("utf8");
  },
}));
app.use(cookieParser());
app.use("/iclock", admsRouter);

const apiRouter = express.Router();


apiRouter.use("/auth", authRouter);
apiRouter.use("/members", membersRouter);
apiRouter.use("/plans", plansRouter);
apiRouter.use("/followups", followupsRouter);
apiRouter.use("/enquiries", enquiriesRouter);
apiRouter.use("/reports", reportsRouter);
apiRouter.use("/stats", statsRouter);
apiRouter.use("/branches", branchesRouter);
apiRouter.use("/diet-plans", dietPlansRouter);
apiRouter.use("/exercise-plans", exercisePlansRouter);
apiRouter.use("/staff", staffRouter);
apiRouter.use("/shifts", shiftsRouter);
apiRouter.use("/payments", paymentsRouter);
apiRouter.use("/classes", classesRouter);
apiRouter.use("/pt", ptRouter);
apiRouter.use("/attendance", attendanceRouter);
apiRouter.use("/activity-logs", activityLogsRouter);
apiRouter.use("/invoices", invoicesRouter);
apiRouter.use("/payroll", payrollRouter);
apiRouter.use("/essl", esslRouter);
apiRouter.use("/billing", billingRouter);

apiRouter.get("/", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", message: "GymOS API running!" });
});

app.use("/api", apiRouter);

app.get("/healthcheck", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", message: "GymOS backend is working fine!" });
});

const host = "0.0.0.0";
app.listen(port, host, () => {
  console.log(`[server]: Server is running at http://${host}:${port}`);
});

startSubscriptionWorker();
scheduleSubscriptionReminder().catch(console.error);

export default app;
