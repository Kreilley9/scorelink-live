import { Button } from "@/react-app/components/ui/button";
import { Clock, Trophy } from "lucide-react";
import { Game, UpdateGameState } from "@/shared/types";

interface SoccerControlsProps {
  game: Game;
  onUpdate: (updates: UpdateGameState) => void;
}

export function SoccerControls({ game, onUpdate }: SoccerControlsProps) {
  const stoppageTime = game.stoppage_time || 0;
  const isStoppageTime = game.is_stoppage_time || 0;
  const isShootoutMode = game.is_shootout_mode || 0;
  const homePKs = game.home_penalty_kicks || 0;
  const awayPKs = game.away_penalty_kicks || 0;

  const setStoppageTime = (minutes: number) => {
    onUpdate({ stoppage_time: minutes * 60 });
  };

  const toggleStoppageTime = () => {
    onUpdate({ is_stoppage_time: isStoppageTime ? 0 : 1 });
  };

  const toggleShootoutMode = () => {
    onUpdate({ 
      is_shootout_mode: isShootoutMode ? 0 : 1,
      // Reset penalty kicks when exiting shootout mode
      ...(isShootoutMode ? { home_penalty_kicks: 0, away_penalty_kicks: 0 } : {})
    });
  };

  const addPenaltyKick = (team: 'home' | 'away') => {
    const key = team === 'home' ? 'home_penalty_kicks' : 'away_penalty_kicks';
    const current = team === 'home' ? homePKs : awayPKs;
    onUpdate({ [key]: current + 1 });
  };

  const removePenaltyKick = (team: 'home' | 'away') => {
    const key = team === 'home' ? 'home_penalty_kicks' : 'away_penalty_kicks';
    const current = team === 'home' ? homePKs : awayPKs;
    onUpdate({ [key]: Math.max(0, current - 1) });
  };

  return (
    <div className="space-y-4">
      {/* Stoppage Time */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-orange-400" />
          <h3 className="text-sm font-semibold text-slate-400">STOPPAGE TIME</h3>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-3">
          {[1, 2, 3, 4, 5, 6].map((mins) => (
            <Button
              key={mins}
              onClick={() => setStoppageTime(mins)}
              size="sm"
              variant={stoppageTime === mins * 60 ? "default" : "outline"}
              className={stoppageTime === mins * 60 ? "bg-orange-600 hover:bg-orange-700" : ""}
            >
              +{mins}
            </Button>
          ))}
        </div>
        
        <Button
          onClick={toggleStoppageTime}
          className={`w-full ${isStoppageTime ? 'bg-orange-600 hover:bg-orange-700' : 'bg-slate-700 hover:bg-slate-600'}`}
        >
          {isStoppageTime ? 'EXIT Stoppage Time' : 'ENTER Stoppage Time'}
        </Button>
        
        {stoppageTime > 0 && (
          <div className="text-center mt-2 text-orange-400 font-semibold">
            +{Math.floor(stoppageTime / 60)} min added
          </div>
        )}
      </div>

      {/* Shootout / Penalty Kicks */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <h3 className="text-sm font-semibold text-slate-400">PENALTY KICKS / SHOOTOUT</h3>
        </div>
        
        <Button
          onClick={toggleShootoutMode}
          className={`w-full mb-4 ${isShootoutMode ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-slate-700 hover:bg-slate-600'}`}
        >
          {isShootoutMode ? 'EXIT Shootout Mode' : 'ENTER Shootout Mode'}
        </Button>
        
        {isShootoutMode === 1 && (
          <div className="grid grid-cols-2 gap-4">
            {/* Home PKs */}
            <div className="text-center">
              <div className="text-xs text-blue-400 font-medium mb-2 truncate">{game.home_team}</div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="text-3xl font-bold text-white mb-2">{homePKs}</div>
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={() => addPenaltyKick('home')}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    MADE
                  </Button>
                  <Button
                    onClick={() => removePenaltyKick('home')}
                    size="sm"
                    variant="outline"
                    disabled={homePKs === 0}
                  >
                    Undo
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Away PKs */}
            <div className="text-center">
              <div className="text-xs text-sky-400 font-medium mb-2 truncate">{game.away_team}</div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="text-3xl font-bold text-white mb-2">{awayPKs}</div>
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={() => addPenaltyKick('away')}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    MADE
                  </Button>
                  <Button
                    onClick={() => removePenaltyKick('away')}
                    size="sm"
                    variant="outline"
                    disabled={awayPKs === 0}
                  >
                    Undo
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
