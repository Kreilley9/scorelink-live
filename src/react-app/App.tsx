import { useEffect, type ReactNode } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { SportAccountProvider } from "@/react-app/hooks/useSportAccount";
import { ProtectedRoute } from "@/react-app/components/ProtectedRoute";
import Scoreboard from "@/react-app/pages/Scoreboard";
import ScoreboardLarge from "@/react-app/pages/ScoreboardLarge";
import RefereePanel from "@/react-app/pages/RefereePanel";
import HomePage from "@/react-app/pages/Home";
import AuthCallback from "@/react-app/pages/AuthCallback";
import UserManagement from "@/react-app/pages/UserManagement";
import RefereeManagement from "@/react-app/pages/RefereeManagement";
import Pricing from "@/react-app/pages/Pricing";
import PaymentSuccess from "@/react-app/pages/PaymentSuccess";
import SponsorManagement from "@/react-app/pages/SponsorManagement";
import TemplateManagement from "@/react-app/pages/TemplateManagement";
import BrandingManagement from "@/react-app/pages/BrandingManagement";
import CoordinatorDashboard from "@/react-app/pages/CoordinatorDashboard";
import CustomerList from "@/react-app/pages/CustomerList";
import Financials from "@/react-app/pages/Financials";
import Statistics from "@/react-app/pages/Statistics";
import MultiFieldView from "@/react-app/pages/MultiFieldView";
import MultiFieldViewLarge from "@/react-app/pages/MultiFieldViewLarge";
import Onboarding from "@/react-app/pages/Onboarding";
import TemplateSettings from "@/react-app/pages/TemplateSettings";
import QRTest from "@/react-app/pages/QRTest";
import PrivacyPolicy from "@/react-app/pages/PrivacyPolicy";
import TermsOfService from "@/react-app/pages/TermsOfService";
import FieldView from "@/react-app/pages/FieldView";
import ContactUs from "@/react-app/pages/ContactUs";
import Signup from "@/react-app/pages/Signup";
import GamesUnified from "@/react-app/pages/GamesUnified";
import GamesOverview from "@/react-app/pages/GamesOverview";
import OpsSupport from "@/react-app/pages/OpsSupport";
import OpsTicketDetail from "@/react-app/pages/OpsTicketDetail";
import OpsFinance from "@/react-app/pages/OpsFinance";
import OpsApprovals from "@/react-app/pages/OpsApprovals";

function ClerkFetchInterceptor({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : (input as Request).url;
      if (url.startsWith("/api/")) {
        const token = await getToken();
        if (token) {
          const headers = new Headers(init.headers);
          if (!headers.has("Authorization")) {
            headers.set("Authorization", `Bearer ${token}`);
          }
          init = { ...init, headers };
        }
      }
      return originalFetch(input, init);
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, [getToken]);

  return <>{children}</>;
}

export default function App() {
  return (
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <ClerkFetchInterceptor>
      <SportAccountProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/game/:code" element={<Scoreboard />} />
          <Route path="/game/:code/large" element={<ScoreboardLarge />} />
          <Route path="/field/:fieldId" element={<FieldView />} />
          <Route path="/multifield" element={<MultiFieldView />} />
          <Route path="/multifield/large" element={<MultiFieldViewLarge />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/qr-test" element={<QRTest />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/contact" element={<ContactUs />} />
          
          {/* Referee routes - requires referee or higher role */}
          <Route path="/referee/:code" element={
            <ProtectedRoute requiredRole={["admin", "coordinator", "referee"]}>
              <RefereePanel />
            </ProtectedRoute>
          } />
          
          {/* Admin routes - requires admin role */}
          <Route path="/admin/users" element={
            <ProtectedRoute requiredRole="admin">
              <UserManagement />
            </ProtectedRoute>
          } />
          
          {/* Coordinator routes - requires admin or coordinator with feature access */}
          <Route path="/admin/referees" element={
            <ProtectedRoute requiredRole={["admin", "coordinator"]} requiredFeature="referee_management">
              <RefereeManagement />
            </ProtectedRoute>
          } />
          <Route path="/admin/games-unified" element={
            <ProtectedRoute requiredRole={["admin", "coordinator"]}>
              <GamesUnified />
            </ProtectedRoute>
          } />
          <Route path="/admin/sponsors" element={
            <ProtectedRoute requiredRole={["admin", "coordinator"]} requiredFeature="sponsorship">
              <SponsorManagement />
            </ProtectedRoute>
          } />
          <Route path="/admin/games" element={
            <ProtectedRoute requiredRole={["admin", "coordinator", "referee"]}>
              <GamesOverview />
            </ProtectedRoute>
          } />
          <Route path="/admin/templates" element={
            <ProtectedRoute requiredRole={["admin", "coordinator"]}>
              <TemplateManagement />
            </ProtectedRoute>
          } />
          <Route path="/admin/branding" element={
            <ProtectedRoute requiredRole={["admin", "coordinator"]} requiredFeature="custom_branding">
              <BrandingManagement />
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute requiredRole={["admin", "coordinator"]}>
              <CoordinatorDashboard />
            </ProtectedRoute>
          } />
          <Route path="/settings/template" element={
            <ProtectedRoute requiredRole={["admin", "coordinator"]}>
              <TemplateSettings />
            </ProtectedRoute>
          } />
          
          {/* Business Analytics (Admin only) */}
          <Route path="/admin/customers" element={
            <ProtectedRoute requiredRole="admin">
              <CustomerList />
            </ProtectedRoute>
          } />
          <Route path="/admin/financials" element={
            <ProtectedRoute requiredRole="admin">
              <Financials />
            </ProtectedRoute>
          } />
          <Route path="/admin/statistics" element={
            <ProtectedRoute requiredRole="admin">
              <Statistics />
            </ProtectedRoute>
          } />
          
          {/* AI Ops Internal Routes */}
          <Route path="/ops/support" element={
            <ProtectedRoute requiredRole="admin">
              <OpsSupport />
            </ProtectedRoute>
          } />
          <Route path="/ops/support/:ticketId" element={
            <ProtectedRoute requiredRole="admin">
              <OpsTicketDetail />
            </ProtectedRoute>
          } />
          <Route path="/ops/finance" element={
            <ProtectedRoute requiredRole="admin">
              <OpsFinance />
            </ProtectedRoute>
          } />
          <Route path="/ops/approvals" element={
            <ProtectedRoute requiredRole="admin">
              <OpsApprovals />
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
      </SportAccountProvider>
      </ClerkFetchInterceptor>
    </ClerkProvider>
  );
}
