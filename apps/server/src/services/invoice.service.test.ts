import { describe, expect, it } from "vitest";

import { calculateInvoiceTotal, generateReceiptNumber, renderInvoiceReceiptPdf } from "./invoice.service";

describe("invoice service", () => {
  it("calculates totals with tax and discount", () => {
    expect(calculateInvoiceTotal(1000, 180, 50)).toBe(1130);
  });

  it("generates receipt numbers from invoice numbers", () => {
    expect(generateReceiptNumber("INV-202608-0001")).toBe("RCT-202608-0001");
  });

  it("renders a PDF document", () => {
    const pdf = renderInvoiceReceiptPdf({
      invoice: { invoice_number: "INV-1", receipt_number: "RCT-1", status: "paid", issue_date: "2026-08-05", subtotal: 100, tax_amount: 18, discount_amount: 0, total_amount: 118, line_items: [] },
      member: { name: "Test Member" },
      gym: { gym_name: "Test Gym" },
    });

    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
