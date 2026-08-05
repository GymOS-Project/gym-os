import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockResponse } from "../testUtils/http";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  resolveWriteGymId: vi.fn(),
  ensureMemberBelongsToGym: vi.fn(),
  logActivity: vi.fn(),
}));

vi.mock("../supabase", () => ({ supabase: { from: mocks.from } }));
vi.mock("../services/gymScope.service", () => ({
  resolveWriteGymId: mocks.resolveWriteGymId,
  ensureMemberBelongsToGym: mocks.ensureMemberBelongsToGym,
}));
vi.mock("../services/activityLog.service", () => ({ logActivity: mocks.logActivity }));

function insertBuilder() {
  const b: any = {};
  b.insert = vi.fn((payload) => { b.payload = payload; return b; });
  b.select = vi.fn(() => b);
  b.single = vi.fn(async () => ({ data: { id: "txn-1", ...b.payload }, error: null }));
  return b;
}

describe("payment collection controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveWriteGymId.mockResolvedValue("gym-1");
    mocks.ensureMemberBelongsToGym.mockResolvedValue(true);
  });

  it("creates payment transactions with scoped member validation", async () => {
    const b = insertBuilder();
    mocks.from.mockReturnValue(b);
    const { createCollection } = await import("./payments");
    const res = createMockResponse();

    await createCollection({ admin: { id: "admin-1" }, body: { member_id: "member-1", amount: "500", payment_mode: "upi" } } as any, res);

    expect(res.statusCode).toBe(201);
    expect(mocks.ensureMemberBelongsToGym).toHaveBeenCalledWith("member-1", "admin-1", "gym-1");
    expect(b.payload).toMatchObject({ admin_id: "admin-1", gym_id: "gym-1", member_id: "member-1", amount: 500, payment_mode: "upi" });
  });
});
