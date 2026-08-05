import { describe, expect, it } from "vitest";

import { getFeatureLabel, getFeatureMinimumPlan, getPlanDefinition, getPlanLimit, getSectionFeature, hasPlanFeature } from "./billing";

describe("frontend billing helpers", () => {
  it("resolves plan definitions and limits", () => {
    expect(getPlanDefinition("growth").name).toBe("Growth");
    expect(getPlanDefinition(undefined).name).toBe("Starter");
    expect(getPlanLimit(null, "max_gyms")).toBe(10);
  });

  it("checks feature access and labels", () => {
    expect(getSectionFeature("classes")).toBe("classes");
    expect(getFeatureMinimumPlan("payroll")).toBe("scale");
    expect(getFeatureLabel("payment_analytics")).toBe("Payment Analytics");
    expect(hasPlanFeature({ entitled: true, features: ["classes"] } as any, "classes")).toBe(true);
    expect(hasPlanFeature({ entitled: false, features: ["classes"] } as any, "classes")).toBe(false);
  });
});
