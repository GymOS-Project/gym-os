export {};

declare global {
  interface FollowupsPageProps {
    type: "general" | "payment_due" | "renewal";
    title: string;
    description: string;
  }

  interface EnquiryListPageProps {
    filterStatus?: string;
    title: string;
    description: string;
  }

  interface ShiftForm {
    gym_id: string;
    name: string;
    shift_type: "recurring" | "one_time";
    description: string;
    event_date: string;
    start_time: string;
    end_time: string;
  }

  interface CouponForm {
    gym_id: string;
    applies_to_all_gyms: boolean;
    code: string;
    name: string;
    description: string;
    discount_type: "percentage" | "flat";
    discount_value: string;
    max_discount_amount: string;
    min_purchase_amount: string;
    usage_limit: string;
    usage_limit_per_member: string;
    starts_at: string;
    ends_at: string;
    is_active: boolean;
  }

  interface BranchForm {
    gym_name: string;
    business_registration_name: string;
    gym_email: string;
    website: string;
    instagram_page: string;
    address: string;
    owner_name: string;
    phone: string;
    owner_email: string;
  }

  interface PaymentForm {
    card_name: string;
    card_number: string;
    expiry: string;
    cvv: string;
  }

  interface GymForm {
    gym_name: string;
    business_registration_name: string;
    gym_email: string;
    website: string;
    instagram_page: string;
    address: string;
    owner_name: string;
    phone: string;
    owner_email: string;
  }

  interface MemberWithPackage extends Member {
    member_packages?: { status: string; end_date: string; package_name: string }[];
  }

  type SharedPlanType = "diet" | "exercise";
  type SharedPlanRecord = DietPlan | ExercisePlan;

  interface SharedPlanPageProps {
    planType: SharedPlanType;
  }

  interface SharedPlanContentConfigItem {
    title: string;
    basePath: string;
    singular?: string;
    empty?: string;
  }

  type SharedPlanContentConfig = Record<SharedPlanType, SharedPlanContentConfigItem>;
}
