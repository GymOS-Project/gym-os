import type * as React from "react";

export {};

declare global {
  type BrandLogoTone = "auto" | "dark" | "light";

  interface BrandLogoProps {
    alt?: string;
    className?: string;
    tone?: BrandLogoTone;
  }

  interface NavItem {
    label: string;
    href?: string;
    icon: React.ComponentType<{ className?: string }>;
    exact?: boolean;
    children?: NavItem[];
  }

  interface AppLayoutProps {
    children: React.ReactNode;
    title?: string;
  }

  type StatCardVariant = "default" | "primary" | "success" | "warning" | "destructive";

  interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ComponentType<{ className?: string }>;
    variant?: StatCardVariant;
  }

  interface StatCardVariantStyle {
    card: string;
    icon: string;
  }

  type StatCardVariantStyles = Record<StatCardVariant, StatCardVariantStyle>;

  interface PlanContentPreviewValue {
    content_type?: "rich_text" | "pdf" | null;
    content?: string | null;
    pdf_url?: string | null;
    pdf_file_name?: string | null;
  }

  interface PlanContentPreviewProps {
    value: PlanContentPreviewValue;
    pdfPreviewUrl?: string | null;
    className?: string;
    emptyMessage?: string;
  }

  interface PlanContentPreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    value: PlanContentPreviewValue | null;
  }

  interface PlanContentEditorProps {
    value: PlanEditorValue;
    onChange: (value: PlanEditorValue) => void;
    className?: string;
  }

  interface ToolbarButtonProps {
    active?: boolean;
    disabled?: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }

  type StaffPermission = typeof import("@/utils/constants").STAFF_PERMISSION_OPTIONS[number];
  type CompensationType = "fixed" | "per_session" | "commission";

  interface StaffFormValue {
    gym_id: string;
    full_name: string;
    email: string;
    password: string;
    phone: string;
    role: string;
    specializations: string;
    external_user_code: string;
    compensation_type: CompensationType;
    base_salary: string;
    per_session_rate: string;
    commission_percent: string;
    is_active: boolean;
    permissions: StaffPermission[];
  }

  interface StaffFormProps {
    gyms: Pick<Gym, "id" | "gym_name">[];
    value: StaffFormValue;
    onSubmit: (value: StaffFormValue) => void | Promise<void>;
    onCancel?: () => void;
    saving?: boolean;
    editing?: boolean;
    submitLabel: string;
  }
}
