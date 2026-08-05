import { describe, expect, it } from "vitest";

import { isDateAfter, isDateBefore, isDateTimeAfter, isDateTimeBefore, isSameCalendarDate } from "./date";

describe("date helpers", () => {
  it("compares date-only values", () => {
    expect(isDateBefore("2026-08-04", "2026-08-05")).toBe(true);
    expect(isDateAfter("2026-08-06", "2026-08-05")).toBe(true);
    expect(isDateBefore("invalid", "2026-08-05")).toBe(false);
  });

  it("compares date-time values and calendar dates", () => {
    expect(isDateTimeBefore("2026-08-05T09:00", "2026-08-05T10:00")).toBe(true);
    expect(isDateTimeAfter("2026-08-05T11:00", "2026-08-05T10:00")).toBe(true);
    expect(isSameCalendarDate("2026-08-05", "2026-08-05T23:59")).toBe(true);
  });
});
