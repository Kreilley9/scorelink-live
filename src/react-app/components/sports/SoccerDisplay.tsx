import { Game } from "@/shared/types";
import { Clock, Trophy } from "lucide-react";

interface SoccerDisplayProps {
  game: Game;
  textColor?: string;
}

export function SoccerDisplay({ game, textColor = "#ffffff" }: SoccerDisplayProps) {
  const stoppageTime = game.stoppage_time || 0;
  const isStoppageTime = game.is_stoppage_time || 0;
  const isShootoutMode = game.is_shootout_mode || 0;
  const homePKs = game.home_penalty_kicks || 0;
  const awayPKs = game.away_penalty_kicks || 0;

  // Only show if either stoppage time is active or shootout mode is active
  if (isStoppageTime !== 1 && isShootoutMode !== 1) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Stoppage Time Indicator */}
      {isStoppageTime === 1 && stoppageTime > 0 && (
        <div className="bg-orange-600/30 backdrop-blur-sm border border-orange-500/50 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-orange-400" />
            <span className="text-orange-400 text-sm font-semibold">STOPPAGE TIME</span>
          </div>
          <div className="text-orange-300 text-2xl font-bold">
            +{Math.floor(stoppageTime / 60)}:{String(stoppageTime % 60).padStart(2, '0')}
          </div>
        </div>
      )}

      {/* Shootout Mode Display */}
      {isShootoutMode === 1 && (
        <div className="bg-yellow-600/20 backdrop-blur-sm border border-yellow-500/50 rounded-xl p-4">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span className="text-yellow-400 text-sm font-bold uppercase tracking-wider">Penalty Shootout</span>
          </div>
          
          <div className="grid grid-cols-3 gap-2 items-center">
            {/* Home Team */}
            <div className="text-center">
              <div className="text-xs mb-1 truncate" style={{ color: textColor, opacity: 0.7 }}>
                {game.home_team}
              </div>
              <div className="text-3xl font-bold text-white">{homePKs}</div>
            </div>
            
            {/* Center Divider */}
            <div className="text-center">
              <div className="text-yellow-400 text-lg font-bold">PKs</div>
            </div>
            
            {/* Away Team */}
            <div className="text-center">
              <div className="text-xs mb-1 truncate" style={{ color: textColor, opacity: 0.7 }}>
                {game.away_team}
              </div>
              <div className="text-3xl font-bold text-white">{awayPKs}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
