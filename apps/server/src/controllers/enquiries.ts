import type { Request, Response } from "express";
import { supabase } from "../supabase";

export async function listEnquiries(req: Request, res: Response) {
  const admin_id = req.query.admin_id as string;
  if (!admin_id) {
    return res.status(400).json({ message: "admin_id is required" });
  }

  let query = supabase.from("enquiries").select("*").eq("admin_id", admin_id);
  const status = req.query.status as string;

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.json(data);
}

export async function createEnquiry(req: Request, res: Response) {
  const {
    admin_id,
    name,
    phone,
    email,
    source,
    interest,
    assigned_to,
    next_followup_date,
    notes,
  } = req.body;

  if (!admin_id || !name || !phone) {
    return res.status(400).json({ message: "admin_id, name, and phone are required" });
  }

  const { data, error } = await supabase
    .from("enquiries")
    .insert({
      admin_id,
      name,
      phone,
      email: email || null,
      source: source || null,
      interest: interest || null,
      assigned_to: assigned_to || null,
      next_followup_date: next_followup_date || null,
      notes: notes || null,
      status: "new",
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.status(201).json(data);
}

export async function updateEnquiry(req: Request, res: Response) {
  const { status, next_followup_date } = req.body;

  const { data, error } = await supabase
    .from("enquiries")
    .update({ status, next_followup_date: next_followup_date || null })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.json(data);
}

export async function deleteEnquiry(req: Request, res: Response) {
  const { error } = await supabase.from("enquiries").delete().eq("id", req.params.id);

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.status(204).send();
}

export async function createEnquiryFollowup(req: Request, res: Response) {
  const { admin_id, followup_date, next_followup_date, notes, status } = req.body;

  const { data, error } = await supabase
    .from("enquiry_followups")
    .insert({
      admin_id,
      enquiry_id: req.params.id,
      followup_date,
      next_followup_date: next_followup_date || null,
      notes: notes || null,
      status,
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.status(201).json(data);
}

export async function listEnquiryFollowups(req: Request, res: Response) {
  const admin_id = req.query.admin_id as string;
  if (!admin_id) {
    return res.status(400).json({ message: "admin_id is required" });
  }

  const { data, error } = await supabase
    .from("enquiry_followups")
    .select("*, enquiries(name, phone, status)")
    .eq("admin_id", admin_id)
    .order("followup_date", { ascending: false });

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.json(data);
}
