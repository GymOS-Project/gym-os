import type { CookieOptions, Request, Response } from "express";
import { supabase } from "../supabase";

const SESSION_COOKIE_NAME = "sessionToken";
const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 30;

type AuthUser = {
  id: string;
  email: string;
};

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
    session.access_token,
    getCookieOptions(accessMaxAge)
  );
  res.cookie(
    REFRESH_COOKIE_NAME,
    session.refresh_token,
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

async function getUserFromAccessToken(accessToken: string) {
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    return null;
  }

  return data.user;
}

async function refreshSession(refreshToken: string) {
  const { data, error } = await supabase.auth.refreshSession({
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
  const accessToken = req.cookies[SESSION_COOKIE_NAME] as string | undefined;
  const refreshToken = req.cookies[REFRESH_COOKIE_NAME] as string | undefined;

  const accessUser = accessToken
    ? await getUserFromAccessToken(accessToken)
    : null;

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

function toAuthUser(user: { id: string; email?: string | null }): AuthUser {
  return {
    id: user.id,
    email: user.email ?? "",
  };
}

export async function signup(req: Request, res: Response) {
  const { email, password, gym_name, owner_name, phone, address } = req.body;

  if (!email || !password || !gym_name || !owner_name) {
    return res.status(400).json({
      message: "email, password, gym_name, and owner_name are required",
    });
  }

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    return res.status(400).json({ message: error.message });
  }

  if (data.user) {
    const { error: adminError } = await supabase.from("admins").insert({
      user_id: data.user.id,
      gym_name,
      owner_name,
      phone: phone || null,
      address: address || null,
    });

    if (adminError) {
      return res.status(500).json({ message: adminError.message });
    }
  }

  const signInResult = await supabase.auth.signInWithPassword({ email, password });

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

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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
  const token = req.cookies[SESSION_COOKIE_NAME] as string | undefined;

  clearSessionCookies(res);

  if (token) {
    await supabase.auth.admin.signOut(token).catch(() => {});
  }

  return res.json({ message: "Signed out" });
}

export async function me(req: Request, res: Response) {
  const user = await resolveAuthenticatedUser(req, res);

  if (!user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const admin = await getAdminByUserId(user.id);

  return res.json({ user: toAuthUser(user), admin, authenticated: true });
}
