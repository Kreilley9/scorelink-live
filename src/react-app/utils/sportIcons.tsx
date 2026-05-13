// Shared sport icon utility for consistent icons across the app
import {
  FlagTriangleRight,
  Dribbble,
  Shield,
  Globe,
  CircleDot,
  Hexagon,
  Crosshair,
  Target,
  Slash,
  Grip,
  Trophy,
  LucideIcon
} from "lucide-react";
import { SportType } from "@/data/sports";

// Map sport IDs to their Lucide icon components
export const sportIconMap: Record<SportType, LucideIcon> = {
  flag_football: FlagTriangleRight,
  basketball: Dribbble,
  tackle_football: Shield,
  soccer: Globe,
  baseball_softball: CircleDot,
  volleyball: Hexagon,
  tennis: Crosshair,
  lacrosse: Target,
  hockey: Slash,
  field_hockey: Grip,
};

// Get the icon component for a sport
export function getSportIcon(sportId: string): LucideIcon {
  return sportIconMap[sportId as SportType] || Trophy;
}

// Render sport icon with consistent styling
export function SportIcon({
  sportId,
  className = "w-4 h-4",
}: {
  sportId: string;
  className?: string;
}) {
  const Icon = getSportIcon(sportId);
  return <Icon className={className} />;
}
