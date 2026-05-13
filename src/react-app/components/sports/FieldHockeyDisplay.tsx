import { Game } from "@/shared/types";

interface FieldHockeyDisplayProps {
  game: Game;
  primaryColor?: string;
  secondaryColor?: string;
  textColor?: string;
}

export function FieldHockeyDisplay({ game }: FieldHockeyDisplayProps) {
  const homePenaltyCorners = game.home_penalty_corners || 0;
  const awayPenaltyCorners = game.away_penalty_corners || 0;
  const homeShots = game.home_shots || 0;
  const awayShots = game.away_shots || 0;
  const homeGreenCards = game.home_green_cards || 0;
  const awayGreenCards = game.away_green_cards || 0;
  const homeYellowCards = game.home_yellow_cards || 0;
  const awayYellowCards = game.away_yellow_cards || 0;
  const homeRedCards = game.home_red_cards || 0;
  const awayRedCards = game.away_red_cards || 0;
  const isShootoutMode = game.is_shootout_mode || 0;
  const homePKs = game.home_penalty_kicks || 0;
  const awayPKs = game.away_penalty_kicks || 0;

  const hasCards = homeGreenCards > 0 || awayGreenCards > 0 || 
                   homeYellowCards > 0 || awayYellowCards > 0 || 
                   homeRedCards > 0 || awayRedCards > 0;

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4 sm:p-6">
      {/* Shootout Mode Banner */}
      {isShootoutMode === 1 && (
        <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-3 mb-4">
          <div className="text-center">
            <div className="text-xs font-semibold text-yellow-400 mb-1">PENALTY SHOOTOUT</div>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <div className="text-sm font-bold text-blue-400 mb-1 truncate">{game.home_team}</div>
                <div className="text-3xl font-black text-white">{homePKs}</div>
              </div>
              <div>
                <div className="text-sm font-bold text-sky-400 mb-1 truncate">{game.away_team}</div>
                <div className="text-3xl font-black text-white">{awayPKs}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Penalty Corners */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-xs font-medium text-slate-400 mb-1">PENALTY CORNERS</div>
          <div className="text-sm font-bold text-blue-400 mb-1 truncate">{game.home_team}</div>
          <div className="text-3xl sm:text-4xl font-black text-white">
            {homePenaltyCorners}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs font-medium text-slate-400 mb-1">PENALTY CORNERS</div>
          <div className="text-sm font-bold text-sky-400 mb-1 truncate">{game.away_team}</div>
          <div className="text-3xl sm:text-4xl font-black text-white">
            {awayPenaltyCorners}
          </div>
        </div>
      </div>

      {/* Shots */}
      <div className="grid grid-cols-2 gap-4 mb-4 border-t border-slate-700 pt-4">
        <div className="text-center">
          <div className="text-xs font-medium text-slate-400 mb-1">SHOTS</div>
          <div className="text-sm font-bold text-blue-400 mb-1 truncate">{game.home_team}</div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {homeShots}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs font-medium text-slate-400 mb-1">SHOTS</div>
          <div className="text-sm font-bold text-sky-400 mb-1 truncate">{game.away_team}</div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {awayShots}
          </div>
        </div>
      </div>

      {/* Cards */}
      {hasCards && (
        <div className="border-t border-slate-700 pt-4">
          <div className="text-xs font-medium text-slate-400 mb-3 text-center">CARDS</div>
          <div className="grid grid-cols-2 gap-4">
            {/* Home Cards */}
            <div>
              <div className="text-sm font-bold text-blue-400 mb-2 truncate text-center">{game.home_team}</div>
              <div className="space-y-1">
                {homeGreenCards > 0 && (
                  <div className="flex justify-between items-center bg-green-900/20 rounded px-2 py-1">
                    <span className="text-xs text-green-400">Green</span>
                    <span className="text-sm font-bold text-white">{homeGreenCards}</span>
                  </div>
                )}
                {homeYellowCards > 0 && (
                  <div className="flex justify-between items-center bg-yellow-900/20 rounded px-2 py-1">
                    <span className="text-xs text-yellow-400">Yellow</span>
                    <span className="text-sm font-bold text-white">{homeYellowCards}</span>
                  </div>
                )}
                {homeRedCards > 0 && (
                  <div className="flex justify-between items-center bg-red-900/20 rounded px-2 py-1">
                    <span className="text-xs text-red-400">Red</span>
                    <span className="text-sm font-bold text-white">{homeRedCards}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Away Cards */}
            <div>
              <div className="text-sm font-bold text-sky-400 mb-2 truncate text-center">{game.away_team}</div>
              <div className="space-y-1">
                {awayGreenCards > 0 && (
                  <div className="flex justify-between items-center bg-green-900/20 rounded px-2 py-1">
                    <span className="text-xs text-green-400">Green</span>
                    <span className="text-sm font-bold text-white">{awayGreenCards}</span>
                  </div>
                )}
                {awayYellowCards > 0 && (
                  <div className="flex justify-between items-center bg-yellow-900/20 rounded px-2 py-1">
                    <span className="text-xs text-yellow-400">Yellow</span>
                    <span className="text-sm font-bold text-white">{awayYellowCards}</span>
                  </div>
                )}
                {awayRedCards > 0 && (
                  <div className="flex justify-between items-center bg-red-900/20 rounded px-2 py-1">
                    <span className="text-xs text-red-400">Red</span>
                    <span className="text-sm font-bold text-white">{awayRedCards}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
