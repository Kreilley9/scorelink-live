import { Button } from "@/react-app/components/ui/button";
import { Plus, Minus } from "lucide-react";
import { Game, UpdateGameState } from "@/shared/types";

interface HockeyControlsProps {
  game: Game;
  onUpdate: (updates: UpdateGameState) => void;
}

export function HockeyControls({ game, onUpdate }: HockeyControlsProps) {
  const homePenalties = game.home_penalties || 0;
  const awayPenalties = game.away_penalties || 0;
  const homeShotsOnGoal = game.home_shots_on_goal || 0;
  const awayShotsOnGoal = game.away_shots_on_goal || 0;

  const addGoal = (team: 'home' | 'away') => {
    const scoreKey = team === 'home' ? 'home_score' : 'away_score';
    const shotsKey = team === 'home' ? 'home_shots_on_goal' : 'away_shots_on_goal';
    const currentScore = team === 'home' ? game.home_score : game.away_score;
    const currentShots = team === 'home' ? homeShotsOnGoal : awayShotsOnGoal;
    
    // Goal counts as shot on goal too
    onUpdate({ 
      [scoreKey]: currentScore + 1,
      [shotsKey]: currentShots + 1
    });
  };

  const addShot = (team: 'home' | 'away') => {
    const shotsKey = team === 'home' ? 'home_shots_on_goal' : 'away_shots_on_goal';
    const currentShots = team === 'home' ? homeShotsOnGoal : awayShotsOnGoal;
    onUpdate({ [shotsKey]: currentShots + 1 });
  };

  const removeShot = (team: 'home' | 'away') => {
    const shotsKey = team === 'home' ? 'home_shots_on_goal' : 'away_shots_on_goal';
    const currentShots = team === 'home' ? homeShotsOnGoal : awayShotsOnGoal;
    if (currentShots > 0) {
      onUpdate({ [shotsKey]: currentShots - 1 });
    }
  };

  const addPenalty = (team: 'home' | 'away') => {
    const penaltyKey = team === 'home' ? 'home_penalties' : 'away_penalties';
    const currentPenalties = team === 'home' ? homePenalties : awayPenalties;
    onUpdate({ [penaltyKey]: currentPenalties + 1 });
  };

  const removePenalty = (team: 'home' | 'away') => {
    const penaltyKey = team === 'home' ? 'home_penalties' : 'away_penalties';
    const currentPenalties = team === 'home' ? homePenalties : awayPenalties;
    if (currentPenalties > 0) {
      onUpdate({ [penaltyKey]: currentPenalties - 1 });
    }
  };

  const powerPlaySituation = homePenalties !== awayPenalties;
  const powerPlayTeam = homePenalties < awayPenalties ? 'home' : 'away';
  const penaltyDifferential = Math.abs(homePenalties - awayPenalties);

  return (
    <div className="space-y-4">
      {/* Power Play Indicator */}
      {powerPlaySituation && (
        <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-4">
          <div className="text-center">
            <div className="text-sm font-semibold text-yellow-400 mb-1">POWER PLAY</div>
            <div className="text-lg font-bold text-white">
              {powerPlayTeam === 'home' ? game.home_team : game.away_team}
            </div>
            <div className="text-sm text-yellow-300 mt-1">
              {penaltyDifferential === 1 ? '5 on 4' : penaltyDifferential === 2 ? '5 on 3' : `+${penaltyDifferential}`}
            </div>
          </div>
        </div>
      )}

      {/* Quick Score */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-400 mb-3">QUICK SCORE</h3>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Home Team */}
          <div className="text-center">
            <div className="text-sm font-bold text-blue-400 mb-2 truncate">{game.home_team}</div>
            <div className="text-4xl font-bold text-white mb-2">
              {game.home_score}
            </div>
            <Button
              onClick={() => addGoal('home')}
              size="sm"
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              +1 Goal
            </Button>
          </div>

          {/* Away Team */}
          <div className="text-center">
            <div className="text-sm font-bold text-sky-400 mb-2 truncate">{game.away_team}</div>
            <div className="text-4xl font-bold text-white mb-2">
              {game.away_score}
            </div>
            <Button
              onClick={() => addGoal('away')}
              size="sm"
              className="w-full bg-sky-600 hover:bg-sky-700"
            >
              +1 Goal
            </Button>
          </div>
        </div>
      </div>

      {/* Shots on Goal */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-400 mb-3">SHOTS ON GOAL</h3>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Home Shots */}
          <div className="text-center">
            <div className="text-sm font-bold text-blue-400 mb-2 truncate">{game.home_team}</div>
            <div className="text-3xl font-bold text-white mb-2">
              {homeShotsOnGoal}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => removeShot('home')}
                size="sm"
                variant="outline"
                className="flex-1"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => addShot('home')}
                size="sm"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Away Shots */}
          <div className="text-center">
            <div className="text-sm font-bold text-sky-400 mb-2 truncate">{game.away_team}</div>
            <div className="text-3xl font-bold text-white mb-2">
              {awayShotsOnGoal}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => removeShot('away')}
                size="sm"
                variant="outline"
                className="flex-1"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => addShot('away')}
                size="sm"
                className="flex-1 bg-sky-600 hover:bg-sky-700"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Penalties */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-400 mb-3">ACTIVE PENALTIES</h3>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Home Penalties */}
          <div className="text-center">
            <div className="text-sm font-bold text-blue-400 mb-2 truncate">{game.home_team}</div>
            <div className="text-3xl font-bold text-white mb-2">
              {homePenalties}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => removePenalty('home')}
                size="sm"
                variant="outline"
                className="flex-1"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => addPenalty('home')}
                size="sm"
                className="flex-1 bg-yellow-600 hover:bg-yellow-700"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Away Penalties */}
          <div className="text-center">
            <div className="text-sm font-bold text-sky-400 mb-2 truncate">{game.away_team}</div>
            <div className="text-3xl font-bold text-white mb-2">
              {awayPenalties}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => removePenalty('away')}
                size="sm"
                variant="outline"
                className="flex-1"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => addPenalty('away')}
                size="sm"
                className="flex-1 bg-yellow-600 hover:bg-yellow-700"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
