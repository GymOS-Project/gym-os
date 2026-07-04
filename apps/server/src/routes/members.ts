import { Router } from "express";
import { supabase } from "../supabase";
import { sendWhatsAppMessage } from "../services/whatsapp";

const router = Router();

router.get("/", async (_req, res) => {
  const { data, error } = await supabase.from("members").select("*");
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

router.get("/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("id", req.params.id)
    .maybeSingle();

  if (error) return res.status(500).json({ message: error.message });
  if (!data) return res.status(404).json({ message: "Member not found" });

  res.json(data);
});

router.post("/", async (req, res) => {
  const { name, email, phone, gender, date_of_birth, address, emergency_contact, shift, notes, reference_member_id, admin_id } = req.body;

  if (!name || !phone || !admin_id) {
    return res.status(400).json({ message: "name, phone, and admin_id are required" });
  }

  const { data, error } = await supabase
    .from("members")
    .insert({ name, email, phone, gender, date_of_birth, address, emergency_contact, shift, notes, reference_member_id, admin_id })
    .select()
    .single();

  if (error) return res.status(500).json({ message: error.message });

  sendWhatsAppMessage(
    data.phone,
    `Welcome to the gym, ${data.name}! Your membership is now active.`
  ).catch((err) => console.error("[whatsapp] Failed to send welcome message", err));

  res.status(201).json(data);
});

router.put("/:id", async (req, res) => {
  const { name, email, phone, gender, date_of_birth, address, emergency_contact, shift, notes, is_active } = req.body;

  const { data: existing } = await supabase
    .from("members")
    .select("id")
    .eq("id", req.params.id)
    .maybeSingle();

  if (!existing) return res.status(404).json({ message: "Member not found" });

  const { data, error } = await supabase
    .from("members")
    .update({ name, email, phone, gender, date_of_birth, address, emergency_contact, shift, notes, is_active, updated_at: new Date().toISOString() })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

router.delete("/:id", async (req, res) => {
  const { data: existing } = await supabase
    .from("members")
    .select("id")
    .eq("id", req.params.id)
    .maybeSingle();

  if (!existing) return res.status(404).json({ message: "Member not found" });

  const { error } = await supabase.from("members").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ message: error.message });

  res.status(204).send();
});

export default router;
