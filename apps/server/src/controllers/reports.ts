import type { Request, Response } from "express";
import { supabase } from "../supabase";

export async function listMemberPackages(req: Request, res: Response) {
  const admin_id = req.query.admin_id as string;
  if (!admin_id) {
    return res.status(400).json({ message: "admin_id is required" });
  }

  const { data, error } = await supabase
    .from("member_packages")
    .select("*, members(name, phone)")
    .eq("admin_id", admin_id)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.json(data);
}

export async function createMemberPackage(req: Request, res: Response) {
  const { admin_id, member_id, package_type_id, package_name, start_date, end_date, amount_paid, payment_mode } = req.body;

  const { data, error } = await supabase
    .from("member_packages")
    .insert({
      admin_id,
      member_id,
      package_type_id,
      package_name,
      start_date,
      end_date,
      amount_paid,
      payment_mode,
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.status(201).json(data);
}

export async function getNearToExpire(req: Request, res: Response) {
  const admin_id = req.query.admin_id as string;
  const days = parseInt(req.query.days as string, 10) || 7;

  if (!admin_id) {
    return res.status(400).json({ message: "admin_id is required" });
  }

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

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.json(data);
}

export async function listTransactions(req: Request, res: Response) {
  const admin_id = req.query.admin_id as string;
  if (!admin_id) {
    return res.status(400).json({ message: "admin_id is required" });
  }

  const { data, error } = await supabase
    .from("transactions")
    .select("*, members(name, phone)")
    .eq("admin_id", admin_id)
    .order("transaction_date", { ascending: false });

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.json(data);
}

export async function createTransaction(req: Request, res: Response) {
  const { admin_id, member_id, type, amount, payment_mode, description } = req.body;

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      admin_id,
      member_id,
      type,
      amount,
      payment_mode,
      description: description || null,
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.status(201).json(data);
}

export async function listReviews(req: Request, res: Response) {
  const admin_id = req.query.admin_id as string;
  if (!admin_id) {
    return res.status(400).json({ message: "admin_id is required" });
  }

  const { data, error } = await supabase
    .from("reviews")
    .select("*, members(name, phone)")
    .eq("admin_id", admin_id)
    .order("review_date", { ascending: false });

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.json(data);
}

export async function createReview(req: Request, res: Response) {
  const { admin_id, member_id, rating, comment, review_date } = req.body;

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      admin_id,
      member_id: member_id || null,
      rating,
      comment: comment || null,
      review_date,
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.status(201).json(data);
}

export async function listReferenceMembers(req: Request, res: Response) {
  const admin_id = req.query.admin_id as string;
  if (!admin_id) {
    return res.status(400).json({ message: "admin_id is required" });
  }

  const { data: members, error } = await supabase
    .from("members")
    .select("id, name, phone, reference_member_id")
    .eq("admin_id", admin_id)
    .not("reference_member_id", "is", null);

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  const refIds = [...new Set((members || []).map((member) => member.reference_member_id))];
  const { data: refs } = refIds.length
    ? await supabase.from("members").select("id, name, phone").in("id", refIds as string[])
    : { data: [] };

  const refMap = Object.fromEntries((refs || []).map((ref) => [ref.id, ref]));
  const grouped: Record<string, { ref: unknown; referrals: unknown[] }> = {};

  (members || []).forEach((member) => {
    const refId = member.reference_member_id as string;
    if (!grouped[refId]) {
      grouped[refId] = { ref: refMap[refId], referrals: [] };
    }
    grouped[refId].referrals.push(member);
  });

  return res.json(Object.values(grouped));
}

export async function getShiftReport(req: Request, res: Response) {
  const admin_id = req.query.admin_id as string;
  if (!admin_id) {
    return res.status(400).json({ message: "admin_id is required" });
  }

  const { data, error } = await supabase
    .from("members")
    .select("id, name, phone, shift, is_active, member_packages(status, end_date, package_name)")
    .eq("admin_id", admin_id)
    .order("shift");

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.json(data);
}
