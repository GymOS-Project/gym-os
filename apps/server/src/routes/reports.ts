import { Router } from "express";
import { supabase } from "../supabase";

const router = Router();

// member_packages routes
router.get("/packages", async (req, res) => {
  const admin_id = req.query.admin_id as string;
  if (!admin_id) return res.status(400).json({ message: "admin_id is required" });
  const { data, error } = await supabase
    .from("member_packages")
    .select("*, members(name, phone)")
    .eq("admin_id", admin_id)
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

router.post("/packages", async (req, res) => {
  const { admin_id, member_id, package_type_id, package_name, start_date, end_date, amount_paid, payment_mode } = req.body;
  const { data, error } = await supabase
    .from("member_packages")
    .insert({ admin_id, member_id, package_type_id, package_name, start_date, end_date, amount_paid, payment_mode })
    .select()
    .single();
  if (error) return res.status(500).json({ message: error.message });
  res.status(201).json(data);
});

// near-to-expire report
router.get("/near-to-expire", async (req, res) => {
  const admin_id = req.query.admin_id as string;
  const days = parseInt(req.query.days as string) || 7;
  if (!admin_id) return res.status(400).json({ message: "admin_id is required" });
  const today = new Date().toISOString().split("T")[0];
  const future = new Date(Date.now() + days * 86400000).toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("member_packages")
    .select("*, members(id, name, phone, email, shift)")
    .eq("admin_id", admin_id)
    .eq("status", "active")
    .gte("end_date", today)
    .lte("end_date", future)
    .order("end_date");
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

// transactions
router.get("/transactions", async (req, res) => {
  const admin_id = req.query.admin_id as string;
  if (!admin_id) return res.status(400).json({ message: "admin_id is required" });
  const { data, error } = await supabase
    .from("transactions")
    .select("*, members(name, phone)")
    .eq("admin_id", admin_id)
    .order("transaction_date", { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

router.post("/transactions", async (req, res) => {
  const { admin_id, member_id, type, amount, payment_mode, description } = req.body;
  const { data, error } = await supabase
    .from("transactions")
    .insert({ admin_id, member_id, type, amount, payment_mode, description: description || null })
    .select()
    .single();
  if (error) return res.status(500).json({ message: error.message });
  res.status(201).json(data);
});

// reviews
router.get("/reviews", async (req, res) => {
  const admin_id = req.query.admin_id as string;
  if (!admin_id) return res.status(400).json({ message: "admin_id is required" });
  const { data, error } = await supabase
    .from("reviews")
    .select("*, members(name, phone)")
    .eq("admin_id", admin_id)
    .order("review_date", { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

router.post("/reviews", async (req, res) => {
  const { admin_id, member_id, rating, comment, review_date } = req.body;
  const { data, error } = await supabase
    .from("reviews")
    .insert({ admin_id, member_id: member_id || null, rating, comment: comment || null, review_date })
    .select()
    .single();
  if (error) return res.status(500).json({ message: error.message });
  res.status(201).json(data);
});

// reference members report
router.get("/reference-members", async (req, res) => {
  const admin_id = req.query.admin_id as string;
  if (!admin_id) return res.status(400).json({ message: "admin_id is required" });
  const { data: members, error } = await supabase
    .from("members")
    .select("id, name, phone, reference_member_id")
    .eq("admin_id", admin_id)
    .not("reference_member_id", "is", null);
  if (error) return res.status(500).json({ message: error.message });
  const refIds = [...new Set((members || []).map((m) => m.reference_member_id))];
  const { data: refs } = refIds.length
    ? await supabase.from("members").select("id, name, phone").in("id", refIds as string[])
    : { data: [] };
  const refMap = Object.fromEntries((refs || []).map((r) => [r.id, r]));
  const grouped: Record<string, any> = {};
  (members || []).forEach((m) => {
    const refId = m.reference_member_id!;
    if (!grouped[refId]) grouped[refId] = { ref: refMap[refId], referrals: [] };
    grouped[refId].referrals.push(m);
  });
  res.json(Object.values(grouped));
});

// shift report
router.get("/shift-report", async (req, res) => {
  const admin_id = req.query.admin_id as string;
  if (!admin_id) return res.status(400).json({ message: "admin_id is required" });
  const { data, error } = await supabase
    .from("members")
    .select("id, name, phone, shift, is_active, member_packages(status, end_date, package_name)")
    .eq("admin_id", admin_id)
    .order("shift");
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

export default router;
