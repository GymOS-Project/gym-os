import { Router } from "express";
import { supabase } from "../supabase";

const router = Router();

router.get("/", async (req, res) => {
  const admin_id = req.query.admin_id as string;
  if (!admin_id) return res.status(400).json({ message: "admin_id is required" });
  let query = supabase.from("enquiries").select("*").eq("admin_id", admin_id);
  const status = req.query.status as string;
  if (status) query = query.eq("status", status);
  query = query.order("created_at", { ascending: false });
  const { data, error } = await query;
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

router.post("/", async (req, res) => {
  const { admin_id, name, phone, email, source, interest, assigned_to, next_followup_date, notes } = req.body;
  if (!admin_id || !name || !phone) {
    return res.status(400).json({ message: "admin_id, name, and phone are required" });
  }
  const { data, error } = await supabase
    .from("enquiries")
    .insert({ admin_id, name, phone, email: email || null, source: source || null, interest: interest || null, assigned_to: assigned_to || null, next_followup_date: next_followup_date || null, notes: notes || null, status: "new" })
    .select()
    .single();
  if (error) return res.status(500).json({ message: error.message });
  res.status(201).json(data);
});

router.put("/:id", async (req, res) => {
  const { status, next_followup_date } = req.body;
  const { data, error } = await supabase
    .from("enquiries")
    .update({ status, next_followup_date: next_followup_date || null })
    .eq("id", req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

router.delete("/:id", async (req, res) => {
  const { error } = await supabase.from("enquiries").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ message: error.message });
  res.status(204).send();
});

router.post("/:id/followups", async (req, res) => {
  const { admin_id, followup_date, next_followup_date, notes, status } = req.body;
  const { data, error } = await supabase
    .from("enquiry_followups")
    .insert({ admin_id, enquiry_id: req.params.id, followup_date, next_followup_date: next_followup_date || null, notes: notes || null, status })
    .select()
    .single();
  if (error) return res.status(500).json({ message: error.message });
  res.status(201).json(data);
});

router.get("/followup-list", async (req, res) => {
  const admin_id = req.query.admin_id as string;
  if (!admin_id) return res.status(400).json({ message: "admin_id is required" });
  const { data, error } = await supabase
    .from("enquiry_followups")
    .select("*, enquiries(name, phone, status)")
    .eq("admin_id", admin_id)
    .order("followup_date", { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

export default router;
