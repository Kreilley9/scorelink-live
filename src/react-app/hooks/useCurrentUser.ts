import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@getmocha/users-service/react";
import type { UserRole, SubscriptionTier } from "@/shared/types";

export interface CurrentUser {
  id: number;
  mocha_user_id: string;
  email: string;
  role: UserRole;
  subscription_tier: SubscriptionTier | null;
  organization_name: string | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  fields_allowed: number | null;
  features: string[];
}

export function useCurrentUser() {
  const { user, isPending: authPending } = useAuth();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = useCallback(async () => {
    if (!user) {
      setCurrentUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/users/me");
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data);
      } else {
        setCurrentUser(null);
      }
    } catch (error) {
      console.error("Failed to fetch current user:", error);
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authPending) {
      fetchCurrentUser();
    }
  }, [authPending, fetchCurrentUser]);

  const hasFeature = useCallback(
    (feature: string): boolean => {
      if (!currentUser) return false;
      // Admin has all features
      if (currentUser.role === "admin") return true;
      // Check feature list
      return currentUser.features?.includes(feature) ?? false;
    },
    [currentUser]
  );

  const hasRole = useCallback(
    (roles: UserRole | UserRole[]): boolean => {
      if (!currentUser) return false;
      const roleArray = Array.isArray(roles) ? roles : [roles];
      return roleArray.includes(currentUser.role);
    },
    [currentUser]
  );

  const isSubscriptionActive = useCallback((): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === "admin") return true;
    if (!currentUser.subscription_end_date) return false;
    return new Date(currentUser.subscription_end_date) > new Date();
  }, [currentUser]);

  return {
    currentUser,
    isLoading: isLoading || authPending,
    hasFeature,
    hasRole,
    isSubscriptionActive,
    refetch: fetchCurrentUser,
  };
}
