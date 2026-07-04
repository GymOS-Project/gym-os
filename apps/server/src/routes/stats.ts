import { Router } from "express";
import { supabase } from "../supabase";

const router = Router();

router.get("/dashboard", async (req, res) => {
  const admin_id = req.query.admin_id as string;
  if (!admin_id) return res.status(400).json({ message: "admin_id query param is required" });

  const today = new Date().toISOString().split("T")[0];
  const weekLater = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

  const [membersRes, packagesRes, txnsRes] = await Promise.all([
    supabase.from("members").select("id, is_active").eq("admin_id", admin_id),
    supabase.from("member_packages").select("status, end_date, amount_paid").eq("admin_id", admin_id),
    supabase.from("transactions").select("amount").eq("admin_id", admin_id).eq("type", "payment").gte("transaction_date", monthStart),
  ]);

  const members = membersRes.data || [];
  const packages = packagesRes.data || [];
  const transactions = txnsRes.data || [];

  const activePackages = packages.filter((p) => p.status === "active");
  const expiredPackages = packages.filter((p) => p.status === "expired");
  const expiringThisWeek = activePackages.filter((p) => p.end_date >= today && p.end_date <= weekLater);

  const totalRevenue = packages.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
  const monthlyRevenue = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);

  res.json({
    totalMembers: members.length,
    activeMembers: activePackages.length,
    expiredMembers: expiredPackages.length,
    expiringThisWeek: expiringThisWeek.length,
    totalRevenue,
    monthlyRevenue,
  });
});

export default router;
