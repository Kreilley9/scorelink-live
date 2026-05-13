import { Button } from "@/react-app/components/ui/button";
import { Plus, Minus, Trophy } from "lucide-react";
import { Game, UpdateGameState } from "@/shared/types";

interface FieldHockeyControlsProps {
  game: Game;
  onUpdate: (updates: UpdateGameState) => void;
}

export function FieldHockeyControls({ game, onUpdate }: FieldHockeyControlsProps) {
  const homeGreenCards = game.home_green_cards || 0;
  const awayGreenCards = game.away_green_cards || 0;
  const homeYellowCards = game.home_yellow_cards || 0;
  const awayYellowCards = game.away_yellow_cards || 0;
  const homeRedCards = game.home_red_cards || 0;
  const awayRedCards = game.away_red_cards || 0;
  const homePenaltyCorners = game.home_penalty_corners || 0;
  const awayPenaltyCorners = game.away_penalty_corners || 0;
  const homeShots = game.home_shots || 0;
  const awayShots = game.away_shots || 0;
  const isShootoutMode = game.is_shootout_mode || 0;
  const homePKs = game.home_penalty_kicks || 0;
  const awayPKs = game.away_penalty_kicks || 0;

  const addCard = (team: 'home' | 'away', cardType: 'green' | 'yellow' | 'red') => {
    const key = `${team}_${cardType}_cards` as keyof UpdateGameState;
    const current = cardType === 'green' 
      ? (team === 'home' ? homeGreenCards : awayGreenCards)
      : cardType === 'yellow'
      ? (team === 'home' ? homeYellowCards : awayYellowCards)
      : (team === 'home' ? homeRedCards : awayRedCards);
    onUpdate({ [key]: current + 1 });
  };

  const removeCard = (team: 'home' | 'away', cardType: 'green' | 'yellow' | 'red') => {
    const key = `${team}_${cardType}_cards` as keyof UpdateGameState;
    const current = cardType === 'green' 
      ? (team === 'home' ? homeGreenCards : awayGreenCards)
      : cardType === 'yellow'
      ? (team === 'home' ? homeYellowCards : awayYellowCards)
      : (team === 'home' ? homeRedCards : awayRedCards);
    if (current > 0) {
      onUpdate({ [key]: current - 1 });
    }
  };

  const addPenaltyCorner = (team: 'home' | 'away') => {
    const key = team === 'home' ? 'home_penalty_corners' : 'away_penalty_corners';
    const current = team === 'home' ? homePenaltyCorners : awayPenaltyCorners;
    onUpdate({ [key]: current + 1 });
  };

  const removePenaltyCorner = (team: 'home' | 'away') => {
    const key = team === 'home' ? 'home_penalty_corners' : 'away_penalty_corners';
    const current = team === 'home' ? homePenaltyCorners : awayPenaltyCorners;
    if (current > 0) {
      onUpdate({ [key]: current - 1 });
    }
  };

  const addShot = (team: 'home' | 'away') => {
    const key = team === 'home' ? 'home_shots' : 'away_shots';
    const current = team === 'home' ? homeShots : awayShots;
    onUpdate({ [key]: current + 1 });
  };

  const removeShot = (team: 'home' | 'away') => {
    const key = team === 'home' ? 'home_shots' : 'away_shots';
    const current = team === 'home' ? homeShots : awayShots;
    if (current > 0) {
      onUpdate({ [key]: current - 1 });
    }
  };

  const toggleShootoutMode = () => {
    onUpdate({ 
      is_shootout_mode: isShootoutMode ? 0 : 1,
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
    if (current > 0) {
      onUpdate({ [key]: current - 1 });
    }
  };

  return (
    <div className="space-y-4">
      {/* Penalty Corners */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-400 mb-3">PENALTY CORNERS</h3>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Home Penalty Corners */}
          <div className="text-center">
            <div className="text-sm font-bold text-blue-400 mb-2 truncate">{game.home_team}</div>
            <div className="text-3xl font-bold text-white mb-2">
              {homePenaltyCorners}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => removePenaltyCorner('home')}
                size="sm"
                variant="outline"
                className="flex-1"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => addPenaltyCorner('home')}
                size="sm"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Away Penalty Corners */}
          <div className="text-center">
            <div className="text-sm font-bold text-sky-400 mb-2 truncate">{game.away_team}</div>
            <div className="text-3xl font-bold text-white mb-2">
              {awayPenaltyCorners}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => removePenaltyCorner('away')}
                size="sm"
                variant="outline"
                className="flex-1"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => addPenaltyCorner('away')}
                size="sm"
                className="flex-1 bg-sky-600 hover:bg-sky-700"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Shots */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-400 mb-3">SHOTS</h3>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Home Shots */}
          <div className="text-center">
            <div className="text-sm font-bold text-blue-400 mb-2 truncate">{game.home_team}</div>
            <div className="text-3xl font-bold text-white mb-2">
              {homeShots}
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
              {awayShots}
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

      {/* Cards */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-400 mb-3">CARDS</h3>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Home Cards */}
          <div>
            <div className="text-sm font-bold text-blue-400 mb-3 truncate text-center">{game.home_team}</div>
            
            {/* Green Cards */}
            <div className="flex items-center justify-between mb-2 bg-slate-900/50 rounded p-2">
              <span className="text-xs text-green-400 font-medium">Green (2 min)</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white w-6 text-center">{homeGreenCards}</span>
                <div className="flex gap-1">
                  <Button
                    onClick={() => removeCard('home', 'green')}
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0"
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <Button
                    onClick={() => addCard('home', 'green')}
                    size="sm"
                    className="h-7 w-7 p-0 bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Yellow Cards */}
            <div className="flex items-center justify-between mb-2 bg-slate-900/50 rounded p-2">
              <span className="text-xs text-yellow-400 font-medium">Yellow (5-10 min)</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white w-6 text-center">{homeYellowCards}</span>
                <div className="flex gap-1">
                  <Button
                    onClick={() => removeCard('home', 'yellow')}
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0"
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <Button
                    onClick={() => addCard('home', 'yellow')}
                    size="sm"
                    className="h-7 w-7 p-0 bg-yellow-600 hover:bg-yellow-700"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Red Cards */}
            <div className="flex items-center justify-between bg-slate-900/50 rounded p-2">
              <span className="text-xs text-red-400 font-medium">Red (Ejection)</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white w-6 text-center">{homeRedCards}</span>
                <div className="flex gap-1">
                  <Button
                    onClick={() => removeCard('home', 'red')}
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0"
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <Button
                    onClick={() => addCard('home', 'red')}
                    size="sm"
                    className="h-7 w-7 p-0 bg-red-600 hover:bg-red-700"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Away Cards */}
          <div>
            <div className="text-sm font-bold text-sky-400 mb-3 truncate text-center">{game.away_team}</div>
            
            {/* Green Cards */}
            <div className="flex items-center justify-between mb-2 bg-slate-900/50 rounded p-2">
              <span className="text-xs text-green-400 font-medium">Green</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white w-6 text-center">{awayGreenCards}</span>
                <div className="flex gap-1">
                  <Button
                    onClick={() => removeCard('away', 'green')}
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0"
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <Button
                    onClick={() => addCard('away', 'green')}
                    size="sm"
                    className="h-7 w-7 p-0 bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Yellow Cards */}
            <div className="flex items-center justify-between mb-2 bg-slate-900/50 rounded p-2">
              <span className="text-xs text-yellow-400 font-medium">Yellow</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white w-6 text-center">{awayYellowCards}</span>
                <div className="flex gap-1">
                  <Button
                    onClick={() => removeCard('away', 'yellow')}
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0"
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <Button
                    onClick={() => addCard('away', 'yellow')}
                    size="sm"
                    className="h-7 w-7 p-0 bg-yellow-600 hover:bg-yellow-700"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Red Cards */}
            <div className="flex items-center justify-between bg-slate-900/50 rounded p-2">
              <span className="text-xs text-red-400 font-medium">Red</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white w-6 text-center">{awayRedCards}</span>
                <div className="flex gap-1">
                  <Button
                    onClick={() => removeCard('away', 'red')}
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0"
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <Button
                    onClick={() => addCard('away', 'red')}
                    size="sm"
                    className="h-7 w-7 p-0 bg-red-600 hover:bg-red-700"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shootout */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <h3 className="text-sm font-semibold text-slate-400">PENALTY SHOOTOUT</h3>
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
