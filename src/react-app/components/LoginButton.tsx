import { useAuth } from "@/react-app/hooks/useAuth";
import { Button } from "@/react-app/components/ui/button";
import { LogIn, LogOut, UserCog } from "lucide-react";
import { useNavigate } from "react-router";
import { useCurrentUser } from "@/react-app/hooks/useCurrentUser";

export default function LoginButton() {
  const { user, isPending, redirectToLogin, logout } = useAuth();
  const navigate = useNavigate();
  const { currentUser, hasRole } = useCurrentUser();

  if (isPending) {
    return null;
  }

  if (!user) {
    return (
      <Button 
        onClick={redirectToLogin} 
        size="lg"
        className="bg-primary hover:bg-primary/90 text-white font-bold gap-2 min-h-[44px] px-6"
      >
        <LogIn className="w-5 h-5" />
        Sign In
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 md:gap-4">
      {/* Hide user info on mobile */}
      <div className="hidden md:block text-right">
        <p className="text-sm text-slate-300">{user.email}</p>
        {currentUser && (
          <p className="text-xs text-slate-500 capitalize">
            {currentUser.role}
            {currentUser.subscription_tier && currentUser.role === 'coordinator' && (
              <span className="ml-1 text-primary">• {currentUser.subscription_tier}</span>
            )}
          </p>
        )}
      </div>
      {/* Hide "Manage Users" text on mobile, show icon only */}
      {hasRole('admin') && (
        <Button
          onClick={() => navigate("/admin/users")}
          variant="outline"
          className="gap-2 min-h-[44px]"
        >
          <UserCog className="w-5 h-5" />
          <span className="hidden md:inline">Manage Users</span>
        </Button>
      )}
      {/* Mobile-friendly sign out button */}
      <Button 
        onClick={logout} 
        variant="outline" 
        className="gap-2 min-h-[44px] px-4 md:px-6"
      >
        <LogOut className="w-5 h-5" />
        <span className="hidden md:inline">Sign Out</span>
      </Button>
    </div>
  );
}
