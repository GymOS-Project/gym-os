export type PlanContentType = "rich_text" | "pdf";

export type PlanEditorValue = {
  content_type: PlanContentType;
  content: string;
  pdf_url: string | null;
  pdf_file_name: string | null;
  pdf_file: File | null;
};

type PlanContentRecord = {
  content_type?: PlanContentType | null;
  content?: string | null;
  pdf_url?: string | null;
  pdf_file_name?: string | null;
};

export function createEmptyPlanEditorValue(): PlanEditorValue {
  return {
    content_type: "rich_text",
    content: "",
    pdf_url: null,
    pdf_file_name: null,
    pdf_file: null,
  };
}

export function createPlanEditorValue(plan?: PlanContentRecord | null): PlanEditorValue {
  return {
    content_type: plan?.content_type === "pdf" ? "pdf" : "rich_text",
    content: plan?.content || "",
    pdf_url: plan?.pdf_url || null,
    pdf_file_name: plan?.pdf_file_name || null,
    pdf_file: null,
  };
}

export function buildPlanFormData(
  fields: Record<string, string | boolean | null | undefined>,
  planContent: PlanEditorValue,
) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    if (value === null || value === undefined) {
      continue;
    }

    formData.set(key, typeof value === "boolean" ? String(value) : value);
  }

  formData.set("content_type", planContent.content_type);

  if (planContent.content_type === "rich_text") {
    formData.set("content", planContent.content || "");
  }

  if (planContent.content_type === "pdf" && planContent.pdf_file) {
    formData.set("pdf_file", planContent.pdf_file);
  }

  return formData;
}
