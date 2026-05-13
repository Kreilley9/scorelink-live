import { Game } from "@/shared/types";

interface BasketballDisplayProps {
  game: Game;
  primaryColor?: string;
  secondaryColor?: string;
  textColor?: string;
}

export function BasketballDisplay({ game, primaryColor, secondaryColor, textColor }: BasketballDisplayProps) {
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

  const defaultPrimary = "#2563eb";
  const defaultSecondary = "#0ea5e9";
  const defaultText = "#ffffff";
  
  const primary = primaryColor || defaultPrimary;
  const secondary = secondaryColor || defaultSecondary;
  const text = textColor || defaultText;

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4 sm:p-6">
      {/* Team Fouls Header */}
      <div className="text-center mb-4">
        <div className="text-sm text-slate-400 mb-2">TEAM FOULS</div>
      </div>

      {/* Fouls Display */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Home Team Fouls */}
        <div className="text-center">
          <div 
            className="text-xs font-medium mb-1 truncate"
            style={{ color: primary }}
          >
            {game.home_team}
          </div>
          <div 
            className="text-3xl sm:text-4xl font-black"
            style={{ color: text }}
          >
            {homeFouls}
          </div>
          {awayBonus !== 'none' && (
            <div className={`mt-2 text-xs font-bold px-2 py-1 rounded inline-block ${
              awayBonus === 'double' 
                ? 'bg-red-500/30 text-red-300' 
                : 'bg-yellow-500/30 text-yellow-300'
            }`}>
              {awayBonus === 'double' ? 'DBL BONUS' : 'BONUS'}
            </div>
          )}
        </div>

        {/* Away Team Fouls */}
        <div className="text-center">
          <div 
            className="text-xs font-medium mb-1 truncate"
            style={{ color: secondary }}
          >
            {game.away_team}
          </div>
          <div 
            className="text-3xl sm:text-4xl font-black"
            style={{ color: text }}
          >
            {awayFouls}
          </div>
          {homeBonus !== 'none' && (
            <div className={`mt-2 text-xs font-bold px-2 py-1 rounded inline-block ${
              homeBonus === 'double' 
                ? 'bg-red-500/30 text-red-300' 
                : 'bg-yellow-500/30 text-yellow-300'
            }`}>
              {homeBonus === 'double' ? 'DBL BONUS' : 'BONUS'}
            </div>
          )}
        </div>
      </div>

      {/* Foul Indicator Bar */}
      <div className="mt-4 border-t border-slate-700 pt-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Home Foul Indicators */}
          <div>
            <div className="flex justify-center gap-1">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-4 rounded-sm transition-colors ${
                    i < homeFouls
                      ? i >= 9 ? 'bg-red-500' : i >= 6 ? 'bg-yellow-500' : 'bg-blue-500'
                      : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-1 px-1">
              <span>0</span>
              <span className="text-yellow-500">7</span>
              <span className="text-red-500">10</span>
            </div>
          </div>

          {/* Away Foul Indicators */}
          <div>
            <div className="flex justify-center gap-1">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-4 rounded-sm transition-colors ${
                    i < awayFouls
                      ? i >= 9 ? 'bg-red-500' : i >= 6 ? 'bg-yellow-500' : 'bg-sky-500'
                      : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-1 px-1">
              <span>0</span>
              <span className="text-yellow-500">7</span>
              <span className="text-red-500">10</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
