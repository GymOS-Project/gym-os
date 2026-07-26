import { randomUUID } from "crypto";

import { supabase } from "../supabase";

export const PLAN_CONTENT_TYPES = ["rich_text", "pdf"] as const;
export type PlanContentType = (typeof PLAN_CONTENT_TYPES)[number];
export type PlanTable = "diet_plans" | "exercise_plans";

const PLAN_PDF_BUCKET = process.env.SUPABASE_PLAN_PDF_BUCKET || "plan-files";

type ExistingPlanContent = {
  content_type?: string | null;
  content?: string | null;
  pdf_url?: string | null;
  pdf_file_name?: string | null;
};

type ResolvePlanContentFieldsParams = {
  adminId: string;
  gymId: string;
  table: PlanTable;
  body: Record<string, unknown>;
  file?: Express.Multer.File;
  existing?: ExistingPlanContent | null;
};

function hasOwn(body: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return value == null ? null : String(value);
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function normalizePlanContent(value: unknown) {
  if (typeof value !== "string") {
    return value == null ? null : String(value);
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function normalizeOptionalBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }
  }

  return undefined;
}

export function resolvePlanContentType(value: unknown, fallback: PlanContentType = "rich_text"): PlanContentType {
  return value === "pdf" || value === "rich_text" ? value : fallback;
}

export function hasPlanContentInput(body: Record<string, unknown>, file?: Express.Multer.File) {
  return Boolean(file)
    || hasOwn(body, "content")
    || hasOwn(body, "content_type");
}

async function uploadPlanPdf(file: Express.Multer.File, adminId: string, gymId: string, table: PlanTable) {
  const fileName = file.originalname || `${table}.pdf`;
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
  const objectPath = `plans/${table}/${adminId}/${gymId}/${randomUUID()}-${safeName}`;

  const { error } = await supabase.storage
    .from(PLAN_PDF_BUCKET)
    .upload(objectPath, file.buffer, {
      contentType: file.mimetype || "application/pdf",
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(PLAN_PDF_BUCKET).getPublicUrl(objectPath);

  return {
    pdfUrl: data.publicUrl,
    pdfFileName: fileName,
  };
}

export async function resolvePlanContentFields(params: ResolvePlanContentFieldsParams) {
  const { adminId, gymId, table, body, file, existing } = params;
  const fallbackType = file
    ? "pdf"
    : resolvePlanContentType(existing?.content_type, "rich_text");
  const contentType = resolvePlanContentType(body.content_type, fallbackType);

  if (contentType === "pdf") {
    if (file) {
      const uploaded = await uploadPlanPdf(file, adminId, gymId, table);
      return {
        content_type: "pdf" as PlanContentType,
        content: null,
        pdf_url: uploaded.pdfUrl,
        pdf_file_name: uploaded.pdfFileName,
      };
    }

    if (existing?.content_type === "pdf" && existing.pdf_url) {
      return {
        content_type: "pdf" as PlanContentType,
        content: null,
        pdf_url: existing.pdf_url,
        pdf_file_name: existing.pdf_file_name || null,
      };
    }

    throw new Error("pdf_file is required for PDF plans");
  }

  return {
    content_type: "rich_text" as PlanContentType,
    content: normalizePlanContent(body.content),
    pdf_url: null,
    pdf_file_name: null,
  };
}

export { hasOwn, normalizeOptionalString };
