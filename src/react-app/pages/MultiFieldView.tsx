import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { Monitor, Play, WifiOff, Wifi } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { useCurrentUser } from '@/react-app/hooks/useCurrentUser';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/react-app/components/ui/dialog';

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

export default function MultiFieldView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hasFeature } = useCurrentUser();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  
  // Get event filter from URL params if provided
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
    const interval = setInterval(fetchGames, 1000);
    return () => clearInterval(interval);
  }, [eventId, coordinatorId]);

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
        // Cache for offline
        localStorage.setItem('multifield_games', JSON.stringify({
          games: data,
          timestamp: new Date().toISOString()
        }));
      }
    } catch (error) {
      // Try to load from cache
      const cached = localStorage.getItem('multifield_games');
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

  const handleLargeDisplay = () => {
    if (hasFeature('large_display_mode')) {
      const params = new URLSearchParams();
      if (eventId) params.append('event', eventId);
      if (coordinatorId) params.append('coordinator', coordinatorId);
      const url = params.toString() ? `/multifield/large?${params.toString()}` : '/multifield/large';
      window.open(url, '_blank');
    } else {
      setShowUpgradeDialog(true);
    }
  };

  const handleGameClick = (gameCode: string) => {
    // Navigate with return param so scoreboard knows to show back button
    navigate(`/game/${gameCode}?from=multifield`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
          <p className="mt-4 text-slate-400">Loading games...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Connection Status */}
      {!isOnline && (
        <div className="bg-red-500/90 text-white text-center py-2 text-sm flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          Offline - showing cached data
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800">
        <div className="flex items-center justify-between p-4">
          <Link to="/" className="flex items-center">
            <img 
              src="https://019d10b5-13db-77bf-8d2c-806760d8fabe.mochausercontent.com/Logo-No-Background-cropped2.png"
              alt="ScoreLink Live"
              className="h-10"
            />
          </Link>
          
          <h1 
            className="text-lg font-bold text-blue-400"
            style={{ fontFamily: 'Orbitron, monospace' }}
          >
            LIVE SCORES
          </h1>
          
          <div className="flex items-center gap-2">
            {isOnline && <Wifi className="w-4 h-4 text-green-400" />}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLargeDisplay}
              className="gap-1 text-xs"
            >
              <Monitor className="w-3 h-3" />
              Large
            </Button>
          </div>
        </div>
      </div>

      {/* Games List */}
      <div className="p-4 space-y-3">
        {games.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 text-lg">No active games</p>
            <p className="text-slate-500 text-sm mt-2">
              Games will appear here when they're live
            </p>
          </div>
        ) : (
          games.map((game) => (
            <div
              key={game.id}
              onClick={() => handleGameClick(game.game_code)}
              className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 cursor-pointer
                         hover:border-blue-500/50 hover:bg-slate-800/50 transition-all active:scale-[0.98]"
            >
              {/* Field Location */}
              {game.field_location && (
                <div className="text-xs text-slate-500 mb-2">
                  📍 {game.field_location}
                </div>
              )}
              
              <div className="flex items-center justify-between">
                {/* Teams & Scores */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium truncate max-w-[140px]">
                      {game.home_team}
                    </span>
                    <span 
                      className="text-2xl font-black text-blue-400 ml-3"
                      style={{ fontFamily: 'Orbitron, monospace' }}
                    >
                      {game.home_score}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium truncate max-w-[140px]">
                      {game.away_team}
                    </span>
                    <span 
                      className="text-2xl font-black text-blue-400 ml-3"
                      style={{ fontFamily: 'Orbitron, monospace' }}
                    >
                      {game.away_score}
                    </span>
                  </div>
                </div>
                
                {/* Time & Period */}
                <div className="ml-4 text-center min-w-[70px]">
                  <div 
                    className="text-xl font-bold text-white"
                    style={{ fontFamily: 'Orbitron, monospace' }}
                  >
                    {formatTime(game.time_remaining)}
                  </div>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <span className="text-xs text-slate-400 uppercase">
                      {getPeriodLabel(game)}
                    </span>
                    {game.is_running === 1 && (
                      <Play className="w-3 h-3 text-green-400 fill-green-400" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">
              Upgrade to Gold
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              For access to full screen display, please upgrade to a Gold subscription.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <p className="text-slate-300 mb-4">
              The Large Display Mode is a premium feature available exclusively to Gold tier subscribers.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowUpgradeDialog(false);
                  navigate('/pricing');
                }}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
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
    </div>
  );
}
