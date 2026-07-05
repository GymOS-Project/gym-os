import type {
  Admin, Member, PackageType, MemberPackage,
  Enquiry, EnquiryFollowup, Followup, Transaction, Review,
} from "@/types";

const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || "http://localhost:3001";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
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
  signup: (email: string, password: string, adminData: { gym_name: string; owner_name: string; email?: string, phone?: string; address?: string}) =>
    request<LoginResult>("/auth/signup", { method: "POST", body: JSON.stringify({ email, password, ...adminData }) }),
  signout: () => request<{ message: string }>("/auth/signout", { method: "POST" }),
  me: () => request<LoginResult>("/auth/me"),

  // Members
  getMembers: (admin_id: string) => request<(Member & { member_packages?: { status: string; end_date: string; package_name: string }[] })[]>(`/members${qs({ admin_id })}`),
  getActiveMembers: (admin_id: string) => request<{ id: string; name: string; phone: string }[]>(`/members/active${qs({ admin_id })}`),
  createMember: (data: Partial<Member> & { admin_id: string }) =>
    request<Member>("/members", { method: "POST", body: JSON.stringify(data) }),
  updateMember: (id: string, data: Partial<Member>) =>
    request<Member>(`/members/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteMember: (id: string) => request<void>(`/members/${id}`, { method: "DELETE" }),

  // Plans (package_types)
  getPlans: (admin_id: string) => request<PackageType[]>(`/plans${qs({ admin_id })}`),
  createPlan: (data: Partial<PackageType> & { admin_id: string }) =>
    request<PackageType>("/plans", { method: "POST", body: JSON.stringify(data) }),
  updatePlan: (id: string, data: Partial<PackageType>) =>
    request<PackageType>(`/plans/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deletePlan: (id: string) => request<void>(`/plans/${id}`, { method: "DELETE" }),

  // Member packages
  getMemberPackages: (admin_id: string) => request<(MemberPackage & { members?: { name: string; phone: string } })[]>(`/reports/packages${qs({ admin_id })}`),
  createMemberPackage: (data: Partial<MemberPackage> & { admin_id: string }) =>
    request<MemberPackage>("/reports/packages", { method: "POST", body: JSON.stringify(data) }),

  // Transactions
  getTransactions: (admin_id: string) => request<(Transaction & { members?: { name: string; phone: string } })[]>(`/reports/transactions${qs({ admin_id })}`),
  createTransaction: (data: Partial<Transaction> & { admin_id: string }) =>
    request<Transaction>("/reports/transactions", { method: "POST", body: JSON.stringify(data) }),

  // Followups
  getFollowups: (admin_id: string, type?: string) =>
    request<(Followup & { members: Member | null })[]>(`/followups${qs({ admin_id, type })}`),
  createFollowup: (data: Partial<Followup> & { admin_id: string }) =>
    request<Followup>("/followups", { method: "POST", body: JSON.stringify(data) }),
  updateFollowup: (id: string, data: Partial<Followup>) =>
    request<Followup>(`/followups/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  // Enquiries
  getEnquiries: (admin_id: string, status?: string) =>
    request<Enquiry[]>(`/enquiries${qs({ admin_id, status })}`),
  createEnquiry: (data: Partial<Enquiry> & { admin_id: string }) =>
    request<Enquiry>("/enquiries", { method: "POST", body: JSON.stringify(data) }),
  updateEnquiry: (id: string, data: Partial<Enquiry>) =>
    request<Enquiry>(`/enquiries/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteEnquiry: (id: string) => request<void>(`/enquiries/${id}`, { method: "DELETE" }),
  addEnquiryFollowup: (enquiry_id: string, data: Partial<EnquiryFollowup> & { admin_id: string }) =>
    request<EnquiryFollowup>(`/enquiries/${enquiry_id}/followups`, { method: "POST", body: JSON.stringify(data) }),
  getEnquiryFollowups: (admin_id: string) =>
    request<(EnquiryFollowup & { enquiries?: { name: string; phone: string; status: string } })[]>(`/enquiries/followup-list${qs({ admin_id })}`),

  // Reports
  getDashboardStats: (admin_id: string) => request<DashboardStats>(`/stats/dashboard${qs({ admin_id })}`),
  getNearToExpire: (admin_id: string, days: number) =>
    request<(MemberPackage & { members?: { id: string; name: string; phone: string; email: string | null; shift: string | null } })[]>(`/reports/near-to-expire${qs({ admin_id, days })}`),
  getReviews: (admin_id: string) =>
    request<(Review & { members?: { name: string; phone: string } })[]>(`/reports/reviews${qs({ admin_id })}`),
  createReview: (data: Partial<Review> & { admin_id: string }) =>
    request<Review>("/reports/reviews", { method: "POST", body: JSON.stringify(data) }),
  getReferenceMembers: (admin_id: string) =>
    request<{ ref: { id: string; name: string; phone: string }; referrals: { id: string; name: string; phone: string }[] }[]>(`/reports/reference-members${qs({ admin_id })}`),
  getShiftReport: (admin_id: string) =>
    request<(Member & { member_packages?: { status: string; end_date: string; package_name: string }[] })[]>(`/reports/shift-report${qs({ admin_id })}`),
};
