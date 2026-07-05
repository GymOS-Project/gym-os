import type { Request, Response } from "express";
import { supabase } from "../supabase";

export async function getDashboardStats(req: Request, res: Response) {
  const admin_id = req.query.admin_id as string;
  if (!admin_id) {
    return res.status(400).json({ message: "admin_id query param is required" });
  }

  const today = new Date().toISOString().split("T")[0];
  const weekLater = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  const monthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  )
    .toISOString()
    .split("T")[0];

  const [membersRes, packagesRes, enquiriesRes, followupsRes, txnsRes, recentRes] = await Promise.all([
    supabase.from("members").select("id, is_active, created_at").eq("admin_id", admin_id),
    supabase
      .from("member_packages")
      .select("status, end_date, amount_paid, created_at")
      .eq("admin_id", admin_id),
    supabase.from("enquiries").select("id").eq("admin_id", admin_id),
    supabase.from("followups").select("id").eq("admin_id", admin_id).eq("status", "pending"),
    supabase
      .from("transactions")
      .select("amount, transaction_date")
      .eq("admin_id", admin_id)
      .gte("transaction_date", monthStart),
    supabase
      .from("members")
      .select("id, name, phone, created_at")
      .eq("admin_id", admin_id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const firstError = [membersRes, packagesRes, enquiriesRes, followupsRes, txnsRes, recentRes].find(
    (result) => result.error
  )?.error;

  if (firstError) {
    return res.status(500).json({ message: firstError.message });
  }

  const members = membersRes.data || [];
  const packages = packagesRes.data || [];
  const transactions = txnsRes.data || [];

  const activePackages = packages.filter((pkg) => pkg.status === "active");
  const expiredPackages = packages.filter((pkg) => pkg.status === "expired");
  const expiringThisWeek = activePackages.filter(
    (pkg) => pkg.end_date >= today && pkg.end_date <= weekLater
  );
  const totalRevenue = packages.reduce((sum, pkg) => sum + Number(pkg.amount_paid || 0), 0);
  const monthlyRevenue = transactions.reduce(
    (sum, transaction) => sum + Number(transaction.amount || 0),
    0
  );

  const revenueChart: { month: string; revenue: number }[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const label = date.toLocaleString("default", { month: "short" });
    const monthRevenue = packages
      .filter((pkg) => {
        const packageDate = new Date(pkg.created_at);
        return packageDate.getFullYear() === year && packageDate.getMonth() + 1 === month;
      })
      .reduce((sum, pkg) => sum + Number(pkg.amount_paid || 0), 0);

    revenueChart.push({ month: label, revenue: monthRevenue });
  }

  const colors = ["hsl(174, 72%, 40%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)"];

  return res.json({
    totalMembers: members.length,
    activeMembers: activePackages.length,
    expiredMembers: expiredPackages.length,
    expiringThisWeek: expiringThisWeek.length,
    totalRevenue,
    monthlyRevenue,
    totalEnquiries: enquiriesRes.data?.length || 0,
    pendingFollowups: followupsRes.data?.length || 0,
    revenueChart,
    recentMembers: recentRes.data || [],
    memberStatusChart: [
      { name: "Active", value: activePackages.length, color: colors[0] },
      { name: "Expiring", value: expiringThisWeek.length, color: colors[1] },
      { name: "Expired", value: expiredPackages.length, color: colors[2] },
    ],
  });
}
