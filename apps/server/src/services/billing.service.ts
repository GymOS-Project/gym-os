import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

import { createSupabaseAuthClient, supabase } from "../supabase";

const GYM_PHOTO_BUCKET = process.env.SUPABASE_GYM_PHOTO_BUCKET || "gym-photos";
const BILLING_ENCRYPTION_SECRET = process.env.BILLING_ENCRYPTION_SECRET
  || process.env.SESSION_COOKIE_SECRET
  || process.env.SUPABASE_SERVICE_ROLE_KEY;
const BILLING_ENCRYPTION_KEY = createHash("sha256")
  .update(BILLING_ENCRYPTION_SECRET || "billing-fallback")
  .digest();

export const BILLING_TRIAL_DAYS = 7;

export const BILLING_PLANS = {
  starter: {
    code: "starter",
    name: "Starter",
    monthlyPrice: 700,
    yearlyPrice: 7000,
    description: "For single gyms that want a complete operational base without the heavier automation layers.",
    features: [] as string[],
    limits: {
      max_gyms: 1,
      max_staff_accounts: 5,
      max_active_members: 300,
    },
  },
  growth: {
    code: "growth",
    name: "Growth",
    monthlyPrice: 1299,
    yearlyPrice: 12990,
    description: "For busy single-gym operations that need classes, PT workflows, coupons, and richer analytics.",
    features: ["classes", "pt_sessions", "coupons", "payment_analytics"] as string[],
    limits: {
      max_gyms: 1,
      max_staff_accounts: 15,
      max_active_members: 1200,
    },
  },
  scale: {
    code: "scale",
    name: "Scale",
    monthlyPrice: 2499,
    yearlyPrice: 24990,
    description: "For multi-branch gyms that need biometric integrations, payroll, auditing, and scale controls.",
    features: ["classes", "pt_sessions", "coupons", "payment_analytics", "multi_branch", "essl_integrations", "payroll", "activity_logs"] as string[],
    limits: {
      max_gyms: 10,
      max_staff_accounts: 50,
      max_active_members: 5000,
    },
  },
} as const;

export type BillingPlanCode = keyof typeof BILLING_PLANS;
export type BillingCycle = "monthly" | "yearly";
export type BillingStatus = "trialing" | "active" | "pending_payment" | "past_due" | "expired" | "cancelled";
export type BillingFeatureKey =
  | "classes"
  | "pt_sessions"
  | "coupons"
  | "payment_analytics"
  | "multi_branch"
  | "essl_integrations"
  | "payroll"
  | "activity_logs";
export type BillingLimitKey = "max_gyms" | "max_staff_accounts" | "max_active_members";

export type SignupGymPayload = {
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

export type BillingSubscriptionSummary = {
  plan_code: BillingPlanCode;
  plan_name: string;
  status: BillingStatus;
  billing_cycle: BillingCycle;
  monthly_price: number;
  yearly_price: number;
  description: string;
  features: BillingFeatureKey[];
  limits: Record<BillingLimitKey, number>;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
  is_trial: boolean;
  entitled: boolean;
  source: "subscription" | "legacy";
};

type FinalizeSignupParams = {
  authEmail: string;
  password: string;
  gymType: "single" | "branch";
  gyms: SignupGymPayload[];
  planCode: BillingPlanCode;
  billingCycle: BillingCycle;
  status: BillingStatus;
  gymPhotoUrls?: string[];
  createSession?: boolean;
};

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

export function getPlanDefinition(planCode: string | null | undefined) {
  const resolvedPlan = (planCode || "starter") as BillingPlanCode;
  return BILLING_PLANS[resolvedPlan] || BILLING_PLANS.starter;
}

export function isFeatureAvailableInPlan(planCode: string | null | undefined, feature: BillingFeatureKey) {
  return getPlanDefinition(planCode).features.includes(feature);
}

export function requiresScalePlan(gymType: string | null | undefined, planCode: string | null | undefined) {
  return gymType === "branch" && planCode !== "scale";
}

export function createLegacySubscriptionSummary(): BillingSubscriptionSummary {
  const plan = BILLING_PLANS.scale;
  return {
    plan_code: plan.code,
    plan_name: `${plan.name} (Legacy)`,
    status: "active",
    billing_cycle: "monthly",
    monthly_price: plan.monthlyPrice,
    yearly_price: plan.yearlyPrice,
    description: plan.description,
    features: [...plan.features] as BillingFeatureKey[],
    limits: { ...plan.limits },
    trial_ends_at: null,
    current_period_ends_at: null,
    is_trial: false,
    entitled: true,
    source: "legacy",
  };
}

function buildSubscriptionSummary(row: Record<string, any> | null): BillingSubscriptionSummary {
  if (!row) {
    return createLegacySubscriptionSummary();
  }

  const plan = getPlanDefinition(row.plan_code);
  const status = (row.status || "active") as BillingStatus;
  const entitled = status === "active" || status === "trialing";

  return {
    plan_code: plan.code,
    plan_name: plan.name,
    status,
    billing_cycle: row.billing_cycle === "yearly" ? "yearly" : "monthly",
    monthly_price: plan.monthlyPrice,
    yearly_price: plan.yearlyPrice,
    description: plan.description,
    features: entitled ? [...plan.features] as BillingFeatureKey[] : [],
    limits: { ...plan.limits },
    trial_ends_at: normalizeOptionalString(row.trial_ends_at),
    current_period_ends_at: normalizeOptionalString(row.current_period_ends_at),
    is_trial: status === "trialing",
    entitled,
    source: "subscription",
  };
}

export function hasBillingFeature(subscription: BillingSubscriptionSummary | null | undefined, feature: BillingFeatureKey) {
  const resolved = subscription || createLegacySubscriptionSummary();
  if (resolved.status === "trialing") {
    return resolved.entitled && isFeatureAvailableInPlan(resolved.plan_code, feature);
  }

  return resolved.entitled && resolved.features.includes(feature);
}

export function getBillingLimit(subscription: BillingSubscriptionSummary | null | undefined, limit: BillingLimitKey) {
  const resolved = subscription || createLegacySubscriptionSummary();
  if (resolved.status === "trialing" && resolved.entitled) {
    return getPlanDefinition(resolved.plan_code).limits[limit];
  }

  return resolved.limits[limit];
}

export async function getAdminSubscriptionSummary(adminId: string) {
  const { data, error } = await supabase
    .from("admin_subscriptions")
    .select("*")
    .eq("admin_id", adminId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return buildSubscriptionSummary(data || null);
}

export async function createAdminSubscription(params: {
  adminId: string;
  planCode: BillingPlanCode;
  billingCycle: BillingCycle;
  status: BillingStatus;
  trialDays?: number;
}) {
  const now = new Date();
  const nextPeriod = new Date(now);
  nextPeriod.setMonth(nextPeriod.getMonth() + (params.billingCycle === "yearly" ? 12 : 1));
  const trialEndsAt = params.status === "trialing"
    ? new Date(now.getTime() + (params.trialDays || BILLING_TRIAL_DAYS) * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { error } = await supabase.from("admin_subscriptions").insert({
    admin_id: params.adminId,
    plan_code: params.planCode,
    billing_cycle: params.billingCycle,
    status: params.status,
    trial_starts_at: params.status === "trialing" ? now.toISOString() : null,
    trial_ends_at: trialEndsAt,
    current_period_starts_at: now.toISOString(),
    current_period_ends_at: nextPeriod.toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function uploadFileToBucket(file: Express.Multer.File, objectPath: string) {
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

export async function uploadSignupDraftPhotos(files: Express.Multer.File[], draftId: string) {
  return Promise.all(files.map((file, index) => {
    const extension = file.originalname.includes(".") ? file.originalname.split(".").pop()?.toLowerCase() || "jpg" : "jpg";
    return uploadFileToBucket(file, `signup-drafts/${draftId}/${Date.now()}-${index}.${extension}`);
  }));
}

export function getGymPhotoFiles(req: { files?: Express.Multer.File[] | Record<string, Express.Multer.File[]> }) {
  const files = Array.isArray(req.files) ? req.files : [];
  return files
    .filter((file) => file.fieldname === "gym_photo" || /^gym_photos(?:\[\d+\])?$/.test(file.fieldname))
    .slice(0, 10);
}

export function parseSignupGyms(body: Record<string, unknown>) {
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

function getPublicFrontendUrl() {
  const url = process.env.FRONTEND_URL;
  if (!url) {
    throw new Error("FRONTEND_URL must be configured for checkout return URLs");
  }

  return url.replace(/\/$/, "");
}

function getDodoPaymentsBaseUrl() {
  const environment = (process.env.DODO_PAYMENTS_ENV || process.env.DODO_PAYMENTS_ENVIRONMENT || "test").toLowerCase();
  return environment === "live" || environment === "live_mode" || environment === "production"
    ? "https://live.dodopayments.com"
    : "https://test.dodopayments.com";
}

function getDodoProductEnvName(planCode: BillingPlanCode, billingCycle: BillingCycle) {
  return `DODO_PRODUCT_${planCode.toUpperCase()}_${billingCycle.toUpperCase()}`;
}

function getDodoProductId(planCode: BillingPlanCode, billingCycle: BillingCycle) {
  const envName = getDodoProductEnvName(planCode, billingCycle);
  const productId = process.env[envName];
  if (!productId) {
    throw new Error(`${envName} must be configured for Dodo Payments checkout`);
  }

  return productId;
}

export async function createDodoCheckoutSession(params: {
  draftId: string;
  planCode: BillingPlanCode;
  billingCycle: BillingCycle;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string;
  gymType: "single" | "branch";
  startTrial: boolean;
}) {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY;

  if (!apiKey) {
    throw new Error("DODO_PAYMENTS_API_KEY is not configured");
  }

  const plan = getPlanDefinition(params.planCode);
  const amount = params.billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
  const productId = getDodoProductId(params.planCode, params.billingCycle);
  const response = await fetch(`${getDodoPaymentsBaseUrl()}/checkouts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "Idempotency-Key": `signup_${params.draftId}`,
    },
    body: JSON.stringify({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: {
        email: params.customerEmail,
        name: params.customerName,
      },
      billing_currency: process.env.DODO_PAYMENTS_CURRENCY || "INR",
      billing_address: {
        country: process.env.DODO_PAYMENTS_COUNTRY || "IN",
      },
      metadata: {
        draft_id: params.draftId,
        plan_code: params.planCode,
        billing_cycle: params.billingCycle,
        gym_type: params.gymType,
        customer_phone: params.customerPhone,
        start_trial: String(params.startTrial),
      },
      return_url: `${getPublicFrontendUrl()}/signup/checkout-status?draft=${params.draftId}`,
    }),
  });

  const json = await response.json().catch(() => null) as Record<string, any> | null;
  if (!response.ok || !json?.checkout_url) {
    throw new Error(json?.message || json?.error?.message || "Failed to create Dodo Payments checkout session");
  }

  return {
    sessionId: String(json.session_id || json.id || ""),
    paymentId: json.payment_id ? String(json.payment_id) : null,
    productId,
    amount,
    checkoutUrl: String(json.checkout_url),
    raw: json,
  };
}

export function encryptDraftPassword(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", BILLING_ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decryptDraftPassword(value: string) {
  const payload = Buffer.from(value, "base64url");
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", BILLING_ENCRYPTION_KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

function normalizeDodoSignatureCandidates(signature: string) {
  return signature
    .split(" ")
    .flatMap((part) => part.split(","))
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.includes("=") ? part.split("=").pop() || "" : part)
    .filter(Boolean);
}

export function verifyDodoWebhookSignature(rawBody: string, webhookId: string, timestamp: string, signature: string) {
  const secret = process.env.DODO_PAYMENTS_WEBHOOK_KEY || process.env.DODO_PAYMENTS_WEBHOOK_SECRET || process.env.DODO_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Dodo Payments webhook secret is not configured");
  }

  if (!rawBody || !webhookId || !timestamp || !signature) {
    throw new Error("Missing Dodo Payments webhook signature headers");
  }

  const signedContent = `${webhookId}.${timestamp}.${rawBody}`;
  const secrets = secret.startsWith("whsec_")
    ? [secret, Buffer.from(secret.slice("whsec_".length), "base64")]
    : [secret];
  const expected = secrets.map((candidate) => createHmac("sha256", candidate).update(signedContent).digest("base64"));
  const received = normalizeDodoSignatureCandidates(signature);

  const isValid = expected.some((computed) => received.some((candidate) => {
    const left = Buffer.from(computed);
    const right = Buffer.from(candidate);
    return left.length === right.length && timingSafeEqual(left, right);
  }));

  if (!isValid) {
    throw new Error("Invalid Dodo Payments webhook signature");
  }
}

async function cleanupAuthUser(userId: string) {
  await supabase.auth.admin.deleteUser(userId).catch(() => {});
}

async function cleanupAdminRecord(adminId: string) {
  await supabase.from("admins").delete().eq("id", adminId);
}

export async function finalizeSignup(params: FinalizeSignupParams) {
  const signupClient = createSupabaseAuthClient();
  const { data, error } = await signupClient.auth.signUp({ email: params.authEmail, password: params.password });
  if (error || !data.user) {
    throw new Error(error?.message || "Failed to create account");
  }

  let createdAdminId: string | null = null;

  try {
    const gymPhotoUrls = params.gymPhotoUrls || [];
    const primaryPhoto = gymPhotoUrls[0] || null;

    const { data: admin, error: adminError } = await supabase.from("admins").insert({
      auth_id: data.user.id,
    }).select("id").single();

    if (adminError || !admin) {
      await cleanupAuthUser(data.user.id);
      throw new Error(adminError?.message || "Failed to create admin account");
    }

    createdAdminId = admin.id;

    const { error: gymError } = await supabase.from("gyms").insert(
      params.gyms.map((gym, index) => ({
        admin_id: admin.id,
        gym_type: params.gymType,
        gym_name: gym.gym_name,
        owner_name: gym.owner_name,
        phone: gym.phone,
        email: gym.gym_email,
        website: gym.website,
        instagram_page: gym.instagram_page,
        address: gym.address,
        business_registration_name: gym.business_registration_name,
        owner_email: gym.owner_email,
        gym_photo_url: index === 0 ? primaryPhoto : null,
        gym_photo_urls: index === 0 ? gymPhotoUrls : [],
      })),
    );

    if (gymError) {
      await cleanupAdminRecord(admin.id);
      await cleanupAuthUser(data.user.id);
      throw new Error(gymError.message);
    }

    await createAdminSubscription({
      adminId: admin.id,
      planCode: params.planCode,
      billingCycle: params.billingCycle,
      status: params.status,
      trialDays: BILLING_TRIAL_DAYS,
    });

    if (!params.createSession) {
      return { userId: data.user.id, adminId: admin.id };
    }

    const signInClient = createSupabaseAuthClient();
    const signInResult = await signInClient.auth.signInWithPassword({ email: params.authEmail, password: params.password });
    return {
      userId: data.user.id,
      adminId: admin.id,
      session: signInResult.data.session || null,
      user: signInResult.data.user || data.user,
    };
  } catch (error) {
    if (createdAdminId) {
      await cleanupAdminRecord(createdAdminId);
    }

    await cleanupAuthUser(data.user.id);
    throw error;
  }
}

export async function countAdminUsage(adminId: string, table: "gyms" | "staff_accounts" | "members") {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("admin_id", adminId);

  if (error) {
    throw new Error(error.message);
  }

  return count || 0;
}

function randomUUID() {
  return globalThis.crypto?.randomUUID?.() || randomBytes(16).toString("hex");
}
