import { Button } from "@/react-app/components/ui/button";
import { Plus, Minus } from "lucide-react";
import { Game, UpdateGameState } from "@/shared/types";

interface FootballControlsProps {
  game: Game;
  onUpdate: (updates: UpdateGameState) => void;
}

export function FootballControls({ game, onUpdate }: FootballControlsProps) {
  const down = game.down || 1;
  const yardsToGo = game.yards_to_go || 10;
  const ballOn = game.ball_on || 20;

  const nextDown = () => {
    if (down >= 4) {
      // Turnover on downs
      onUpdate({ down: 1, yards_to_go: 10 });
    } else {
      onUpdate({ down: down + 1 });
    }
  };

  const firstDown = () => {
    onUpdate({ down: 1, yards_to_go: 10 });
  };

  const touchdown = (team: 'home' | 'away') => {
    const scoreKey = team === 'home' ? 'home_score' : 'away_score';
    const currentScore = team === 'home' ? game.home_score : game.away_score;
    onUpdate({ 
      [scoreKey]: currentScore + 6,
      down: 1,
      yards_to_go: 10,
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Football Controls</h3>
        
        {/* Down */}
        <div className="mb-4">
          <label className="text-sm text-slate-400 mb-2 block">Down</label>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => onUpdate({ down: Math.max(1, down - 1) })}
              variant="outline"
              size="sm"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <div className="text-3xl font-bold text-white w-16 text-center">
              {down}
            </div>
            <Button
              onClick={nextDown}
              variant="outline"
              size="sm"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Yards to Go */}
        <div className="mb-4">
          <label className="text-sm text-slate-400 mb-2 block">Yards to Go</label>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => onUpdate({ yards_to_go: Math.max(1, yardsToGo - 1) })}
              variant="outline"
              size="sm"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <div className="text-3xl font-bold text-white w-16 text-center">
              {yardsToGo}
            </div>
            <Button
              onClick={() => onUpdate({ yards_to_go: yardsToGo + 1 })}
              variant="outline"
              size="sm"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Ball On */}
        <div className="mb-4">
          <label className="text-sm text-slate-400 mb-2 block">Ball On (Yard Line)</label>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => onUpdate({ ball_on: Math.max(1, ballOn - 5) })}
              variant="outline"
              size="sm"
            >
              -5
            </Button>
            <Button
              onClick={() => onUpdate({ ball_on: Math.max(1, ballOn - 1) })}
              variant="outline"
              size="sm"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <div className="text-3xl font-bold text-white w-20 text-center">
              {ballOn}
            </div>
            <Button
              onClick={() => onUpdate({ ball_on: Math.min(99, ballOn + 1) })}
              variant="outline"
              size="sm"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => onUpdate({ ball_on: Math.min(99, ballOn + 5) })}
              variant="outline"
              size="sm"
            >
              +5
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Button
            onClick={firstDown}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            First Down
          </Button>
          <Button
            onClick={() => onUpdate({ down: 1, yards_to_go: 10 })}
            variant="outline"
          >
            Turnover
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => touchdown('home')}
            className="bg-green-600 hover:bg-green-700"
          >
            {game.home_team} TD
          </Button>
          <Button
            onClick={() => touchdown('away')}
            className="bg-green-600 hover:bg-green-700"
          >
            {game.away_team} TD
          </Button>
        </div>
      </div>
    </div>
  );
}
