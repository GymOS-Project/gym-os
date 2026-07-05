import type { Request, Response } from "express";
import { supabase } from "../supabase";

export async function listMembers(req: Request, res: Response) {
  const admin_id = req.query.admin_id as string;

  let query = supabase
    .from("members")
    .select("*, member_packages(status, end_date, package_name)");

  if (admin_id) {
    query = query.eq("admin_id", admin_id);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.json(data);
}

export async function listActiveMembers(req: Request, res: Response) {
  const admin_id = req.query.admin_id as string;
  if (!admin_id) {
    return res.status(400).json({ message: "admin_id is required" });
  }

  const { data, error } = await supabase
    .from("members")
    .select("id, name, phone")
    .eq("admin_id", admin_id)
    .eq("is_active", true);

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.json(data);
}

export async function getMember(req: Request, res: Response) {
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("id", req.params.id)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ message: error.message });
  }
  if (!data) {
    return res.status(404).json({ message: "Member not found" });
  }

  return res.json(data);
}

export async function createMember(req: Request, res: Response) {
  const {
    name,
    email,
    phone,
    gender,
    date_of_birth,
    address,
    emergency_contact,
    shift,
    notes,
    reference_member_id,
    admin_id,
  } = req.body;

  if (!name || !phone || !admin_id) {
    return res.status(400).json({ message: "name, phone, and admin_id are required" });
  }

  const { data, error } = await supabase
    .from("members")
    .insert({
      name,
      email,
      phone,
      gender,
      date_of_birth,
      address,
      emergency_contact,
      shift,
      notes,
      reference_member_id,
      admin_id,
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.status(201).json(data);
}

export async function updateMember(req: Request, res: Response) {
  const {
    name,
    email,
    phone,
    gender,
    date_of_birth,
    address,
    emergency_contact,
    shift,
    notes,
    is_active,
  } = req.body;

  const { data: existing } = await supabase
    .from("members")
    .select("id")
    .eq("id", req.params.id)
    .maybeSingle();

  if (!existing) {
    return res.status(404).json({ message: "Member not found" });
  }

  const { data, error } = await supabase
    .from("members")
    .update({
      name,
      email,
      phone,
      gender,
      date_of_birth,
      address,
      emergency_contact,
      shift,
      notes,
      is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.json(data);
}

export async function deleteMember(req: Request, res: Response) {
  const { data: existing } = await supabase
    .from("members")
    .select("id")
    .eq("id", req.params.id)
    .maybeSingle();

  if (!existing) {
    return res.status(404).json({ message: "Member not found" });
  }

  const { error } = await supabase.from("members").delete().eq("id", req.params.id);
  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.status(204).send();
}
