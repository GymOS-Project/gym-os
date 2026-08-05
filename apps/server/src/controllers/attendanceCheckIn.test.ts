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
  b.single = vi.fn(async () => ({ data: { id: "att-1", ...b.payload }, error: null }));
  return b;
}

describe("attendance check-in controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveWriteGymId.mockResolvedValue("gym-1");
    mocks.ensureMemberBelongsToGym.mockResolvedValue(true);
  });

  it("creates member check-in logs", async () => {
    const b = insertBuilder();
    mocks.from.mockReturnValue(b);
    const { checkIn } = await import("./attendance");
    const res = createMockResponse();

    await checkIn({ admin: { id: "admin-1" }, body: { entity_type: "member", member_id: "member-1", check_in_at: "2026-08-05T10:00:00.000Z" } } as any, res);

    expect(res.statusCode).toBe(201);
    expect(b.payload).toMatchObject({ admin_id: "admin-1", gym_id: "gym-1", entity_type: "member", member_id: "member-1", attendance_date: "2026-08-05", source: "manual", status: "present" });
  });
});
