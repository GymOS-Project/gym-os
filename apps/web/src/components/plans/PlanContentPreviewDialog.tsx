import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { PlanContentPreview } from "./PlanContentPreview";

export function PlanContentPreviewDialog({ open, onOpenChange, title, value }: PlanContentPreviewDialogProps) {
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
