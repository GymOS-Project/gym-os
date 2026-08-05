import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockResponse } from "../testUtils/http";

const resolveAuthenticatedSession = vi.fn();

vi.mock("../services/authSession.service", () => ({
  resolveAuthenticatedSession,
}));

vi.mock("../services/billing.service", () => ({
  hasBillingFeature: vi.fn(() => true),
}));

describe("session auth middleware", () => {
  beforeEach(() => {
    resolveAuthenticatedSession.mockReset();
  });

  it("rejects unauthenticated requests", async () => {
    resolveAuthenticatedSession.mockResolvedValue(null);
    const { requireAuthenticatedSession } = await import("./sessionAuth.middleware");
    const res = createMockResponse();
    const next = vi.fn();

    await requireAuthenticatedSession({} as any, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("attaches authenticated session data", async () => {
    resolveAuthenticatedSession.mockResolvedValue({
      user: { id: "user-1" },
      admin: { id: "admin-1" },
      staff: null,
      role: "admin",
    });
    const { requireAuthenticatedSession } = await import("./sessionAuth.middleware");
    const req: any = {};
    const res = createMockResponse();
    const next = vi.fn();

    await requireAuthenticatedSession(req, res, next);

    expect(req.admin.id).toBe("admin-1");
    expect(req.sessionRole).toBe("admin");
    expect(next).toHaveBeenCalledOnce();
  });
});
