import type { Response } from "express";

import type { AuthenticatedRequest } from "../middleware/sessionAuth.middleware";
import { logActivity } from "../services/activityLog.service";
import { attachMembersByMemberId } from "../services/relatedRecords.service";
import { ensureMemberBelongsToGym, resolveGymScope, resolveWriteGymId } from "../services/gymScope.service";
import { normalizeOptionalNumber, normalizeOptionalString, validateCouponForSale } from "../services/payments.service";
import { supabase } from "../supabase";

function getAdminId(req: AuthenticatedRequest, res: Response) {
  const adminId = req.admin?.id;
  if (!adminId) {
    res.status(401).json({ message: "Not authenticated" });
    return null;
  }

  return adminId;
}

function parseOptionalDate(value: unknown) {
  const normalized = normalizeOptionalString(value);
  return normalized || null;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

async function loadScopedPackageType(adminId: string, gymId: string, packageTypeId: string) {
  const { data, error } = await supabase
    .from("package_types")
    .select("*")
    .eq("id", packageTypeId)
    .eq("admin_id", adminId)
    .eq("gym_id", gymId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function loadScopedTransaction(adminId: string, transactionId: string, gymId?: string | null) {
  let query = supabase
    .from("transactions")
    .select("*")
    .eq("id", transactionId)
    .eq("admin_id", adminId);

  if (gymId) {
    query = query.eq("gym_id", gymId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function listCollections(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) return;

  const dateFrom = parseOptionalDate(req.query.date_from);
  const dateTo = parseOptionalDate(req.query.date_to);
  const type = normalizeOptionalString(req.query.type);
  const paymentMode = normalizeOptionalString(req.query.payment_mode);
  const memberId = normalizeOptionalString(req.query.member_id);

  let query = supabase
    .from("transactions")
    .select("*")
    .eq("admin_id", adminId);

  if (gymScope.selectedGymId) query = query.eq("gym_id", gymScope.selectedGymId);
  if (dateFrom) query = query.gte("transaction_date", dateFrom);
  if (dateTo) query = query.lte("transaction_date", dateTo);
  if (type) query = query.eq("type", type);
  if (paymentMode) query = query.eq("payment_mode", paymentMode);
  if (memberId) query = query.eq("member_id", memberId);

  const { data, error } = await query.order("transaction_date", { ascending: false });
  if (error) return res.status(500).json({ message: error.message });

  try {
    return res.json(await attachMembersByMemberId(data || [], adminId, gymScope.gymIds, "id, name, phone, email, shift"));
  } catch (attachError) {
    return res.status(500).json({ message: attachError instanceof Error ? attachError.message : "Failed to load collections" });
  }
}

export async function createCollection(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const gymId = await resolveWriteGymId(req, res);
  if (!gymId) return;

  const memberId = normalizeOptionalString(req.body.member_id);
  const type = normalizeOptionalString(req.body.type) || "payment";
  const amount = normalizeOptionalNumber(req.body.amount);
  const paymentMode = normalizeOptionalString(req.body.payment_mode);
  const description = normalizeOptionalString(req.body.description);
  const transactionDate = parseOptionalDate(req.body.transaction_date) || new Date().toISOString().split("T")[0];

  if (!amount || !paymentMode) {
    return res.status(400).json({ message: "amount and payment_mode are required" });
  }

  if (memberId) {
    const validMember = await ensureMemberBelongsToGym(memberId, adminId, gymId).catch((error) => {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to validate member" });
      return null;
    });
    if (validMember === null) return;
    if (!validMember) return res.status(400).json({ message: "Selected member does not belong to this gym" });
  }

  const roundedAmount = roundCurrency(amount);
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      admin_id: adminId,
      gym_id: gymId,
      member_id: memberId,
      type,
      amount: roundedAmount,
      gross_amount: roundedAmount,
      discount_amount: 0,
      net_amount: roundedAmount,
      payment_mode: paymentMode,
      description,
      transaction_date: transactionDate,
    })
    .select("*")
    .single();

  if (error) return res.status(500).json({ message: error.message });
  await logActivity(req, { action: "create", entityType: "transaction", entityId: data.id, gymId, after: data });
  return res.status(201).json(data);
}

export async function updateCollection(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;
  const transactionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) return;

  let transaction;
  try {
    transaction = await loadScopedTransaction(adminId, transactionId, gymScope.selectedGymId);
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to load payment" });
  }

  if (!transaction) {
    return res.status(404).json({ message: "Payment not found" });
  }

  if (transaction.member_package_id || transaction.package_sale_id || transaction.coupon_id || Number(transaction.discount_amount || 0) > 0) {
    return res.status(400).json({ message: "Package sale payments cannot be edited directly. Create a refund instead." });
  }

  const memberId = normalizeOptionalString(req.body.member_id);
  const type = normalizeOptionalString(req.body.type);
  const amount = req.body.amount !== undefined ? normalizeOptionalNumber(req.body.amount) : null;
  const paymentMode = normalizeOptionalString(req.body.payment_mode);
  const description = req.body.description !== undefined ? normalizeOptionalString(req.body.description) : undefined;
  const transactionDate = req.body.transaction_date !== undefined ? parseOptionalDate(req.body.transaction_date) : undefined;

  if (memberId) {
    const validMember = await ensureMemberBelongsToGym(memberId, adminId, transaction.gym_id).catch((error) => {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to validate member" });
      return null;
    });
    if (validMember === null) return;
    if (!validMember) return res.status(400).json({ message: "Selected member does not belong to this gym" });
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (memberId !== null) updates.member_id = memberId;
  if (type) updates.type = type;
  if (amount != null) {
    const roundedAmount = roundCurrency(amount);
    updates.amount = roundedAmount;
    updates.gross_amount = roundedAmount;
    updates.net_amount = roundedAmount;
    updates.discount_amount = 0;
  }
  if (paymentMode) updates.payment_mode = paymentMode;
  if (description !== undefined) updates.description = description;
  if (transactionDate !== undefined) updates.transaction_date = transactionDate;

  const { data, error } = await supabase
    .from("transactions")
    .update(updates)
    .eq("id", transactionId)
    .eq("admin_id", adminId)
    .select("*")
    .single();

  if (error) return res.status(500).json({ message: error.message });
  await logActivity(req, { action: "update", entityType: "transaction", entityId: data.id, gymId: data.gym_id, before: transaction, after: data });
  return res.json(data);
}

export async function deleteCollection(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;
  const transactionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) return;

  let transaction;
  try {
    transaction = await loadScopedTransaction(adminId, transactionId, gymScope.selectedGymId);
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to load payment" });
  }

  if (!transaction) {
    return res.status(404).json({ message: "Payment not found" });
  }

  if (transaction.member_package_id || transaction.package_sale_id || transaction.coupon_id || Number(transaction.discount_amount || 0) > 0) {
    return res.status(400).json({ message: "Package sale payments cannot be deleted directly. Create a refund instead." });
  }

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", transactionId)
    .eq("admin_id", adminId);

  if (error) return res.status(500).json({ message: error.message });
  await logActivity(req, { action: "delete", entityType: "transaction", entityId: transactionId, gymId: transaction.gym_id, before: transaction });
  return res.status(204).send();
}

export async function refundCollection(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;
  const transactionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) return;

  let transaction;
  try {
    transaction = await loadScopedTransaction(adminId, transactionId, gymScope.selectedGymId);
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to load payment" });
  }

  if (!transaction) {
    return res.status(404).json({ message: "Payment not found" });
  }

  if (transaction.type !== "payment") {
    return res.status(400).json({ message: "Only payment transactions can be refunded" });
  }

  const requestedAmount = normalizeOptionalNumber(req.body.amount);
  const sourceAmount = Number(transaction.net_amount ?? transaction.amount ?? 0);
  const refundAmount = roundCurrency(requestedAmount ?? sourceAmount);
  if (!refundAmount || refundAmount <= 0) {
    return res.status(400).json({ message: "Refund amount must be greater than zero" });
  }

  if (refundAmount > sourceAmount) {
    return res.status(400).json({ message: "Refund amount cannot exceed the original payment amount" });
  }

  const description = normalizeOptionalString(req.body.description)
    || `Refund for payment ${transaction.id}`;
  const transactionDate = parseOptionalDate(req.body.transaction_date) || new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      admin_id: adminId,
      gym_id: transaction.gym_id,
      member_id: transaction.member_id,
      member_package_id: transaction.member_package_id,
      package_sale_id: transaction.package_sale_id,
      coupon_id: null,
      type: "refund",
      amount: refundAmount,
      gross_amount: refundAmount,
      discount_amount: 0,
      net_amount: refundAmount,
      payment_mode: transaction.payment_mode,
      description,
      transaction_date: transactionDate,
    })
    .select("*")
    .single();

  if (error) return res.status(500).json({ message: error.message });
  await logActivity(req, { action: "refund", entityType: "transaction", entityId: data.id, gymId: data.gym_id, before: transaction, after: data });
  return res.status(201).json(data);
}

export async function listSales(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) return;

  const dateFrom = parseOptionalDate(req.query.date_from);
  const dateTo = parseOptionalDate(req.query.date_to);
  const status = normalizeOptionalString(req.query.status);
  const packageTypeId = normalizeOptionalString(req.query.package_type_id);
  const memberId = normalizeOptionalString(req.query.member_id);

  let query = supabase
    .from("member_packages")
    .select("*")
    .eq("admin_id", adminId);

  if (gymScope.selectedGymId) query = query.eq("gym_id", gymScope.selectedGymId);
  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59.999Z`);
  if (status) query = query.eq("status", status);
  if (packageTypeId) query = query.eq("package_type_id", packageTypeId);
  if (memberId) query = query.eq("member_id", memberId);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return res.status(500).json({ message: error.message });

  try {
    return res.json(await attachMembersByMemberId(data || [], adminId, gymScope.gymIds, "id, name, phone, email, shift"));
  } catch (attachError) {
    return res.status(500).json({ message: attachError instanceof Error ? attachError.message : "Failed to load sales" });
  }
}

export async function getPaymentAnalytics(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) return;

  const dateFrom = parseOptionalDate(req.query.date_from);
  const dateTo = parseOptionalDate(req.query.date_to);

  let txQuery = supabase.from("transactions").select("type, amount, gross_amount, discount_amount, net_amount, payment_mode, transaction_date").eq("admin_id", adminId);
  let salesQuery = supabase.from("member_packages").select("package_name, amount_paid, gross_amount, discount_amount, net_amount, created_at").eq("admin_id", adminId);
  let couponUsageQuery = supabase.from("coupon_usages").select("coupon_code, discount_amount, created_at").eq("admin_id", adminId);

  if (gymScope.selectedGymId) {
    txQuery = txQuery.eq("gym_id", gymScope.selectedGymId);
    salesQuery = salesQuery.eq("gym_id", gymScope.selectedGymId);
    couponUsageQuery = couponUsageQuery.eq("gym_id", gymScope.selectedGymId);
  }

  if (dateFrom) {
    txQuery = txQuery.gte("transaction_date", dateFrom);
    salesQuery = salesQuery.gte("created_at", dateFrom);
    couponUsageQuery = couponUsageQuery.gte("created_at", dateFrom);
  }

  if (dateTo) {
    txQuery = txQuery.lte("transaction_date", dateTo);
    salesQuery = salesQuery.lte("created_at", `${dateTo}T23:59:59.999Z`);
    couponUsageQuery = couponUsageQuery.lte("created_at", `${dateTo}T23:59:59.999Z`);
  }

  const [txRes, salesRes, couponRes] = await Promise.all([txQuery, salesQuery, couponUsageQuery]);
  const firstError = [txRes, salesRes, couponRes].find((result) => result.error)?.error;
  if (firstError) return res.status(500).json({ message: firstError.message });

  const transactions = txRes.data || [];
  const sales = salesRes.data || [];
  const couponUsages = couponRes.data || [];

  const totalCollections = transactions.filter((txn) => txn.type === "payment").reduce((sum, txn) => sum + Number(txn.net_amount ?? txn.amount ?? 0), 0);
  const totalRefunds = transactions.filter((txn) => txn.type === "refund").reduce((sum, txn) => sum + Number(txn.net_amount ?? txn.amount ?? 0), 0);
  const totalAdjustments = transactions.filter((txn) => txn.type === "adjustment").reduce((sum, txn) => sum + Number(txn.net_amount ?? txn.amount ?? 0), 0);
  const netCollections = roundCurrency(totalCollections - totalRefunds + totalAdjustments);
  const totalDiscountGiven = couponUsages.reduce((sum, usage) => sum + Number(usage.discount_amount || 0), 0);

  const revenueByMode = Object.entries(
    transactions
      .filter((txn) => txn.type === "payment")
      .reduce<Record<string, number>>((acc, txn) => {
        const key = txn.payment_mode || "unknown";
        acc[key] = (acc[key] || 0) + Number(txn.net_amount ?? txn.amount ?? 0);
        return acc;
      }, {}),
  ).map(([mode, amount]) => ({ mode, amount: roundCurrency(amount) }));

  const salesByPackage = Object.entries(
    sales.reduce<Record<string, number>>((acc, sale) => {
      const key = sale.package_name || "Unknown";
      acc[key] = (acc[key] || 0) + Number(sale.net_amount ?? sale.amount_paid ?? 0);
      return acc;
    }, {}),
  ).map(([package_name, amount]) => ({ package_name, amount: roundCurrency(amount) }));

  const couponBreakdown = Object.entries(
    couponUsages.reduce<Record<string, number>>((acc, usage) => {
      const key = usage.coupon_code || "Unknown";
      acc[key] = (acc[key] || 0) + Number(usage.discount_amount || 0);
      return acc;
    }, {}),
  ).map(([coupon_code, discount_amount]) => ({ coupon_code, discount_amount: roundCurrency(discount_amount) }));

  const timelineSource = transactions
    .filter((txn) => txn.type === "payment")
    .map((txn) => ({ date: String(txn.transaction_date).slice(0, 10), amount: Number(txn.net_amount ?? txn.amount ?? 0) }));

  const revenueSeries = Object.entries(
    timelineSource.reduce<Record<string, number>>((acc, item) => {
      acc[item.date] = (acc[item.date] || 0) + item.amount;
      return acc;
    }, {}),
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date, amount: roundCurrency(amount) }));

  return res.json({
    totalCollections: roundCurrency(totalCollections),
    totalRefunds: roundCurrency(totalRefunds),
    totalAdjustments: roundCurrency(totalAdjustments),
    netCollections,
    totalSales: sales.length,
    averageSale: sales.length ? roundCurrency(sales.reduce((sum, sale) => sum + Number(sale.net_amount ?? sale.amount_paid ?? 0), 0) / sales.length) : 0,
    totalDiscountGiven: roundCurrency(totalDiscountGiven),
    couponUsageCount: couponUsages.length,
    revenueByMode,
    salesByPackage,
    couponBreakdown,
    revenueSeries,
  });
}

export async function listCoupons(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) return;

  const includeInactive = req.query.include_inactive === "true";

  let query = supabase.from("coupons").select("*").eq("admin_id", adminId);
  if (!includeInactive) query = query.eq("is_active", true);
  if (gymScope.selectedGymId) {
    query = query.or(`gym_id.is.null,gym_id.eq.${gymScope.selectedGymId}`);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return res.status(500).json({ message: error.message });

  const coupons = data || [];
  const couponIds = coupons.map((coupon) => coupon.id as string);

  if (couponIds.length === 0) {
    return res.json([]);
  }

  const { data: usages, error: usageError } = await supabase
    .from("coupon_usages")
    .select("coupon_id, discount_amount, created_at")
    .eq("admin_id", adminId)
    .in("coupon_id", couponIds);

  if (usageError) {
    return res.status(500).json({ message: usageError.message });
  }

  const usageSummary = new Map<string, { usage_count: number; total_discount_amount: number; last_used_at: string | null }>();
  for (const usage of usages || []) {
    const couponId = usage.coupon_id as string;
    const existing = usageSummary.get(couponId) || { usage_count: 0, total_discount_amount: 0, last_used_at: null };
    existing.usage_count += 1;
    existing.total_discount_amount += Number(usage.discount_amount || 0);
    const createdAt = typeof usage.created_at === "string" ? usage.created_at : null;
    if (createdAt && (!existing.last_used_at || createdAt > existing.last_used_at)) {
      existing.last_used_at = createdAt;
    }
    usageSummary.set(couponId, existing);
  }

  return res.json(coupons.map((coupon) => {
    const summary = usageSummary.get(coupon.id as string);
    return {
      ...coupon,
      usage_count: summary?.usage_count || 0,
      total_discount_amount: roundCurrency(summary?.total_discount_amount || 0),
      last_used_at: summary?.last_used_at || null,
    };
  }));
}

export async function createCoupon(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const gymId = await resolveWriteGymId(req, res);
  if (!gymId) return;

  const code = normalizeOptionalString(req.body.code)?.toUpperCase();
  const name = normalizeOptionalString(req.body.name);
  const description = normalizeOptionalString(req.body.description);
  const discountType = normalizeOptionalString(req.body.discount_type);
  const discountValue = normalizeOptionalNumber(req.body.discount_value);
  const maxDiscountAmount = normalizeOptionalNumber(req.body.max_discount_amount);
  const minPurchaseAmount = normalizeOptionalNumber(req.body.min_purchase_amount);
  const usageLimit = normalizeOptionalNumber(req.body.usage_limit);
  const usageLimitPerMember = normalizeOptionalNumber(req.body.usage_limit_per_member);
  const startsAt = normalizeOptionalString(req.body.starts_at);
  const endsAt = normalizeOptionalString(req.body.ends_at);
  const appliesToAllGyms = req.body.applies_to_all_gyms === true || req.body.applies_to_all_gyms === "true";

  if (!code || !name || !discountType || !discountValue) {
    return res.status(400).json({ message: "code, name, discount_type, and discount_value are required" });
  }

  if (discountType !== "percentage" && discountType !== "flat") {
    return res.status(400).json({ message: "discount_type must be percentage or flat" });
  }

  const { data, error } = await supabase
    .from("coupons")
    .insert({
      admin_id: adminId,
      gym_id: appliesToAllGyms ? null : gymId,
      code,
      name,
      description,
      discount_type: discountType,
      discount_value: discountValue,
      max_discount_amount: maxDiscountAmount,
      min_purchase_amount: minPurchaseAmount,
      usage_limit: usageLimit,
      usage_limit_per_member: usageLimitPerMember,
      starts_at: startsAt,
      ends_at: endsAt,
    })
    .select("*")
    .single();

  if (error) return res.status(500).json({ message: error.message });
  return res.status(201).json(data);
}

export async function updateCoupon(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const updates: Record<string, unknown> = {};
  if (req.body.code !== undefined) updates.code = normalizeOptionalString(req.body.code)?.toUpperCase();
  if (req.body.name !== undefined) updates.name = normalizeOptionalString(req.body.name);
  if (req.body.description !== undefined) updates.description = normalizeOptionalString(req.body.description);
  if (req.body.discount_type !== undefined) updates.discount_type = normalizeOptionalString(req.body.discount_type);
  if (req.body.discount_value !== undefined) updates.discount_value = normalizeOptionalNumber(req.body.discount_value);
  if (req.body.max_discount_amount !== undefined) updates.max_discount_amount = normalizeOptionalNumber(req.body.max_discount_amount);
  if (req.body.min_purchase_amount !== undefined) updates.min_purchase_amount = normalizeOptionalNumber(req.body.min_purchase_amount);
  if (req.body.usage_limit !== undefined) updates.usage_limit = normalizeOptionalNumber(req.body.usage_limit);
  if (req.body.usage_limit_per_member !== undefined) updates.usage_limit_per_member = normalizeOptionalNumber(req.body.usage_limit_per_member);
  if (req.body.starts_at !== undefined) updates.starts_at = normalizeOptionalString(req.body.starts_at);
  if (req.body.ends_at !== undefined) updates.ends_at = normalizeOptionalString(req.body.ends_at);
  if (req.body.is_active !== undefined) updates.is_active = req.body.is_active === true || req.body.is_active === "true";
  if (req.body.applies_to_all_gyms !== undefined || req.body.gym_id !== undefined) {
    updates.gym_id = req.body.applies_to_all_gyms === true || req.body.applies_to_all_gyms === "true"
      ? null
      : normalizeOptionalString(req.body.gym_id);
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: "No valid fields provided for update" });
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("coupons")
    .update(updates)
    .eq("id", req.params.id)
    .eq("admin_id", adminId)
    .select("*")
    .single();

  if (error) return res.status(500).json({ message: error.message });
  return res.json(data);
}

export async function deactivateCoupon(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const { error } = await supabase
    .from("coupons")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", req.params.id)
    .eq("admin_id", adminId);

  if (error) return res.status(500).json({ message: error.message });
  return res.status(204).send();
}

export async function validateCoupon(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const gymId = await resolveWriteGymId(req, res);
  if (!gymId) return;

  const grossAmount = normalizeOptionalNumber(req.body.gross_amount);
  if (!grossAmount) {
    return res.status(400).json({ message: "gross_amount is required" });
  }

  try {
    const result = await validateCouponForSale({
      adminId,
      gymId,
      memberId: normalizeOptionalString(req.body.member_id),
      couponId: normalizeOptionalString(req.body.coupon_id),
      couponCode: normalizeOptionalString(req.body.coupon_code),
      grossAmount,
    });
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Invalid coupon" });
  }
}

export async function createMemberSale(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const gymId = await resolveWriteGymId(req, res);
  if (!gymId) return;

  const memberId = normalizeOptionalString(req.body.member_id);
  const packageTypeId = normalizeOptionalString(req.body.package_type_id);
  const startDate = parseOptionalDate(req.body.start_date);
  const endDate = parseOptionalDate(req.body.end_date);
  const paymentMode = normalizeOptionalString(req.body.payment_mode);
  const description = normalizeOptionalString(req.body.description);
  const transactionDate = parseOptionalDate(req.body.transaction_date) || new Date().toISOString().split("T")[0];
  const grossAmountInput = normalizeOptionalNumber(req.body.gross_amount);
  const couponId = normalizeOptionalString(req.body.coupon_id);
  const couponCode = normalizeOptionalString(req.body.coupon_code);

  if (!memberId || !packageTypeId || !startDate || !endDate || !paymentMode) {
    return res.status(400).json({ message: "member_id, package_type_id, start_date, end_date, and payment_mode are required" });
  }

  const validMember = await ensureMemberBelongsToGym(memberId, adminId, gymId).catch((error) => {
    res.status(500).json({ message: error instanceof Error ? error.message : "Failed to validate member" });
    return null;
  });
  if (validMember === null) return;
  if (!validMember) return res.status(400).json({ message: "Selected member does not belong to this gym" });

  const packageType = await loadScopedPackageType(adminId, gymId, packageTypeId).catch((error) => {
    res.status(500).json({ message: error instanceof Error ? error.message : "Failed to load package type" });
    return null;
  });
  if (packageType === null) return;
  if (!packageType) return res.status(400).json({ message: "Package type not found" });

  if (!grossAmountInput) {
    return res.status(400).json({ message: "gross_amount is required" });
  }

  const grossAmount = roundCurrency(grossAmountInput);
  let discountAmount = 0;
  let netAmount = grossAmount;
  let appliedCoupon: { id: string; code: string } | null = null;

  if (couponId || couponCode) {
    try {
      const couponResult = await validateCouponForSale({
        adminId,
        gymId,
        memberId,
        couponId,
        couponCode,
        grossAmount,
      });
      discountAmount = couponResult.discountAmount;
      netAmount = couponResult.netAmount;
      appliedCoupon = { id: couponResult.coupon.id, code: couponResult.coupon.code };
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : "Invalid coupon" });
    }
  }

  const saleInsert = await supabase
    .from("member_packages")
    .insert({
      admin_id: adminId,
      gym_id: gymId,
      member_id: memberId,
      package_type_id: packageTypeId,
      package_name: packageType.name,
      start_date: startDate,
      end_date: endDate,
      amount_paid: netAmount,
      gross_amount: grossAmount,
      discount_amount: discountAmount,
      net_amount: netAmount,
      coupon_id: appliedCoupon?.id || null,
      payment_mode: paymentMode,
    })
    .select("*")
    .single();

  if (saleInsert.error || !saleInsert.data) {
    return res.status(500).json({ message: saleInsert.error?.message || "Failed to create sale" });
  }

  const transactionInsert = await supabase
    .from("transactions")
    .insert({
      admin_id: adminId,
      gym_id: gymId,
      member_id: memberId,
      member_package_id: saleInsert.data.id,
      package_sale_id: saleInsert.data.id,
      coupon_id: appliedCoupon?.id || null,
      type: "payment",
      amount: netAmount,
      gross_amount: grossAmount,
      discount_amount: discountAmount,
      net_amount: netAmount,
      payment_mode: paymentMode,
      description: description || `Package: ${packageType.name}${appliedCoupon ? ` (Coupon: ${appliedCoupon.code})` : ""}`,
      transaction_date: transactionDate,
    })
    .select("*")
    .single();

  if (transactionInsert.error || !transactionInsert.data) {
    await supabase.from("member_packages").delete().eq("id", saleInsert.data.id).eq("admin_id", adminId);
    return res.status(500).json({ message: transactionInsert.error?.message || "Failed to create transaction" });
  }

  if (appliedCoupon) {
    const couponUsageInsert = await supabase
      .from("coupon_usages")
      .insert({
        admin_id: adminId,
        gym_id: gymId,
        coupon_id: appliedCoupon.id,
        member_id: memberId,
        member_package_id: saleInsert.data.id,
        transaction_id: transactionInsert.data.id,
        coupon_code: appliedCoupon.code,
        gross_amount: grossAmount,
        discount_amount: discountAmount,
        net_amount: netAmount,
      });

    if (couponUsageInsert.error) {
      await supabase.from("transactions").delete().eq("id", transactionInsert.data.id).eq("admin_id", adminId);
      await supabase.from("member_packages").delete().eq("id", saleInsert.data.id).eq("admin_id", adminId);
      return res.status(500).json({ message: couponUsageInsert.error.message });
    }
  }

  await logActivity(req, {
    action: "create_sale",
    entityType: "member_package",
    entityId: saleInsert.data.id,
    gymId,
    after: {
      sale: saleInsert.data,
      transaction: transactionInsert.data,
      applied_coupon: appliedCoupon,
    },
  });

  return res.status(201).json({
    sale: saleInsert.data,
    transaction: transactionInsert.data,
    applied_coupon: appliedCoupon,
    gross_amount: grossAmount,
    discount_amount: discountAmount,
    net_amount: netAmount,
  });
}
