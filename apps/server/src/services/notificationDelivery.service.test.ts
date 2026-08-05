import { describe, expect, it } from "vitest";

import { calculateNotificationRetryDelayMs, calculateNextNotificationRetryAt, resolveNotificationFailureStatus } from "./notificationDelivery.service";

describe("notification delivery retry policy", () => {
  it("uses exponential backoff capped at 24 hours", () => {
    expect(calculateNotificationRetryDelayMs(1)).toBe(60 * 60 * 1000);
    expect(calculateNotificationRetryDelayMs(2)).toBe(2 * 60 * 60 * 1000);
    expect(calculateNotificationRetryDelayMs(99)).toBe(24 * 60 * 60 * 1000);
  });

  it("returns retry timestamps from the supplied clock", () => {
    expect(calculateNextNotificationRetryAt(1, new Date("2026-08-05T00:00:00.000Z"))).toBe("2026-08-05T01:00:00.000Z");
  });

  it("marks exhausted deliveries permanently failed", () => {
    expect(resolveNotificationFailureStatus(2, 3)).toBe("failed");
    expect(resolveNotificationFailureStatus(3, 3)).toBe("permanently_failed");
  });
});
