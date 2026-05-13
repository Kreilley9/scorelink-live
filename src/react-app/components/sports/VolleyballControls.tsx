import { Button } from "@/react-app/components/ui/button";
import { Trophy, Plus, Minus } from "lucide-react";
import { Game, UpdateGameState } from "@/shared/types";

interface VolleyballControlsProps {
  game: Game;
  onUpdate: (updates: UpdateGameState) => void;
}

export function VolleyballControls({ game, onUpdate }: VolleyballControlsProps) {
  const homeSets = game.home_sets_won || 0;
  const awaySets = game.away_sets_won || 0;
  const homeScore = game.home_score;
  const awayScore = game.away_score;

  const addPoint = (team: 'home' | 'away') => {
    const scoreKey = team === 'home' ? 'home_score' : 'away_score';
    const currentScore = team === 'home' ? homeScore : awayScore;
    onUpdate({ [scoreKey]: currentScore + 1 });
  };

  const removePoint = (team: 'home' | 'away') => {
    const scoreKey = team === 'home' ? 'home_score' : 'away_score';
    const currentScore = team === 'home' ? homeScore : awayScore;
    onUpdate({ [scoreKey]: Math.max(0, currentScore - 1) });
  };

  const addSet = (team: 'home' | 'away') => {
    const setsKey = team === 'home' ? 'home_sets_won' : 'away_sets_won';
    const currentSets = team === 'home' ? homeSets : awaySets;
    onUpdate({ [setsKey]: currentSets + 1 });
  };

  const removeSet = (team: 'home' | 'away') => {
    const setsKey = team === 'home' ? 'home_sets_won' : 'away_sets_won';
    const currentSets = team === 'home' ? homeSets : awaySets;
    onUpdate({ [setsKey]: Math.max(0, currentSets - 1) });
  };

  const resetSetScore = () => {
    onUpdate({ home_score: 0, away_score: 0 });
  };

  return (
    <div className="space-y-4">
      {/* Quick Score */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-400 mb-3">QUICK SCORE</h3>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Home Team */}
          <div className="text-center">
            <div className="text-sm font-bold text-blue-400 mb-2 truncate">{game.home_team}</div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Button
                onClick={() => removePoint('home')}
                size="sm"
                variant="outline"
                disabled={homeScore === 0}
                className="h-10 w-10 p-0"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <div className="text-4xl font-bold text-white w-16 text-center">
                {homeScore}
              </div>
              <Button
                onClick={() => addPoint('home')}
                size="sm"
                className="h-10 w-10 p-0 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Away Team */}
          <div className="text-center">
            <div className="text-sm font-bold text-sky-400 mb-2 truncate">{game.away_team}</div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Button
                onClick={() => removePoint('away')}
                size="sm"
                variant="outline"
                disabled={awayScore === 0}
                className="h-10 w-10 p-0"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <div className="text-4xl font-bold text-white w-16 text-center">
                {awayScore}
              </div>
              <Button
                onClick={() => addPoint('away')}
                size="sm"
                className="h-10 w-10 p-0 bg-sky-600 hover:bg-sky-700"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <Button
          onClick={resetSetScore}
          variant="outline"
          size="sm"
          className="w-full mt-3"
        >
          Reset Set Score
        </Button>
      </div>

      {/* Sets Won */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <h3 className="text-sm font-semibold text-slate-400">SETS WON</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Home Sets */}
          <div className="text-center">
            <div className="text-xs text-blue-400 font-medium mb-2 truncate">{game.home_team}</div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Button
                onClick={() => removeSet('home')}
                size="sm"
                variant="outline"
                disabled={homeSets === 0}
                className="h-8 w-8 p-0"
              >
                <Minus className="w-3 h-3" />
              </Button>
              <div className="text-3xl font-bold text-white w-10 text-center">
                {homeSets}
              </div>
              <Button
                onClick={() => addSet('home')}
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Away Sets */}
          <div className="text-center">
            <div className="text-xs text-sky-400 font-medium mb-2 truncate">{game.away_team}</div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Button
                onClick={() => removeSet('away')}
                size="sm"
                variant="outline"
                disabled={awaySets === 0}
                className="h-8 w-8 p-0"
              >
                <Minus className="w-3 h-3" />
              </Button>
              <div className="text-3xl font-bold text-white w-10 text-center">
                {awaySets}
              </div>
              <Button
                onClick={() => addSet('away')}
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
