import { useState } from "react";
import { useNavigate } from "react-router";
import { 
  ChevronDown, 
  Check, 
  Plus,
  Trophy
} from "lucide-react";
import { useSportAccount, formatSportName } from "@/react-app/hooks/useSportAccount";
import { Button } from "@/react-app/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/react-app/components/ui/dropdown-menu";
import { getSportIcon } from "@/react-app/utils/sportIcons";

export default function SportSelector() {
  const navigate = useNavigate();
  const { sportAccounts, activeSportAccount, setActiveSportAccount, isLoading } = useSportAccount();
  const [open, setOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="h-10 w-40 bg-slate-800/50 rounded-lg animate-pulse" />
    );
  }

  // If no sport accounts, show a button to add one
  if (sportAccounts.length === 0) {
    return (
      <Button
        onClick={() => navigate("/signup")}
        variant="outline"
        className="gap-2 bg-blue-600/20 border-blue-500/30 text-blue-300 hover:bg-blue-600/30"
      >
        <Plus className="w-4 h-4" />
        Add Sport
      </Button>
    );
  }

  // Always show dropdown with "Add Another Sport" option
  const ActiveIcon = activeSportAccount ? getSportIcon(activeSportAccount.sport_type) : Trophy;
  
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 bg-slate-800/50 border-slate-700/50 text-white hover:bg-slate-700/50 w-full md:min-w-[160px] justify-between"
        >
          <div className="flex items-center gap-2">
            <ActiveIcon className="w-4 h-4 text-blue-400" />
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">
                {activeSportAccount ? formatSportName(activeSportAccount.sport_type) : "Select Sport"}
              </span>
              {activeSportAccount?.organization_name && (
                <span className="text-xs text-slate-400 truncate max-w-[150px] md:max-w-[120px]">
                  {activeSportAccount.organization_name}
                </span>
              )}
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        className="w-[220px] bg-slate-900 border-slate-700"
      >
        {sportAccounts.map((account) => {
          const SportIcon = getSportIcon(account.sport_type);
          return (
            <DropdownMenuItem
              key={account.id}
              onClick={() => {
                setActiveSportAccount(account);
                setOpen(false);
              }}
              className="flex items-center justify-between cursor-pointer hover:bg-slate-800 text-slate-200"
            >
              <div className="flex items-center gap-2">
                <SportIcon className="w-4 h-4 text-blue-400" />
                <div className="flex flex-col">
                  <span className="font-medium">{formatSportName(account.sport_type)}</span>
                  {account.organization_name && (
                    <span className="text-xs text-slate-400">{account.organization_name}</span>
                  )}
                  <span className="text-xs text-blue-400 capitalize">{account.subscription_tier}</span>
                </div>
              </div>
              {activeSportAccount?.id === account.id && (
                <Check className="w-4 h-4 text-blue-400" />
              )}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator className="bg-slate-700" />
        <DropdownMenuItem
          onClick={() => {
            setOpen(false);
            navigate("/signup");
          }}
          className="flex items-center gap-2 cursor-pointer hover:bg-slate-800 text-blue-400"
        >
          <Plus className="w-4 h-4" />
          Add Another Sport
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
