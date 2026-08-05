import { describe, expect, it } from "vitest";

import { normalizeOptionalNumber, normalizeOptionalString } from "./payments.service";

describe("payments service", () => {
  it("normalizes optional payment inputs", () => {
    expect(normalizeOptionalString("  upi  ")).toBe("upi");
    expect(normalizeOptionalString("   ")).toBeNull();
    expect(normalizeOptionalNumber("123.45")).toBe(123.45);
    expect(normalizeOptionalNumber("nope")).toBeNull();
  });
});
