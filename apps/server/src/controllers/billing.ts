import type { Request, Response } from "express";
import { randomUUID } from "crypto";

import {
  createDodoCheckoutSession,
  decryptDraftPassword,
  finalizeSignup,
  getGymPhotoFiles,
  getPlanDefinition,
  parseSignupGyms,
  requiresScalePlan,
  retrieveDodoSubscription,
  uploadSignupDraftPhotos,
  verifyDodoWebhookSignature,
  encryptDraftPassword,
} from "../services/billing.service";
import { supabase } from "../supabase";

const ONBOARDING_PAYMENTS_ENABLED =
  (process.env.ONBOARDING_PAYMENTS_ENABLED ?? "false").toLowerCase() === "true";

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return value == null ? null : String(value);
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function getRawBody(req: Request) {
  const rawBody = (req as Request & { rawBody?: string }).rawBody;
  return typeof rawBody === "string" ? rawBody : "";
}

function parseWebhookPayload(req: Request) {
  const body = req.body;
  if (body && typeof body === "object" && !Array.isArray(body) && "data" in body) {
    return body as Record<string, any>;
  }

  const rawBody = getRawBody(req);
  if (rawBody) {
    try {
      return JSON.parse(rawBody) as Record<string, any>;
    } catch {}
  }

  if (body && typeof body === "object") {
    return body as Record<string, any>;
  }

  return null;
}

function getNestedOptionalString(source: unknown, paths: string[][]) {
  for (const path of paths) {
    let current = source as any;
    for (const key of path) {
      current = current?.[key];
    }

    const value = normalizeOptionalString(current);
    if (value) {
      return value;
    }
  }

  return null;
}

function getDodoWebhookId(req: Request) {
  return req.get("webhook-id") || req.get("x-webhook-id") || req.get("svix-id") || "";
}

function getDodoWebhookSignature(req: Request) {
  return req.get("webhook-signature") || req.get("x-webhook-signature") || req.get("svix-signature") || "";
}

function getDodoWebhookTimestamp(req: Request) {
  return req.get("webhook-timestamp") || req.get("x-webhook-timestamp") || req.get("svix-timestamp") || "";
}

function extractDodoEventFields(payload: Record<string, any>) {
  const data = payload?.data || {};
  const eventType = normalizeOptionalString(payload?.type);
  const draftId = getNestedOptionalString(payload, [
    ["data", "metadata", "draft_id"],
    ["data", "payment", "metadata", "draft_id"],
    ["data", "subscription", "metadata", "draft_id"],
    ["data", "checkout", "metadata", "draft_id"],
    ["data", "checkout_session", "metadata", "draft_id"],
    ["metadata", "draft_id"],
  ]);
  const paymentId = getNestedOptionalString(payload, [
    ["data", "payment_id"],
    ["data", "payment", "payment_id"],
    ["data", "payment", "id"],
  ]);
  const subscriptionId = getNestedOptionalString(payload, [
    ["data", "subscription_id"],
    ["data", "subscription", "subscription_id"],
    ["data", "subscription", "id"],
  ]);
  const checkoutId = getNestedOptionalString(payload, [
    ["data", "checkout_session_id"],
    ["data", "checkout_id"],
    ["data", "session_id"],
    ["data", "checkout", "session_id"],
    ["data", "checkout_session", "session_id"],
  ]);
  const providerStatus = normalizeOptionalString(data?.status) || eventType || "pending";

  return { data, eventType, draftId, paymentId, subscriptionId, checkoutId, providerStatus };
}

async function finalizeDodoSignupDraft(params: {
  draftId: string;
  paymentId: string | null;
  subscriptionId: string | null;
  checkoutId: string | null;
  webhookId: string | null;
  payload: Record<string, any>;
}) {
  const draftLookup = await supabase
    .from("billing_signup_drafts")
    .select("*")
    .eq("id", params.draftId)
    .maybeSingle();

  if (draftLookup.error) {
    throw new Error(draftLookup.error.message);
  }

  const draft = draftLookup.data;
  if (!draft) {
    return { ignored: true };
  }

  if (draft.status === "completed" && draft.admin_id) {
    return { finalized: true };
  }

  const gyms = Array.isArray(draft.signup_payload?.gyms) ? draft.signup_payload.gyms : [];
  const shouldStartTrial = draft.signup_payload?.start_trial === true || draft.signup_payload?.start_trial === "true";
  const finalizeResult = await finalizeSignup({
    authEmail: draft.auth_email,
    password: decryptDraftPassword(draft.encrypted_password),
    gymType: draft.gym_type === "branch" ? "branch" : "single",
    gyms,
    planCode: draft.plan_code,
    billingCycle: draft.billing_cycle === "yearly" ? "yearly" : "monthly",
    status: shouldStartTrial ? "trialing" : "active",
    gymPhotoUrls: Array.isArray(draft.photo_urls) ? draft.photo_urls : [],
    createSession: false,
  });

  await Promise.all([
    supabase.from("billing_signup_drafts").update({
      status: "completed",
      admin_id: finalizeResult.adminId,
      dodo_payment_id: params.paymentId,
      dodo_subscription_id: params.subscriptionId,
      updated_at: new Date().toISOString(),
    }).eq("id", params.draftId),
    supabase.from("billing_payments").update({
      status: "paid",
      admin_id: finalizeResult.adminId,
      provider: "dodo",
      dodo_checkout_id: params.checkoutId,
      dodo_payment_id: params.paymentId,
      dodo_subscription_id: params.subscriptionId,
      dodo_webhook_id: params.webhookId,
      raw_payload: params.payload,
      updated_at: new Date().toISOString(),
    }).eq("signup_draft_id", params.draftId),
  ]);

  return { finalized: true };
}

export async function createSignupCheckout(req: Request, res: Response) {
  if (!ONBOARDING_PAYMENTS_ENABLED) {
    return res.status(503).json({
      message: "Online payments are disabled for onboarding. Start the free trial and upgrade later.",
    });
  }

  const { password, gym_type, plan_code, billing_cycle, email, account_email, start_trial } = req.body as Record<string, unknown>;
  const planCode = normalizeOptionalString(plan_code) || "starter";
  const resolvedPlanCode = getPlanDefinition(planCode).code;
  const billingCycle = normalizeOptionalString(billing_cycle) === "yearly" ? "yearly" : "monthly";
  const startTrial = start_trial === true || start_trial === "true";
  let gyms;

  try {
    gyms = parseSignupGyms(req.body as Record<string, unknown>);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Invalid signup payload" });
  }

  if (requiresScalePlan(normalizeOptionalString(gym_type), resolvedPlanCode)) {
    return res.status(400).json({ message: "Branch onboarding is available on the Scale plan" });
  }

  const authEmail = normalizeOptionalString(email) || normalizeOptionalString(account_email) || gyms[0]?.owner_email || gyms[0]?.gym_email;
  if (!authEmail || typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ message: "A valid account email and password are required" });
  }

  try {
    const draftId = randomUUID();
    const photoUrls = await uploadSignupDraftPhotos(getGymPhotoFiles(req), draftId);

    const draftInsert = await supabase.from("billing_signup_drafts").insert({
      id: draftId,
      auth_email: authEmail,
      encrypted_password: encryptDraftPassword(password),
      gym_type,
      plan_code: resolvedPlanCode,
      billing_cycle: billingCycle,
      status: "pending_payment",
      signup_payload: { gyms, start_trial: startTrial },
      photo_urls: photoUrls,
    }).select("id").single();

    if (draftInsert.error) {
      return res.status(500).json({ message: draftInsert.error.message });
    }

    const checkoutSession = await createDodoCheckoutSession({
      draftId,
      planCode: resolvedPlanCode,
      billingCycle,
      customerName: gyms[0]?.owner_name || gyms[0]?.gym_name || "Gym owner",
      customerEmail: authEmail,
      customerPhone: gyms[0]?.phone || "9999999999",
      gymType: gym_type === "branch" ? "branch" : "single",
      startTrial,
    });

    const paymentInsert = await supabase.from("billing_payments").insert({
      signup_draft_id: draftId,
      plan_code: resolvedPlanCode,
      billing_cycle: billingCycle,
      amount: checkoutSession.amount,
      status: "checkout_created",
      provider: "dodo",
      dodo_checkout_id: checkoutSession.sessionId || null,
      dodo_payment_id: checkoutSession.paymentId,
      dodo_product_id: checkoutSession.productId,
      raw_payload: checkoutSession.raw,
    });

    if (paymentInsert.error) {
      return res.status(500).json({ message: paymentInsert.error.message });
    }

    await supabase.from("billing_signup_drafts").update({
      dodo_checkout_id: checkoutSession.sessionId || null,
      updated_at: new Date().toISOString(),
    }).eq("id", draftId);

    return res.status(201).json({
      draft_id: draftId,
      checkout_url: checkoutSession.checkoutUrl,
      link_url: checkoutSession.checkoutUrl,
    });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to initiate checkout" });
  }
}

export async function getSignupCheckoutStatus(req: Request, res: Response) {
  const draftId = req.params.id;
  if (!draftId) {
    return res.status(400).json({ message: "draft id is required" });
  }

  let draftResult = await supabase
    .from("billing_signup_drafts")
    .select("id, status, admin_id, auth_email, plan_code, billing_cycle, created_at, updated_at")
    .eq("id", draftId)
    .maybeSingle();

  if (draftResult.error) {
    return res.status(500).json({ message: draftResult.error.message });
  }
  if (!draftResult.data) {
    return res.status(404).json({ message: "Checkout not found" });
  }

  const returnStatus = normalizeOptionalString(req.query.status);
  const subscriptionId = normalizeOptionalString(req.query.subscription_id);
  const returnEmail = normalizeOptionalString(req.query.email);
  if (draftResult.data.status !== "completed" && returnStatus === "active" && subscriptionId) {
    try {
      const subscription = await retrieveDodoSubscription(subscriptionId);
      const subscriptionDraftId = normalizeOptionalString(subscription?.metadata?.draft_id);
      const subscriptionEmail = normalizeOptionalString(subscription?.customer?.email) || returnEmail;
      const subscriptionStatus = normalizeOptionalString(subscription?.status);

      if (
        subscriptionDraftId === draftId
        && subscriptionStatus === "active"
        && (!subscriptionEmail || subscriptionEmail.toLowerCase() === String(draftResult.data.auth_email).toLowerCase())
      ) {
        await finalizeDodoSignupDraft({
          draftId,
          paymentId: null,
          subscriptionId,
          checkoutId: null,
          webhookId: null,
          payload: { type: "subscription.verified_return", data: subscription },
        });

        draftResult = await supabase
          .from("billing_signup_drafts")
          .select("id, status, admin_id, auth_email, plan_code, billing_cycle, created_at, updated_at")
          .eq("id", draftId)
          .maybeSingle();
      }
    } catch (error) {
      console.error("[dodo] Failed to recover checkout status", error);
    }
  }

  const paymentResult = await supabase
    .from("billing_payments")
    .select("status, amount, provider, dodo_checkout_id, dodo_payment_id, dodo_subscription_id, updated_at")
    .eq("signup_draft_id", draftId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (draftResult.error) {
    return res.status(500).json({ message: draftResult.error.message });
  }
  if (paymentResult.error) {
    return res.status(500).json({ message: paymentResult.error.message });
  }
  if (!draftResult.data) {
    return res.status(404).json({ message: "Checkout not found" });
  }

  return res.json({
    draft_id: draftResult.data.id,
    status: draftResult.data.status,
    plan_code: draftResult.data.plan_code,
    billing_cycle: draftResult.data.billing_cycle,
    admin_id: draftResult.data.admin_id,
    payment: paymentResult.data || null,
  });
}

export async function handleDodoWebhook(req: Request, res: Response) {
  try {
    const webhookId = getDodoWebhookId(req);
    const signature = getDodoWebhookSignature(req);
    const timestamp = getDodoWebhookTimestamp(req);
    const rawBody = getRawBody(req) || JSON.stringify(req.body || {});
    verifyDodoWebhookSignature(rawBody, webhookId, timestamp, signature);

    const payload = parseWebhookPayload(req);
    if (!payload) {
      return res.status(400).json({ message: "Invalid Dodo Payments webhook payload" });
    }

    const { eventType, draftId, paymentId, subscriptionId, checkoutId, providerStatus } = extractDodoEventFields(payload);

    if (!draftId) {
      return res.status(200).json({ received: true, ignored: true });
    }

    const isSuccessEvent =
      eventType === "payment.succeeded"
      || eventType === "subscription.active"
      || (eventType?.startsWith("subscription.") && providerStatus === "active");
    if (!isSuccessEvent) {
      await supabase.from("billing_payments").update({
        status: eventType === "payment.failed" ? "failed" : providerStatus,
        provider: "dodo",
        dodo_checkout_id: checkoutId,
        dodo_payment_id: paymentId,
        dodo_subscription_id: subscriptionId,
        dodo_webhook_id: webhookId,
        raw_payload: payload,
        updated_at: new Date().toISOString(),
      }).eq("signup_draft_id", draftId);
      return res.status(200).json({ received: true, status: providerStatus });
    }

    const result = await finalizeDodoSignupDraft({ draftId, paymentId, subscriptionId, checkoutId, webhookId, payload });

    return res.status(200).json({ received: true, ...result });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to process webhook" });
  }
}
