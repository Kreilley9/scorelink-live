import { Game } from "@/shared/types";

interface TennisDisplayProps {
  game: Game;
  primaryColor?: string;
  secondaryColor?: string;
  textColor?: string;
}

export function TennisDisplay({ game }: TennisDisplayProps) {
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

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4 sm:p-6">
      {/* Sets Won */}
      <div className="mb-6">
        <div className="text-center text-xs text-slate-400 mb-2">SETS</div>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-sm font-bold text-blue-400 mb-1 truncate">{game.home_team}</div>
            <div className="text-4xl sm:text-5xl font-black text-white">{homeSets}</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-sky-400 mb-1 truncate">{game.away_team}</div>
            <div className="text-4xl sm:text-5xl font-black text-white">{awaySets}</div>
          </div>
        </div>
      </div>

      {/* Games in Current Set */}
      <div className="border-t border-slate-700 pt-4 mb-6">
        <div className="text-center text-xs text-slate-400 mb-2">GAMES (CURRENT SET)</div>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-black text-white">{homeGames}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-black text-white">{awayGames}</div>
          </div>
        </div>
      </div>

      {/* Current Game Points */}
      <div className="border-t border-slate-700 pt-4">
        <div className="text-center text-xs text-slate-400 mb-2">CURRENT GAME</div>
        
        {/* Deuce/Advantage indicator */}
        {isDeuce && (
          <div className="text-center mb-2 text-yellow-400 font-bold text-sm">DEUCE</div>
        )}
        {hasAdvantage && (
          <div className="text-center mb-2 text-yellow-400 font-bold text-sm">
            ADVANTAGE
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-xs font-bold text-blue-400 mb-1">
              {currentServer === 'home' && '🎾 '}
              {game.home_team}
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white">
              {getPointDisplay(homePoints, awayPoints)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold text-sky-400 mb-1">
              {currentServer === 'away' && '🎾 '}
              {game.away_team}
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white">
              {getPointDisplay(awayPoints, homePoints)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
