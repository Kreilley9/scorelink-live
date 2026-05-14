import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/react-app/hooks/useAuth";
import { useApiFetch } from "@/react-app/hooks/useApiFetch";

export default function AuthCallback() {
  const { isPending } = useAuth();
  const apiFetch = useApiFetch();
  const navigate = useNavigate();

  useEffect(() => {
    if (isPending) return;

    const handleAuth = async () => {
      try {
        const response = await apiFetch("/api/users/me");
        if (response.ok) {
          const userData = await response.json();

          if (!userData.is_onboarded && userData.role !== "admin") {
            navigate("/onboarding");
          } else if (userData.role === "admin" || userData.role === "coordinator") {
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
  }, [isPending, apiFetch, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400"></div>
        <p className="mt-4 text-slate-400">Completing sign in...</p>
      </div>
    </div>
  );
}
