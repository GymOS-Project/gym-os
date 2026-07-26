import DOMPurify from "dompurify";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  value: {
    content_type?: "rich_text" | "pdf" | null;
    content?: string | null;
    pdf_url?: string | null;
    pdf_file_name?: string | null;
  };
  pdfPreviewUrl?: string | null;
  className?: string;
  emptyMessage?: string;
};

export function PlanContentPreview({ value, pdfPreviewUrl, className, emptyMessage = "No preview available yet." }: Props) {
  const contentType = value.content_type === "pdf" ? "pdf" : "rich_text";
  const pdfUrl = pdfPreviewUrl || value.pdf_url || null;
  const sanitizedHtml = contentType === "rich_text" && value.content
    ? DOMPurify.sanitize(value.content)
    : "";

  if (contentType === "pdf") {
    if (!pdfUrl) {
      return (
        <div className={cn("flex min-h-[280px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground", className)}>
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className={cn("overflow-hidden rounded-xl border bg-card", className)}>
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <p className="text-sm font-medium">PDF Preview</p>
            {value.pdf_file_name && <p className="text-xs text-muted-foreground">{value.pdf_file_name}</p>}
          </div>
          <Button type="button" variant="outline" size="sm" asChild>
            <a href={pdfUrl} target="_blank" rel="noreferrer">Open PDF</a>
          </Button>
        </div>
        <iframe title={value.pdf_file_name || "Plan PDF preview"} src={pdfUrl} className="h-[420px] w-full bg-background" />
      </div>
    );
  }

  if (!sanitizedHtml) {
    return (
      <div className={cn("flex min-h-[280px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground", className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card", className)}>
      <div className="border-b px-4 py-3">
        <p className="text-sm font-medium">Rich Text Preview</p>
      </div>
      <div className="plan-content max-h-[420px] overflow-auto p-4" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
    </div>
  );
}
