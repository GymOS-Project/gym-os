type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type SessionRole = 'admin' | 'trainer';
type PlanContentType = 'rich_text' | 'pdf';

type RouteType = { path: string, element: React.JSX, protected?: boolean, section?: string, allowedRoles?: SessionRole[], guestOnly?: boolean }

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
  role: 'trainer';
  full_name: string;
  email: string;
  phone: string | null;
  specializations: string | null;
  section_permissions: string[];
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
  package_name: string;
  start_date: string;
  end_date: string;
  amount_paid: number;
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
  type: 'payment' | 'refund' | 'adjustment';
  amount: number;
  payment_mode: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'other';
  description: string | null;
  transaction_date: string;
  created_at: string;
  members?: Member;
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
