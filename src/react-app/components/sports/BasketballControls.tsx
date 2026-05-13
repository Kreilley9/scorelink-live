import { Button } from "@/react-app/components/ui/button";
import { Plus, Minus } from "lucide-react";
import { Game, UpdateGameState } from "@/shared/types";

interface BasketballControlsProps {
  game: Game;
  onUpdate: (updates: UpdateGameState) => void;
}

export function BasketballControls({ game, onUpdate }: BasketballControlsProps) {
  const homeFouls = game.home_fouls || 0;
  const awayFouls = game.away_fouls || 0;
  
  // Determine bonus status based on fouls (NCAA rules: bonus at 7, double bonus at 10)
  const getBonus = (fouls: number): 'none' | 'bonus' | 'double' => {
    if (fouls >= 10) return 'double';
    if (fouls >= 7) return 'bonus';
    return 'none';
  };

  const homeBonus = getBonus(awayFouls); // Home team gets bonus when away team has fouls
  const awayBonus = getBonus(homeFouls); // Away team gets bonus when home team has fouls

  const addPoints = (team: 'home' | 'away', points: number) => {
    const scoreKey = team === 'home' ? 'home_score' : 'away_score';
    const currentScore = team === 'home' ? game.home_score : game.away_score;
    onUpdate({ [scoreKey]: currentScore + points });
  };

  const adjustFouls = (team: 'home' | 'away', delta: number) => {
    const key = team === 'home' ? 'home_fouls' : 'away_fouls';
    const current = team === 'home' ? homeFouls : awayFouls;
    const newValue = Math.max(0, current + delta);
    onUpdate({ [key]: newValue });
  };

  const resetFouls = () => {
    onUpdate({ home_fouls: 0, away_fouls: 0 });
  };

  return (
    <div className="space-y-4">
      {/* Quick Score Buttons */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-400 mb-3">QUICK SCORE</h3>
        
        {/* Home Team Scoring */}
        <div className="mb-4">
          <div className="text-sm font-bold text-blue-400 mb-2 truncate">{game.home_team}</div>
          <div className="grid grid-cols-4 gap-2">
            <Button
              onClick={() => addPoints('home', 1)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              +1
            </Button>
            <Button
              onClick={() => addPoints('home', 2)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              +2
            </Button>
            <Button
              onClick={() => addPoints('home', 3)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              +3
            </Button>
            <Button
              onClick={() => {
                const current = game.home_score;
                onUpdate({ home_score: Math.max(0, current - 1) });
              }}
              variant="outline"
              className="border-slate-600"
            >
              -1
            </Button>
          </div>
        </div>

        {/* Away Team Scoring */}
        <div>
          <div className="text-sm font-bold text-sky-400 mb-2 truncate">{game.away_team}</div>
          <div className="grid grid-cols-4 gap-2">
            <Button
              onClick={() => addPoints('away', 1)}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold"
            >
              +1
            </Button>
            <Button
              onClick={() => addPoints('away', 2)}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold"
            >
              +2
            </Button>
            <Button
              onClick={() => addPoints('away', 3)}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold"
            >
              +3
            </Button>
            <Button
              onClick={() => {
                const current = game.away_score;
                onUpdate({ away_score: Math.max(0, current - 1) });
              }}
              variant="outline"
              className="border-slate-600"
            >
              -1
            </Button>
          </div>
        </div>
      </div>

      {/* Team Fouls */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-400">TEAM FOULS</h3>
          <Button
            onClick={resetFouls}
            variant="ghost"
            size="sm"
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            Reset
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Home Fouls */}
          <div className="text-center">
            <div className="text-xs text-blue-400 font-medium mb-2 truncate">{game.home_team}</div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Button
                onClick={() => adjustFouls('home', -1)}
                size="sm"
                variant="outline"
                disabled={homeFouls === 0}
                className="h-8 w-8 p-0"
              >
                <Minus className="w-3 h-3" />
              </Button>
              <div className="text-2xl font-bold text-white w-10 text-center">
                {homeFouls}
              </div>
              <Button
                onClick={() => adjustFouls('home', 1)}
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            {awayBonus !== 'none' && (
              <div className={`text-xs font-bold px-2 py-1 rounded ${
                awayBonus === 'double' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {awayBonus === 'double' ? 'DOUBLE BONUS' : 'BONUS'}
              </div>
            )}
          </div>

          {/* Away Fouls */}
          <div className="text-center">
            <div className="text-xs text-sky-400 font-medium mb-2 truncate">{game.away_team}</div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Button
                onClick={() => adjustFouls('away', -1)}
                size="sm"
                variant="outline"
                disabled={awayFouls === 0}
                className="h-8 w-8 p-0"
              >
                <Minus className="w-3 h-3" />
              </Button>
              <div className="text-2xl font-bold text-white w-10 text-center">
                {awayFouls}
              </div>
              <Button
                onClick={() => adjustFouls('away', 1)}
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            {homeBonus !== 'none' && (
              <div className={`text-xs font-bold px-2 py-1 rounded ${
                homeBonus === 'double' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {homeBonus === 'double' ? 'DOUBLE BONUS' : 'BONUS'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
