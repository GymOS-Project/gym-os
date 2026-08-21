import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/sessionAuth.middleware";
import {
  clearSessionCookies,
  decryptCookieValue,
  getAdminByAuthId,
  getStaffByAuthId,
  resolveAuthenticatedSession,
  setSessionCookies
} from "../services/authSession.service";
import { sendGymOnboardingWelcomeEmail } from "../services/email.service";
import { ensureGymBelongsToAdmin } from "../services/gymScope.service";
import { countAdminUsage, createAdminSubscription, getAdminSubscriptionSummary, getBillingLimit, requiresScalePlan } from "../services/billing.service";
import { createSupabaseAuthClient, supabase } from "../supabase";

const SESSION_COOKIE_NAME = "sessionToken";
const GYM_PHOTO_BUCKET = process.env.SUPABASE_GYM_PHOTO_BUCKET || "gym-photos";
const ADMIN_LOGO_BUCKET = process.env.SUPABASE_ADMIN_LOGO_BUCKET || GYM_PHOTO_BUCKET;
const MAX_GYM_PHOTOS = 10;

function normalizeBaseUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const first = value.split(/[,\s]+/).map((entry) => entry.trim()).filter(Boolean)[0];
  if (!first) return null;
  return first.replace(/\/$/, "");
}

const PASSWORD_RESET_REDIRECT_URL =
  normalizeBaseUrl(process.env.PASSWORD_RESET_REDIRECT_URL)
  || (normalizeBaseUrl(process.env.FRONTEND_URL) ? `${normalizeBaseUrl(process.env.FRONTEND_URL)}/reset-password` : null);

type AuthUser = {
  id: string;
  email: string;
};

type SignupGymPayload = {
  gym_name: string;
  business_registration_name: string | null;
  gym_email: string | null;
  website: string | null;
  instagram_page: string | null;
  address: string | null;
  owner_name: string;
  phone: string;
  owner_email: string | null;
};

type GymDetailsPayload = SignupGymPayload;

function isSupabaseConnectivityErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("unable to connect") ||
    normalized.includes("fetch failed") ||
    normalized.includes("econnrefused") ||
    normalized.includes("enotfound") ||
    normalized.includes("etimedout") ||
    normalized.includes("network") ||
    normalized.includes("getaddrinfo")
  );
}

function respondSupabaseAuthError(res: Response, error: { message?: string } | null, fallbackStatus = 400) {
  if (!error) return null;

  const message = error.message || "Unknown authentication error";
  if (isSupabaseConnectivityErrorMessage(message)) {
    return res.status(503).json({ message: "Auth service is unavailable. Please try again later." });
  }

  return res.status(fallbackStatus).json({ message });
}


async function uploadAdminImage(file: Express.Multer.File, userId: string, bucket: string, folder: string) {
  const fileExt = file.originalname.includes(".")
    ? file.originalname.split(".").pop()?.toLowerCase()
    : "jpg";
  const safeExt = fileExt || "jpg";
  const objectPath = `admins/${userId}/${folder}/${Date.now()}.${safeExt}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(objectPath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  return data.publicUrl;
}

async function uploadGymPhoto(file: Express.Multer.File, userId: string) {
  return uploadAdminImage(file, userId, GYM_PHOTO_BUCKET, "gym-photos");
}

async function uploadGymPhotos(files: Express.Multer.File[], userId: string) {
  return Promise.all(files.map((file) => uploadGymPhoto(file, userId)));
}

async function uploadAdminLogo(file: Express.Multer.File, userId: string) {
  return uploadAdminImage(file, userId, ADMIN_LOGO_BUCKET, "logos");
}

function getGymPhotoFiles(req: Request) {
  const files = Array.isArray(req.files) ? req.files : [];

  return files
    .filter((file) => file.fieldname === "gym_photo" || /^gym_photos(?:\[\d+\])?$/.test(file.fieldname))
    .slice(0, MAX_GYM_PHOTOS);
}

function getUploadedFile(req: Request, ...fieldNames: string[]) {
  const files = Array.isArray(req.files) ? req.files : [];
  return files.find((file) => fieldNames.includes(file.fieldname));
}

function hasOwn(body: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return value == null ? null : String(value);
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeRequiredString(value: unknown) {
  const normalized = normalizeOptionalString(value);
  return typeof normalized === "string" ? normalized : "";
}

function parseSignupGyms(body: Record<string, unknown>) {
  const gymType = body.gym_type;

  if (gymType !== "single" && gymType !== "branch") {
    throw new Error("gym_type must be either single or branch");
  }

  if (gymType === "branch") {
    const rawBranches = typeof body.branches_payload === "string" ? body.branches_payload : "[]";
    let parsed: unknown;

    try {
      parsed = JSON.parse(rawBranches);
    } catch {
      throw new Error("branches_payload must be valid JSON");
    }

    if (!Array.isArray(parsed) || parsed.length < 2) {
      throw new Error("Branch gyms must include at least 2 branches");
    }

    return parsed.map((branch, index) => {
      const payload = (branch || {}) as Record<string, unknown>;
      const gym = {
        gym_name: normalizeRequiredString(payload.gym_name),
        business_registration_name: normalizeOptionalString(payload.business_registration_name),
        gym_email: normalizeOptionalString(payload.gym_email),
        website: normalizeOptionalString(payload.website),
        instagram_page: normalizeOptionalString(payload.instagram_page),
        address: normalizeOptionalString(payload.address),
        owner_name: normalizeRequiredString(payload.owner_name),
        phone: normalizeRequiredString(payload.phone),
        owner_email: normalizeOptionalString(payload.owner_email),
      } satisfies SignupGymPayload;

      if (!gym.gym_name || !gym.owner_name || !gym.phone || !gym.gym_email || !gym.address || !gym.owner_email || !gym.business_registration_name) {
        throw new Error(`Branch ${index + 1} is missing required fields`);
      }

      return gym;
    });
  }

  const gym = {
    gym_name: normalizeRequiredString(body.gym_name),
    business_registration_name: normalizeOptionalString(body.business_registration_name),
    gym_email: normalizeOptionalString(body.gym_email),
    website: normalizeOptionalString(body.website),
    instagram_page: normalizeOptionalString(body.instagram_page ?? body.instagram),
    address: normalizeOptionalString(body.address),
    owner_name: normalizeRequiredString(body.owner_name),
    phone: normalizeRequiredString(body.phone),
    owner_email: normalizeOptionalString(body.owner_email),
  } satisfies SignupGymPayload;

  if (!gym.gym_name || !gym.owner_name || !gym.phone || !gym.gym_email || !gym.address || !gym.owner_email || !gym.business_registration_name) {
    throw new Error("All gym and owner fields are required");
  }

  return [gym];
}

function parseGymDetails(payload: Record<string, unknown>) {
  const gym = {
    gym_name: normalizeRequiredString(payload.gym_name),
    business_registration_name: normalizeOptionalString(payload.business_registration_name),
    gym_email: normalizeOptionalString(payload.gym_email),
    website: normalizeOptionalString(payload.website),
    instagram_page: normalizeOptionalString(payload.instagram_page),
    address: normalizeOptionalString(payload.address),
    owner_name: normalizeRequiredString(payload.owner_name),
    phone: normalizeRequiredString(payload.phone),
    owner_email: normalizeOptionalString(payload.owner_email),
  } satisfies GymDetailsPayload;

  if (!gym.gym_name || !gym.owner_name || !gym.phone || !gym.gym_email || !gym.address || !gym.owner_email || !gym.business_registration_name) {
    throw new Error("All new branch fields are required");
  }

  return gym;
}

async function getAdminGyms(adminId: string) {
  const { data, error } = await supabase
    .from("gyms")
    .select("*")
    .eq("admin_id", adminId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

function toAuthUser(user: { id: string; email?: string | null }): AuthUser {
  return {
    id: user.id,
    email: user.email ?? "",
  };
}

async function cleanupAuthUser(userId: string) {
  await supabase.auth.admin.deleteUser(userId).catch(() => {});
}

async function cleanupAdminRecord(adminId: string) {
  await supabase.from("admins").delete().eq("id", adminId);
}

async function cleanupGymRecord(adminId: string, gymId: string) {
  await supabase.from("gyms").delete().eq("id", gymId).eq("admin_id", adminId);
}

export async function signup(req: Request, res: Response) {
  const {
    email,
    account_email,
    password,
    gym_type,
    plan_code,
    billing_cycle,
    start_trial,
  } = req.body;
  let gyms: SignupGymPayload[];

  try {
    gyms = parseSignupGyms(req.body as Record<string, unknown>);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Invalid signup payload" });
  }

  const primaryGym = gyms[0];
  const authEmail = email || account_email || primaryGym.owner_email || primaryGym.gym_email;
  const gymPhotoFiles = getGymPhotoFiles(req);

  if (!authEmail || !password || !gym_type) {
    return res.status(400).json({
      message: "email, password, and gym_type are required",
    });
  }

  if (gym_type !== "single" && gym_type !== "branch") {
    return res.status(400).json({ message: "gym_type must be either single or branch" });
  }

  if (requiresScalePlan(gym_type, typeof plan_code === "string" ? plan_code : null)) {
    return res.status(400).json({ message: "Branch onboarding is available on the Scale plan" });
  }

  const signupClient = createSupabaseAuthClient();
  const { data, error } = await signupClient.auth.signUp({ email: authEmail, password });
  if (error) {
    return res.status(400).json({ message: error.message });
  }

  if (data.user) {
    let gymPhotoUrl: string | null = null;
    let gymPhotoUrls: string[] = [];
    let createdAdminId: string | null = null;

    try {
      if (gymPhotoFiles.length > 0) {
        gymPhotoUrls = await uploadGymPhotos(gymPhotoFiles, data.user.id);
        gymPhotoUrl = gymPhotoUrls[0] || null;
      }

      const { data: admin, error: adminError } = await supabase.from("admins").insert({
        auth_id: data.user.id,
      }).select("id").single();

      if (adminError || !admin) {
        await cleanupAuthUser(data.user.id);
        return res.status(500).json({ message: adminError?.message || "Failed to create admin account" });
      }

      createdAdminId = admin.id;

      const { error: gymError } = await supabase.from("gyms").insert(
        gyms.map((gym, index) => ({
          admin_id: admin.id,
          gym_type,
          gym_name: gym.gym_name,
          owner_name: gym.owner_name,
          phone: gym.phone,
          email: gym.gym_email,
          website: gym.website,
          instagram_page: gym.instagram_page,
          address: gym.address,
          business_registration_name: gym.business_registration_name,
          owner_email: gym.owner_email,
          gym_photo_url: index === 0 ? gymPhotoUrl : null,
          gym_photo_urls: index === 0 ? gymPhotoUrls : [],
        })),
      );

       if (gymError) {
         await cleanupAdminRecord(admin.id);
         await cleanupAuthUser(data.user.id);
         return res.status(500).json({ message: gymError.message });
       }

       if (typeof plan_code === "string" && plan_code) {
         await createAdminSubscription({
           adminId: admin.id,
           planCode: plan_code as any,
           billingCycle: billing_cycle === "yearly" ? "yearly" : "monthly",
           status: start_trial === true || start_trial === "true" ? "trialing" : "active",
         });
       }

       const recipientEmail = data.user.email || authEmail;
      if (recipientEmail) {
        void sendGymOnboardingWelcomeEmail({
          to: recipientEmail,
          ownerName: primaryGym.owner_name,
          gymName: primaryGym.gym_name,
          gymType: gym_type,
          gymCount: gyms.length,
        }).catch((emailError) => {
          console.error("Failed to send onboarding welcome email", emailError);
        });
      }
    } catch (uploadError) {
      if (createdAdminId) {
        await cleanupAdminRecord(createdAdminId);
      }

      await cleanupAuthUser(data.user.id);
      return res.status(500).json({ message: uploadError instanceof Error ? uploadError.message : "Failed to create account" });
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

  const admin = await getAdminByAuthId(signInResult.data.user.id);
  const staffSession = admin ? null : await getStaffByAuthId(signInResult.data.user.id);

  return res.status(201).json({
    message: "Account created successfully.",
    user: toAuthUser(signInResult.data.user),
    admin,
    staff: staffSession?.staff || null,
    role: admin ? "admin" : staffSession ? "staff" : null,
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
    return respondSupabaseAuthError(res, error, 401);
  }

  if (!data.session || !data.user) {
    return res.status(401).json({ message: "Unable to create session" });
  }

  setSessionCookies(res, data.session);

  const admin = await getAdminByAuthId(data.user.id);
  const staffSession = admin ? null : await getStaffByAuthId(data.user.id);

  return res.json({
    user: toAuthUser(data.user),
    admin: admin || staffSession?.admin || null,
    staff: staffSession?.staff || null,
    role: admin ? "admin" : staffSession ? "staff" : null,
    authenticated: true,
  });
}

export async function forgotPassword(req: Request, res: Response) {
  const email = normalizeOptionalString(req.body?.email);

  if (!email) {
    return res.status(400).json({ message: "email is required" });
  }

  if (!PASSWORD_RESET_REDIRECT_URL) {
    return res.status(500).json({
      message: "Password reset redirect URL is not configured. Set PASSWORD_RESET_REDIRECT_URL or FRONTEND_URL.",
    });
  }
  const authClient = createSupabaseAuthClient();
  const { error } = await authClient.auth.resetPasswordForEmail(email, {
    redirectTo: PASSWORD_RESET_REDIRECT_URL,
  });

  if (error) {
    return respondSupabaseAuthError(res, error, 400);
  }

  return res.json({ message: "If the account exists, a password reset link has been sent." });
}

export async function resetPassword(req: Request, res: Response) {
  const accessToken = normalizeOptionalString(req.body?.access_token);
  const refreshToken = normalizeOptionalString(req.body?.refresh_token);
  const newPassword = normalizeOptionalString(req.body?.new_password);

  if (!accessToken || !newPassword) {
    return res.status(400).json({ message: "access_token and new_password are required" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  const authClient = createSupabaseAuthClient();
  const { data: userResult, error: userError } = refreshToken
    ? await authClient.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
    : await authClient.auth.getUser(accessToken);

  if (userError || !userResult.user?.id || !userResult.user.email) {
    return res.status(400).json({ message: "Invalid or expired reset link" });
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(userResult.user.id, {
    password: newPassword,
  });

  if (updateError) {
    return res.status(500).json({ message: updateError.message });
  }

  const signInClient = createSupabaseAuthClient();
  const signInResult = await signInClient.auth.signInWithPassword({
    email: userResult.user.email,
    password: newPassword,
  });

  if (signInResult.error || !signInResult.data.session || !signInResult.data.user) {
    return res.status(500).json({ message: signInResult.error?.message || "Password updated, but failed to create a new session" });
  }

  setSessionCookies(res, signInResult.data.session);

  const admin = await getAdminByAuthId(signInResult.data.user.id);
  const staffSession = admin ? null : await getStaffByAuthId(signInResult.data.user.id);

  return res.json({
    user: toAuthUser(signInResult.data.user),
    admin: admin || staffSession?.admin || null,
    staff: staffSession?.staff || null,
    role: admin ? "admin" : staffSession ? "staff" : null,
    authenticated: true,
    message: "Password updated successfully.",
  });
}

export async function updatePassword(req: AuthenticatedRequest, res: Response) {
  const userId = req.authUser?.id;
  const email = req.authUser?.email || null;
  const currentPassword = normalizeOptionalString(req.body?.current_password);
  const newPassword = normalizeOptionalString(req.body?.new_password);

  if (!userId || !email) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "current_password and new_password are required" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({ message: "New password must be different from the current password" });
  }

  const verifyClient = createSupabaseAuthClient();
  const verifyResult = await verifyClient.auth.signInWithPassword({ email, password: currentPassword });
  if (verifyResult.error) {
    return res.status(401).json({ message: "Current password is incorrect" });
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (updateError) {
    return res.status(500).json({ message: updateError.message });
  }

  const signInClient = createSupabaseAuthClient();
  const signInResult = await signInClient.auth.signInWithPassword({ email, password: newPassword });
  if (signInResult.error || !signInResult.data.session) {
    return res.status(500).json({ message: signInResult.error?.message || "Password updated, but failed to refresh the session" });
  }

  setSessionCookies(res, signInResult.data.session);
  return res.json({ message: "Password updated successfully" });
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
  const session = await resolveAuthenticatedSession(req, res);

  if (!session) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  return res.json({
    user: toAuthUser(session.user),
    admin: session.admin,
    staff: session.staff,
    role: session.role,
    authenticated: true,
  });
}

export async function upgradeSingleGymToBranch(req: AuthenticatedRequest, res: Response) {
  const adminId = req.admin?.id;
  const userId = req.authUser?.id;

  if (!adminId || !userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  let newGym: GymDetailsPayload;

  try {
    newGym = parseGymDetails(req.body as Record<string, unknown>);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Invalid branch upgrade payload" });
  }

  try {
    const admin = await getAdminByAuthId(userId);

    if (!admin || admin.gym_type !== "single" || !Array.isArray(admin.gyms) || admin.gyms.length !== 1) {
      return res.status(400).json({ message: "Only single-gym accounts can upgrade to branch mode" });
    }

    const currentGyms = await getAdminGyms(adminId);

    if (currentGyms.length !== 1) {
      return res.status(400).json({ message: "This account is no longer eligible for branch upgrade setup" });
    }

    const subscription = await getAdminSubscriptionSummary(adminId);
    const gymLimit = getBillingLimit(subscription, "max_gyms");
    const currentGymCount = await countAdminUsage(adminId, "gyms");
    if (currentGymCount >= gymLimit) {
      return res.status(403).json({ message: `Your current plan allows up to ${gymLimit} gyms. Upgrade to add more branches.` });
    }

    const upgradeTimestamp = new Date().toISOString();

    const { data: insertedBranch, error: insertBranchError } = await supabase.from("gyms").insert({
      admin_id: adminId,
      gym_type: "branch",
      gym_name: newGym.gym_name,
      owner_name: newGym.owner_name,
      phone: newGym.phone,
      email: newGym.gym_email,
      website: newGym.website,
      instagram_page: newGym.instagram_page,
      address: newGym.address,
      business_registration_name: newGym.business_registration_name,
      owner_email: newGym.owner_email,
    }).select("id").single();

    if (insertBranchError || !insertedBranch) {
      return res.status(500).json({ message: insertBranchError?.message || "Failed to create new branch" });
    }

    const { error: updateExistingGymsError } = await supabase
      .from("gyms")
      .update({
        gym_type: "branch",
        updated_at: upgradeTimestamp,
      })
      .eq("admin_id", adminId)
      .neq("id", insertedBranch.id);

    if (updateExistingGymsError) {
      await cleanupGymRecord(adminId, insertedBranch.id);
      return res.status(500).json({ message: updateExistingGymsError.message });
    }

    const refreshedAdmin = await getAdminByAuthId(userId);
    return res.json(refreshedAdmin);
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to upgrade account to branch mode" });
  }
}

export async function updateAdmin(req: AuthenticatedRequest, res: Response) {
  const adminId = req.admin?.id;
  const userId = req.authUser?.id;

  if (!adminId || !userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const body = req.body as Record<string, unknown>;
  const gymUpdates: Record<string, unknown> = {};
  const selectedGymId = normalizeOptionalString(body.gym_id);

  if (hasOwn(body, "gym_type")) {
    return res.status(400).json({
      message: req.admin?.gym_type === "single"
        ? "Gym type changes are locked. Submit a branch upgrade request first."
        : "Gym type cannot be changed from settings.",
    });
  }

  const requiredFields = [
    { key: "owner_name", label: "owner_name" },
    { key: "gym_name", label: "gym_name" },
  ];

  for (const field of requiredFields) {
    if (hasOwn(body, field.key)) {
      const value = normalizeOptionalString(body[field.key]);
      if (!value) {
        return res.status(400).json({ message: `${field.label} cannot be empty` });
      }
      gymUpdates[field.key] = value;
    }
  }

  const optionalFields = [
    "phone",
    "email",
    "website",
    "instagram_page",
    "address",
    "business_registration_name",
    "owner_email",
  ];

  for (const field of optionalFields) {
    if (hasOwn(body, field)) {
      const value = normalizeOptionalString(body[field]);
      gymUpdates[field] = value;
    }
  }

  const profileImageFile = getUploadedFile(req, "profile_image", "logo_image", "logo");
  const gymPhotoFiles = getGymPhotoFiles(req);
  const gymPhotoFile = gymPhotoFiles[0] || getUploadedFile(req, "gym_photo", "cover_image");

  const targetGymId = typeof selectedGymId === "string"
    ? selectedGymId
    : typeof req.admin?.gym_id === "string"
      ? req.admin.gym_id
      : null;

  if (!targetGymId) {
    return res.status(400).json({ message: "gym_id is required" });
  }

  try {
    const belongsToAdmin = await ensureGymBelongsToAdmin(adminId, targetGymId);
    if (!belongsToAdmin) {
      return res.status(403).json({ message: "Invalid gym" });
    }
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to validate gym" });
  }

  try {
    if (profileImageFile) {
      gymUpdates.logo_url = await uploadAdminLogo(profileImageFile, userId);
    }

    if (gymPhotoFiles.length > 0) {
      const uploadedGymPhotoUrls = await uploadGymPhotos(gymPhotoFiles, userId);
      gymUpdates.gym_photo_urls = uploadedGymPhotoUrls;
      gymUpdates.gym_photo_url = uploadedGymPhotoUrls[0] || null;
    } else if (gymPhotoFile) {
      gymUpdates.gym_photo_url = await uploadGymPhoto(gymPhotoFile, userId);
      gymUpdates.gym_photo_urls = gymUpdates.gym_photo_url ? [gymUpdates.gym_photo_url] : [];
    }
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to upload image" });
  }

  if (Object.keys(gymUpdates).length === 0) {
    const admin = await getAdminByAuthId(userId);
    return res.json(admin);
  }

  gymUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("gyms")
    .update(gymUpdates)
    .eq("id", targetGymId)
    .eq("admin_id", adminId)
    .select("*")
    .single();

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  const admin = await getAdminByAuthId(userId);
  return res.json(admin);
}
