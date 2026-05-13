import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useCurrentUser } from './useCurrentUser';

export interface SportAccount {
  id: number;
  user_id: number;
  sport_type: string;
  organization_name: string | null;
  subscription_tier: string;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  fields_allowed: number;
  template_config: string | null;
  is_onboarded: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SportAccountContextType {
  sportAccounts: SportAccount[];
  activeSportAccount: SportAccount | null;
  setActiveSportAccount: (account: SportAccount) => void;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const SportAccountContext = createContext<SportAccountContextType | undefined>(undefined);

const ACTIVE_SPORT_ACCOUNT_KEY = 'scorelink_active_sport_account_id';

export function SportAccountProvider({ children }: { children: ReactNode }) {
  const { currentUser, isLoading: userLoading } = useCurrentUser();
  const [sportAccounts, setSportAccounts] = useState<SportAccount[]>([]);
  const [activeSportAccount, setActiveSportAccountState] = useState<SportAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSportAccounts = async () => {
    if (!currentUser) {
      setSportAccounts([]);
      setActiveSportAccountState(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/sport-accounts');
      if (response.ok) {
        const accounts: SportAccount[] = await response.json();
        setSportAccounts(accounts);

        // Restore previously selected sport account from localStorage
        const savedId = localStorage.getItem(ACTIVE_SPORT_ACCOUNT_KEY);
        const savedAccount = savedId 
          ? accounts.find(a => a.id === parseInt(savedId))
          : null;

        if (savedAccount) {
          setActiveSportAccountState(savedAccount);
        } else if (accounts.length > 0) {
          // Default to first account
          setActiveSportAccountState(accounts[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch sport accounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!userLoading) {
      fetchSportAccounts();
    }
  }, [currentUser, userLoading]);

  const setActiveSportAccount = (account: SportAccount) => {
    setActiveSportAccountState(account);
    localStorage.setItem(ACTIVE_SPORT_ACCOUNT_KEY, account.id.toString());
  };

  return (
    <SportAccountContext.Provider
      value={{
        sportAccounts,
        activeSportAccount,
        setActiveSportAccount,
        isLoading: isLoading || userLoading,
        refetch: fetchSportAccounts,
      }}
    >
      {children}
    </SportAccountContext.Provider>
  );
}

export function useSportAccount() {
  const context = useContext(SportAccountContext);
  if (context === undefined) {
    throw new Error('useSportAccount must be used within a SportAccountProvider');
  }
  return context;
}

// Helper to format sport type for display
export function formatSportName(sportType: string): string {
  const names: Record<string, string> = {
    flag_football: 'Flag Football',
    basketball: 'Basketball',
    tackle_football: 'Tackle Football',
    soccer: 'Soccer',
    baseball_softball: 'Baseball/Softball',
    volleyball: 'Volleyball',
    tennis: 'Tennis',
    lacrosse: 'Lacrosse',
    hockey: 'Hockey',
    field_hockey: 'Field Hockey',
  };
  return names[sportType] || sportType;
}
