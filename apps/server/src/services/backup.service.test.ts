import { describe, expect, it } from "vitest";

import { sanitizeBackupRows, validateBackupPayload } from "./backup.service";

describe("backup service", () => {
  it("summarizes valid backup payloads", () => {
    const { summary } = validateBackupPayload({ tables: { members: [{ id: "1" }], transactions: [] } });
    expect(summary.members).toBe(1);
    expect(summary.transactions).toBe(0);
  });

  it("rejects invalid table values", () => {
    expect(() => validateBackupPayload({ tables: { members: {} } })).toThrow("Backup table members must be an array");
  });

  it("scopes restored rows to the current admin and selected gym", () => {
    expect(sanitizeBackupRows([{ id: "a", admin_id: "old", gym_id: "gym-1" }, { id: "b", gym_id: "gym-2" }], "admin-1", "gym-1")).toEqual([
      { id: "a", admin_id: "admin-1", gym_id: "gym-1" },
    ]);
  });
});
