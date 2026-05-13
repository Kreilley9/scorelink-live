import { useAuth } from "@getmocha/users-service/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/react-app/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/react-app/components/ui/table";
import { 
  ArrowLeft, 
  QrCode, 
  ExternalLink, 
  Play, 
  Pause, 
  Search, 
  Monitor,
  Trophy,
  Calendar,
  MapPin,
  Activity,
  TrendingUp,
  Link2,
  Copy,
  AlertTriangle,
} from "lucide-react";
import GameQRCode from "@/react-app/components/GameQRCode";
import { useCurrentUser } from "@/react-app/hooks/useCurrentUser";
import { useSportAccount } from "@/react-app/hooks/useSportAccount";
import { getSportIcon, SportIcon } from "@/react-app/utils/sportIcons";
import { Alert, AlertDescription } from "@/react-app/components/ui/alert";

interface Game {
  id: number;
  game_code: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  time_remaining: number;
  half: number;
  is_running: boolean;
  status: string;
  scheduled_date?: string;
  scheduled_time?: string;
  field_location?: string;
  created_at: string;
}

interface CompletedGame {
  id: number;
  game_code: string;
  sport_type: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  field_location: string;
  field_id: number;
  scheduled_date: string;
  scheduled_time: string;
  division: string;
  created_at: string;
  updated_at: string;
}

interface Field {
  id: number;
  name: string;
  location?: string;
}

interface CurrentUser {
  id: string;
  email: string;
  role: string;
}

export default function GamesOverview() {
  const { user, isPending, redirectToLogin } = useAuth();
  const navigate = useNavigate();
  const { hasFeature } = useCurrentUser();
  const { activeSportAccount } = useSportAccount();
  const [activeTab, setActiveTab] = useState<"live" | "completed">("live");
  
  // Live games state
  const [liveGames, setLiveGames] = useState<Game[]>([]);
  const [filteredLiveGames, setFilteredLiveGames] = useState<Game[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [qrCodeGame, setQrCodeGame] = useState<Game | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  
  // Completed games state
  const [completedGames, setCompletedGames] = useState<CompletedGame[]>([]);
  const [filteredCompletedGames, setFilteredCompletedGames] = useState<CompletedGame[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [fieldFilter, setFieldFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [linkShareGame, setLinkShareGame] = useState<Game | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/users/me");
        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data);
          
          if (data.role !== "admin" && data.role !== "referee") {
            navigate("/");
          }
        }
      } catch (error) {
        console.error("Failed to fetch current user:", error);
      }
    };

    if (user) {
      fetchCurrentUser();
    }
  }, [user, navigate]);

  // Fetch live games
  useEffect(() => {
    if (activeTab === "live" && currentUser) {
      fetchLiveGames();
      const interval = setInterval(fetchLiveGames, 3000);
      return () => clearInterval(interval);
    }
  }, [activeTab, currentUser]);

  // Fetch completed games
  useEffect(() => {
    if (activeTab === "completed" && activeSportAccount) {
      fetchCompletedGames();
    }
  }, [activeTab, activeSportAccount]);

  // Filter live games
  useEffect(() => {
    let filtered = liveGames;

    if (searchQuery) {
      filtered = filtered.filter(
        (game) =>
          game.game_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          game.home_team.toLowerCase().includes(searchQuery.toLowerCase()) ||
          game.away_team.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((game) => game.status === statusFilter);
    }

    setFilteredLiveGames(filtered);
  }, [liveGames, searchQuery, statusFilter]);

  // Filter completed games
  useEffect(() => {
    let filtered = completedGames;
    if (fieldFilter !== "all") {
      filtered = filtered.filter((game) => game.field_id === Number(fieldFilter));
    }
    if (locationFilter !== "all") {
      const locationFields = fields.filter(f => f.location === locationFilter).map(f => f.id);
      filtered = filtered.filter((game) => game.field_id && locationFields.includes(game.field_id));
    }
    if (dateFilter !== "all") {
      filtered = filtered.filter((game) => game.scheduled_date === dateFilter);
    }
    setFilteredCompletedGames(filtered);
  }, [completedGames, fieldFilter, locationFilter, dateFilter, fields]);

  const fetchLiveGames = async () => {
    if (!currentUser) return;

    try {
      const response = await fetch("/api/games/all");
      if (response.ok) {
        const data = await response.json();
        setLiveGames(data);
      }
    } catch (error) {
      console.error("Failed to fetch games:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletedGames = async () => {
    if (!activeSportAccount) return;
    
    try {
      const sportAccountParam = `sport_account_id=${activeSportAccount.id}`;
      const [gamesRes, fieldsRes] = await Promise.all([
        fetch(`/api/games/completed?${sportAccountParam}`),
        fetch(`/api/fields?${sportAccountParam}`),
      ]);
      
      if (gamesRes.ok) {
        const data = await gamesRes.json();
        setCompletedGames(data);
      }
      
      if (fieldsRes.ok) {
        const fieldsData = await fieldsRes.json();
        setFields(fieldsData.fields || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleLargeDisplay = (gameCode: string) => {
    if (hasFeature("large_display_mode")) {
      window.open(`/game/${gameCode}/large`, "_blank");
    } else {
      setShowUpgradeDialog(true);
    }
  };

  const handleShareLink = (game: Game) => {
    setLinkShareGame(game);
    setCopySuccess(false);
  };

  const copyRefereeLink = () => {
    if (!linkShareGame) return;
    const link = `${window.location.origin}/referee/${linkShareGame.game_code}`;
    navigator.clipboard.writeText(link);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const getWinner = (game: CompletedGame) => {
    if (game.home_score > game.away_score) {
      return { team: game.home_team, score: `${game.home_score}-${game.away_score}` };
    } else if (game.away_score > game.home_score) {
      return { team: game.away_team, score: `${game.away_score}-${game.home_score}` };
    } else {
      return { team: "Tie", score: `${game.home_score}-${game.away_score}` };
    }
  };

  // Calculate statistics for completed games
  const totalGames = filteredCompletedGames.length;
  const uniqueFields = new Set(filteredCompletedGames.map(g => g.field_id)).size;
  const uniqueLocations = new Set(fields.filter(f => filteredCompletedGames.some(g => g.field_id === f.id) && f.location).map(f => f.location)).size;
  const totalDays = new Set(filteredCompletedGames.map(g => g.scheduled_date)).size;

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">Sign in required</h1>
          <p className="text-slate-400">You need to sign in to access this page</p>
          <Button onClick={redirectToLogin}>Sign in with Google</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Button
            onClick={() => navigate("/dashboard")}
            variant="outline"
            className="mb-6 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>

          <h1 className="text-4xl font-black text-white mb-2">
            Games Management
          </h1>
          <p className="text-slate-400">
            Monitor live games and view completed game results
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-slate-800">
          <button
            onClick={() => setActiveTab("live")}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === "live"
                ? "text-primary border-b-2 border-primary"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              Live Games
            </div>
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === "completed"
                ? "text-primary border-b-2 border-primary"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Completed Games
            </div>
          </button>
        </div>

        {/* Live Games Tab */}
        {activeTab === "live" && (
          <>
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by game code or team name..."
                  className="pl-10 bg-slate-800/50 border-slate-700"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-md text-white"
              >
                <option value="all">All Games</option>
                <option value="scheduled">Scheduled</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {filteredLiveGames.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-block p-6 bg-slate-800/30 rounded-full mb-4">
                  <QrCode className="w-12 h-12 text-slate-600" />
                </div>
                <p className="text-slate-400 text-lg">No games found</p>
                <p className="text-slate-500 text-sm mt-2">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Create a new game to get started"}
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredLiveGames.map((game) => (
                  <div
                    key={game.id}
                    className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6 space-y-4"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          {(() => {
                            const SportIcon = getSportIcon(activeSportAccount?.sport_type || 'flag_football');
                            return <SportIcon className="w-5 h-5 text-primary" />;
                          })()}
                          <span
                            className="text-2xl font-black text-primary"
                            style={{ fontFamily: "monospace" }}
                          >
                            {game.game_code}
                          </span>
                          {game.is_running && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full">
                              <Play className="w-3 h-3 text-green-400" />
                              <span className="text-xs text-green-400 font-semibold">LIVE</span>
                            </div>
                          )}
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            game.status === "active"
                              ? "bg-green-500/20 text-green-400"
                              : game.status === "completed"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-slate-500/20 text-slate-400"
                          }`}
                        >
                          {game.status}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm">{game.home_team}</span>
                        <span className="text-white text-xl font-bold">{game.home_score}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm">{game.away_team}</span>
                        <span className="text-white text-xl font-bold">{game.away_score}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                      <div className="flex-1 text-center">
                        <p className="text-xs text-slate-500">Time</p>
                        <p className="text-white font-semibold">{formatTime(game.time_remaining)}</p>
                      </div>
                      <div className="flex-1 text-center">
                        <p className="text-xs text-slate-500">Half</p>
                        <p className="text-white font-semibold">{game.half}</p>
                      </div>
                      <div className="flex-1 text-center">
                        <p className="text-xs text-slate-500">Status</p>
                        {game.is_running ? (
                          <Play className="w-4 h-4 text-green-400 mx-auto" />
                        ) : (
                          <Pause className="w-4 h-4 text-slate-500 mx-auto" />
                        )}
                      </div>
                    </div>

                    {game.field_location && (
                      <p className="text-sm text-slate-400">
                        📍 {game.field_location}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setQrCodeGame(game)}
                        className="gap-1 text-xs"
                      >
                        <QrCode className="w-3 h-3" />
                        QR
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`/game/${game.game_code}`, "_blank")}
                        className="gap-1 text-xs"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleLargeDisplay(game.game_code)}
                        className="gap-1 text-xs"
                      >
                        <Monitor className="w-3 h-3" />
                        Large Display
                      </Button>
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-white gap-1 text-xs"
                        onClick={() => navigate(`/referee/${game.game_code}`)}
                      >
                        <Play className="w-3 h-3" />
                        Control
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleShareLink(game)}
                        className="gap-1 text-xs"
                      >
                        <Link2 className="w-3 h-3" />
                        Share Link
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Completed Games Tab */}
        {activeTab === "completed" && (
          <>
            <div className="flex flex-wrap gap-4 mb-6">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-md text-white"
              >
                <option value="all">All Dates</option>
                {Array.from(new Set(completedGames.map(g => g.scheduled_date).filter(Boolean))).sort().reverse().map(date => (
                  <option key={date} value={date}>
                    {new Date(date).toLocaleDateString()}
                  </option>
                ))}
              </select>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-md text-white"
              >
                <option value="all">All Locations</option>
                {Array.from(new Set(fields.filter(f => f.location).map(f => f.location))).map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
              <select
                value={fieldFilter}
                onChange={(e) => setFieldFilter(e.target.value)}
                className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-md text-white"
              >
                <option value="all">All Fields</option>
                {fields.map(field => (
                  <option key={field.id} value={field.id}>{field.name}</option>
                ))}
              </select>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <Activity className="w-8 h-8 text-primary" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">{totalGames}</div>
                <div className="text-sm text-slate-400">Total Games Played</div>
              </div>

              <div className="bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/30 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <MapPin className="w-8 h-8 text-accent" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">{uniqueFields}</div>
                <div className="text-sm text-slate-400">Active Fields Used</div>
              </div>

              <div className="bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/30 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <TrendingUp className="w-8 h-8 text-green-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">{uniqueLocations}</div>
                <div className="text-sm text-slate-400">Locations Covered</div>
              </div>

              <div className="bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/30 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <Calendar className="w-8 h-8 text-amber-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">{totalDays}</div>
                <div className="text-sm text-slate-400">Event Days</div>
              </div>
            </div>

            {filteredCompletedGames.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No completed games yet</h3>
                <p className="text-slate-400">Completed games will appear here</p>
              </div>
            ) : (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800">
                      <TableHead className="text-slate-400">Date</TableHead>
                      <TableHead className="text-slate-400">Time</TableHead>
                      <TableHead className="text-slate-400">Sport</TableHead>
                      <TableHead className="text-slate-400">Matchup</TableHead>
                      <TableHead className="text-slate-400">Final Score</TableHead>
                      <TableHead className="text-slate-400">Winner</TableHead>
                      <TableHead className="text-slate-400">Field</TableHead>
                      <TableHead className="text-slate-400">Division</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompletedGames.map((game) => {
                      const winner = getWinner(game);
                      const gameField = fields.find(f => f.id === game.field_id);
                      return (
                        <TableRow key={game.id} className="border-slate-800">
                          <TableCell className="text-slate-300">
                            {game.scheduled_date ? new Date(game.scheduled_date).toLocaleDateString() : "-"}
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {game.scheduled_time || "-"}
                          </TableCell>
                          <TableCell className="text-slate-300">
                            <span className="capitalize flex items-center gap-2">
                              <SportIcon sportId={game.sport_type} className="w-4 h-4 text-slate-400" />
                              {game.sport_type.replace(/_/g, " ")}
                            </span>
                          </TableCell>
                          <TableCell className="text-slate-300">
                            <div className="font-medium">
                              {game.home_team} vs {game.away_team}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-300 font-bold">
                            {game.home_score} - {game.away_score}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {winner.team !== "Tie" && (
                                <Trophy className="w-4 h-4 text-amber-400" />
                              )}
                              <span className={winner.team === "Tie" ? "text-slate-400" : "text-amber-400 font-semibold"}>
                                {winner.team}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-400">
                            <div>{game.field_location || "-"}</div>
                            {gameField?.location && (
                              <div className="text-xs text-slate-500">{gameField.location}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-400">
                            {game.division || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}

        <GameQRCode
          gameCode={qrCodeGame?.game_code || 'TEST'}
          homeTeam={qrCodeGame?.home_team || 'Home Team'}
          awayTeam={qrCodeGame?.away_team || 'Away Team'}
          open={!!qrCodeGame}
          onOpenChange={(open) => {
            if (!open) setQrCodeGame(null);
          }}
        />

        {/* Upgrade Dialog */}
        <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-white">
                Upgrade to Premium
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                For access to full screen display, please upgrade to a Premium subscription.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <p className="text-slate-300 mb-4">
                The Large Display Mode is a premium feature available exclusively to Premium tier subscribers. 
                Upgrade today to unlock:
              </p>
              <ul className="space-y-2 text-slate-300 mb-6">
                <li className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-primary" />
                  Full-screen widescreen display mode
                </li>
                <li className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-primary" />
                  Perfect for large TVs and displays
                </li>
                <li className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-primary" />
                  Professional stadium-style scoreboard
                </li>
              </ul>
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowUpgradeDialog(false);
                    navigate("/pricing");
                  }}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white"
                >
                  View Pricing
                </Button>
                <Button
                  onClick={() => setShowUpgradeDialog(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Maybe Later
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Referee Link Share Dialog */}
        {linkShareGame && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-2">Share Referee Control Link</h3>
                <p className="text-slate-400">
                  {linkShareGame.home_team} vs {linkShareGame.away_team}
                </p>
              </div>

              <Alert className="mb-6 bg-amber-500/10 border-amber-500/30 text-amber-400">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                <AlertDescription className="text-amber-300 font-medium ml-2">
                  This link provides access to control the game. Only share this link with official personnel.
                </AlertDescription>
              </Alert>

              <div className="mb-6">
                <div className="text-lg font-bold text-white mb-3">REFEREE CONTROL LINK</div>
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-3">
                  <div className="text-primary text-sm font-medium break-all">
                    {window.location.origin}/referee/{linkShareGame.game_code}
                  </div>
                </div>
                <Button onClick={copyRefereeLink} className="w-full bg-primary hover:bg-primary/90 text-white text-base py-6">
                  <Copy className="w-5 h-5 mr-2" />
                  {copySuccess ? "Copied!" : "Copy Referee Link"}
                </Button>
                <p className="text-sm text-slate-400 mt-3 text-center">
                  Share this link with your referee via text, email, or any messaging app
                </p>
              </div>

              <Button onClick={() => setLinkShareGame(null)} variant="outline" className="w-full">
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
