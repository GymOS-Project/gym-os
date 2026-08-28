import { describe, expect, it } from "vitest";

import { getBillingLimit, hasBillingFeature } from "./billing.service";

describe("billing service helpers", () => {
  it("grants trial features according to plan tier", () => {
    expect(hasBillingFeature({ entitled: true, status: "trialing", plan_code: "growth", features: [] } as any, "classes")).toBe(true);
    expect(hasBillingFeature({ entitled: true, status: "trialing", plan_code: "growth", features: [] } as any, "payroll")).toBe(false);
    expect(hasBillingFeature({ entitled: true, status: "trialing", plan_code: "scale", features: [] } as any, "payroll")).toBe(true);
    expect(getBillingLimit({ entitled: true, status: "trialing", plan_code: "growth", limits: {} } as any, "max_active_members")).toBe(1200);
  });
});
