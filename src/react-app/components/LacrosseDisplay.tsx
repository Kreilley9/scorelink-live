import { Game } from "@/shared/types";

interface LacrosseDisplayProps {
  game: Game;
  primaryColor?: string;
  textColor?: string;
  isMobile?: boolean;
}

export function LacrosseDisplay({ game, primaryColor = "#2563EB", textColor = "#FFFFFF", isMobile = false }: LacrosseDisplayProps) {
  const homeFaceoffs = game.home_faceoffs || 0;
  const awayFaceoffs = game.away_faceoffs || 0;
  const homeGroundBalls = game.home_ground_balls || 0;
  const awayGroundBalls = game.away_ground_balls || 0;

  const statSize = isMobile ? "text-lg" : "text-2xl";
  const labelSize = isMobile ? "text-xs" : "text-sm";

  return (
    <div className="w-full space-y-3">
      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Faceoffs */}
        <div className="text-center">
          <div className={`${labelSize} font-medium uppercase tracking-wide`} style={{ color: textColor }}>
            Faceoffs
          </div>
          <div className={`${statSize} font-bold flex justify-center gap-4 mt-1`} style={{ color: textColor }}>
            <span>{homeFaceoffs}</span>
            <span style={{ color: primaryColor }}>-</span>
            <span>{awayFaceoffs}</span>
          </div>
        </div>

        {/* Ground Balls */}
        <div className="text-center">
          <div className={`${labelSize} font-medium uppercase tracking-wide`} style={{ color: textColor }}>
            Ground Balls
          </div>
          <div className={`${statSize} font-bold flex justify-center gap-4 mt-1`} style={{ color: textColor }}>
            <span>{homeGroundBalls}</span>
            <span style={{ color: primaryColor }}>-</span>
            <span>{awayGroundBalls}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
