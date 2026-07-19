import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/sessionAuth.middleware";
import { attachEnquiriesByEnquiryId } from "../services/relatedRecords.service";
import { ensureEnquiryBelongsToGym, resolveGymScope, resolveWriteGymId } from "../services/gymScope.service";
import { supabase } from "../supabase";

function getAdminId(req: AuthenticatedRequest, res: Response) {
  const adminId = req.admin?.id;
  if (!adminId) {
    res.status(401).json({ message: "Not authenticated" });
    return null;
  }

  return adminId;
}

export async function listEnquiries(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) {
    return;
  }

  let query = supabase.from("enquiries").select("*").eq("admin_id", adminId);
  const status = req.query.status as string;

  if (gymScope.selectedGymId) {
    query = query.eq("gym_id", gymScope.selectedGymId);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.json(data);
}

export async function createEnquiry(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymId = await resolveWriteGymId(req, res);
  if (!gymId) {
    return;
  }

  const {
    name,
    phone,
    email,
    source,
    interest,
    assigned_to,
    next_followup_date,
    notes,
  } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ message: "name and phone are required" });
  }

  const { data, error } = await supabase
    .from("enquiries")
    .insert({
      admin_id: adminId,
      gym_id: gymId,
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

export async function updateEnquiry(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) {
    return;
  }

  const { status, next_followup_date } = req.body;

  let query = supabase
    .from("enquiries")
    .update({ status, next_followup_date: next_followup_date || null })
    .eq("id", req.params.id)
    .eq("admin_id", adminId);

  if (gymScope.selectedGymId) {
    query = query.eq("gym_id", gymScope.selectedGymId);
  }

  const { data, error } = await query.select().single();

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.json(data);
}

export async function deleteEnquiry(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) {
    return;
  }

  let query = supabase.from("enquiries").delete().eq("id", req.params.id).eq("admin_id", adminId);

  if (gymScope.selectedGymId) {
    query = query.eq("gym_id", gymScope.selectedGymId);
  }

  const { error } = await query;

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.status(204).send();
}

export async function createEnquiryFollowup(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymId = await resolveWriteGymId(req, res);
  if (!gymId) {
    return;
  }

  const validEnquiry = await ensureEnquiryBelongsToGym(req.params.id, adminId, gymId).catch((error) => {
    res.status(500).json({ message: error instanceof Error ? error.message : "Failed to validate enquiry" });
    return null;
  });

  if (validEnquiry === null) {
    return;
  }

  if (!validEnquiry) {
    return res.status(400).json({ message: "Selected enquiry does not belong to this gym" });
  }

  const { followup_date, next_followup_date, notes, status } = req.body;

  const { data, error } = await supabase
    .from("enquiry_followups")
    .insert({
      admin_id: adminId,
      gym_id: gymId,
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

export async function listEnquiryFollowups(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) {
    return;
  }

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) {
    return;
  }

  let query = supabase
    .from("enquiry_followups")
    .select("*")
    .eq("admin_id", adminId);

  if (gymScope.selectedGymId) {
    query = query.eq("gym_id", gymScope.selectedGymId);
  }

  const { data, error } = await query.order("followup_date", { ascending: false });

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  try {
    return res.json(await attachEnquiriesByEnquiryId(data || []));
  } catch (attachError) {
    return res.status(500).json({ message: attachError instanceof Error ? attachError.message : "Failed to load enquiry followups" });
  }
}
