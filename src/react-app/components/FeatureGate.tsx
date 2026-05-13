import { ReactNode } from "react";
import { useNavigate } from "react-router";
import { useCurrentUser } from "@/react-app/hooks/useCurrentUser";
import { Button } from "@/react-app/components/ui/button";
import { Lock, Sparkles } from "lucide-react";
import type { UserRole } from "@/shared/types";

interface FeatureGateProps {
  children: ReactNode;
  feature?: string;
  requiredRole?: UserRole | UserRole[];
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
}

export function FeatureGate({
  children,
  feature,
  requiredRole,
  fallback,
  showUpgradePrompt = true,
}: FeatureGateProps) {
  const { currentUser, isLoading, hasFeature, hasRole } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  // Check role access
  if (requiredRole && !hasRole(requiredRole)) {
    if (fallback) return <>{fallback}</>;
    if (showUpgradePrompt) {
      return <AccessDenied reason="role" currentRole={currentUser?.role} />;
    }
    return null;
  }

  // Check feature access
  if (feature && !hasFeature(feature)) {
    if (fallback) return <>{fallback}</>;
    if (showUpgradePrompt) {
      return <UpgradePrompt feature={feature} />;
    }
    return null;
  }

  return <>{children}</>;
}

interface UpgradePromptProps {
  feature: string;
  className?: string;
}

const featureLabels: Record<string, { name: string; tier: string }> = {
  live_scoreboard: { name: "Live Scoreboard", tier: "Basic" },
  realtime_updates: { name: "Real-time Updates", tier: "Basic" },
  qr_codes: { name: "QR Code Access", tier: "Basic" },
  mobile_viewing: { name: "Mobile Viewing", tier: "Basic" },
  multi_field_view: { name: "Multi-Field View", tier: "Silver" },
  bulk_scheduling: { name: "Bulk Scheduling", tier: "Silver" },
  custom_branding: { name: "Custom Branding", tier: "Silver" },
  sponsorship: { name: "Sponsorship Management", tier: "Gold" },
  referee_management: { name: "Referee Management", tier: "Gold" },
  large_display_mode: { name: "Large Display Mode", tier: "Gold" },
  premium_layouts: { name: "Premium Layouts", tier: "Gold" },
};

export function UpgradePrompt({ feature, className = "" }: UpgradePromptProps) {
  const navigate = useNavigate();
  const featureInfo = featureLabels[feature] || { name: feature, tier: "a higher" };

  return (
    <div className={`bg-slate-900/50 border border-blue-500/30 rounded-xl p-6 text-center ${className}`}>
      <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-500/10 rounded-full mb-4">
        <Lock className="w-7 h-7 text-blue-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">
        {featureInfo.name} Requires Upgrade
      </h3>
      <p className="text-slate-400 mb-4">
        This feature is available on the {featureInfo.tier} plan and above.
        Upgrade your subscription to unlock it.
      </p>
      <Button
        onClick={() => navigate("/pricing")}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-2"
      >
        <Sparkles className="w-4 h-4" />
        View Pricing Plans
      </Button>
    </div>
  );
}

interface AccessDeniedProps {
  reason: "role";
  currentRole?: string;
}

function AccessDenied({ currentRole }: AccessDeniedProps) {
  return (
    <div className="bg-slate-900/50 border border-red-500/30 rounded-xl p-6 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 bg-red-500/10 rounded-full mb-4">
        <Lock className="w-7 h-7 text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">Access Denied</h3>
      <p className="text-slate-400">
        {currentRole === "viewer"
          ? "You have view-only access. Contact an administrator to request additional permissions."
          : "You don't have permission to access this feature. Contact an administrator for access."}
      </p>
    </div>
  );
}

// Helper component for inline feature checks (shows nothing or upgrade button)
interface FeatureButtonProps {
  feature: string;
  children: ReactNode;
  className?: string;
}

export function FeatureButton({ feature, children, className = "" }: FeatureButtonProps) {
  const navigate = useNavigate();
  const { hasFeature, isLoading } = useCurrentUser();

  if (isLoading) return null;

  if (!hasFeature(feature)) {
    return (
      <Button
        onClick={() => navigate("/pricing")}
        variant="outline"
        className={`gap-2 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 ${className}`}
      >
        <Lock className="w-4 h-4" />
        Upgrade to Unlock
      </Button>
    );
  }

  return <>{children}</>;
}
