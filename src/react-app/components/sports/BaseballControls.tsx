import { Button } from "@/react-app/components/ui/button";
import { Plus, RotateCcw } from "lucide-react";
import { Game, UpdateGameState } from "@/shared/types";

interface BaseballControlsProps {
  game: Game;
  onUpdate: (updates: UpdateGameState) => void;
}

export function BaseballControls({ game, onUpdate }: BaseballControlsProps) {
  const balls = game.balls || 0;
  const strikes = game.strikes || 0;
  const outs = game.outs || 0;
  const inning = game.inning || 1;
  const pitchCount = game.pitch_count || 0;
  const isTopInning = game.half === 1;

  const addBall = () => {
    if (balls >= 3) {
      // Walk - reset count
      onUpdate({ balls: 0, strikes: 0, pitch_count: pitchCount + 1 });
    } else {
      onUpdate({ balls: balls + 1, pitch_count: pitchCount + 1 });
    }
  };

  const addStrike = () => {
    if (strikes >= 2) {
      // Strikeout - add out
      addOut();
    } else {
      onUpdate({ strikes: strikes + 1, pitch_count: pitchCount + 1 });
    }
  };

  const addOut = () => {
    if (outs >= 2) {
      // 3 outs - change sides
      changeSides();
    } else {
      onUpdate({ 
        outs: outs + 1, 
        balls: 0, 
        strikes: 0,
        pitch_count: pitchCount + 1 
      });
    }
  };

  const changeSides = () => {
    if (isTopInning) {
      // Top to bottom - same inning
      onUpdate({ 
        half: 2, 
        outs: 0, 
        balls: 0, 
        strikes: 0,
        pitch_count: 0 
      });
    } else {
      // Bottom to top - next inning
      onUpdate({ 
        half: 1, 
        inning: inning + 1, 
        outs: 0, 
        balls: 0, 
        strikes: 0,
        pitch_count: 0 
      });
    }
  };

  const resetCount = () => {
    onUpdate({ balls: 0, strikes: 0 });
  };

  const addRun = (team: 'home' | 'away') => {
    const scoreKey = team === 'home' ? 'home_score' : 'away_score';
    const currentScore = team === 'home' ? game.home_score : game.away_score;
    onUpdate({ [scoreKey]: currentScore + 1 });
  };

  return (
    <div className="space-y-4">
      {/* Inning Display */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <div className="text-center mb-2">
          <div className="text-sm text-slate-400">INNING</div>
          <div className="text-4xl font-bold text-white">
            {inning} <span className="text-lg text-slate-400">({isTopInning ? 'Top' : 'Bottom'})</span>
          </div>
        </div>
        <Button
          onClick={changeSides}
          variant="outline"
          size="sm"
          className="w-full"
        >
          Change Sides
        </Button>
      </div>

      {/* Balls, Strikes, Outs */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-400 mb-3">COUNT</h3>
        
        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* Balls */}
          <div className="text-center">
            <div className="text-xs text-green-400 font-medium mb-2">BALLS</div>
            <div className="text-4xl font-bold text-white mb-2">{balls}</div>
            <div className="flex gap-1 justify-center mb-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    i < balls ? 'bg-green-500' : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
            <Button
              onClick={addBall}
              size="sm"
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Strikes */}
          <div className="text-center">
            <div className="text-xs text-red-400 font-medium mb-2">STRIKES</div>
            <div className="text-4xl font-bold text-white mb-2">{strikes}</div>
            <div className="flex gap-1 justify-center mb-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    i < strikes ? 'bg-red-500' : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
            <Button
              onClick={addStrike}
              size="sm"
              className="w-full bg-red-600 hover:bg-red-700"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Outs */}
          <div className="text-center">
            <div className="text-xs text-yellow-400 font-medium mb-2">OUTS</div>
            <div className="text-4xl font-bold text-white mb-2">{outs}</div>
            <div className="flex gap-1 justify-center mb-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    i < outs ? 'bg-yellow-500' : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
            <Button
              onClick={addOut}
              size="sm"
              className="w-full bg-yellow-600 hover:bg-yellow-700"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Button
          onClick={resetCount}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Count
        </Button>
      </div>

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
              onClick={() => addRun('home')}
              size="sm"
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              +1 Run
            </Button>
          </div>

          {/* Away Team */}
          <div className="text-center">
            <div className="text-sm font-bold text-sky-400 mb-2 truncate">{game.away_team}</div>
            <div className="text-4xl font-bold text-white mb-2">
              {game.away_score}
            </div>
            <Button
              onClick={() => addRun('away')}
              size="sm"
              className="w-full bg-sky-600 hover:bg-sky-700"
            >
              +1 Run
            </Button>
          </div>
        </div>
      </div>

      {/* Pitch Count */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-400">PITCH COUNT</div>
          <div className="text-2xl font-bold text-white">{pitchCount}</div>
        </div>
      </div>
    </div>
  );
}
