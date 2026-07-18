import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import type { CookieOptions, Request, Response } from "express";
import { createSupabaseAuthClient, supabase } from "../supabase";

const SESSION_COOKIE_NAME = "sessionToken";
const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 30;
const GYM_PHOTO_BUCKET = process.env.SUPABASE_GYM_PHOTO_BUCKET || "gym-photos";
const AUTH_READ_RATE_LIMIT_WINDOW_MS = Number(process.env.AUTH_READ_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const AUTH_READ_RATE_LIMIT_MAX_REQUESTS = Number(process.env.AUTH_READ_RATE_LIMIT_MAX_REQUESTS) || 100;
const AUTH_WRITE_RATE_LIMIT_WINDOW_MS = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const AUTH_WRITE_RATE_LIMIT_MAX_REQUESTS = Number(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 20;
const COOKIE_ENCRYPTION_SECRET =
  process.env.SESSION_COOKIE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!COOKIE_ENCRYPTION_SECRET) {
  throw new Error("SESSION_COOKIE_SECRET or SUPABASE_SERVICE_ROLE_KEY must be set.");
}

const COOKIE_ENCRYPTION_KEY = createHash("sha256")
  .update(COOKIE_ENCRYPTION_SECRET)
  .digest();

type AuthUser = {
  id: string;
  email: string;
};

type RateLimitEntry = {
  count: number;
  resetTime: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfterSeconds: number;
};

const authReadEntries = new Map<string, RateLimitEntry>();
const authWriteEntries = new Map<string, RateLimitEntry>();

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function getRequestSource(req: Request) {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function pruneExpiredRateLimits(entries: Map<string, RateLimitEntry>, now: number) {
  for (const [key, entry] of entries.entries()) {
    if (entry.resetTime <= now) {
      entries.delete(key);
    }
  }
}

function consumeRateLimit(
  entries: Map<string, RateLimitEntry>,
  key: string,
  windowMs: number,
  maxRequests: number,
): RateLimitResult {
  const now = Date.now();
  pruneExpiredRateLimits(entries, now);

  const currentEntry = entries.get(key);
  if (!currentEntry || currentEntry.resetTime <= now) {
    const resetTime = now + windowMs;
    entries.set(key, { count: 1, resetTime });

    return {
      allowed: true,
      remaining: Math.max(maxRequests - 1, 0),
      resetTime,
      retryAfterSeconds: Math.max(1, Math.ceil(windowMs / 1000)),
    };
  }

  currentEntry.count += 1;

  return {
    allowed: currentEntry.count <= maxRequests,
    remaining: Math.max(maxRequests - currentEntry.count, 0),
    resetTime: currentEntry.resetTime,
    retryAfterSeconds: Math.max(1, Math.ceil((currentEntry.resetTime - now) / 1000)),
  };
}

function applyRateLimitHeaders(
  res: Response,
  maxRequests: number,
  result: RateLimitResult,
) {
  res.setHeader("X-RateLimit-Limit", String(maxRequests));
  res.setHeader("X-RateLimit-Remaining", String(result.remaining));
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(result.resetTime / 1000)));
}

function enforceRateLimit(
  res: Response,
  entries: Map<string, RateLimitEntry>,
  key: string,
  windowMs: number,
  maxRequests: number,
  message: string,
) {
  const result = consumeRateLimit(entries, key, windowMs, maxRequests);
  applyRateLimitHeaders(res, maxRequests, result);

  if (!result.allowed) {
    res.setHeader("Retry-After", String(result.retryAfterSeconds));
    res.status(429).json({ message });
    return false;
  }

  return true;
}

function enforceAuthReadLimit(res: Response, key: string) {
  return enforceRateLimit(
    res,
    authReadEntries,
    key,
    AUTH_READ_RATE_LIMIT_WINDOW_MS,
    AUTH_READ_RATE_LIMIT_MAX_REQUESTS,
    "Too many authentication requests. Please try again later.",
  );
}

function enforceAuthWriteLimit(res: Response, key: string) {
  return enforceRateLimit(
    res,
    authWriteEntries,
    key,
    AUTH_WRITE_RATE_LIMIT_WINDOW_MS,
    AUTH_WRITE_RATE_LIMIT_MAX_REQUESTS,
    "Too many authentication attempts. Please try again later.",
  );
}

function encryptCookieValue(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", COOKIE_ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

function decryptCookieValue(value?: string) {
  if (!value) {
    return null;
  }

  try {
    const payload = Buffer.from(value, "base64url");
    if (payload.length <= 28) {
      return null;
    }

    const iv = payload.subarray(0, 12);
    const tag = payload.subarray(12, 28);
    const encrypted = payload.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", COOKIE_ENCRYPTION_KEY, iv);

    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

function getCookieOptions(maxAge?: number): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(maxAge ? { maxAge } : {}),
  };
}

function setSessionCookies(
  res: Response,
  session: { access_token: string; refresh_token: string; expires_in?: number }
) {
  const accessMaxAge = session.expires_in ? session.expires_in * 1000 : 1000 * 60 * 60;

  res.cookie(
    SESSION_COOKIE_NAME,
    encryptCookieValue(session.access_token),
    getCookieOptions(accessMaxAge)
  );
  res.cookie(
    REFRESH_COOKIE_NAME,
    encryptCookieValue(session.refresh_token),
    getCookieOptions(REFRESH_COOKIE_MAX_AGE)
  );
}

function clearSessionCookies(res: Response) {
  res.clearCookie(SESSION_COOKIE_NAME, getCookieOptions());
  res.clearCookie(REFRESH_COOKIE_NAME, getCookieOptions());
}

async function getAdminByUserId(userId: string) {
  const { data: admin, error } = await supabase
    .from("admins")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return admin;
}

async function getUserFromAccessToken(accessToken: string, requestSource: string, res: Response) {
  if (!enforceAuthReadLimit(res, `access:${requestSource}:${hashValue(accessToken)}`)) {
    return null;
  }

  const authClient = createSupabaseAuthClient();
  const { data, error } = await authClient.auth.getUser(accessToken);
  if (error || !data.user) {
    return null;
  }

  return data.user;
}

async function uploadGymPhoto(file: Express.Multer.File, userId: string) {
  const fileExt = file.originalname.includes(".")
    ? file.originalname.split(".").pop()?.toLowerCase()
    : "jpg";
  const safeExt = fileExt || "jpg";
  const objectPath = `admins/${userId}/${Date.now()}.${safeExt}`;

  const { error } = await supabase.storage
    .from(GYM_PHOTO_BUCKET)
    .upload(objectPath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(GYM_PHOTO_BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}

function getSignupFiles(req: Request) {
  const files = Array.isArray(req.files) ? req.files : [];

  return files
    .filter((file) => file.fieldname === "gym_photo" || /^gym_photos(?:\[\d+\])?$/.test(file.fieldname))
    .slice(0, 10);
}

async function refreshSession(refreshToken: string, requestSource: string, res: Response) {
  if (!enforceAuthReadLimit(res, `refresh:${requestSource}:${hashValue(refreshToken)}`)) {
    return null;
  }

  const authClient = createSupabaseAuthClient();
  const { data, error } = await authClient.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session || !data.user) {
    return null;
  }

  return {
    session: data.session,
    user: data.user,
  };
}

async function resolveAuthenticatedUser(req: Request, res: Response) {
  const requestSource = getRequestSource(req);
  const accessCookie = req.cookies[SESSION_COOKIE_NAME] as string | undefined;
  const refreshCookie = req.cookies[REFRESH_COOKIE_NAME] as string | undefined;
  const accessToken = decryptCookieValue(accessCookie);
  const refreshToken = decryptCookieValue(refreshCookie);

  if ((accessCookie && !accessToken) || (refreshCookie && !refreshToken)) {
    clearSessionCookies(res);
    return null;
  }

  const accessUser = accessToken
    ? await getUserFromAccessToken(accessToken, requestSource, res)
    : null;

  if (res.headersSent) {
    return null;
  }

  if (accessUser) {
    return accessUser;
  }

  if (!refreshToken) {
    return null;
  }

  const refreshed = await refreshSession(refreshToken, requestSource, res);
  if (res.headersSent) {
    return null;
  }

  if (!refreshed) {
    clearSessionCookies(res);
    return null;
  }

  setSessionCookies(res, refreshed.session);
  return refreshed.user;
}

function toAuthUser(user: { id: string; email?: string | null }): AuthUser {
  return {
    id: user.id,
    email: user.email ?? "",
  };
}

export async function signup(req: Request, res: Response) {
  const {
    email,
    password,
    gym_name,
    owner_name,
    phone,
    address,
    website,
    instagram,
    instagram_page,
    business_registration_name,
    owner_email,
    gym_email,
  } = req.body;
  const authEmail = email || owner_email || gym_email;
  const gymPhotoFiles = getSignupFiles(req);
  const gymPhotoFile = gymPhotoFiles[0];

  if (!authEmail || !password || !gym_name || !owner_name || !phone) {
    return res.status(400).json({
      message: "email, password, gym_name, owner_name, and phone are required",
    });
  }

  if (!enforceAuthWriteLimit(res, `signup:${getRequestSource(req)}:${authEmail.toLowerCase()}`)) {
    return;
  }

  const signupClient = createSupabaseAuthClient();
  const { data, error } = await signupClient.auth.signUp({ email: authEmail, password });
  if (error) {
    return res.status(400).json({ message: error.message });
  }

  if (data.user) {
    let gymPhotoUrl: string | null = null;

    if (gymPhotoFile) {
      gymPhotoUrl = await uploadGymPhoto(gymPhotoFile, data.user.id);
    }

    const { error: adminError } = await supabase.from("admins").insert({
      user_id: data.user.id,
      gym_name,
      owner_name,
      phone: phone || null,
      email: gym_email || null,
      website: website || null,
      instagram_page: instagram_page || instagram || null,
      address: address || null,
      business_registration_name: business_registration_name || null,
      owner_email: owner_email || null,
      gym_photo_url: gymPhotoUrl,
    });

    if (adminError) {
      return res.status(500).json({ message: adminError.message });
    }
  }

  const signInClient = createSupabaseAuthClient();
  const signInResult = await signInClient.auth.signInWithPassword({ email: authEmail, password });

  if (signInResult.error || !signInResult.data.session || !signInResult.data.user) {
    return res.status(201).json({
      message: "Account created. Please sign in to continue.",
      user: null,
      admin: null,
      authenticated: false,
    });
  }

  setSessionCookies(res, signInResult.data.session);

  const admin = await getAdminByUserId(signInResult.data.user.id);

  return res.status(201).json({
    message: "Account created successfully.",
    user: toAuthUser(signInResult.data.user),
    admin,
    authenticated: true,
  });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "email and password are required" });
  }

  if (!enforceAuthWriteLimit(res, `login:${getRequestSource(req)}:${email.toLowerCase()}`)) {
    return;
  }

  const authClient = createSupabaseAuthClient();
  const { data, error } = await authClient.auth.signInWithPassword({ email, password });
  if (error) {
    return res.status(401).json({ message: error.message });
  }

  if (!data.session || !data.user) {
    return res.status(401).json({ message: "Unable to create session" });
  }

  setSessionCookies(res, data.session);

  const admin = await getAdminByUserId(data.user.id);

  return res.json({ user: toAuthUser(data.user), admin, authenticated: true });
}

export async function signout(req: Request, res: Response) {
  const token = decryptCookieValue(req.cookies[SESSION_COOKIE_NAME] as string | undefined);

  clearSessionCookies(res);

  if (token) {
    await supabase.auth.admin.signOut(token).catch(() => {});
  }

  return res.json({ message: "Signed out" });
}

export async function me(req: Request, res: Response) {
  const user = await resolveAuthenticatedUser(req, res);

  if (res.headersSent) {
    return;
  }

  if (!user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const admin = await getAdminByUserId(user.id);

  return res.json({ user: toAuthUser(user), admin, authenticated: true });
}
