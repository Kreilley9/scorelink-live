import { useAuth as useClerkAuth, useUser, useClerk } from "@clerk/clerk-react";

export function useAuth() {
  const { isSignedIn, isLoaded, signOut, getToken } = useClerkAuth();
  const { user } = useUser();
  const { openSignIn } = useClerk();

  return {
    user:
      isSignedIn && user
        ? { email: user.emailAddresses[0]?.emailAddress ?? "", id: user.id }
        : null,
    isPending: !isLoaded,
    redirectToLogin: () => openSignIn(),
    logout: () => signOut(),
    getToken,
    exchangeCodeForSessionToken: async () => {},
  };
}
