import { Toaster } from "@/components/ui/toaster"

import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import PostHogTracker from "@/components/analytics/PostHogTracker";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { GuestRoute, ProtectedRoute } from "@/components/auth/ProtectedRoute";

import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import SignupCheckoutStatusPage from "@/pages/auth/SignupCheckoutStatusPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import DashboardPage from "@/pages/DashboardPage";

import AddMemberPage from "@/pages/members/AddMemberPage";
import MemberListPage from "@/pages/members/MemberListPage";
import PackageTypesPage from "@/pages/members/PackageTypesPage";
import ShiftsPage from "@/pages/operations/ShiftsPage";
import ClassSchedulePage from "@/pages/operations/ClassSchedulePage";
import AttendancePage from "@/pages/operations/AttendancePage";
import PaymentsCollectionsPage from "@/pages/payments/PaymentsCollectionsPage";
import PaymentsSalesPage from "@/pages/payments/PaymentsSalesPage";
import PaymentsAnalyticsPage from "@/pages/payments/PaymentsAnalyticsPage";
import CouponsPage from "@/pages/payments/CouponsPage";
import InvoicesPage from "@/pages/payments/InvoicesPage";
import DietPlansPage from "@/pages/diet-exercise/DietPlansPage";
import DietPlanEditorPage from "@/pages/diet-exercise/DietPlanEditorPage";
import ExercisePlansPage from "@/pages/diet-exercise/ExercisePlansPage";
import ExercisePlanEditorPage from "@/pages/diet-exercise/ExercisePlanEditorPage";

import FollowupsPage from "@/pages/followups/FollowupsPage";

import AddEnquiryPage from "@/pages/enquiry/AddEnquiryPage";
import EnquiryListPage from "@/pages/enquiry/EnquiryListPage";
import EnquiryFollowupListPage from "@/pages/enquiry/EnquiryFollowupListPage";

import ReviewsPage from "@/pages/reports/ReviewsPage";
import ReferenceMembersPage from "@/pages/reports/ReferenceMembersPage";
import ShiftReportPage from "@/pages/reports/ShiftReportPage";
import NearToExpirePage from "@/pages/reports/NearToExpirePage";
import ProfilePage from "@/pages/account/ProfilePage";
import SettingsPage from "@/pages/account/SettingsPage";
import IntegrationsPage from "@/pages/account/IntegrationsPage";
import CreateStaffPage from "@/pages/staff/CreateStaffPage";
import StaffListPage from "@/pages/staff/StaffListPage";
import PTSessionsPage from "@/pages/staff/PTSessionsPage";
import PayrollPage from "@/pages/staff/PayrollPage";
import ActivityLogPage from "@/pages/reports/ActivityLogPage";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();
const protectedElement = (element: React.ReactNode, options?: { section?: string; allowedRoles?: SessionRole[]; feature?: BillingFeatureKey }) => (
  <ProtectedRoute section={options?.section} allowedRoles={options?.allowedRoles} feature={options?.feature}>{element}</ProtectedRoute>
);
const guestElement = (element: React.ReactNode) => <GuestRoute>{element}</GuestRoute>;
const routes: RouteType[] = [
  { path: "/login", element: <LoginPage />, guestOnly: true },
  { path: "/signup", element: <SignupPage />, guestOnly: true },
  { path: "/signup/checkout-status", element: <SignupCheckoutStatusPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  { path: "/", element: <DashboardPage />, protected: true },
  { path: "/members", element: <MemberListPage />, protected: true, section: "members" },
  { path: "/members/add", element: <AddMemberPage />, protected: true, section: "members", allowedRoles: ["admin"] },
  { path: "/members/:id/edit", element: <AddMemberPage />, protected: true, section: "members" },
  { path: "/packages-shift/packages", element: <PackageTypesPage />, protected: true, section: "packages", allowedRoles: ["admin"] },
  { path: "/packages-shift/shifts", element: <ShiftsPage />, protected: true, section: "packages", allowedRoles: ["admin"] },
  { path: "/operations/classes", element: <ClassSchedulePage />, protected: true, section: "classes", feature: "classes" },
  { path: "/operations/attendance", element: <AttendancePage />, protected: true, section: "attendance" },
  { path: "/payments/collections", element: <PaymentsCollectionsPage />, protected: true, allowedRoles: ["admin"] },
  { path: "/payments/sales", element: <PaymentsSalesPage />, protected: true, allowedRoles: ["admin"] },
  { path: "/payments/analytics", element: <PaymentsAnalyticsPage />, protected: true, allowedRoles: ["admin"], feature: "payment_analytics" },
  { path: "/payments/coupons", element: <CouponsPage />, protected: true, allowedRoles: ["admin"], feature: "coupons" },
  { path: "/payments/invoices", element: <InvoicesPage />, protected: true, allowedRoles: ["admin"] },
  { path: "/members/packages", element: <PackageTypesPage />, protected: true, section: "packages", allowedRoles: ["admin"] },
  { path: "/diet-exercise/diet-plans", element: <DietPlansPage />, protected: true, section: "diet_plans" },
  { path: "/diet-exercise/diet-plans/create", element: <DietPlanEditorPage />, protected: true, section: "diet_plans" },
  { path: "/diet-exercise/diet-plans/:id/edit", element: <DietPlanEditorPage />, protected: true, section: "diet_plans" },
  { path: "/diet-exercise/exercise-plans", element: <ExercisePlansPage />, protected: true, section: "exercise_plans" },
  { path: "/diet-exercise/exercise-plans/create", element: <ExercisePlanEditorPage />, protected: true, section: "exercise_plans" },
  { path: "/diet-exercise/exercise-plans/:id/edit", element: <ExercisePlanEditorPage />, protected: true, section: "exercise_plans" },
  { path: "/staff/create", element: <CreateStaffPage />, protected: true, allowedRoles: ["admin"] },
  { path: "/staff/list", element: <StaffListPage />, protected: true, allowedRoles: ["admin"] },
  { path: "/staff/trainers", element: <StaffListPage />, protected: true, allowedRoles: ["admin"] },
  { path: "/staff/pt-sessions", element: <PTSessionsPage />, protected: true, section: "pt", feature: "pt_sessions" },
  { path: "/staff/payroll", element: <PayrollPage />, protected: true, allowedRoles: ["admin"], feature: "payroll" },
  {
    path: "/followups/common",
    element: (
      <FollowupsPage
        type="general"
        title="Common Follow Up"
        description="Track general follow-ups with members"
      />
    ),
    protected: true,
    section: "followups",
  },
  {
    path: "/followups/payment-due",
    element: (
      <FollowupsPage
        type="payment_due"
        title="Payment Due Follow Up"
        description="Track members with pending payments"
      />
    ),
    protected: true,
    section: "followups",
  },
  {
    path: "/followups/renewal",
    element: (
      <FollowupsPage
        type="renewal"
        title="Renewal Follow Up"
        description="Follow up with members for subscription renewal"
      />
    ),
    protected: true,
    section: "followups",
  },
  { path: "/enquiry/add", element: <AddEnquiryPage />, protected: true, section: "enquiries" },
  {
    path: "/enquiry",
    element: (
      <EnquiryListPage
        title="Enquiry Data List"
        description="All leads and enquiries"
      />
    ),
    protected: true,
    section: "enquiries",
  },
  {
    path: "/enquiry/followups",
    element: <EnquiryFollowupListPage />,
    protected: true,
    section: "enquiries",
  },
  {
    path: "/enquiry/not-interested",
    element: (
      <EnquiryListPage
        filterStatus="not_interested"
        title="Not Interested"
        description="Leads who are not interested"
      />
    ),
    protected: true,
    section: "enquiries",
  },
  { path: "/reports/sales", element: <PaymentsSalesPage />, protected: true, allowedRoles: ["admin"] },
  {
    path: "/reports/transactions",
    element: <PaymentsCollectionsPage />,
    protected: true,
    allowedRoles: ["admin"],
  },
  { path: "/reports/reviews", element: <ReviewsPage />, protected: true, section: "reports" },
  {
    path: "/reports/references",
    element: <ReferenceMembersPage />,
    protected: true,
    section: "reports",
  },
  { path: "/reports/shift", element: <ShiftReportPage />, protected: true, section: "reports" },
  { path: "/reports/expiring", element: <NearToExpirePage />, protected: true, section: "reports" },
  { path: "/reports/activity-logs", element: <ActivityLogPage />, protected: true, allowedRoles: ["admin"], feature: "activity_logs" },
  { path: "/profile", element: <ProfilePage />, protected: true },
  { path: "/settings", element: <SettingsPage />, protected: true },
  { path: "/settings/integrations", element: <IntegrationsPage />, protected: true, allowedRoles: ["admin"], feature: "essl_integrations" },
  { path: "*", element: <NotFound /> },
];

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <PostHogTracker />
          <Routes>
            {routes.map(({ path, element, protected: isProtected, guestOnly, section, allowedRoles, feature }) => (
              <Route
                key={path}
                path={path}
                element={isProtected ? protectedElement(element, { section, allowedRoles, feature }) : guestOnly ? guestElement(element) : element}
              />
            ))}
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

