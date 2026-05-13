import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router';
import { Play, WifiOff, Wifi } from 'lucide-react';

interface Game {
  id: number;
  game_code: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  time_remaining: number;
  half: number;
  period?: number;
  is_running: number;
  status: string;
  sport_type: string;
  field_location?: string;
}

export default function MultiFieldViewLarge() {
  const [searchParams] = useSearchParams();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const eventId = searchParams.get('event');
  const coordinatorId = searchParams.get('coordinator');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    fetchGames();
    const interval = setInterval(fetchGames, 500);
    return () => clearInterval(interval);
  }, [eventId, coordinatorId]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchGames = async () => {
    try {
      let url = '/api/games/active';
      const params = new URLSearchParams();
      if (eventId) params.append('event', eventId);
      if (coordinatorId) params.append('coordinator', coordinatorId);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setGames(data);
        localStorage.setItem('multifield_large_games', JSON.stringify({
          games: data,
          timestamp: new Date().toISOString()
        }));
      }
    } catch (error) {
      const cached = localStorage.getItem('multifield_large_games');
      if (cached) {
        const { games: cachedGames } = JSON.parse(cached);
        setGames(cachedGames);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPeriodLabel = (game: Game) => {
    const sport = game.sport_type?.toLowerCase() || '';
    if (sport.includes('hockey')) return `P${game.period || game.half}`;
    if (sport.includes('soccer') || sport.includes('lacrosse')) return `H${game.half}`;
    if (sport.includes('basketball')) return `Q${game.half}`;
    if (sport.includes('baseball') || sport.includes('softball')) return `INN ${game.half}`;
    return `H${game.half}`;
  };

  // Calculate grid layout based on number of games
  const getGridClass = () => {
    const count = games.length;
    if (count <= 2) return 'grid-cols-1 md:grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 6) return 'grid-cols-2 lg:grid-cols-3';
    if (count <= 9) return 'grid-cols-3';
    return 'grid-cols-3 lg:grid-cols-4';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-400"></div>
          <p className="mt-6 text-slate-400 text-xl">Loading games...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center">
            <img 
              src="https://019d10b5-13db-77bf-8d2c-806760d8fabe.mochausercontent.com/Logo-No-Background-cropped2.png"
              alt="ScoreLink Live"
              className="h-12 md:h-16"
            />
          </Link>
          {!isOnline && (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-500/20 rounded-full">
              <WifiOff className="w-4 h-4 text-red-400" />
              <span className="text-red-400 text-sm">Offline</span>
            </div>
          )}
          {isOnline && (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-full">
              <Wifi className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-sm">Live</span>
            </div>
          )}
        </div>
        <div 
          className="text-2xl text-slate-400"
          style={{ fontFamily: 'Orbitron, monospace' }}
        >
          {currentTime.toLocaleTimeString()}
        </div>
      </div>

      {/* Games Grid */}
      {games.length === 0 ? (
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center">
            <p className="text-slate-400 text-2xl">No active games</p>
            <p className="text-slate-500 mt-2">Games will appear here when they're live</p>
          </div>
        </div>
      ) : (
        <div className={`grid ${getGridClass()} gap-4 h-[calc(100vh-120px)]`}>
          {games.map((game) => (
            <div
              key={game.id}
              className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-slate-700 rounded-xl p-4 
                         flex flex-col justify-between relative overflow-hidden"
            >
              {/* Live indicator */}
              {game.is_running === 1 && (
                <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full">
                  <Play className="w-3 h-3 text-green-400 fill-green-400" />
                  <span className="text-xs text-green-400 font-semibold">LIVE</span>
                </div>
              )}

              {/* Field Location */}
              {game.field_location && (
                <div className="text-sm text-slate-500 mb-2">
                  📍 {game.field_location}
                </div>
              )}

              {/* Teams and Scores */}
              <div className="flex-1 flex flex-col justify-center space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white font-semibold text-lg truncate max-w-[60%]">
                    {game.home_team}
                  </span>
                  <span 
                    className="text-4xl font-black text-blue-400"
                    style={{ fontFamily: 'Orbitron, monospace' }}
                  >
                    {game.home_score}
                  </span>
                </div>
                <div className="h-px bg-slate-700"></div>
                <div className="flex items-center justify-between">
                  <span className="text-white font-semibold text-lg truncate max-w-[60%]">
                    {game.away_team}
                  </span>
                  <span 
                    className="text-4xl font-black text-blue-400"
                    style={{ fontFamily: 'Orbitron, monospace' }}
                  >
                    {game.away_score}
                  </span>
                </div>
              </div>

              {/* Time and Period */}
              <div className="mt-4 pt-3 border-t border-slate-700 flex items-center justify-between">
                <span className="text-slate-400 uppercase text-sm font-semibold">
                  {getPeriodLabel(game)}
                </span>
                <span 
                  className="text-2xl font-bold text-white"
                  style={{ fontFamily: 'Orbitron, monospace' }}
                >
                  {formatTime(game.time_remaining)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
