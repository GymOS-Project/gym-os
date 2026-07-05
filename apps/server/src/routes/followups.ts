import { Router } from "express";
import { supabase } from "../supabase";

const router = Router();

router.get("/", async (req, res) => {
  const admin_id = req.query.admin_id as string;
  if (!admin_id) return res.status(400).json({ message: "admin_id is required" });
  let query = supabase.from("followups").select("*, members(id, name, phone)").eq("admin_id", admin_id);
  const type = req.query.type as string;
  if (type) query = query.eq("type", type);
  query = query.order("followup_date", { ascending: false });
  const { data, error } = await query;
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

router.post("/", async (req, res) => {
  const { admin_id, type, member_id, followup_date, next_followup_date, notes, status } = req.body;
  if (!admin_id || !followup_date) {
    return res.status(400).json({ message: "admin_id and followup_date are required" });
  }
  const { data, error } = await supabase
    .from("followups")
    .insert({ admin_id, type, member_id: member_id || null, followup_date, next_followup_date: next_followup_date || null, notes: notes || null, status: status || "pending" })
    .select()
    .single();
  if (error) return res.status(500).json({ message: error.message });
  res.status(201).json(data);
});

router.put("/:id", async (req, res) => {
  const { member_id, followup_date, next_followup_date, notes, status } = req.body;
  const { data, error } = await supabase
    .from("followups")
    .update({ member_id: member_id || null, followup_date, next_followup_date: next_followup_date || null, notes: notes || null, status })
    .eq("id", req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

export default router;
