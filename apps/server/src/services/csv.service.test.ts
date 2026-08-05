import { describe, expect, it } from "vitest";

import { parseCsv, toCsv } from "./csv.service";

describe("csv service", () => {
  it("round trips escaped CSV values", () => {
    const csv = toCsv([{ name: "A, B", notes: "hello \"gym\"" }], ["name", "notes"]);
    expect(parseCsv(csv)).toEqual([{ name: "A, B", notes: 'hello "gym"' }]);
  });
});
