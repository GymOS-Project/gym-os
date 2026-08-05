import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockResponse } from "../testUtils/http";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  resolveWriteGymId: vi.fn(),
  ensureMemberBelongsToGym: vi.fn(),
  generateInvoiceNumber: vi.fn(),
  logActivity: vi.fn(),
}));

vi.mock("../supabase", () => ({ supabase: { from: mocks.from } }));
vi.mock("../services/gymScope.service", () => ({
  resolveWriteGymId: mocks.resolveWriteGymId,
  ensureMemberBelongsToGym: mocks.ensureMemberBelongsToGym,
}));
vi.mock("../services/activityLog.service", () => ({ logActivity: mocks.logActivity }));
vi.mock("../services/invoice.service", async () => {
  const actual = await vi.importActual<typeof import("../services/invoice.service")>("../services/invoice.service");
  return { ...actual, generateInvoiceNumber: mocks.generateInvoiceNumber };
});

function insertBuilder() {
  const b: any = {};
  b.insert = vi.fn((payload) => { b.payload = payload; return b; });
  b.select = vi.fn(() => b);
  b.single = vi.fn(async () => ({ data: { id: "inv-1", ...b.payload }, error: null }));
  return b;
}

describe("invoice creation controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveWriteGymId.mockResolvedValue("gym-1");
    mocks.ensureMemberBelongsToGym.mockResolvedValue(true);
    mocks.generateInvoiceNumber.mockResolvedValue("INV-202608-0001");
  });

  it("creates invoices with calculated totals and invoice numbers", async () => {
    const b = insertBuilder();
    mocks.from.mockReturnValue(b);
    const { createInvoice } = await import("./invoices");
    const res = createMockResponse();

    await createInvoice({ admin: { id: "admin-1" }, body: { member_id: "member-1", subtotal: 1000, tax_amount: 180, discount_amount: 50 } } as any, res);

    expect(res.statusCode).toBe(201);
    expect(b.payload).toMatchObject({ invoice_number: "INV-202608-0001", total_amount: 1130, admin_id: "admin-1", gym_id: "gym-1" });
  });
});
