import { ReactNode } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import { useCurrentUser } from "@/react-app/hooks/useCurrentUser";
import { Button } from "@/react-app/components/ui/button";
import { LogIn, Lock, ArrowLeft } from "lucide-react";
import type { UserRole } from "@/shared/types";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole | UserRole[];
  requiredFeature?: string;
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredFeature,
}: ProtectedRouteProps) {
  const navigate = useNavigate();
  const { user, isPending: authPending, redirectToLogin } = useAuth();
  const { currentUser, isLoading, hasRole, hasFeature } = useCurrentUser();

  // Show loading state
  if (authPending || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/10 rounded-full mb-6">
            <LogIn className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Sign In Required</h2>
          <p className="text-slate-400 mb-6">
            Please sign in to access this page.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={redirectToLogin}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-2"
            >
              <LogIn className="w-4 h-4" />
              Sign In with Google
            </Button>
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Check role requirement
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
        <div className="bg-slate-900/50 border border-red-500/30 rounded-xl p-8 max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/10 rounded-full mb-6">
            <Lock className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Access Denied</h2>
          <p className="text-slate-400 mb-2">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-slate-500 mb-6">
            Current role: <span className="capitalize">{currentUser?.role}</span>
          </p>
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // Check feature requirement
  if (requiredFeature && !hasFeature(requiredFeature)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
        <div className="bg-slate-900/50 border border-blue-500/30 rounded-xl p-8 max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/10 rounded-full mb-6">
            <Lock className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Upgrade Required</h2>
          <p className="text-slate-400 mb-6">
            This feature requires a higher subscription tier.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => navigate("/pricing")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              View Pricing Plans
            </Button>
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
