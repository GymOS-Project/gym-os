import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { PlanContentPreview } from "./PlanContentPreview";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  value: {
    content_type?: "rich_text" | "pdf" | null;
    content?: string | null;
    pdf_url?: string | null;
    pdf_file_name?: string | null;
  } | null;
};

export function PlanContentPreviewDialog({ open, onOpenChange, title, value }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {value ? <PlanContentPreview value={value} /> : null}
      </DialogContent>
    </Dialog>
  );
}
