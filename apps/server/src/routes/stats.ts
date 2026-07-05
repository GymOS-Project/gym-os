import { Router } from "express";
import { supabase } from "../supabase";

const router = Router();

router.get("/dashboard", async (req, res) => {
  const admin_id = req.query.admin_id as string;
  if (!admin_id) return res.status(400).json({ message: "admin_id query param is required" });

  const today = new Date().toISOString().split("T")[0];
  const weekLater = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

  const [membersRes, packagesRes, enquiriesRes, followupsRes, txnsRes, recentRes] = await Promise.all([
    supabase.from("members").select("id, is_active, created_at").eq("admin_id", admin_id),
    supabase.from("member_packages").select("status, end_date, amount_paid, created_at").eq("admin_id", admin_id),
    supabase.from("enquiries").select("id").eq("admin_id", admin_id),
    supabase.from("followups").select("id").eq("admin_id", admin_id).eq("status", "pending"),
    supabase.from("transactions").select("amount, transaction_date").eq("admin_id", admin_id).gte("transaction_date", monthStart),
    supabase.from("members").select("id, name, phone, created_at").eq("admin_id", admin_id).order("created_at", { ascending: false }).limit(5),
  ]);

  const members = membersRes.data || [];
  const packages = packagesRes.data || [];
  const transactions = txnsRes.data || [];

  const activePackages = packages.filter((p) => p.status === "active");
  const expiredPackages = packages.filter((p) => p.status === "expired");
  const expiringThisWeek = activePackages.filter((p) => p.end_date >= today && p.end_date <= weekLater);
  const totalRevenue = packages.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
  const monthlyRevenue = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const revenueChart: { month: string; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const label = d.toLocaleString("default", { month: "short" });
    const monthRevenue = packages
      .filter((p) => { const pd = new Date(p.created_at); return pd.getFullYear() === y && pd.getMonth() + 1 === m; })
      .reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
    revenueChart.push({ month: label, revenue: monthRevenue });
  }

  const COLORS = ["hsl(174, 72%, 40%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)"];

  res.json({
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
      { name: "Active", value: activePackages.length, color: COLORS[0] },
      { name: "Expiring", value: expiringThisWeek.length, color: COLORS[1] },
      { name: "Expired", value: expiredPackages.length, color: COLORS[2] },
    ],
  });
});

export default router;
