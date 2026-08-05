import { describe, expect, it } from "vitest";

import { buildPlanFormData, createEmptyPlanEditorValue, createPlanEditorValue } from "./planContent";

describe("plan content helpers", () => {
  it("creates editor values from plan records", () => {
    expect(createEmptyPlanEditorValue()).toMatchObject({ content_type: "rich_text", content: "" });
    expect(createPlanEditorValue({ content_type: "pdf", pdf_url: "file.pdf", pdf_file_name: "file.pdf" })).toMatchObject({ content_type: "pdf", pdf_url: "file.pdf" });
  });

  it("builds form data for rich text plans", () => {
    const data = buildPlanFormData({ name: "Diet", is_active: true, skipped: null }, { ...createEmptyPlanEditorValue(), content: "Eat well" });

    expect(data.get("name")).toBe("Diet");
    expect(data.get("is_active")).toBe("true");
    expect(data.get("skipped")).toBeNull();
    expect(data.get("content_type")).toBe("rich_text");
    expect(data.get("content")).toBe("Eat well");
  });
});
