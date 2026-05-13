import { Game } from "@/shared/types";

interface FootballDisplayProps {
  game: Game;
}

export function FootballDisplay({ game }: FootballDisplayProps) {
  const down = game.down || 1;
  const yardsToGo = game.yards_to_go || 10;
  const ballOn = game.ball_on || 20;

  const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
      {/* Down & Distance */}
      <div className="text-center mb-6">
        <div className="text-sm text-slate-400 mb-2">DOWN & DISTANCE</div>
        <div className="text-4xl font-black text-blue-400">
          {getOrdinal(down)} & {yardsToGo}
        </div>
      </div>

      {/* Ball Position */}
      <div className="text-center border-t border-slate-700 pt-4">
        <div className="text-sm text-slate-400 mb-2">BALL ON</div>
        <div className="text-3xl font-bold text-white">
          {ballOn} YD LINE
        </div>
      </div>

      {/* Field Visualization (optional) */}
      <div className="mt-4 border-t border-slate-700 pt-4">
        <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-400"
            style={{ width: `${(ballOn / 100) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>
    </div>
  );
}
