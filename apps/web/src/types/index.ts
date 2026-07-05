export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Admin {
  id: string;
  user_id: string;
  gym_name: string;
  owner_name: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  facebook_page: string | null;
  address: string | null;
  business_registration_name: string | null;
  owner_email: string | null;
  gym_photo_url: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PackageType {
  id: string;
  admin_id: string;
  name: string;
  duration_months: number | null;
  duration_days: number | null;
  price: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  admin_id: string;
  name: string;
  email: string | null;
  phone: string;
  gender: 'male' | 'female' | 'other' | null;
  date_of_birth: string | null;
  address: string | null;
  photo_url: string | null;
  emergency_contact: string | null;
  reference_member_id: string | null;
  shift: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MemberPackage {
  id: string;
  admin_id: string;
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

export interface Enquiry {
  id: string;
  admin_id: string;
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

export interface EnquiryFollowup {
  id: string;
  admin_id: string;
  enquiry_id: string;
  followup_date: string;
  next_followup_date: string | null;
  notes: string | null;
  status: 'pending' | 'done' | 'no_response';
  created_at: string;
  enquiries?: Enquiry;
}

export interface Followup {
  id: string;
  admin_id: string;
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

export interface Transaction {
  id: string;
  admin_id: string;
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

export interface Review {
  id: string;
  admin_id: string;
  member_id: string | null;
  rating: number | null;
  comment: string | null;
  review_date: string;
  created_at: string;
  members?: Member;
}
