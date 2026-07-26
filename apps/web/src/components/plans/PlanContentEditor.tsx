import { useEffect, useMemo, useState, type ReactNode } from "react";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Code2, Eye, EyeOff, Heading1, Heading2, Heading3, Italic, List, ListOrdered, Pilcrow, Quote, Redo2, Strikethrough, Underline as UnderlineIcon, Undo2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PlanEditorValue } from "@/lib/planContent";
import { cn } from "@/lib/utils";

import { PlanContentPreview } from "./PlanContentPreview";

type Props = {
  value: PlanEditorValue;
  onChange: (value: PlanEditorValue) => void;
  className?: string;
};

type ToolbarButtonProps = {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
};

function ToolbarButton({ active, disabled, onClick, children }: ToolbarButtonProps) {
  return (
    <Button type="button" size="sm" variant={active ? "default" : "outline"} disabled={disabled} onClick={onClick} className="h-8 px-2">
      {children}
    </Button>
  );
}

export function PlanContentEditor({ value, onChange, className }: Props) {
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }),
      Underline,
      Placeholder.configure({ placeholder: "Build the full plan here. Use headings, lists, and paragraphs for structure." }),
    ],
    content: value.content || "",
    editorProps: {
      attributes: {
        class: "plan-content min-h-[360px] p-5 focus:outline-none",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange({ ...value, content: currentEditor.getHTML() });
    },
  });

  useEffect(() => {
    setViewMode("edit");
  }, [value.content_type]);

  useEffect(() => {
    if (!editor || value.content_type !== "rich_text") {
      return;
    }

    const nextContent = value.content || "";
    if (editor.getHTML() !== nextContent) {
      editor.commands.setContent(nextContent, { emitUpdate: false});
    }
  }, [editor, value.content, value.content_type]);

  useEffect(() => {
    if (!value.pdf_file) {
      setPdfPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(value.pdf_file);
    setPdfPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [value.pdf_file]);

  const previewValue = useMemo(
    () => ({
      content_type: value.content_type,
      content: value.content,
      pdf_url: value.pdf_url,
      pdf_file_name: value.pdf_file_name,
    }),
    [value.content, value.content_type, value.pdf_file_name, value.pdf_url],
  );

  const canPreview = value.content_type === "pdf"
    ? Boolean(value.pdf_file || value.pdf_url)
    : Boolean((value.content || "").trim());

  const toolbarDisabled = !editor || viewMode === "preview";

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant={value.content_type === "rich_text" ? "gradient" : "outline"} onClick={() => onChange({ ...value, content_type: "rich_text" })}>
            Rich Text
          </Button>
          <Button type="button" variant={value.content_type === "pdf" ? "gradient" : "outline"} onClick={() => onChange({ ...value, content_type: "pdf" })}>
            PDF Upload
          </Button>
        </div>

        <Button type="button" variant="outline" onClick={() => setViewMode((current) => current === "edit" ? "preview" : "edit")} disabled={viewMode === "edit" && !canPreview}>
          {viewMode === "edit" ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          {viewMode === "edit" ? "Preview" : "Back To Editor"}
        </Button>
      </div>

      {value.content_type === "rich_text" ? (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="flex flex-wrap gap-2 border-b px-3 py-3">
              <ToolbarButton disabled={toolbarDisabled} active={editor?.isActive("paragraph")} onClick={() => editor?.chain().focus().setParagraph().run()}><Pilcrow className="h-4 w-4" /></ToolbarButton>
              <ToolbarButton disabled={toolbarDisabled} active={editor?.isActive("heading", { level: 1 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="h-4 w-4" /></ToolbarButton>
              <ToolbarButton disabled={toolbarDisabled} active={editor?.isActive("heading", { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></ToolbarButton>
              <ToolbarButton disabled={toolbarDisabled} active={editor?.isActive("heading", { level: 3 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="h-4 w-4" /></ToolbarButton>
              <ToolbarButton disabled={toolbarDisabled} active={editor?.isActive("heading", { level: 4 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 4 }).run()}>H4</ToolbarButton>
              <ToolbarButton disabled={toolbarDisabled} active={editor?.isActive("heading", { level: 5 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 5 }).run()}>H5</ToolbarButton>
              <ToolbarButton disabled={toolbarDisabled} active={editor?.isActive("heading", { level: 6 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 6 }).run()}>H6</ToolbarButton>
              <ToolbarButton disabled={toolbarDisabled} active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></ToolbarButton>
              <ToolbarButton disabled={toolbarDisabled} active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></ToolbarButton>
              <ToolbarButton disabled={toolbarDisabled} active={editor?.isActive("underline")} onClick={() => editor?.chain().focus().toggleUnderline().run()}><UnderlineIcon className="h-4 w-4" /></ToolbarButton>
              <ToolbarButton disabled={toolbarDisabled} active={editor?.isActive("strike")} onClick={() => editor?.chain().focus().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></ToolbarButton>
              <ToolbarButton disabled={toolbarDisabled} active={editor?.isActive("code")} onClick={() => editor?.chain().focus().toggleCode().run()}><Code2 className="h-4 w-4" /></ToolbarButton>
              <ToolbarButton disabled={toolbarDisabled} active={editor?.isActive("blockquote")} onClick={() => editor?.chain().focus().toggleBlockquote().run()}><Quote className="h-4 w-4" /></ToolbarButton>
              <ToolbarButton disabled={toolbarDisabled} active={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></ToolbarButton>
              <ToolbarButton disabled={toolbarDisabled} active={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></ToolbarButton>
              <ToolbarButton disabled={toolbarDisabled} active={editor?.isActive("codeBlock")} onClick={() => editor?.chain().focus().toggleCodeBlock().run()}>Code Block</ToolbarButton>
              <ToolbarButton disabled={!editor?.can().chain().focus().undo().run() || viewMode === "preview"} onClick={() => editor?.chain().focus().undo().run()}><Undo2 className="h-4 w-4" /></ToolbarButton>
              <ToolbarButton disabled={!editor?.can().chain().focus().redo().run() || viewMode === "preview"} onClick={() => editor?.chain().focus().redo().run()}><Redo2 className="h-4 w-4" /></ToolbarButton>
            </div>
            {viewMode === "edit" ? (
              <EditorContent editor={editor} className="plan-editor min-h-[420px]" />
            ) : (
              <PlanContentPreview value={previewValue} className="rounded-none border-0" emptyMessage="Start typing to preview the plan." />
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="pdf_file">Plan PDF</Label>
                <Input
                  id="pdf_file"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    onChange({ ...value, pdf_file: file, pdf_file_name: file?.name || value.pdf_file_name });
                  }}
                />
              </div>
              <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <Upload className="h-4 w-4 text-primary" />
                  Upload a PDF plan
                </div>
                <p className="mt-2">Use PDF mode when the plan is already designed and should be viewed exactly as provided.</p>
                {value.pdf_file_name && <p className="mt-3 text-xs text-foreground">Current file: {value.pdf_file_name}</p>}
              </div>
            </div>
          </div>

          {viewMode === "preview" ? (
            <PlanContentPreview value={previewValue} pdfPreviewUrl={pdfPreviewUrl} emptyMessage="Upload a PDF to preview it here." />
          ) : null}
        </div>
      )}
    </div>
  );
}
