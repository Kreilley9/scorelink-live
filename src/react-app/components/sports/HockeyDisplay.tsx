import { Game } from "@/shared/types";

interface HockeyDisplayProps {
  game: Game;
  primaryColor?: string;
  secondaryColor?: string;
  textColor?: string;
}

export function HockeyDisplay({ game }: HockeyDisplayProps) {
  const homePenalties = game.home_penalties || 0;
  const awayPenalties = game.away_penalties || 0;
  const homeShotsOnGoal = game.home_shots_on_goal || 0;
  const awayShotsOnGoal = game.away_shots_on_goal || 0;

  const powerPlaySituation = homePenalties !== awayPenalties;
  const powerPlayTeam = homePenalties < awayPenalties ? 'home' : 'away';
  const penaltyDifferential = Math.abs(homePenalties - awayPenalties);

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4 sm:p-6">
      {/* Power Play Indicator */}
      {powerPlaySituation && (
        <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-3 mb-4">
          <div className="text-center">
            <div className="text-xs font-semibold text-yellow-400 mb-1">POWER PLAY</div>
            <div className="text-lg font-bold text-white">
              {powerPlayTeam === 'home' ? game.home_team : game.away_team}
            </div>
            <div className="text-sm text-yellow-300 mt-1">
              {penaltyDifferential === 1 ? '5 on 4' : penaltyDifferential === 2 ? '5 on 3' : `+${penaltyDifferential}`}
            </div>
          </div>
        </div>
      )}

      {/* Shots on Goal */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-xs font-medium text-slate-400 mb-1">SHOTS ON GOAL</div>
          <div className="text-sm font-bold text-blue-400 mb-1 truncate">{game.home_team}</div>
          <div className="text-3xl sm:text-4xl font-black text-white">
            {homeShotsOnGoal}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs font-medium text-slate-400 mb-1">SHOTS ON GOAL</div>
          <div className="text-sm font-bold text-sky-400 mb-1 truncate">{game.away_team}</div>
          <div className="text-3xl sm:text-4xl font-black text-white">
            {awayShotsOnGoal}
          </div>
        </div>
      </div>

      {/* Penalties */}
      {(homePenalties > 0 || awayPenalties > 0) && (
        <div className="border-t border-slate-700 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-xs font-medium text-yellow-400 mb-1">PENALTIES</div>
              <div className="text-sm font-bold text-blue-400 mb-1 truncate">{game.home_team}</div>
              <div className="text-2xl sm:text-3xl font-black text-white">
                {homePenalties}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs font-medium text-yellow-400 mb-1">PENALTIES</div>
              <div className="text-sm font-bold text-sky-400 mb-1 truncate">{game.away_team}</div>
              <div className="text-2xl sm:text-3xl font-black text-white">
                {awayPenalties}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
