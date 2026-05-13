import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";

export default function AuthCallback() {
  const { exchangeCodeForSessionToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        await exchangeCodeForSessionToken();
        
        // Fetch user role to determine redirect
        const response = await fetch("/api/users/me");
        if (response.ok) {
          const userData = await response.json();
          
          // New users (except admin) need to complete onboarding
          if (!userData.is_onboarded && userData.role !== "admin") {
            navigate("/onboarding");
          } else if (userData.role === "admin" || userData.role === "coordinator") {
            // Admins and coordinators go to dashboard
            navigate("/dashboard");
          } else {
            navigate("/");
          }
        } else {
          navigate("/");
        }
      } catch (error) {
        console.error("Authentication failed:", error);
        navigate("/");
      }
    };

    handleAuth();
  }, [exchangeCodeForSessionToken, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400"></div>
        <p className="mt-4 text-slate-400">Completing sign in...</p>
      </div>
    </div>
  );
}
