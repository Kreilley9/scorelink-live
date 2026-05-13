import { Game } from "@/shared/types";

interface BaseballDisplayProps {
  game: Game;
  primaryColor?: string;
  secondaryColor?: string;
  textColor?: string;
}

export function BaseballDisplay({ game, textColor }: BaseballDisplayProps) {
  const balls = game.balls || 0;
  const strikes = game.strikes || 0;
  const outs = game.outs || 0;
  const inning = game.inning || 1;
  const pitchCount = game.pitch_count || 0;
  const isTopInning = game.half === 1;

  const defaultText = "#ffffff";
  
  const text = textColor || defaultText;

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4 sm:p-6">
      {/* Inning */}
      <div className="text-center mb-6">
        <div className="text-sm text-slate-400 mb-2">INNING</div>
        <div className="text-4xl sm:text-5xl font-black" style={{ color: text }}>
          {inning}
        </div>
        <div className="text-lg text-slate-400 mt-1">
          {isTopInning ? '▲ Top' : '▼ Bottom'}
        </div>
      </div>

      {/* Count Display */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Balls */}
        <div className="text-center">
          <div className="text-xs font-medium text-green-400 mb-2">BALLS</div>
          <div className="text-3xl sm:text-4xl font-black text-white mb-2">
            {balls}
          </div>
          <div className="flex gap-1 justify-center">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-colors ${
                  i < balls ? 'bg-green-500' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Strikes */}
        <div className="text-center">
          <div className="text-xs font-medium text-red-400 mb-2">STRIKES</div>
          <div className="text-3xl sm:text-4xl font-black text-white mb-2">
            {strikes}
          </div>
          <div className="flex gap-1 justify-center">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-colors ${
                  i < strikes ? 'bg-red-500' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Outs */}
        <div className="text-center">
          <div className="text-xs font-medium text-yellow-400 mb-2">OUTS</div>
          <div className="text-3xl sm:text-4xl font-black text-white mb-2">
            {outs}
          </div>
          <div className="flex gap-1 justify-center">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-colors ${
                  i < outs ? 'bg-yellow-500' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Pitch Count */}
      {pitchCount > 0 && (
        <div className="border-t border-slate-700 pt-4 text-center">
          <div className="text-xs text-slate-400 mb-1">PITCH COUNT</div>
          <div className="text-2xl font-bold text-white">{pitchCount}</div>
        </div>
      )}
    </div>
  );
}
