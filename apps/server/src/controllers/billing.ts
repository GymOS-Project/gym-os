import type { Request, Response } from "express";
import { randomUUID } from "crypto";

import {
  createCashfreePaymentLink,
  decryptDraftPassword,
  finalizeSignup,
  getGymPhotoFiles,
  parseSignupGyms,
  requiresScalePlan,
  uploadSignupDraftPhotos,
  verifyCashfreeWebhookSignature,
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

export async function createSignupCheckout(req: Request, res: Response) {
  if (!ONBOARDING_PAYMENTS_ENABLED) {
    return res.status(503).json({
      message: "Online payments are disabled for onboarding. Start the free trial and upgrade later.",
    });
  }

  const { password, gym_type, plan_code, billing_cycle, email, account_email } = req.body as Record<string, unknown>;
  const planCode = normalizeOptionalString(plan_code) || "starter";
  const billingCycle = normalizeOptionalString(billing_cycle) === "yearly" ? "yearly" : "monthly";
  let gyms;

  try {
    gyms = parseSignupGyms(req.body as Record<string, unknown>);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Invalid signup payload" });
  }

  if (requiresScalePlan(normalizeOptionalString(gym_type), planCode)) {
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
      plan_code,
      billing_cycle: billingCycle,
      status: "pending_payment",
      signup_payload: { gyms },
      photo_urls: photoUrls,
    }).select("id").single();

    if (draftInsert.error) {
      return res.status(500).json({ message: draftInsert.error.message });
    }

    const paymentLink = await createCashfreePaymentLink({
      draftId,
      planCode: planCode as any,
      billingCycle,
      customerName: gyms[0]?.owner_name || gyms[0]?.gym_name || "Gym owner",
      customerEmail: authEmail,
      customerPhone: gyms[0]?.phone || "9999999999",
      gymType: gym_type === "branch" ? "branch" : "single",
    });

    const paymentInsert = await supabase.from("billing_payments").insert({
      signup_draft_id: draftId,
      plan_code,
      billing_cycle: billingCycle,
      amount: paymentLink.amount,
      status: "link_created",
      cashfree_link_id: paymentLink.linkId,
      cashfree_cf_link_id: paymentLink.cfLinkId,
      raw_payload: paymentLink.raw,
    });

    if (paymentInsert.error) {
      return res.status(500).json({ message: paymentInsert.error.message });
    }

    await supabase.from("billing_signup_drafts").update({
      cashfree_link_id: paymentLink.linkId,
      cashfree_cf_link_id: paymentLink.cfLinkId,
      updated_at: new Date().toISOString(),
    }).eq("id", draftId);

    return res.status(201).json({ draft_id: draftId, link_url: paymentLink.linkUrl });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to initiate checkout" });
  }
}

export async function getSignupCheckoutStatus(req: Request, res: Response) {
  const draftId = req.params.id;
  if (!draftId) {
    return res.status(400).json({ message: "draft id is required" });
  }

  const [draftResult, paymentResult] = await Promise.all([
    supabase.from("billing_signup_drafts").select("id, status, admin_id, plan_code, billing_cycle, created_at, updated_at").eq("id", draftId).maybeSingle(),
    supabase.from("billing_payments").select("status, amount, cashfree_link_id, cashfree_transaction_id, updated_at").eq("signup_draft_id", draftId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

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

export async function handleCashfreeWebhook(req: Request, res: Response) {
  try {
    const signature = req.get("x-webhook-signature") || "";
    const timestamp = req.get("x-webhook-timestamp") || "";
    const rawBody = getRawBody(req);
    if (signature && timestamp && rawBody) {
      verifyCashfreeWebhookSignature(rawBody, timestamp, signature);
    }

    const payload = parseWebhookPayload(req);
    const data = payload?.data;
    const linkNotes = data?.link_notes || {};
    const draftId = normalizeOptionalString(linkNotes?.draft_id);
    const transactionStatus = normalizeOptionalString(data?.order?.transaction_status);
    const transactionId = normalizeOptionalString(data?.order?.transaction_id);
    const linkId = normalizeOptionalString(data?.link_id);

    if (!draftId) {
      return res.status(200).json({ received: true, ignored: true });
    }

    if (transactionStatus !== "SUCCESS") {
      await supabase.from("billing_payments").update({
        status: normalizeOptionalString(data?.link_status) || "pending",
        raw_payload: payload,
        updated_at: new Date().toISOString(),
      }).eq("signup_draft_id", draftId);
      return res.status(200).json({ received: true, status: transactionStatus || data?.link_status || "pending" });
    }

    const draftLookup = await supabase
      .from("billing_signup_drafts")
      .select("*")
      .eq("id", draftId)
      .maybeSingle();

    if (draftLookup.error) {
      return res.status(500).json({ message: draftLookup.error.message });
    }

    const draft = draftLookup.data;
    if (!draft) {
      return res.status(200).json({ received: true, ignored: true });
    }

    if (draft.status === "completed" && draft.admin_id) {
      return res.status(200).json({ received: true, finalized: true });
    }

    const gyms = Array.isArray(draft.signup_payload?.gyms) ? draft.signup_payload.gyms : [];
    const finalizeResult = await finalizeSignup({
      authEmail: draft.auth_email,
      password: decryptDraftPassword(draft.encrypted_password),
      gymType: draft.gym_type === "branch" ? "branch" : "single",
      gyms,
      planCode: draft.plan_code,
      billingCycle: draft.billing_cycle === "yearly" ? "yearly" : "monthly",
      status: "active",
      gymPhotoUrls: Array.isArray(draft.photo_urls) ? draft.photo_urls : [],
      createSession: false,
    });

    await Promise.all([
      supabase.from("billing_signup_drafts").update({
        status: "completed",
        admin_id: finalizeResult.adminId,
        cashfree_transaction_id: transactionId,
        updated_at: new Date().toISOString(),
      }).eq("id", draftId),
      supabase.from("billing_payments").update({
        status: "paid",
        admin_id: finalizeResult.adminId,
        cashfree_link_id: linkId,
        cashfree_transaction_id: transactionId,
        raw_payload: payload,
        updated_at: new Date().toISOString(),
      }).eq("signup_draft_id", draftId),
    ]);

    return res.status(200).json({ received: true, finalized: true });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to process webhook" });
  }
}
