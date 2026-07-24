import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import type { CookieOptions, Request, Response } from "express";

import { createSupabaseAuthClient, supabase } from "../supabase";

export const SESSION_COOKIE_NAME = "sessionToken";
export const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 30;
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const COOKIE_SAME_SITE = (process.env.SESSION_COOKIE_SAME_SITE || (IS_PRODUCTION ? "none" : "lax")).toLowerCase();
const COOKIE_SECURE = process.env.SESSION_COOKIE_SECURE
  ? process.env.SESSION_COOKIE_SECURE === "true"
  : IS_PRODUCTION;
const COOKIE_ENCRYPTION_SECRET =
  process.env.SESSION_COOKIE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!COOKIE_ENCRYPTION_SECRET) {
  throw new Error("SESSION_COOKIE_SECRET or SUPABASE_SERVICE_ROLE_KEY must be set.");
}

const COOKIE_ENCRYPTION_KEY = createHash("sha256")
  .update(COOKIE_ENCRYPTION_SECRET)
  .digest();

type SessionPayload = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
};

export type AuthSessionUser = {
  id: string;
  email?: string | null;
};

export type SessionRole = "admin" | "trainer";

export type StaffSessionProfile = {
  id: string;
  admin_id: string;
  gym_id: string;
  auth_user_id: string;
  role: "trainer";
  full_name: string;
  email: string;
  phone: string | null;
  specializations: string | null;
  section_permissions: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

type FlattenedAdmin = {
  id: string;
  auth_id: string;
  [key: string]: any;
};

type GymRecord = Record<string, any>;

function normalizeSectionPermissions(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function mergeAdminWithGym(
  admin: FlattenedAdmin | null,
  gym: GymRecord | null,
  gyms: GymRecord[] = [],
): FlattenedAdmin | null {
  if (!admin || !gym) {
    return null;
  }

  return {
    ...admin,
    gym_id: gym.id,
    gym_name: gym.gym_name,
    owner_name: gym.owner_name,
    phone: gym.phone,
    email: gym.email,
    website: gym.website,
    instagram_page: gym.instagram_page,
    address: gym.address,
    business_registration_name: gym.business_registration_name,
    owner_email: gym.owner_email,
    gym_photo_url: gym.gym_photo_url,
    gym_photo_urls: Array.isArray(gym.gym_photo_urls)
      ? gym.gym_photo_urls
      : typeof gym.gym_photo_url === "string" && gym.gym_photo_url
        ? [gym.gym_photo_url]
        : [],
    logo_url: gym.logo_url,
    gym_type: gym.gym_type,
    created_at: admin.created_at ?? gym.created_at,
    updated_at: gym.updated_at ?? admin.updated_at,
    gyms,
  };
}

export function getCookieOptions(maxAge?: number): CookieOptions {
  const sameSite: CookieOptions["sameSite"] =
    COOKIE_SAME_SITE === "strict"
      ? "strict"
      : COOKIE_SAME_SITE === "none"
        ? "none"
        : "lax";

  return {
    httpOnly: true,
    sameSite,
    secure: COOKIE_SECURE,
    path: "/",
    ...(maxAge ? { maxAge } : {}),
  };
}

function encryptCookieValue(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", COOKIE_ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decryptCookieValue(value?: string) {
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

export function setSessionCookies(res: Response, session: SessionPayload) {
  const accessMaxAge = session.expires_in ? session.expires_in * 1000 : 1000 * 60 * 60;

  res.cookie(
    SESSION_COOKIE_NAME,
    encryptCookieValue(session.access_token),
    getCookieOptions(accessMaxAge),
  );
  res.cookie(
    REFRESH_COOKIE_NAME,
    encryptCookieValue(session.refresh_token),
    getCookieOptions(REFRESH_COOKIE_MAX_AGE),
  );
}

export function clearSessionCookies(res: Response) {
  res.clearCookie(SESSION_COOKIE_NAME, getCookieOptions());
  res.clearCookie(REFRESH_COOKIE_NAME, getCookieOptions());
}

async function getAdminContext(adminId: string, gymIds?: string[]) {
  const { data: admin, error } = await supabase
    .from("admins")
    .select("*")
    .eq("id", adminId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!admin) {
    return null;
  }

  let gymsQuery = supabase
    .from("gyms")
    .select("*")
    .eq("admin_id", admin.id)
    .order("created_at", { ascending: true });

  if (gymIds && gymIds.length > 0) {
    gymsQuery = gymIds.length === 1 ? gymsQuery.eq("id", gymIds[0]) : gymsQuery.in("id", gymIds);
  }

  const { data: gyms, error: gymError } = await gymsQuery;

  if (gymError) {
    throw new Error(gymError.message);
  }

  const primaryGym = gyms?.[0] || null;
  return mergeAdminWithGym(admin, primaryGym, gyms || []);
}

export async function getAdminByAuthId(authId: string) {
  const { data: admin, error } = await supabase
    .from("admins")
    .select("*")
    .eq("auth_id", authId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!admin) {
    return null;
  }

  return getAdminContext(admin.id);
}

export async function getStaffByAuthId(authId: string) {
  const { data: staff, error } = await supabase
    .from("staff_accounts")
    .select("*")
    .eq("auth_user_id", authId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!staff || !staff.is_active) {
    return null;
  }

  const admin = await getAdminContext(staff.admin_id, [staff.gym_id]);
  if (!admin) {
    return null;
  }

  return {
    admin,
    staff: {
      ...staff,
      role: "trainer" as const,
      section_permissions: normalizeSectionPermissions(staff.section_permissions),
    } satisfies StaffSessionProfile,
  };
}

async function getUserFromAccessToken(accessToken: string) {
  const authClient = createSupabaseAuthClient();
  const { data, error } = await authClient.auth.getUser(accessToken);
  if (error || !data.user) {
    return null;
  }

  return data.user;
}

async function refreshSession(refreshToken: string) {
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

export async function resolveAuthenticatedUser(req: Request, res: Response) {
  const accessCookie = req.cookies[SESSION_COOKIE_NAME] as string | undefined;
  const refreshCookie = req.cookies[REFRESH_COOKIE_NAME] as string | undefined;
  const accessToken = decryptCookieValue(accessCookie);
  const refreshToken = decryptCookieValue(refreshCookie);

  if ((accessCookie && !accessToken) || (refreshCookie && !refreshToken)) {
    clearSessionCookies(res);
    return null;
  }

  const accessUser = accessToken ? await getUserFromAccessToken(accessToken) : null;

  if (accessUser) {
    return accessUser;
  }

  if (!refreshToken) {
    return null;
  }

  const refreshed = await refreshSession(refreshToken);
  if (!refreshed) {
    clearSessionCookies(res);
    return null;
  }

  setSessionCookies(res, refreshed.session);
  return refreshed.user;
}

export async function resolveAuthenticatedAdmin(req: Request, res: Response) {
  const user = await resolveAuthenticatedUser(req, res);
  if (!user) {
    return null;
  }

  const admin = await getAdminByAuthId(user.id);
  if (!admin) {
    return null;
  }

  return { user, admin };
}

export async function resolveAuthenticatedSession(req: Request, res: Response) {
  const user = await resolveAuthenticatedUser(req, res);
  if (!user) {
    return null;
  }

  const admin = await getAdminByAuthId(user.id);
  if (admin) {
    return {
      user,
      admin,
      staff: null,
      role: "admin" as SessionRole,
    };
  }

  const staffSession = await getStaffByAuthId(user.id);
  if (!staffSession) {
    return null;
  }

  return {
    user,
    admin: staffSession.admin,
    staff: staffSession.staff,
    role: staffSession.staff.role,
  };
}
