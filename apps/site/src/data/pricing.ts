export type PricingPlan = {
  code: "starter" | "growth" | "scale";
  label: string;
  monthlyPriceLabel: string;
  yearlyPriceLabel: string;
  monthlySuffix: string;
  yearlySuffix: string;
  summary: string;
  highlight?: string;
  ctaLabel: string;
  limits: string[];
  features: string[];
};

export const pricingPlans: PricingPlan[] = [
  {
    code: "starter",
    label: "Starter",
    monthlyPriceLabel: "₹700",
    yearlyPriceLabel: "₹7,000",
    monthlySuffix: "/month",
    yearlySuffix: "/year",
    summary: "For single gyms that want a complete operating base without heavy automation overhead.",
    ctaLabel: "Start Starter Trial",
    limits: [
      "1 gym",
      "Up to 5 staff accounts",
      "Up to 300 active members",
    ],
    features: [
      "Members, packages, shifts, and manual attendance",
      "Diet plans, exercise plans, invoices, and collections",
      "Enquiries, follow-ups, and core dashboard reporting",
    ],
  },
  {
    code: "growth",
    label: "Growth",
    monthlyPriceLabel: "₹1,299",
    yearlyPriceLabel: "₹12,990",
    monthlySuffix: "/month",
    yearlySuffix: "/year",
    summary: "For busy single-location gyms that need stronger class, PT, campaign, and analytics workflows.",
    highlight: "Most popular",
    ctaLabel: "Start Growth Trial",
    limits: [
      "1 gym",
      "Up to 15 staff accounts",
      "Up to 1,200 active members",
    ],
    features: [
      "Everything in Starter",
      "Classes, PT sessions, and coupon campaigns",
      "Payment analytics and richer operational visibility",
    ],
  },
  {
    code: "scale",
    label: "Scale",
    monthlyPriceLabel: "₹2,499",
    yearlyPriceLabel: "₹24,990",
    monthlySuffix: "/month",
    yearlySuffix: "/year",
    summary: "For multi-branch operators who need biometric attendance, payroll, and audit-level control.",
    highlight: "Branch + eSSL",
    ctaLabel: "Start Scale Trial",
    limits: [
      "Up to 10 gyms",
      "Up to 50 staff accounts",
      "Up to 5,000 active members",
    ],
    features: [
      "Everything in Growth",
      "Branch gyms and eSSL integration",
      "Payroll, activity logs, and higher operating limits",
    ],
  },
];

export const pricingToggleValues = {
  monthly: {
    starter: { label: "₹700", suffix: "/month" },
    growth: { label: "₹1,299", suffix: "/month" },
    scale: { label: "₹2,499", suffix: "/month" },
  },
  yearly: {
    starter: { label: "₹7,000", suffix: "/year" },
    growth: { label: "₹12,990", suffix: "/year" },
    scale: { label: "₹24,990", suffix: "/year" },
  },
} as const;
