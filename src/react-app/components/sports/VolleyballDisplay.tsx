import { Game } from "@/shared/types";
import { Trophy } from "lucide-react";

interface VolleyballDisplayProps {
  game: Game;
  primaryColor?: string;
  secondaryColor?: string;
  textColor?: string;
}

export function VolleyballDisplay({ game, primaryColor, secondaryColor, textColor }: VolleyballDisplayProps) {
  const homeSets = game.home_sets_won || 0;
  const awaySets = game.away_sets_won || 0;

  const defaultPrimary = "#2563eb";
  const defaultSecondary = "#0ea5e9";
  const defaultText = "#ffffff";
  
  const primary = primaryColor || defaultPrimary;
  const secondary = secondaryColor || defaultSecondary;
  const text = textColor || defaultText;

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4 sm:p-6">
      {/* Sets Won Header */}
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <div className="text-sm text-slate-400">SETS WON</div>
        </div>
      </div>

      {/* Sets Display */}
      <div className="grid grid-cols-3 gap-4">
        {/* Home Team Sets */}
        <div className="text-center">
          <div 
            className="text-xs font-medium mb-1 truncate"
            style={{ color: primary }}
          >
            {game.home_team}
          </div>
          <div 
            className="text-4xl sm:text-5xl font-black"
            style={{ color: text }}
          >
            {homeSets}
          </div>
        </div>

        {/* Center Divider */}
        <div className="flex items-center justify-center">
          <div className="text-2xl font-bold text-slate-600">-</div>
        </div>

        {/* Away Team Sets */}
        <div className="text-center">
          <div 
            className="text-xs font-medium mb-1 truncate"
            style={{ color: secondary }}
          >
            {game.away_team}
          </div>
          <div 
            className="text-4xl sm:text-5xl font-black"
            style={{ color: text }}
          >
            {awaySets}
          </div>
        </div>
      </div>

      {/* Set Indicators */}
      <div className="mt-6 border-t border-slate-700 pt-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Home Set Indicators */}
          <div>
            <div className="flex justify-center gap-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    i < homeSets
                      ? 'bg-blue-500 border-blue-400'
                      : 'bg-slate-700 border-slate-600'
                  }`}
                >
                  {i < homeSets && (
                    <Trophy className="w-3 h-3 text-white" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Away Set Indicators */}
          <div>
            <div className="flex justify-center gap-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    i < awaySets
                      ? 'bg-sky-500 border-sky-400'
                      : 'bg-slate-700 border-slate-600'
                  }`}
                >
                  {i < awaySets && (
                    <Trophy className="w-3 h-3 text-white" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
