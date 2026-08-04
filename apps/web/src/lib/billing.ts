export const BILLING_TRIAL_DAYS = 14;

export const BILLING_PLANS = {
  starter: {
    code: 'starter',
    name: 'Starter',
    monthlyPrice: 700,
    yearlyPrice: 7000,
    tagline: 'Everything a single gym needs to run daily operations with confidence.',
    featuredBullets: [
      'Members, packages, shifts, and manual attendance',
      'Diet plans, exercise plans, invoices, and collections',
      'Enquiries, followups, reports, and staff management',
    ],
    limits: {
      max_gyms: 1,
      max_staff_accounts: 5,
      max_active_members: 300,
    },
    features: [] as BillingFeatureKey[],
  },
  growth: {
    code: 'growth',
    name: 'Growth',
    monthlyPrice: 1299,
    yearlyPrice: 12990,
    tagline: 'For high-volume single gyms that need classes, PT, coupons, and sharper insights.',
    featuredBullets: [
      'Everything in Starter',
      'Classes, PT sessions, coupon campaigns',
      'Payment analytics for better revenue visibility',
    ],
    limits: {
      max_gyms: 1,
      max_staff_accounts: 15,
      max_active_members: 1200,
    },
    features: ['classes', 'pt_sessions', 'coupons', 'payment_analytics'] as BillingFeatureKey[],
  },
  scale: {
    code: 'scale',
    name: 'Scale',
    monthlyPrice: 2499,
    yearlyPrice: 24990,
    tagline: 'For multi-branch businesses that want biometric attendance, payroll, and audit control.',
    featuredBullets: [
      'Everything in Growth',
      'Branch gyms and eSSL integration',
      'Payroll, activity logs, and larger operating limits',
    ],
    limits: {
      max_gyms: 10,
      max_staff_accounts: 50,
      max_active_members: 5000,
    },
    features: ['classes', 'pt_sessions', 'coupons', 'payment_analytics', 'multi_branch', 'essl_integrations', 'payroll', 'activity_logs'] as BillingFeatureKey[],
  },
} as const;

const SECTION_FEATURE_MAP: Partial<Record<string, BillingFeatureKey>> = {
  classes: 'classes',
  pt: 'pt_sessions',
};

const FEATURE_MINIMUM_PLAN: Record<BillingFeatureKey, BillingPlanCode> = {
  classes: 'growth',
  pt_sessions: 'growth',
  coupons: 'growth',
  payment_analytics: 'growth',
  multi_branch: 'scale',
  essl_integrations: 'scale',
  payroll: 'scale',
  activity_logs: 'scale',
};

export function getPlanDefinition(planCode?: BillingPlanCode | null) {
  return BILLING_PLANS[planCode || 'starter'] || BILLING_PLANS.starter;
}

export function getSectionFeature(section: string) {
  return SECTION_FEATURE_MAP[section];
}

export function hasPlanFeature(subscription: BillingSubscription | null | undefined, feature: BillingFeatureKey) {
  if (!subscription) {
    return true;
  }

  return subscription.entitled && subscription.features.includes(feature);
}

export function getPlanLimit(subscription: BillingSubscription | null | undefined, limit: BillingLimitKey) {
  return subscription?.limits?.[limit] ?? BILLING_PLANS.scale.limits[limit];
}

export function getFeatureMinimumPlan(feature: BillingFeatureKey) {
  return FEATURE_MINIMUM_PLAN[feature];
}

export function getFeatureLabel(feature: BillingFeatureKey) {
  return feature.replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}
