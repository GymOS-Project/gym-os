import { describe, expect, it, vi } from "vitest";

import { requirePlanFeature } from "./billing.middleware";
import { createMockResponse } from "../testUtils/http";

describe("billing gate middleware", () => {
  it("blocks plans missing a required feature", () => {
    const req: any = { admin: { subscription: { entitled: true, features: [] } } };
    const res = createMockResponse();
    const next = vi.fn();

    requirePlanFeature("classes")(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe("PLAN_FEATURE_LOCKED");
    expect(next).not.toHaveBeenCalled();
  });

  it("allows plans with the required feature", () => {
    const req: any = { admin: { subscription: { entitled: true, features: ["classes"] } } };
    const res = createMockResponse();
    const next = vi.fn();

    requirePlanFeature("classes")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });
});
