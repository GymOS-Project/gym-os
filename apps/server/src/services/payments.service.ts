import { supabase } from "../supabase";

export type CouponRecord = {
  id: string;
  admin_id: string;
  gym_id: string | null;
  code: string;
  name: string;
  description: string | null;
  discount_type: "percentage" | "flat";
  discount_value: number;
  max_discount_amount: number | null;
  min_purchase_amount: number | null;
  usage_limit: number | null;
  usage_limit_per_member: number | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
};

export type CouponValidationResult = {
  coupon: CouponRecord;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
};

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return value == null ? null : String(value);
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function normalizeOptionalNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export async function getCouponUsageCount(couponId: string) {
  const { count, error } = await supabase
    .from("coupon_usages")
    .select("id", { count: "exact", head: true })
    .eq("coupon_id", couponId);

  if (error) {
    throw new Error(error.message);
  }

  return count || 0;
}

export async function getCouponUsageCountForMember(couponId: string, memberId: string) {
  const { count, error } = await supabase
    .from("coupon_usages")
    .select("id", { count: "exact", head: true })
    .eq("coupon_id", couponId)
    .eq("member_id", memberId);

  if (error) {
    throw new Error(error.message);
  }

  return count || 0;
}

export async function loadCouponByIdentifier(adminId: string, gymId: string, couponId?: string | null, couponCode?: string | null) {
  const normalizedCode = couponCode?.trim().toLowerCase();

  let query = supabase
    .from("coupons")
    .select("*")
    .eq("admin_id", adminId)
    .eq("is_active", true);

  if (couponId) {
    query = query.eq("id", couponId);
  } else if (normalizedCode) {
    query = query.ilike("code", normalizedCode);
  } else {
    return null;
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  if (data.gym_id && data.gym_id !== gymId) {
    return null;
  }

  return data as CouponRecord;
}

export async function validateCouponForSale(params: {
  adminId: string;
  gymId: string;
  memberId?: string | null;
  couponId?: string | null;
  couponCode?: string | null;
  grossAmount: number;
}) {
  const { adminId, gymId, memberId, couponId, couponCode, grossAmount } = params;
  const normalizedAmount = roundCurrency(grossAmount);

  const coupon = await loadCouponByIdentifier(adminId, gymId, couponId, couponCode);
  if (!coupon) {
    throw new Error("Coupon not found or not available for this gym");
  }

  const now = Date.now();
  if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) {
    throw new Error("Coupon is not active yet");
  }

  if (coupon.ends_at && new Date(coupon.ends_at).getTime() < now) {
    throw new Error("Coupon has expired");
  }

  if (coupon.min_purchase_amount && normalizedAmount < Number(coupon.min_purchase_amount)) {
    throw new Error(`Coupon requires a minimum purchase of ${coupon.min_purchase_amount}`);
  }

  if (coupon.usage_limit != null) {
    const totalUsage = await getCouponUsageCount(coupon.id);
    if (totalUsage >= coupon.usage_limit) {
      throw new Error("Coupon usage limit reached");
    }
  }

  if (memberId && coupon.usage_limit_per_member != null) {
    const memberUsage = await getCouponUsageCountForMember(coupon.id, memberId);
    if (memberUsage >= coupon.usage_limit_per_member) {
      throw new Error("Coupon usage limit reached for this member");
    }
  }

  const rawDiscount = coupon.discount_type === "percentage"
    ? normalizedAmount * (Number(coupon.discount_value) / 100)
    : Number(coupon.discount_value);

  const cappedDiscount = coupon.max_discount_amount != null
    ? Math.min(rawDiscount, Number(coupon.max_discount_amount))
    : rawDiscount;

  const discountAmount = roundCurrency(Math.min(cappedDiscount, normalizedAmount));
  const netAmount = roundCurrency(Math.max(normalizedAmount - discountAmount, 0));

  return {
    coupon,
    grossAmount: normalizedAmount,
    discountAmount,
    netAmount,
  } satisfies CouponValidationResult;
}
