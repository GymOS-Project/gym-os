import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockResponse } from "../testUtils/http";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  resolveWriteGymId: vi.fn(),
  getAdminSubscriptionSummary: vi.fn(),
  countAdminUsage: vi.fn(),
  getBillingLimit: vi.fn(),
  sendMemberWelcomeEmail: vi.fn(),
  logActivity: vi.fn(),
}));

vi.mock("../supabase", () => ({ supabase: { from: mocks.from } }));
vi.mock("../services/gymScope.service", () => ({ resolveWriteGymId: mocks.resolveWriteGymId }));
vi.mock("../services/billing.service", () => ({
  getAdminSubscriptionSummary: mocks.getAdminSubscriptionSummary,
  countAdminUsage: mocks.countAdminUsage,
  getBillingLimit: mocks.getBillingLimit,
}));
vi.mock("../services/email.service", () => ({ sendMemberWelcomeEmail: mocks.sendMemberWelcomeEmail }));
vi.mock("../services/activityLog.service", () => ({ logActivity: mocks.logActivity }));

function builder(result: any) {
  const b: any = {};
  b.select = vi.fn(() => b);
  b.eq = vi.fn(() => b);
  b.insert = vi.fn((payload) => {
    b.payload = payload;
    return b;
  });
  b.single = vi.fn(async () => (typeof result === "function" ? result(b.payload) : result));
  return b;
}

describe("member creation controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveWriteGymId.mockResolvedValue("gym-1");
    mocks.getAdminSubscriptionSummary.mockResolvedValue({ limits: { max_active_members: 10 } });
    mocks.countAdminUsage.mockResolvedValue(1);
    mocks.getBillingLimit.mockReturnValue(10);
    mocks.sendMemberWelcomeEmail.mockResolvedValue(true);
  });

  it("creates a member in the resolved gym and logs activity", async () => {
    const gymBuilder = builder({ data: { gym_name: "Main Gym" }, error: null });
    const memberBuilder = builder((payload: any) => ({ data: { id: "member-1", ...payload }, error: null }));
    mocks.from.mockImplementation((table) => table === "gyms" ? gymBuilder : memberBuilder);
    const { createMember } = await import("./members");
    const res = createMockResponse();

    await createMember({ admin: { id: "admin-1" }, body: { name: "Nishu", phone: "999", email: "nishu@example.com" } } as any, res);

    expect(res.statusCode).toBe(201);
    expect(memberBuilder.payload).toMatchObject({ admin_id: "admin-1", gym_id: "gym-1", name: "Nishu", phone: "999" });
    expect(mocks.sendMemberWelcomeEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "nishu@example.com", gymName: "Main Gym" }));
    expect(mocks.logActivity).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: "create", entityType: "member" }));
  });
});
