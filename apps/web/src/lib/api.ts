import type {
  Admin, Gym, Member, PackageType, MemberPackage,
  Enquiry, EnquiryFollowup, Followup, Transaction, Review,
} from "@/types";
import { getStoredGymFilter } from "@/lib/gymFilter";

const API_BASE_URL =
  (import.meta as any).env.VITE_API_BASE_URL ||
  ((import.meta as any).env.PROD ? "/api" : "http://localhost:3001");

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const isFormData = options?.body instanceof FormData;
  const headers = withGymHeader(path, options?.headers, isFormData);
  const res = await fetch(`${API_BASE_URL}${path}`, {
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
  signout: () => request<{ message: string }>("/auth/signout", { method: "POST" }),
  me: () => request<LoginResult>("/auth/me"),
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

  // Plans (package_types)
  getPlans: () => request<PackageType[]>("/plans"),
  createPlan: (data: Partial<PackageType>) =>
    request<PackageType>("/plans", { method: "POST", body: JSON.stringify(data) }),
  updatePlan: (id: string, data: Partial<PackageType>) =>
    request<PackageType>(`/plans/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deletePlan: (id: string) => request<void>(`/plans/${id}`, { method: "DELETE" }),

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
