import { Button } from "@/react-app/components/ui/button";
import { Card } from "@/react-app/components/ui/card";
import { Plus, Minus } from "lucide-react";
import { Game, UpdateGameState } from "@/shared/types";

interface LacrosseControlsProps {
  game: Game;
  updateGameState: (updates: UpdateGameState) => void;
}

export function LacrosseControls({ game, updateGameState }: LacrosseControlsProps) {
  const homeFaceoffs = game.home_faceoffs || 0;
  const awayFaceoffs = game.away_faceoffs || 0;
  const homeGroundBalls = game.home_ground_balls || 0;
  const awayGroundBalls = game.away_ground_balls || 0;

  return (
    <div className="space-y-4">
      {/* Faceoffs */}
      <Card className="p-4 bg-slate-800/50 border-blue-600/30">
        <h3 className="text-lg font-semibold text-white mb-3">Faceoffs</h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Home Faceoffs */}
          <div className="space-y-2">
            <div className="text-sm text-blue-300 font-medium">{game.home_team}</div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-blue-300 hover:text-blue-200 hover:bg-blue-900/30"
                onClick={() => updateGameState({ home_faceoffs: Math.max(0, homeFaceoffs - 1) })}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="flex-1 text-center">
                <span className="text-2xl font-bold text-white">{homeFaceoffs}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-green-300 hover:text-green-200 hover:bg-green-900/30"
                onClick={() => updateGameState({ home_faceoffs: homeFaceoffs + 1 })}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Away Faceoffs */}
          <div className="space-y-2">
            <div className="text-sm text-blue-300 font-medium">{game.away_team}</div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-blue-300 hover:text-blue-200 hover:bg-blue-900/30"
                onClick={() => updateGameState({ away_faceoffs: Math.max(0, awayFaceoffs - 1) })}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="flex-1 text-center">
                <span className="text-2xl font-bold text-white">{awayFaceoffs}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-green-300 hover:text-green-200 hover:bg-green-900/30"
                onClick={() => updateGameState({ away_faceoffs: awayFaceoffs + 1 })}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Ground Balls */}
      <Card className="p-4 bg-slate-800/50 border-blue-600/30">
        <h3 className="text-lg font-semibold text-white mb-3">Ground Balls</h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Home Ground Balls */}
          <div className="space-y-2">
            <div className="text-sm text-blue-300 font-medium">{game.home_team}</div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-blue-300 hover:text-blue-200 hover:bg-blue-900/30"
                onClick={() => updateGameState({ home_ground_balls: Math.max(0, homeGroundBalls - 1) })}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="flex-1 text-center">
                <span className="text-2xl font-bold text-white">{homeGroundBalls}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-green-300 hover:text-green-200 hover:bg-green-900/30"
                onClick={() => updateGameState({ home_ground_balls: homeGroundBalls + 1 })}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Away Ground Balls */}
          <div className="space-y-2">
            <div className="text-sm text-blue-300 font-medium">{game.away_team}</div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-blue-300 hover:text-blue-200 hover:bg-blue-900/30"
                onClick={() => updateGameState({ away_ground_balls: Math.max(0, awayGroundBalls - 1) })}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="flex-1 text-center">
                <span className="text-2xl font-bold text-white">{awayGroundBalls}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-green-300 hover:text-green-200 hover:bg-green-900/30"
                onClick={() => updateGameState({ away_ground_balls: awayGroundBalls + 1 })}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
