import { Building2, Lock, User } from "lucide-react";

import { todayDateValue } from "@/lib/date";

export const STAFF_PERMISSION_OPTIONS = [
  "members",
  "packages",
  "diet_plans",
  "exercise_plans",
  "enquiries",
  "followups",
  "reports",
  "classes",
  "pt",
  "attendance",
] as const;

export const MOBILE_BREAKPOINT = 768;
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_GYM_PHOTOS = 10;
export const MAX_SIGNUP_PHOTOS = 10;

export const NO_MEMBER_OPTION = "__none__";
export const NO_REFERENCE_MEMBER_OPTION = "__none__";
export const ANONYMOUS_MEMBER_OPTION = "__anonymous__";

export const SIGNUP_STEPS = [
  { id: 1, title: "Gym Profile", description: "Add each gym or branch profile", icon: Building2 },
  { id: 2, title: "Owner & Contact", description: "Capture branch contact details", icon: User },
  { id: 3, title: "Account & Media", description: "Set your admin login and optional photos", icon: Lock },
] as const;

export const STAT_CARD_VARIANT_STYLES: StatCardVariantStyles = {
  default: { card: "bg-card", icon: "bg-muted text-foreground" },
  primary: { card: "border-primary/20 bg-primary/10", icon: "gradient-primary text-primary-foreground" },
  success: { card: "border-success/20 bg-success/10", icon: "bg-success text-success-foreground" },
  warning: { card: "border-warning/20 bg-warning/10", icon: "bg-warning text-warning-foreground" },
  destructive: { card: "border-destructive/20 bg-destructive/10", icon: "bg-destructive text-destructive-foreground" },
};

export const SHARED_PLAN_CONTENT_CONFIG: SharedPlanContentConfig = {
  diet: {
    title: "Diet Plans",
    singular: "Diet Plan",
    basePath: "/diet-exercise/diet-plans",
    empty: "No diet plans created yet.",
  },
  exercise: {
    title: "Exercise Plans",
    singular: "Exercise Plan",
    basePath: "/diet-exercise/exercise-plans",
    empty: "No exercise plans created yet.",
  },
};

export const CHART_THEMES = { light: "", dark: ".dark" } as const;

export const EMPTY_CLASS_SESSION_FORM = {
  gym_id: "",
  name: "",
  description: "",
  trainer_staff_id: "",
  capacity: "20",
  session_date: "",
  start_time: "",
  end_time: "",
  recurrence_label: "",
};

export const EMPTY_INVOICE_FORM = {
  gym_id: "",
  member_id: "",
  issue_date: todayDateValue(),
  due_date: "",
  subtotal: "0",
  tax_amount: "0",
  discount_amount: "0",
  notes: "",
};

export const EMPTY_INTEGRATION_FORM = {
  gym_id: "",
  device_name: "",
  serial_number: "",
  integration_mode: "adms",
  ip_address: "",
  port: "4370",
  server_address: "",
  server_port: "80",
  status: "inactive",
  notes: "",
};

export const EMPTY_ATTENDANCE_FORM = {
  gym_id: "",
  entity_type: "member",
  member_id: "",
  staff_account_id: "",
  attendance_date: todayDateValue(),
  check_in_at: "",
  check_out_at: "",
  status: "present",
  notes: "",
};

export const EMPTY_BRANCH_FORM: BranchForm = {
  gym_name: "",
  business_registration_name: "",
  gym_email: "",
  website: "",
  instagram_page: "",
  address: "",
  owner_name: "",
  phone: "",
  owner_email: "",
};

export const EMPTY_PAYMENT_FORM: PaymentForm = {
  card_name: "",
  card_number: "",
  expiry: "",
  cvv: "",
};

export const EMPTY_SHIFT_FORM: ShiftForm = {
  gym_id: "",
  name: "",
  shift_type: "recurring",
  description: "",
  event_date: "",
  start_time: "",
  end_time: "",
};

export const EMPTY_COUPON_FORM: CouponForm = {
  gym_id: "",
  applies_to_all_gyms: false,
  code: "",
  name: "",
  description: "",
  discount_type: "percentage",
  discount_value: "",
  max_discount_amount: "",
  min_purchase_amount: "",
  usage_limit: "",
  usage_limit_per_member: "",
  starts_at: "",
  ends_at: "",
  is_active: true,
};

export const EMPTY_PT_SESSION_FORM = {
  gym_id: "",
  trainer_staff_id: "",
  member_id: "",
  scheduled_at: "",
  duration_minutes: "60",
  status: "scheduled",
  notes: "",
};

export const EMPTY_PAYROLL_RUN_FORM = {
  gym_id: "",
  title: "",
  period_start: todayDateValue(),
  period_end: todayDateValue(),
  notes: "",
};

export const REPORT_SHIFTS = ["morning", "afternoon", "evening"] as const;

export const SIDEBAR_COOKIE_NAME = "sidebar:state";
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
export const SIDEBAR_WIDTH = "16rem";
export const SIDEBAR_WIDTH_MOBILE = "18rem";
export const SIDEBAR_WIDTH_ICON = "3rem";
export const SIDEBAR_KEYBOARD_SHORTCUT = "b";
