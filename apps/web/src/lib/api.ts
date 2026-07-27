import { getStoredGymFilter } from "@/lib/gymFilter";

const API_BASE_URL =
  (import.meta as any).env.VITE_API_BASE_URL ||
  "https://gymos.duckdns.org";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const isFormData = options?.body instanceof FormData;
  const headers = withGymHeader(path, options?.headers, isFormData);
  const res = await fetch(`${API_BASE_URL}/api${path}`, {
    ...options,
    credentials: "include",
    headers,
  });

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {}
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function withBody(data: FormData | Record<string, unknown>) {
  return data instanceof FormData ? data : JSON.stringify(data);
}

function withGymHeader(path: string, incomingHeaders: RequestInit["headers"], isFormData: boolean) {
  const headers = new Headers(incomingHeaders || undefined);

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (path.startsWith("/auth") || path.startsWith("/branches")) {
    return headers;
  }

  const selectedGymId = getStoredGymFilter();
  if (!selectedGymId || selectedGymId === "all") {
    return headers;
  }

  headers.set("x-gym-id", selectedGymId);
  return headers;
}

function qs(params: Record<string, string | number | undefined>): string {
  const p = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join("&");
  return p ? `?${p}` : "";
}

export interface LoginResult {
  user: { id: string; email: string } | null;
  admin: Admin | null;
  staff: StaffAccount | null;
  role: SessionRole | null;
  authenticated: boolean;
  message?: string;
}

export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  expiredMembers: number;
  expiringThisWeek: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalEnquiries: number;
  pendingFollowups: number;
  revenueChart: { month: string; revenue: number }[];
  memberStatusChart: { name: string; value: number; color: string }[];
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<LoginResult>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  signup: (data: FormData) =>
    request<LoginResult>("/auth/signup", { method: "POST", body: data }),
  forgotPassword: (email: string) =>
    request<{ message: string }>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (access_token: string, new_password: string) =>
    request<LoginResult>("/auth/reset-password", { method: "POST", body: JSON.stringify({ access_token, new_password }) }),
  signout: () => request<{ message: string }>("/auth/signout", { method: "POST" }),
  me: () => request<LoginResult>("/auth/me"),
  updatePassword: (current_password: string, new_password: string) =>
    request<{ message: string }>("/auth/password", { method: "POST", body: JSON.stringify({ current_password, new_password }) }),
  updateAdmin: (data: FormData) =>
    request<Admin>("/auth/admin", { method: "PUT", body: data }),
  upgradeToBranch: (data: Record<string, unknown>) =>
    request<Admin>("/auth/admin/upgrade-to-branch", { method: "POST", body: JSON.stringify(data) }),
  getGyms: () => request<Gym[]>("/branches"),
  createBranch: (data: Record<string, unknown>) =>
    request<Gym>("/branches", { method: "POST", body: JSON.stringify(data) }),

  // Members
  getMembers: () => request<(Member & { member_packages?: { status: string; end_date: string; package_name: string }[] })[]>("/members"),
  getMember: (id: string) => request<Member>(`/members/${id}`),
  getActiveMembers: () => request<{ id: string; name: string; phone: string; gym_id: string }[]>("/members/active"),
  createMember: (data: Partial<Member>) =>
    request<Member>("/members", { method: "POST", body: JSON.stringify(data) }),
  updateMember: (id: string, data: Partial<Member>) =>
    request<Member>(`/members/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteMember: (id: string) => request<void>(`/members/${id}`, { method: "DELETE" }),
  assignDietPlanToMember: (memberId: string, plan_id: string) =>
    request<DietPlanAssignment>(`/members/${memberId}/diet-plans`, { method: "POST", body: JSON.stringify({ plan_id }) }),
  updateAssignedDietPlan: (memberId: string, assignmentId: string, data: FormData | Partial<DietPlan>) =>
    request<DietPlanAssignment>(`/members/${memberId}/diet-plans/${assignmentId}`, { method: "PUT", body: withBody(data as FormData | Record<string, unknown>) }),
  deleteAssignedDietPlan: (memberId: string, assignmentId: string) =>
    request<void>(`/members/${memberId}/diet-plans/${assignmentId}`, { method: "DELETE" }),
  assignExercisePlanToMember: (memberId: string, plan_id: string) =>
    request<ExercisePlanAssignment>(`/members/${memberId}/exercise-plans`, { method: "POST", body: JSON.stringify({ plan_id }) }),
  updateAssignedExercisePlan: (memberId: string, assignmentId: string, data: FormData | Partial<ExercisePlan>) =>
    request<ExercisePlanAssignment>(`/members/${memberId}/exercise-plans/${assignmentId}`, { method: "PUT", body: withBody(data as FormData | Record<string, unknown>) }),
  deleteAssignedExercisePlan: (memberId: string, assignmentId: string) =>
    request<void>(`/members/${memberId}/exercise-plans/${assignmentId}`, { method: "DELETE" }),

  // Plans (package_types)
  getPlans: () => request<PackageType[]>("/plans"),
  createPlan: (data: Partial<PackageType>) =>
    request<PackageType>("/plans", { method: "POST", body: JSON.stringify(data) }),
  updatePlan: (id: string, data: Partial<PackageType>) =>
    request<PackageType>(`/plans/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deletePlan: (id: string) => request<void>(`/plans/${id}`, { method: "DELETE" }),

  // Diet plans
  getDietPlans: (scope = "shared") => request<DietPlan[]>(`/diet-plans${qs({ scope })}`),
  getDietPlan: (id: string) => request<DietPlan>(`/diet-plans/${id}`),
  createDietPlan: (data: FormData | Partial<DietPlan>) =>
    request<DietPlan>("/diet-plans", { method: "POST", body: withBody(data as FormData | Record<string, unknown>) }),
  updateDietPlan: (id: string, data: FormData | Partial<DietPlan>) =>
    request<DietPlan>(`/diet-plans/${id}`, { method: "PUT", body: withBody(data as FormData | Record<string, unknown>) }),
  deleteDietPlan: (id: string) => request<void>(`/diet-plans/${id}`, { method: "DELETE" }),

  // Exercise plans
  getExercisePlans: (scope = "shared") => request<ExercisePlan[]>(`/exercise-plans${qs({ scope })}`),
  getExercisePlan: (id: string) => request<ExercisePlan>(`/exercise-plans/${id}`),
  createExercisePlan: (data: FormData | Partial<ExercisePlan>) =>
    request<ExercisePlan>("/exercise-plans", { method: "POST", body: withBody(data as FormData | Record<string, unknown>) }),
  updateExercisePlan: (id: string, data: FormData | Partial<ExercisePlan>) =>
    request<ExercisePlan>(`/exercise-plans/${id}`, { method: "PUT", body: withBody(data as FormData | Record<string, unknown>) }),
  deleteExercisePlan: (id: string) => request<void>(`/exercise-plans/${id}`, { method: "DELETE" }),

  // Staff
  getStaff: (role?: string) => request<StaffAccount[]>(`/staff${qs({ role })}`),
  createStaff: (data: Partial<StaffAccount> & { password: string }) =>
    request<StaffAccount>("/staff", { method: "POST", body: JSON.stringify(data) }),
  updateStaff: (id: string, data: Partial<StaffAccount>) =>
    request<StaffAccount>(`/staff/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  // Shifts
  getShifts: () => request<Shift[]>("/shifts"),
  createShift: (data: Partial<Shift>) =>
    request<Shift>("/shifts", { method: "POST", body: JSON.stringify(data) }),
  updateShift: (id: string, data: Partial<Shift>) =>
    request<Shift>(`/shifts/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteShift: (id: string) => request<void>(`/shifts/${id}`, { method: "DELETE" }),

  // Payments
  getPaymentCollections: (params?: { date_from?: string; date_to?: string; type?: string; payment_mode?: string; member_id?: string }) =>
    request<(Transaction & { members?: { id: string; name: string; phone: string; email?: string | null; shift?: string | null } | null })[]>(`/payments/collections${qs(params || {})}`),
  createPaymentCollection: (data: Partial<Transaction>) =>
    request<Transaction>("/payments/collections", { method: "POST", body: JSON.stringify(data) }),
  updatePaymentCollection: (id: string, data: Partial<Transaction>) =>
    request<Transaction>(`/payments/collections/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deletePaymentCollection: (id: string) =>
    request<void>(`/payments/collections/${id}`, { method: "DELETE" }),
  refundPaymentCollection: (id: string, data?: { amount?: number; description?: string | null; transaction_date?: string | null }) =>
    request<Transaction>(`/payments/collections/${id}/refund`, { method: "POST", body: JSON.stringify(data || {}) }),
  getPaymentSales: (params?: { date_from?: string; date_to?: string; status?: string; package_type_id?: string; member_id?: string }) =>
    request<(MemberPackage & { members?: { id: string; name: string; phone: string; email?: string | null; shift?: string | null } | null })[]>(`/payments/sales${qs(params || {})}`),
  getPaymentAnalytics: (params?: { date_from?: string; date_to?: string }) =>
    request<PaymentAnalytics>(`/payments/analytics${qs(params || {})}`),
  getCoupons: (includeInactive = false) =>
    request<Coupon[]>(`/payments/coupons${qs({ include_inactive: includeInactive ? "true" : undefined })}`),
  createCoupon: (data: Partial<Coupon> & { applies_to_all_gyms?: boolean }) =>
    request<Coupon>("/payments/coupons", { method: "POST", body: JSON.stringify(data) }),
  updateCoupon: (id: string, data: Partial<Coupon> & { applies_to_all_gyms?: boolean }) =>
    request<Coupon>(`/payments/coupons/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCoupon: (id: string) => request<void>(`/payments/coupons/${id}`, { method: "DELETE" }),
  validateCoupon: (data: { gym_id: string; gross_amount: number; member_id?: string | null; coupon_id?: string | null; coupon_code?: string | null }) =>
    request<CouponValidationResult>("/payments/coupons/validate", { method: "POST", body: JSON.stringify(data) }),
  createMemberSale: (data: {
    gym_id: string;
    member_id: string;
    package_type_id: string;
    start_date: string;
    end_date: string;
    gross_amount: number;
    payment_mode: string;
    coupon_id?: string | null;
    coupon_code?: string | null;
    description?: string | null;
  }) => request<{ sale: MemberPackage; transaction: Transaction; applied_coupon: { id: string; code: string } | null; gross_amount: number; discount_amount: number; net_amount: number }>("/payments/member-sales", { method: "POST", body: JSON.stringify(data) }),

  // Member packages
  getMemberPackages: () => request<(MemberPackage & { members?: { name: string; phone: string } })[]>("/reports/packages"),
  createMemberPackage: (data: Partial<MemberPackage>) =>
    request<MemberPackage>("/reports/packages", { method: "POST", body: JSON.stringify(data) }),

  // Transactions
  getTransactions: () => request<(Transaction & { members?: { name: string; phone: string } })[]>("/reports/transactions"),
  createTransaction: (data: Partial<Transaction>) =>
    request<Transaction>("/reports/transactions", { method: "POST", body: JSON.stringify(data) }),

  // Followups
  getFollowups: (type?: string) =>
    request<(Followup & { members: Member | null })[]>(`/followups${qs({ type })}`),
  createFollowup: (data: Partial<Followup>) =>
    request<Followup>("/followups", { method: "POST", body: JSON.stringify(data) }),
  updateFollowup: (id: string, data: Partial<Followup>) =>
    request<Followup>(`/followups/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  // Enquiries
  getEnquiries: (status?: string) =>
    request<Enquiry[]>(`/enquiries${qs({ status })}`),
  createEnquiry: (data: Partial<Enquiry>) =>
    request<Enquiry>("/enquiries", { method: "POST", body: JSON.stringify(data) }),
  updateEnquiry: (id: string, data: Partial<Enquiry>) =>
    request<Enquiry>(`/enquiries/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteEnquiry: (id: string) => request<void>(`/enquiries/${id}`, { method: "DELETE" }),
  addEnquiryFollowup: (enquiry_id: string, data: Partial<EnquiryFollowup>) =>
    request<EnquiryFollowup>(`/enquiries/${enquiry_id}/followups`, { method: "POST", body: JSON.stringify(data) }),
  getEnquiryFollowups: () =>
    request<(EnquiryFollowup & { enquiries?: { name: string; phone: string; status: string } })[]>("/enquiries/followup-list"),

  // Reports
  getDashboardStats: () => request<DashboardStats>("/stats/dashboard"),
  getNearToExpire: (days: number) =>
    request<(MemberPackage & { members?: { id: string; name: string; phone: string; email: string | null; shift: string | null } })[]>(`/reports/near-to-expire${qs({ days })}`),
  getReviews: () =>
    request<(Review & { members?: { name: string; phone: string } })[]>("/reports/reviews"),
  createReview: (data: Partial<Review>) =>
    request<Review>("/reports/reviews", { method: "POST", body: JSON.stringify(data) }),
  getReferenceMembers: () =>
    request<{ ref: { id: string; name: string; phone: string }; referrals: { id: string; name: string; phone: string }[] }[]>("/reports/reference-members"),
  getShiftReport: () =>
    request<(Member & { member_packages?: { status: string; end_date: string; package_name: string }[] })[]>("/reports/shift-report"),
};
