import { supabase } from "../supabase";

type MemberLike = {
  id: string;
};

type MemberPackageSummary = {
  member_id: string;
  status: string;
  end_date: string;
  package_name: string;
};

export async function attachMemberPackages<T extends MemberLike>(members: T[], adminId: string) {
  if (members.length === 0) {
    return members.map((member) => ({ ...member, member_packages: [] }));
  }

  const memberIds = members.map((member) => member.id);
  const { data, error } = await supabase
    .from("member_packages")
    .select("member_id, status, end_date, package_name")
    .eq("admin_id", adminId)
    .in("member_id", memberIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const packageMap = new Map<string, MemberPackageSummary[]>();
  for (const memberPackage of (data || []) as MemberPackageSummary[]) {
    const existing = packageMap.get(memberPackage.member_id) || [];
    existing.push(memberPackage);
    packageMap.set(memberPackage.member_id, existing);
  }

  return members.map((member) => ({
    ...member,
    member_packages: packageMap.get(member.id) || [],
  }));
}

export function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function calculatePausedDays(pausedAt: string, resumedAt = new Date().toISOString()) {
  const start = new Date(pausedAt).getTime();
  const end = new Date(resumedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.max(1, Math.ceil((end - start) / 86400000));
}
