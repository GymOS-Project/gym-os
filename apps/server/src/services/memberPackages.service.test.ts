import { describe, expect, it } from "vitest";

import { addDays, calculatePausedDays } from "./memberPackages.service";

describe("member package lifecycle helpers", () => {
  it("extends end dates by paused days", () => {
    expect(addDays("2026-08-05", 3)).toBe("2026-08-08");
  });

  it("counts at least one paused day", () => {
    expect(calculatePausedDays("2026-08-05T10:00:00.000Z", "2026-08-05T11:00:00.000Z")).toBe(1);
    expect(calculatePausedDays("2026-08-05T10:00:00.000Z", "2026-08-07T10:00:00.000Z")).toBe(2);
  });
});
