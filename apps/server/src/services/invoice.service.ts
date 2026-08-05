import { supabase } from "../supabase";

export function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateInvoiceTotal(subtotal: number, taxAmount: number, discountAmount: number) {
  return roundCurrency(subtotal + taxAmount - discountAmount);
}

export async function generateInvoiceNumber(adminId: string) {
  const period = new Date().toISOString().slice(0, 7).replace("-", "");
  const rpcResult = await supabase.rpc("next_invoice_number", { p_admin_id: adminId, p_period: period });
  if (!rpcResult.error && typeof rpcResult.data === "string") {
    return rpcResult.data;
  }

  const prefix = `INV-${period}`;
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

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCurrency(value: unknown) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value: unknown) {
  if (!value) return "-";
  return new Date(String(value)).toLocaleDateString("en-IN");
}

export function renderInvoiceReceiptHtml({ invoice, member, gym }: { invoice: any; member?: any; gym?: any }) {
  const lineItems = Array.isArray(invoice.line_items) ? invoice.line_items : [];
  const firstItem = lineItems[0] || {};
  const title = invoice.status === "paid" ? "Receipt" : "Invoice";
  const rows = lineItems.length > 0
    ? lineItems.map((item: any) => `
      <tr>
        <td>${escapeHtml(item.label || item.name || "Gym service")}</td>
        <td class="amount">${formatCurrency(item.amount || 0)}</td>
      </tr>`).join("")
    : `<tr><td>Gym service</td><td class="amount">${formatCurrency(invoice.subtotal)}</td></tr>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} ${escapeHtml(invoice.invoice_number)}</title>
  <style>
    body { margin: 0; background: #f4f6f8; color: #111827; font-family: Arial, Helvetica, sans-serif; }
    .page { max-width: 820px; margin: 32px auto; background: #fff; padding: 40px; border: 1px solid #e5e7eb; border-radius: 18px; }
    .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #111827; padding-bottom: 24px; }
    h1 { margin: 0; font-size: 32px; }
    h2 { margin: 0 0 8px; font-size: 18px; }
    p { margin: 4px 0; color: #4b5563; }
    .meta { text-align: right; }
    .section { margin-top: 28px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: left; }
    th { background: #f9fafb; color: #374151; font-size: 13px; text-transform: uppercase; letter-spacing: .04em; }
    .amount { text-align: right; }
    .totals { margin-left: auto; width: 320px; }
    .totals td { border: 0; padding: 8px 0; }
    .total td { border-top: 2px solid #111827; font-weight: 700; font-size: 18px; padding-top: 14px; }
    .badge { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #dcfce7; color: #166534; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .print { margin: 24px auto; max-width: 820px; text-align: right; }
    button { border: 0; border-radius: 10px; background: #111827; color: #fff; padding: 10px 16px; cursor: pointer; }
    @media print { body { background: #fff; } .page { margin: 0; border: 0; border-radius: 0; } .print { display: none; } }
  </style>
</head>
<body>
  <div class="print"><button onclick="window.print()">Print / Save as PDF</button></div>
  <main class="page">
    <div class="header">
      <div>
        <h1>${escapeHtml(title)}</h1>
        <p><strong>${escapeHtml(gym?.gym_name || "GymOS")}</strong></p>
        <p>${escapeHtml(gym?.address || "")}</p>
        <p>${escapeHtml(gym?.phone || gym?.email || "")}</p>
      </div>
      <div class="meta">
        <p><strong>Invoice:</strong> ${escapeHtml(invoice.invoice_number)}</p>
        <p><strong>Receipt:</strong> ${escapeHtml(invoice.receipt_number || "Pending")}</p>
        <p><strong>Issue date:</strong> ${formatDate(invoice.issue_date)}</p>
        <p><strong>Due date:</strong> ${formatDate(invoice.due_date)}</p>
        <p><span class="badge">${escapeHtml(invoice.status)}</span></p>
      </div>
    </div>
    <div class="section">
      <h2>Billed To</h2>
      <p><strong>${escapeHtml(member?.name || "Walk-in / General")}</strong></p>
      <p>${escapeHtml(member?.phone || "")}</p>
      <p>${escapeHtml(member?.email || "")}</p>
      ${firstItem.gstin ? `<p><strong>GSTIN:</strong> ${escapeHtml(firstItem.gstin)}</p>` : ""}
      ${firstItem.place_of_supply ? `<p><strong>Place of supply:</strong> ${escapeHtml(firstItem.place_of_supply)}</p>` : ""}
      ${firstItem.hsn_sac ? `<p><strong>HSN/SAC:</strong> ${escapeHtml(firstItem.hsn_sac)}</p>` : ""}
    </div>
    <div class="section">
      <h2>Line Items</h2>
      <table><thead><tr><th>Description</th><th class="amount">Amount</th></tr></thead><tbody>${rows}</tbody></table>
    </div>
    <div class="section">
      <table class="totals">
        <tr><td>Subtotal</td><td class="amount">${formatCurrency(invoice.subtotal)}</td></tr>
        <tr><td>Tax</td><td class="amount">${formatCurrency(invoice.tax_amount)}</td></tr>
        <tr><td>Discount</td><td class="amount">-${formatCurrency(invoice.discount_amount)}</td></tr>
        <tr class="total"><td>Total</td><td class="amount">${formatCurrency(invoice.total_amount)}</td></tr>
      </table>
    </div>
    ${invoice.notes ? `<div class="section"><h2>Notes</h2><p>${escapeHtml(invoice.notes)}</p></div>` : ""}
  </main>
</body>
</html>`;
}

function pdfEscape(value: unknown) {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function renderInvoiceReceiptPdf(input: { invoice: any; member?: any; gym?: any }) {
  const { invoice, member, gym } = input;
  const title = invoice.status === "paid" ? "Receipt" : "Invoice";
  const lineItems = Array.isArray(invoice.line_items) ? invoice.line_items : [];
  const firstItem = lineItems[0] || {};
  const textLines = [
    `${title} ${invoice.receipt_number || invoice.invoice_number}`,
    gym?.gym_name || "GymOS",
    gym?.address || "",
    `Invoice: ${invoice.invoice_number}`,
    `Receipt: ${invoice.receipt_number || "Pending"}`,
    `Issue date: ${formatDate(invoice.issue_date)}`,
    `Due date: ${formatDate(invoice.due_date)}`,
    `Status: ${invoice.status}`,
    "",
    "Billed To",
    member?.name || "Walk-in / General",
    member?.phone || "",
    member?.email || "",
    firstItem.gstin ? `GSTIN: ${firstItem.gstin}` : "",
    firstItem.place_of_supply ? `Place of supply: ${firstItem.place_of_supply}` : "",
    firstItem.hsn_sac ? `HSN/SAC: ${firstItem.hsn_sac}` : "",
    "",
    "Line Items",
    ...(lineItems.length > 0 ? lineItems.map((item: any) => `${item.label || item.name || "Gym service"}: ${formatCurrency(item.amount || 0)}`) : [`Gym service: ${formatCurrency(invoice.subtotal)}`]),
    "",
    `Subtotal: ${formatCurrency(invoice.subtotal)}`,
    `Tax: ${formatCurrency(invoice.tax_amount)}`,
    `Discount: -${formatCurrency(invoice.discount_amount)}`,
    `Total: ${formatCurrency(invoice.total_amount)}`,
    invoice.notes ? `Notes: ${invoice.notes}` : "",
  ].filter(Boolean);

  const content = ["BT", "/F1 18 Tf", "72 760 Td", `(${pdfEscape(textLines[0])}) Tj`, "/F1 11 Tf"];
  textLines.slice(1).forEach((line) => {
    content.push("0 -18 Td", `(${pdfEscape(line)}) Tj`);
  });
  content.push("ET");
  const stream = content.join("\n");
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream\nendobj\n`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += object;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "binary");
}
