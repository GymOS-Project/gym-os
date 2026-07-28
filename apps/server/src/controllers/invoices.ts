import type { Response } from "express";

import type { AuthenticatedRequest } from "../middleware/sessionAuth.middleware";
import { logActivity } from "../services/activityLog.service";
import { ensureMemberBelongsToGym, resolveGymScope, resolveWriteGymId } from "../services/gymScope.service";
import { calculateInvoiceTotal, generateInvoiceNumber, generateReceiptNumber, roundCurrency } from "../services/invoice.service";
import { supabase } from "../supabase";

function getAdminId(req: AuthenticatedRequest, res: Response) {
  const adminId = req.admin?.id;
  if (!adminId) {
    res.status(401).json({ message: "Not authenticated" });
    return null;
  }
  return adminId;
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") return value == null ? null : String(value);
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeOptionalNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? roundCurrency(numeric) : null;
}

export async function listInvoices(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const gymScope = await resolveGymScope(req, res);
  if (!gymScope) return;

  let query = supabase
    .from("invoices")
    .select("*")
    .eq("admin_id", adminId)
    .order("issue_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (gymScope.selectedGymId) query = query.eq("gym_id", gymScope.selectedGymId);

  const { data, error } = await query;
  if (error) return res.status(500).json({ message: error.message });
  return res.json(data || []);
}

export async function createInvoice(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const gymId = await resolveWriteGymId(req, res);
  if (!gymId) return;

  const memberId = normalizeOptionalString(req.body.member_id);
  if (memberId) {
    const validMember = await ensureMemberBelongsToGym(memberId, adminId, gymId).catch((error) => {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to validate member" });
      return null;
    });
    if (validMember === null) return;
    if (!validMember) return res.status(400).json({ message: "Selected member does not belong to this gym" });
  }

  const subtotal = normalizeOptionalNumber(req.body.subtotal) || 0;
  const taxAmount = normalizeOptionalNumber(req.body.tax_amount) || 0;
  const discountAmount = normalizeOptionalNumber(req.body.discount_amount) || 0;
  const totalAmount = calculateInvoiceTotal(subtotal, taxAmount, discountAmount);
  const invoiceNumber = await generateInvoiceNumber(adminId).catch((error) => {
    res.status(500).json({ message: error instanceof Error ? error.message : "Failed to generate invoice number" });
    return null;
  });
  if (!invoiceNumber) return;

  const insert = await supabase
    .from("invoices")
    .insert({
      admin_id: adminId,
      gym_id: gymId,
      member_id: memberId,
      member_package_id: normalizeOptionalString(req.body.member_package_id),
      transaction_id: normalizeOptionalString(req.body.transaction_id),
      invoice_number: invoiceNumber,
      status: normalizeOptionalString(req.body.status) || "draft",
      issue_date: normalizeOptionalString(req.body.issue_date) || new Date().toISOString().slice(0, 10),
      due_date: normalizeOptionalString(req.body.due_date),
      subtotal,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      total_amount: totalAmount,
      notes: normalizeOptionalString(req.body.notes),
      line_items: Array.isArray(req.body.line_items) ? req.body.line_items : [],
    })
    .select("*")
    .single();

  if (insert.error) return res.status(500).json({ message: insert.error.message });
  await logActivity(req, { action: "create", entityType: "invoice", entityId: insert.data.id, gymId, after: insert.data });
  return res.status(201).json(insert.data);
}

export async function updateInvoice(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const existing = await supabase.from("invoices").select("*").eq("id", req.params.id).eq("admin_id", adminId).maybeSingle();
  if (existing.error) return res.status(500).json({ message: existing.error.message });
  if (!existing.data) return res.status(404).json({ message: "Invoice not found" });

  const subtotal = req.body.subtotal !== undefined ? normalizeOptionalNumber(req.body.subtotal) || 0 : Number(existing.data.subtotal || 0);
  const taxAmount = req.body.tax_amount !== undefined ? normalizeOptionalNumber(req.body.tax_amount) || 0 : Number(existing.data.tax_amount || 0);
  const discountAmount = req.body.discount_amount !== undefined ? normalizeOptionalNumber(req.body.discount_amount) || 0 : Number(existing.data.discount_amount || 0);

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    subtotal,
    tax_amount: taxAmount,
    discount_amount: discountAmount,
    total_amount: calculateInvoiceTotal(subtotal, taxAmount, discountAmount),
  };

  if (req.body.status !== undefined) updates.status = normalizeOptionalString(req.body.status);
  if (req.body.issue_date !== undefined) updates.issue_date = normalizeOptionalString(req.body.issue_date);
  if (req.body.due_date !== undefined) updates.due_date = normalizeOptionalString(req.body.due_date);
  if (req.body.notes !== undefined) updates.notes = normalizeOptionalString(req.body.notes);
  if (req.body.line_items !== undefined) updates.line_items = Array.isArray(req.body.line_items) ? req.body.line_items : [];

  const update = await supabase.from("invoices").update(updates).eq("id", req.params.id).eq("admin_id", adminId).select("*").single();
  if (update.error) return res.status(500).json({ message: update.error.message });
  await logActivity(req, { action: "update", entityType: "invoice", entityId: update.data.id, gymId: update.data.gym_id, before: existing.data, after: update.data });
  return res.json(update.data);
}

export async function markInvoicePaid(req: AuthenticatedRequest, res: Response) {
  const adminId = getAdminId(req, res);
  if (!adminId) return;

  const existing = await supabase.from("invoices").select("*").eq("id", req.params.id).eq("admin_id", adminId).maybeSingle();
  if (existing.error) return res.status(500).json({ message: existing.error.message });
  if (!existing.data) return res.status(404).json({ message: "Invoice not found" });

  const update = await supabase
    .from("invoices")
    .update({
      status: "paid",
      receipt_number: existing.data.receipt_number || generateReceiptNumber(existing.data.invoice_number),
      updated_at: new Date().toISOString(),
    })
    .eq("id", req.params.id)
    .eq("admin_id", adminId)
    .select("*")
    .single();

  if (update.error) return res.status(500).json({ message: update.error.message });
  await logActivity(req, { action: "mark_paid", entityType: "invoice", entityId: update.data.id, gymId: update.data.gym_id, before: existing.data, after: update.data });
  return res.json(update.data);
}
