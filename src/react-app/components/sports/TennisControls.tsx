import { Button } from "@/react-app/components/ui/button";
import { Game, UpdateGameState } from "@/shared/types";

interface TennisControlsProps {
  game: Game;
  onUpdate: (updates: UpdateGameState) => void;
}

export function TennisControls({ game, onUpdate }: TennisControlsProps) {
  const homePoints = game.home_score || 0;
  const awayPoints = game.away_score || 0;
  const homeGames = game.home_games_won || 0;
  const awayGames = game.away_games_won || 0;
  const homeSets = game.home_sets_won || 0;
  const awaySets = game.away_sets_won || 0;
  const currentServer = game.current_server || 'home';

  // Convert points to tennis score display
  const getPointDisplay = (points: number, oppPoints: number) => {
    if (points === 0) return '0';
    if (points === 1) return '15';
    if (points === 2) return '30';
    if (points === 3) {
      if (oppPoints < 3) return '40';
      if (oppPoints === 3) return '40';
      if (points === oppPoints) return '40';
      if (points > oppPoints) return 'AD';
    }
    if (points > 3) {
      if (points === oppPoints) return '40';
      if (points > oppPoints) return 'AD';
    }
    return '40';
  };

  const isDeuce = homePoints >= 3 && awayPoints >= 3 && homePoints === awayPoints;
  const hasAdvantage = homePoints >= 3 && awayPoints >= 3 && homePoints !== awayPoints;

  const addPoint = (team: 'home' | 'away') => {
    const newHomePoints = team === 'home' ? homePoints + 1 : homePoints;
    const newAwayPoints = team === 'away' ? awayPoints + 1 : awayPoints;

    // Check if game is won
    if (team === 'home') {
      if (newHomePoints >= 4 && newHomePoints - newAwayPoints >= 2) {
        // Home wins game
        winGame('home');
        return;
      }
    } else {
      if (newAwayPoints >= 4 && newAwayPoints - newHomePoints >= 2) {
        // Away wins game
        winGame('away');
        return;
      }
    }

    // Just add point
    onUpdate({
      home_score: newHomePoints,
      away_score: newAwayPoints,
    });
  };

  const winGame = (team: 'home' | 'away') => {
    const newHomeGames = team === 'home' ? homeGames + 1 : homeGames;
    const newAwayGames = team === 'away' ? awayGames + 1 : awayGames;

    // Check if set is won (need 6 games with 2-game lead, or 7-6)
    if (team === 'home') {
      if (newHomeGames >= 6 && newHomeGames - newAwayGames >= 2) {
        winSet('home');
        return;
      }
      if (newHomeGames === 7 && newAwayGames === 6) {
        winSet('home');
        return;
      }
    } else {
      if (newAwayGames >= 6 && newAwayGames - newHomeGames >= 2) {
        winSet('away');
        return;
      }
      if (newAwayGames === 7 && newHomeGames === 6) {
        winSet('away');
        return;
      }
    }

    // Reset points, increment games, switch server
    onUpdate({
      home_score: 0,
      away_score: 0,
      home_games_won: newHomeGames,
      away_games_won: newAwayGames,
      current_server: currentServer === 'home' ? 'away' : 'home',
    });
  };

  const winSet = (team: 'home' | 'away') => {
    const newHomeSets = team === 'home' ? homeSets + 1 : homeSets;
    const newAwaySets = team === 'away' ? awaySets + 1 : awaySets;

    // Reset games and points, increment sets
    onUpdate({
      home_score: 0,
      away_score: 0,
      home_games_won: 0,
      away_games_won: 0,
      home_sets_won: newHomeSets,
      away_sets_won: newAwaySets,
      current_server: currentServer === 'home' ? 'away' : 'home',
    });
  };

  const switchServer = () => {
    onUpdate({
      current_server: currentServer === 'home' ? 'away' : 'home',
    });
  };

  const resetGame = () => {
    onUpdate({
      home_score: 0,
      away_score: 0,
    });
  };

  return (
    <div className="space-y-4">
      {/* Match Score - Sets Won */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-400 mb-3 text-center">MATCH SCORE</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-sm font-bold text-blue-400 mb-2 truncate">{game.home_team}</div>
            <div className="text-5xl font-bold text-white">{homeSets}</div>
            <div className="text-xs text-slate-400 mt-1">Sets</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-sky-400 mb-2 truncate">{game.away_team}</div>
            <div className="text-5xl font-bold text-white">{awaySets}</div>
            <div className="text-xs text-slate-400 mt-1">Sets</div>
          </div>
        </div>
      </div>

      {/* Current Set - Games Won */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-400 mb-3 text-center">CURRENT SET</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-4xl font-bold text-white">{homeGames}</div>
            <div className="text-xs text-slate-400 mt-1">Games</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-white">{awayGames}</div>
            <div className="text-xs text-slate-400 mt-1">Games</div>
          </div>
        </div>
      </div>

      {/* Current Game - Points */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-400 mb-3 text-center">CURRENT GAME</h3>
        
        {/* Deuce/Advantage indicator */}
        {isDeuce && (
          <div className="text-center mb-3 text-yellow-400 font-bold">DEUCE</div>
        )}
        {hasAdvantage && (
          <div className="text-center mb-3 text-yellow-400 font-bold">
            ADVANTAGE: {homePoints > awayPoints ? game.home_team : game.away_team}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <div className="text-sm font-bold text-blue-400 mb-2 truncate">
              {game.home_team}
              {currentServer === 'home' && ' 🎾'}
            </div>
            <div className="text-5xl font-bold text-white mb-2">
              {getPointDisplay(homePoints, awayPoints)}
            </div>
            <Button
              onClick={() => addPoint('home')}
              size="sm"
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              + Point
            </Button>
          </div>

          <div className="text-center">
            <div className="text-sm font-bold text-sky-400 mb-2 truncate">
              {game.away_team}
              {currentServer === 'away' && ' 🎾'}
            </div>
            <div className="text-5xl font-bold text-white mb-2">
              {getPointDisplay(awayPoints, homePoints)}
            </div>
            <Button
              onClick={() => addPoint('away')}
              size="sm"
              className="w-full bg-sky-600 hover:bg-sky-700"
            >
              + Point
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={switchServer}
            variant="outline"
            size="sm"
          >
            Switch Server
          </Button>
          <Button
            onClick={resetGame}
            variant="outline"
            size="sm"
          >
            Reset Game
          </Button>
        </div>
      </div>

      {/* Manual Set Control */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-400 mb-3">MANUAL SET CONTROL</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => winSet('home')}
            variant="outline"
            size="sm"
            className="text-blue-400"
          >
            {game.home_team} Wins Set
          </Button>
          <Button
            onClick={() => winSet('away')}
            variant="outline"
            size="sm"
            className="text-sky-400"
          >
            {game.away_team} Wins Set
          </Button>
        </div>
      </div>
    </div>
  );
}
