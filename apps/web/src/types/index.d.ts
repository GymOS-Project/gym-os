type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type SessionRole = 'admin' | 'staff';
type PlanContentType = 'rich_text' | 'pdf';

type RouteType = { path: string, element: JSX.Element, protected?: boolean, section?: string, allowedRoles?: SessionRole[], guestOnly?: boolean }

interface Gym {
  id: string;
  admin_id: string;
  gym_type: 'single' | 'branch';
  gym_name: string;
  owner_name: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  instagram_page: string | null;
  address: string | null;
  business_registration_name: string | null;
  owner_email: string | null;
  gym_photo_url: string | null;
  gym_photo_urls: string[];
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

interface Admin {
  id: string;
  user_id: string;
  gym_id: string;
  gym_type: 'single' | 'branch';
  gym_name: string;
  owner_name: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  instagram_page: string | null;
  address: string | null;
  business_registration_name: string | null;
  owner_email: string | null;
  gym_photo_url: string | null;
  gym_photo_urls: string[];
  logo_url: string | null;
  created_at: string;
  updated_at: string;
  gyms: Gym[];
}

interface StaffAccount {
  id: string;
  admin_id: string;
  gym_id: string;
  auth_user_id: string;
  role: string;
  full_name: string;
  email: string;
  phone: string | null;
  specializations: string | null;
  section_permissions: string[];
   external_user_code?: string | null;
   compensation_type?: 'fixed' | 'per_session' | 'commission' | string;
   base_salary?: number;
   per_session_rate?: number;
   commission_percent?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface BasePlan {
  id: string;
  admin_id: string;
  gym_id: string;
  member_id: string | null;
  source_plan_id: string | null;
  created_by_type: SessionRole;
  created_by_staff_id: string | null;
  plan_scope: 'shared' | 'member_custom';
  name: string;
  description: string | null;
  content_type: PlanContentType;
  content: string | null;
  pdf_url: string | null;
  pdf_file_name: string | null;
  tag: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface DietPlan extends BasePlan { }

interface ExercisePlan extends BasePlan { }

interface DietPlanAssignment {
  id: string;
  admin_id: string;
  gym_id: string;
  member_id: string;
  diet_plan_id: string;
  assigned_by_staff_id: string | null;
  created_at: string;
  updated_at: string;
  plan?: DietPlan | null;
}

interface ExercisePlanAssignment {
  id: string;
  admin_id: string;
  gym_id: string;
  member_id: string;
  exercise_plan_id: string;
  assigned_by_staff_id: string | null;
  created_at: string;
  updated_at: string;
  plan?: ExercisePlan | null;
}

interface PackageType {
  id: string;
  admin_id: string;
  gym_id: string;
  name: string;
  duration_months: number | null;
  duration_days: number | null;
  price: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Shift {
  id: string;
  admin_id: string;
  gym_id: string;
  name: string;
  shift_type: 'recurring' | 'one_time';
  description: string | null;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Member {
  id: string;
  admin_id: string;
  gym_id: string;
  name: string;
  email: string | null;
  phone: string;
  gender: 'male' | 'female' | 'other' | null;
  date_of_birth: string | null;
  address: string | null;
  current_address: string | null;
  permanent_address: string | null;
  photo_url: string | null;
  emergency_contact: string | null;
  aadhar_card_no: string | null;
  driving_license_no: string | null;
  pan_card_no: string | null;
  marital_status: string | null;
  reference_member_id: string | null;
   external_user_code?: string | null;
  shift: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  diet_plan_assignments?: DietPlanAssignment[];
  exercise_plan_assignments?: ExercisePlanAssignment[];
}

interface MemberPackage {
  id: string;
  admin_id: string;
  gym_id: string;
  member_id: string;
  package_type_id: string | null;
  coupon_id: string | null;
  package_name: string;
  start_date: string;
  end_date: string;
  amount_paid: number;
  gross_amount?: number | null;
  discount_amount?: number | null;
  net_amount?: number | null;
  payment_mode: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'other';
  status: 'active' | 'expired' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
  members?: Member;
}

interface Enquiry {
  id: string;
  admin_id: string;
  gym_id: string;
  name: string;
  phone: string;
  email: string | null;
  source: string | null;
  interest: string | null;
  assigned_to: string | null;
  status: 'new' | 'contacted' | 'follow_up' | 'converted' | 'not_interested';
  next_followup_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface EnquiryFollowup {
  id: string;
  admin_id: string;
  gym_id: string;
  enquiry_id: string;
  followup_date: string;
  next_followup_date: string | null;
  notes: string | null;
  status: 'pending' | 'done' | 'no_response';
  created_at: string;
  enquiries?: Enquiry;
}

interface Followup {
  id: string;
  admin_id: string;
  gym_id: string;
  member_id: string | null;
  type: 'general' | 'payment_due' | 'renewal';
  followup_date: string;
  next_followup_date: string | null;
  notes: string | null;
  status: 'pending' | 'done' | 'no_response';
  created_at: string;
  updated_at: string;
  members?: Member;
}

interface Transaction {
  id: string;
  admin_id: string;
  gym_id: string;
  member_id: string | null;
  member_package_id: string | null;
  package_sale_id?: string | null;
  coupon_id?: string | null;
  type: 'payment' | 'refund' | 'adjustment';
  amount: number;
  gross_amount?: number | null;
  discount_amount?: number | null;
  net_amount?: number | null;
  payment_mode: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'other';
  description: string | null;
  reference_no?: string | null;
  transaction_date: string;
  created_at: string;
  members?: Member;
}

interface Coupon {
  id: string;
  admin_id: string;
  gym_id: string | null;
  code: string;
  name: string;
  description: string | null;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  max_discount_amount: number | null;
  min_purchase_amount: number | null;
  usage_limit: number | null;
  usage_limit_per_member: number | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  usage_count?: number;
  total_discount_amount?: number;
  last_used_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface CouponValidationResult {
  coupon: Coupon;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
}

interface PaymentAnalytics {
  totalCollections: number;
  totalRefunds: number;
  totalAdjustments: number;
  netCollections: number;
  totalSales: number;
  averageSale: number;
  totalDiscountGiven: number;
  couponUsageCount: number;
  revenueByMode: { mode: string; amount: number }[];
  salesByPackage: { package_name: string; amount: number }[];
  couponBreakdown: { coupon_code: string; discount_amount: number }[];
  revenueSeries: { date: string; amount: number }[];
}

interface Review {
  id: string;
  admin_id: string;
  gym_id: string;
  member_id: string | null;
  rating: number | null;
  comment: string | null;
  review_date: string;
  created_at: string;
  members?: Member;
}

interface ClassSession {
  id: string;
  admin_id: string;
  gym_id: string;
  name: string;
  description: string | null;
  trainer_staff_id: string | null;
  capacity: number;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  recurrence_label: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ClassBooking {
  id: string;
  admin_id: string;
  gym_id: string;
  class_session_id: string;
  member_id: string;
  status: 'booked' | 'attended' | 'cancelled' | string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface PtSession {
  id: string;
  admin_id: string;
  gym_id: string;
  trainer_staff_id: string;
  member_id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show' | string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface AttendanceLog {
  id: string;
  admin_id: string;
  gym_id: string;
  entity_type: 'member' | 'staff' | string;
  member_id: string | null;
  staff_account_id: string | null;
  class_session_id: string | null;
  pt_session_id: string | null;
  attendance_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  source: 'manual' | 'essl' | string;
  status: 'present' | 'late' | 'absent' | string;
  notes: string | null;
  external_punch_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ActivityLog {
  id: string;
  admin_id: string;
  gym_id: string | null;
  actor_user_id: string | null;
  actor_staff_id: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_json: Json | null;
  after_json: Json | null;
  metadata_json: Json | null;
  created_at: string;
}

interface Invoice {
  id: string;
  admin_id: string;
  gym_id: string;
  member_id: string | null;
  member_package_id: string | null;
  transaction_id: string | null;
  invoice_number: string;
  receipt_number: string | null;
  status: 'draft' | 'paid' | 'cancelled' | string;
  issue_date: string;
  due_date: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  notes: string | null;
  line_items: Json[];
  created_at: string;
  updated_at: string;
}

interface PayrollRun {
  id: string;
  admin_id: string;
  gym_id: string;
  title: string;
  period_start: string;
  period_end: string;
  status: 'draft' | 'processed' | 'paid' | string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface PayrollEntry {
  id: string;
  admin_id: string;
  gym_id: string;
  payroll_run_id: string;
  staff_id: string;
  compensation_type: 'fixed' | 'per_session' | 'commission' | string;
  base_amount: number;
  session_count: number;
  session_rate: number;
  commission_percent: number;
  commission_amount: number;
  bonus_amount: number;
  deductions: number;
  net_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface EsslDevice {
  id: string;
  admin_id: string;
  gym_id: string;
  device_name: string;
  serial_number: string | null;
  integration_mode: 'adms' | 'middleware' | 'sdk' | string;
  ip_address: string | null;
  port: number | null;
  server_address: string | null;
  server_port: number | null;
  status: string;
  is_active: boolean;
  last_synced_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface EsslRawPunchLog {
  id: string;
  admin_id: string | null;
  gym_id: string | null;
  essl_device_id: string | null;
  serial_number: string | null;
  user_code: string | null;
  punch_at: string | null;
  payload: Json;
  processing_status: string;
  resolved_member_id: string | null;
  resolved_staff_id: string | null;
  created_at: string;
  updated_at: string;
}


type StaffFormValue = {
  gym_id: string;
  full_name: string;
  email: string;
  password: string;
  phone: string;
  role: string;
  specializations: string;
  external_user_code: string;
  compensation_type: string;
  base_salary: string;
  per_session_rate: string;
  commission_percent: string;
  is_active: boolean;
  permissions: string[];
};

type Props = {
  gyms: Gym[];
  value: StaffFormValue;
  onSubmit: (value: StaffFormValue) => void | Promise<void>;
  onCancel?: () => void;
  saving?: boolean;
  editing?: boolean;
  submitLabel: string;
};


type CompensationType = "fixed" | "per_session" | "commission";

interface StaffFormGym {
  id: string;
  gym_name: string;
}

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

interface Props {
  gyms: StaffFormGym[];
  value: StaffFormValue;
  onSubmit: (v: StaffFormValue) => Promise<void> | void;
  onCancel?: () => void;
  saving?: boolean;
  editing?: boolean;
  submitLabel: string;
}