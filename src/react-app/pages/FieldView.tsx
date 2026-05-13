import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Button } from "@/react-app/components/ui/button";
import { MapPin, Calendar, Clock } from "lucide-react";

interface Game {
  id: number;
  game_code: string;
  home_team: string;
  away_team: string;
  scheduled_date?: string;
  scheduled_time?: string;
  status: string;
  field_location?: string;
  field_id?: number;
}

interface Field {
  id: number;
  name: string;
}

export default function FieldView() {
  const { fieldId } = useParams<{ fieldId: string }>();
  const navigate = useNavigate();
  const [field, setField] = useState<Field | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFieldGames();
  }, [fieldId]);

  const fetchFieldGames = async () => {
    try {
      const [gamesRes, fieldsRes] = await Promise.all([
        fetch("/api/games/all"),
        fetch("/api/fields"),
      ]);

      if (gamesRes.ok) {
        const allGames = await gamesRes.json();
        const filtered = allGames.filter((g: Game) => g.field_id === Number(fieldId));
        setGames(filtered);
      }

      if (fieldsRes.ok) {
        const fieldsData = await fieldsRes.json();
        const foundField = fieldsData.fields?.find((f: Field) => f.id === Number(fieldId));
        setField(foundField || null);
      }
    } catch (error) {
      console.error("Failed to fetch field data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGameClick = (gameCode: string) => {
    navigate(`/game/${gameCode}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!field) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Field not found</p>
          <Button onClick={() => navigate("/")} variant="outline">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const activeGames = games.filter((g) => g.status === "active" || g.status === "live");
  const scheduledGames = games.filter((g) => g.status === "scheduled");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent" />
      
      <div className="relative z-10 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <MapPin className="w-8 h-8 text-blue-400" />
              <h1 className="text-4xl font-bold text-white">{field.name}</h1>
            </div>
            <p className="text-slate-400">Select a game to view the live scoreboard</p>
          </div>

          {/* Active Games */}
          {activeGames.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                Live Now
              </h2>
              <div className="grid gap-4">
                {activeGames.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => handleGameClick(game.game_code)}
                    className="bg-slate-900/60 backdrop-blur-sm rounded-xl border border-slate-800 p-6 hover:border-blue-500 hover:bg-slate-800/60 transition-all text-left w-full group"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="text-2xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                          {game.home_team}
                          <span className="mx-4 text-slate-500">vs</span>
                          {game.away_team}
                        </div>
                        <div className="text-sm text-slate-400">
                          Game Code: <span className="font-mono text-blue-400">{game.game_code}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        LIVE
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Scheduled Games */}
          {scheduledGames.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-blue-400" />
                Scheduled Games
              </h2>
              <div className="grid gap-3">
                {scheduledGames.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => handleGameClick(game.game_code)}
                    className="bg-slate-900/60 backdrop-blur-sm rounded-xl border border-slate-800 p-4 hover:border-blue-500 hover:bg-slate-800/60 transition-all text-left w-full group"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        {game.scheduled_time && (
                          <div className="flex items-center gap-2 text-blue-400 min-w-[80px]">
                            <Clock className="w-4 h-4" />
                            <span className="font-medium">{game.scheduled_time}</span>
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                            {game.home_team}
                            <span className="mx-3 text-slate-500">vs</span>
                            {game.away_team}
                          </div>
                          {game.scheduled_date && (
                            <div className="text-sm text-slate-500 mt-1">
                              {new Date(game.scheduled_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-slate-700/50 text-slate-400 rounded text-sm">
                        Scheduled
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No Games */}
          {games.length === 0 && (
            <div className="bg-slate-900/60 backdrop-blur-sm rounded-xl border border-slate-800 p-12 text-center">
              <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg mb-2">No games scheduled for this field</p>
              <p className="text-slate-500 text-sm">Check back later for updates</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 text-center">
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
