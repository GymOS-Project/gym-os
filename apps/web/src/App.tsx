import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { GuestRoute, ProtectedRoute } from "@/components/auth/ProtectedRoute";

import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import DashboardPage from "@/pages/DashboardPage";

import AddMemberPage from "@/pages/members/AddMemberPage";
import MemberListPage from "@/pages/members/MemberListPage";
import PackageTypesPage from "@/pages/members/PackageTypesPage";

import FollowupsPage from "@/pages/followups/FollowupsPage";

import AddEnquiryPage from "@/pages/enquiry/AddEnquiryPage";
import EnquiryListPage from "@/pages/enquiry/EnquiryListPage";
import EnquiryFollowupListPage from "@/pages/enquiry/EnquiryFollowupListPage";

import SalesHistoryPage from "@/pages/reports/SalesHistoryPage";
import TransactionsPage from "@/pages/reports/TransactionsPage";
import ReviewsPage from "@/pages/reports/ReviewsPage";
import ReferenceMembersPage from "@/pages/reports/ReferenceMembersPage";
import ShiftReportPage from "@/pages/reports/ShiftReportPage";
import NearToExpirePage from "@/pages/reports/NearToExpirePage";
import ProfilePage from "@/pages/account/ProfilePage";
import SettingsPage from "@/pages/account/SettingsPage";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();
const protectedElement = (element: React.ReactNode) => (
  <ProtectedRoute>{element}</ProtectedRoute>
);
const guestElement = (element: React.ReactNode) => <GuestRoute>{element}</GuestRoute>;
const routes = [
  { path: "/login", element: <LoginPage />, guestOnly: true },
  { path: "/signup", element: <SignupPage />, guestOnly: true },
  { path: "/", element: <DashboardPage />, protected: true },
  { path: "/members", element: <MemberListPage />, protected: true },
  { path: "/members/add", element: <AddMemberPage />, protected: true },
  { path: "/members/:id/edit", element: <AddMemberPage />, protected: true },
  { path: "/members/packages", element: <PackageTypesPage />, protected: true },
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
  },
  { path: "/enquiry/add", element: <AddEnquiryPage />, protected: true },
  {
    path: "/enquiry",
    element: (
      <EnquiryListPage
        title="Enquiry Data List"
        description="All leads and enquiries"
      />
    ),
    protected: true,
  },
  {
    path: "/enquiry/followups",
    element: <EnquiryFollowupListPage />,
    protected: true,
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
  },
  { path: "/reports/sales", element: <SalesHistoryPage />, protected: true },
  {
    path: "/reports/transactions",
    element: <TransactionsPage />,
    protected: true,
  },
  { path: "/reports/reviews", element: <ReviewsPage />, protected: true },
  {
    path: "/reports/references",
    element: <ReferenceMembersPage />,
    protected: true,
  },
  { path: "/reports/shift", element: <ShiftReportPage />, protected: true },
  { path: "/reports/expiring", element: <NearToExpirePage />, protected: true },
  { path: "/profile", element: <ProfilePage />, protected: true },
  { path: "/settings", element: <SettingsPage />, protected: true },
  { path: "*", element: <NotFound /> },
];

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {routes.map(({ path, element, protected: isProtected, guestOnly }) => (
              <Route
                key={path}
                path={path}
                element={isProtected ? protectedElement(element) : guestOnly ? guestElement(element) : element}
              />
            ))}
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
