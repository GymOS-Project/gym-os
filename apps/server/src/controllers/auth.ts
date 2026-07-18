import type { CookieOptions, Request, Response } from "express";
import { createSupabaseAuthClient, supabase } from "../supabase";

const SESSION_COOKIE_NAME = "sessionToken";
const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 30;
const GYM_PHOTO_BUCKET = process.env.SUPABASE_GYM_PHOTO_BUCKET || "gym-photos";

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
