import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

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

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Protected */}
            <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

            {/* Members */}
            <Route path="/members" element={<ProtectedRoute><MemberListPage /></ProtectedRoute>} />
            <Route path="/members/add" element={<ProtectedRoute><AddMemberPage /></ProtectedRoute>} />
            <Route path="/members/packages" element={<ProtectedRoute><PackageTypesPage /></ProtectedRoute>} />

            {/* Follow-ups */}
            <Route path="/followups/common" element={<ProtectedRoute><FollowupsPage type="general" title="Common Follow Up" description="Track general follow-ups with members" /></ProtectedRoute>} />
            <Route path="/followups/enquiry" element={<ProtectedRoute><FollowupsPage type="general" title="Enquiry Follow Up" description="Follow up with enquiry leads" /></ProtectedRoute>} />
            <Route path="/followups/payment-due" element={<ProtectedRoute><FollowupsPage type="payment_due" title="Payment Due Follow Up" description="Track members with pending payments" /></ProtectedRoute>} />
            <Route path="/followups/renewal" element={<ProtectedRoute><FollowupsPage type="renewal" title="Renewal Follow Up" description="Follow up with members for subscription renewal" /></ProtectedRoute>} />

            {/* Enquiry */}
            <Route path="/enquiry/add" element={<ProtectedRoute><AddEnquiryPage /></ProtectedRoute>} />
            <Route path="/enquiry" element={<ProtectedRoute><EnquiryListPage title="Enquiry Data List" description="All leads and enquiries" /></ProtectedRoute>} />
            <Route path="/enquiry/followups" element={<ProtectedRoute><EnquiryFollowupListPage /></ProtectedRoute>} />
            <Route path="/enquiry/not-interested" element={<ProtectedRoute><EnquiryListPage filterStatus="not_interested" title="Not Interested" description="Leads who are not interested" /></ProtectedRoute>} />

            {/* Reports */}
            <Route path="/reports/sales" element={<ProtectedRoute><SalesHistoryPage /></ProtectedRoute>} />
            <Route path="/reports/transactions" element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} />
            <Route path="/reports/reviews" element={<ProtectedRoute><ReviewsPage /></ProtectedRoute>} />
            <Route path="/reports/references" element={<ProtectedRoute><ReferenceMembersPage /></ProtectedRoute>} />
            <Route path="/reports/shift" element={<ProtectedRoute><ShiftReportPage /></ProtectedRoute>} />
            <Route path="/reports/expiring" element={<ProtectedRoute><NearToExpirePage /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
