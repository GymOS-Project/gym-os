import { supabase } from "../supabase";

export function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateInvoiceTotal(subtotal: number, taxAmount: number, discountAmount: number) {
  return roundCurrency(subtotal + taxAmount - discountAmount);
}

export async function generateInvoiceNumber(adminId: string) {
  const prefix = `INV-${new Date().toISOString().slice(0, 7).replace("-", "")}`;
  const { count, error } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("admin_id", adminId)
    .like("invoice_number", `${prefix}-%`);

  if (error) {
    throw new Error(error.message);
  }

  return `${prefix}-${String((count || 0) + 1).padStart(4, "0")}`;
}

export function generateReceiptNumber(invoiceNumber: string) {
  return invoiceNumber.replace(/^INV-/, "RCT-");
}
