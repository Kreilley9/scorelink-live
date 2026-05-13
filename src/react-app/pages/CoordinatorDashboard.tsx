import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/react-app/components/ui/button";
import { useCurrentUser } from "@/react-app/hooks/useCurrentUser";
import { useAuth } from "@getmocha/users-service/react";
import { useSportAccount } from "@/react-app/hooks/useSportAccount";
import MultiFieldQRCode from "@/react-app/components/MultiFieldQRCode";
import Footer from "@/react-app/components/Footer";
import {
  ArrowLeft,
  Calendar,
  Users,
  Zap,
  Palette,
  Trophy,
  Crown,

  CheckCircle2,
  Lock,
  Activity,
  DollarSign,
  BarChart3,
  LogOut,
  ShoppingCart,
  CreditCard,
  Layout,
  Megaphone,
  Tv,
  Settings,
} from "lucide-react";
import SportSelector from "@/react-app/components/SportSelector";

export default function CoordinatorDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { currentUser, isLoading } = useCurrentUser();
  const { activeSportAccount } = useSportAccount();
  const [showMultiFieldQR, setShowMultiFieldQR] = useState(false);
  const [fieldDaysUsed, setFieldDaysUsed] = useState(0);

  useEffect(() => {
    if (activeSportAccount) {
      fetchFieldDaysUsed();
    }
  }, [currentUser, activeSportAccount]);

  const fetchFieldDaysUsed = async () => {
    if (!activeSportAccount) return;
    
    try {
      const response = await fetch(`/api/field-usage?sport_account_id=${activeSportAccount.id}`);
      if (response.ok) {
        const usageData = await response.json();
        setFieldDaysUsed(usageData.length);
      }
    } catch (error) {
      console.error("Failed to fetch field usage:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const tierColors = {
    free: "from-slate-600 to-slate-700",
    basic: "from-slate-600 to-slate-700",
    standard: "from-primary to-primary/90",
    premium: "from-amber-500 to-amber-600",
  };

  const tier = activeSportAccount?.subscription_tier || "basic";
  const isAdmin = currentUser?.role === "admin";
  const fieldsAllowed = activeSportAccount?.fields_allowed || 0;
  const fieldsRemaining = Math.max(0, fieldsAllowed - fieldDaysUsed);

  // Feature check based on active sport account tier or admin role
  const hasSportFeature = (feature: string): boolean => {
    if (isAdmin) return true; // Admin has all features
    if (!activeSportAccount) return false;
    
    const tierFeatures: Record<string, string[]> = {
      basic: [
        "live_scoreboard",
        "realtime_updates",
        "qr_codes",
        "mobile_viewing",
      ],
      standard: [
        "live_scoreboard",
        "realtime_updates",
        "qr_codes",
        "mobile_viewing",
        "multi_field_view",
        "bulk_scheduling",
        "custom_branding",
      ],
      premium: [
        "live_scoreboard",
        "realtime_updates",
        "qr_codes",
        "mobile_viewing",
        "multi_field_view",
        "bulk_scheduling",
        "custom_branding",
        "sponsorship",
        "referee_management",
        "large_display_mode",
        "premium_layouts",
      ],
    };
    
    const features = tierFeatures[tier] || [];
    return features.includes(feature);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Navigation Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-lg border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3">
          {/* Mobile: Compact vertical layout */}
          <div className="md:hidden space-y-3">
            <div className="flex items-center justify-between">
              <img 
                src="https://019d10b5-13db-77bf-8d2c-806760d8fabe.mochausercontent.com/Logo-No-Background-cropped2.png" 
                alt="ScoreLink LIVE"
                className="h-8"
              />
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => navigate("/")}
                  variant="ghost"
                  size="sm"
                  className="text-slate-300 hover:text-white text-xs"
                >
                  <ArrowLeft className="w-3 h-3 mr-1" />
                  Home
                </Button>
                <Button
                  onClick={logout}
                  variant="outline"
                  size="sm"
                  className="text-xs border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white"
                >
                  <LogOut className="w-3 h-3 mr-1" />
                  Sign Out
                </Button>
              </div>
            </div>
            <div className="w-full">
              <SportSelector />
            </div>
          </div>

          {/* Desktop: Single-row layout */}
          <div className="hidden md:flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <img 
                src="https://019d10b5-13db-77bf-8d2c-806760d8fabe.mochausercontent.com/Logo-No-Background-cropped2.png" 
                alt="ScoreLink LIVE"
                className="h-14"
              />
              <div>
                <SportSelector />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate("/")}
                variant="ghost"
                className="text-slate-300 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Home
              </Button>
              <Button
                onClick={logout}
                variant="outline"
                className="gap-2 border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 md:pt-24 pb-12">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-black text-white mb-2">
                {isAdmin ? "Site Admin Dashboard" : "Event Coordinator Dashboard"}
              </h1>
              <p className="text-slate-400">
                {isAdmin 
                  ? "Manage all events and coordinators" 
                  : (activeSportAccount?.organization_name || "Welcome back")
                } •{" "}
                <span className="capitalize">{currentUser?.role}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Top Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <ActionButton
            icon={<Activity className="w-6 h-6" />}
            label="Games"
            onClick={() => navigate("/admin/games")}
          />
          <ActionButton
            icon={<Calendar className="w-6 h-6" />}
            label="Schedule & Fields"
            onClick={() => navigate("/admin/games-unified")}
          />
          <ActionButton
            icon={<Settings className="w-6 h-6" />}
            label="Template Settings"
            onClick={() => navigate("/settings/template")}
          />
          {isAdmin && (
            <ActionButton
              icon={<Users className="w-6 h-6" />}
              label="Manage Coordinators"
              onClick={() => navigate("/admin/users")}
            />
          )}
        </div>

        {/* Subscription Info Section */}
        {activeSportAccount && (
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {/* Field Days Card */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Field-Days Remaining</p>
                  <p className="text-4xl font-bold text-white">
                    {fieldsRemaining}
                    <span className="text-lg text-slate-400 ml-2">/ {fieldsAllowed}</span>
                  </p>
                  <p className="text-slate-500 text-xs mt-1">
                    {fieldDaysUsed} used
                  </p>
                </div>
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
              </div>
              <Button
                onClick={() => navigate("/pricing")}
                className="w-full bg-primary hover:bg-primary/90 text-white gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                Purchase More Field-Days
              </Button>
            </div>

            {/* Subscription Tier Card */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Subscription Tier</p>
                  <p className="text-4xl font-bold text-white capitalize">{tier}</p>
                  {activeSportAccount?.subscription_end_date && (
                    <p className="text-slate-500 text-xs mt-1">
                      Valid until {new Date(activeSportAccount.subscription_end_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className={`bg-gradient-to-r ${tierColors[tier as keyof typeof tierColors]} p-3 rounded-lg`}>
                  {tier === "free" && <Zap className="w-6 h-6 text-white" />}
                  {tier === "basic" && <Zap className="w-6 h-6 text-white" />}
                  {tier === "standard" && <Trophy className="w-6 h-6 text-white" />}
                  {tier === "premium" && <Crown className="w-6 h-6 text-white" />}
                </div>
              </div>
              {tier !== "premium" && (
                <Button
                  onClick={() => navigate("/pricing")}
                  className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-white gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  Upgrade Subscription
                </Button>
              )}
              {tier === "premium" && (
                <div className="text-center py-2 text-green-400 font-medium">
                  <CheckCircle2 className="w-4 h-4 inline mr-2" />
                  Premium Active
                </div>
              )}
            </div>
          </div>
        )}

        {/* Your Features */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Your Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Standard Tier Features */}
            <FeatureCard
              icon={<Layout className="w-5 h-5" />}
              title="Multi-Field View"
              description="Monitor multiple games at once"
              available={hasSportFeature("multi_field_view")}
              requiredTier="Standard"
              onClick={() =>
                hasSportFeature("multi_field_view")
                  ? navigate("/multifield")
                  : navigate("/pricing")
              }
            />
            <FeatureCard
              icon={<Calendar className="w-5 h-5" />}
              title="Bulk Scheduling"
              description="Upload schedules via Excel"
              available={hasSportFeature("bulk_scheduling")}
              requiredTier="Standard"
              onClick={() => navigate("/admin/games-unified")}
            />
            <FeatureCard
              icon={<Palette className="w-5 h-5" />}
              title="Custom Branding"
              description="Personalize colors and logos"
              available={hasSportFeature("custom_branding")}
              requiredTier="Standard"
              onClick={() =>
                hasSportFeature("custom_branding")
                  ? navigate("/admin/branding")
                  : navigate("/pricing")
              }
            />
            
            {/* Premium Tier Features */}
            <FeatureCard
              icon={<Megaphone className="w-5 h-5" />}
              title="Sponsorship"
              description="Display sponsor ads on scoreboards"
              available={hasSportFeature("sponsorship")}
              requiredTier="Premium"
              onClick={() =>
                hasSportFeature("sponsorship")
                  ? navigate("/admin/sponsors")
                  : navigate("/pricing")
              }
            />
            <FeatureCard
              icon={<Users className="w-5 h-5" />}
              title="Referee Management"
              description="Manage your referee database"
              available={hasSportFeature("referee_management")}
              requiredTier="Premium"
              onClick={() =>
                hasSportFeature("referee_management")
                  ? navigate("/admin/referees")
                  : navigate("/pricing")
              }
            />
            <FeatureCard
              icon={<Tv className="w-5 h-5" />}
              title="Large Display Mode"
              description="Turn any screen into an elite scoreboard"
              available={hasSportFeature("large_display_mode")}
              requiredTier="Premium"
              onClick={() =>
                hasSportFeature("large_display_mode")
                  ? navigate("/admin/games")
                  : navigate("/pricing")
              }
            />
          </div>
        </div>

        {/* Business Analytics (Admin only) */}
        {isAdmin && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Business Analytics</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <QuickActionCard
                icon={<Users className="w-6 h-6" />}
                title="Customer Management"
                description="View all coordinators and subscriptions"
                onClick={() => navigate("/admin/customers")}
              />
              <QuickActionCard
                icon={<DollarSign className="w-6 h-6" />}
                title="Financials"
                description="Revenue breakdown and trends"
                onClick={() => navigate("/admin/financials")}
              />
              <QuickActionCard
                icon={<BarChart3 className="w-6 h-6" />}
                title="Usage Statistics"
                description="Platform activity and insights"
                onClick={() => navigate("/admin/statistics")}
              />
            </div>
          </div>
        )}

        {/* AI Ops (Admin only) */}
        {isAdmin && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">AI Operations</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <QuickActionCard
                icon={<Users className="w-6 h-6" />}
                title="Support Tickets"
                description="AI-powered customer support management"
                onClick={() => navigate("/ops/support")}
              />
              <QuickActionCard
                icon={<DollarSign className="w-6 h-6" />}
                title="Finance Alerts"
                description="Payment failures and billing issues"
                onClick={() => navigate("/ops/finance")}
              />
              <QuickActionCard
                icon={<BarChart3 className="w-6 h-6" />}
                title="Approval Queue"
                description="Review AI-generated actions"
                onClick={() => navigate("/ops/approvals")}
              />
            </div>
          </div>
        )}

        {/* Multi-Field QR Code Dialog */}
        <MultiFieldQRCode
          coordinatorId={currentUser?.mocha_user_id}
          eventName={activeSportAccount?.organization_name || undefined}
          open={showMultiFieldQR}
          onOpenChange={setShowMultiFieldQR}
        />
      </div>
      <Footer />
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-gradient-to-br from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 border border-primary/30 rounded-xl p-6 text-left transition-all group shadow-lg shadow-primary/20"
    >
      <div className="text-white mb-3 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="font-bold text-white text-lg">{label}</h3>
    </button>
  );
}

function QuickActionCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 text-left hover:border-primary/30 hover:bg-slate-800/50 transition-all group"
    >
      <div className="text-primary mb-3 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-slate-400">{description}</p>
    </button>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  available,
  requiredTier,
  onClick,
  comingSoon,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  available: boolean;
  requiredTier?: string;
  onClick: () => void;
  comingSoon?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`bg-slate-900/50 border rounded-xl p-4 text-left transition-all ${
        available
          ? "border-slate-800 hover:border-primary/30 hover:bg-slate-800/50"
          : "border-slate-800/50 opacity-60"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className={available ? "text-primary" : "text-slate-500"}>
          {icon}
        </div>
        {!available && !comingSoon && (
          <div className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded">
            <Lock className="w-3 h-3" />
            {requiredTier}
          </div>
        )}
        {comingSoon && (
          <div className="text-xs text-primary bg-primary/10 px-2 py-1 rounded">
            Coming Soon
          </div>
        )}
        {available && !comingSoon && (
          <CheckCircle2 className="w-4 h-4 text-green-400" />
        )}
      </div>
      <h3 className={`font-medium mb-1 ${available ? "text-white" : "text-slate-400"}`}>
        {title}
      </h3>
      <p className="text-xs text-slate-500">{description}</p>
    </button>
  );
}

