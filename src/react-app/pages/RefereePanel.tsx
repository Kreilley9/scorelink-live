import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAuth } from '@getmocha/users-service/react';
import { Button } from '@/react-app/components/ui/button';
import { Input } from '@/react-app/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/react-app/components/ui/dialog';
import { Play, Pause, RotateCcw, Plus, Minus, ArrowRight, Check, X } from 'lucide-react';
import { Game, UpdateGameState } from '@/shared/types';
import { useOfflineSync } from '@/react-app/hooks/useOfflineSync';
import { SoccerControls } from '@/react-app/components/sports/SoccerControls';
import { BasketballControls } from '@/react-app/components/sports/BasketballControls';
import { VolleyballControls } from '@/react-app/components/sports/VolleyballControls';
import { FootballControls } from '@/react-app/components/sports/FootballControls';
import { BaseballControls } from '@/react-app/components/sports/BaseballControls';
import { HockeyControls } from '@/react-app/components/sports/HockeyControls';
import { TennisControls } from '@/react-app/components/sports/TennisControls';
import { LacrosseControls } from '@/react-app/components/LacrosseControls';
import { FieldHockeyControls } from '@/react-app/components/sports/FieldHockeyControls';


interface CurrentUser {
  id: string;
  email: string;
  role: string;
}

export default function RefereePanel() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user, isPending, redirectToLogin } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [isPendingUpdate, setIsPendingUpdate] = useState(false);
  const [showTransitionDialog, setShowTransitionDialog] = useState(false);
  const [nextGameData, setNextGameData] = useState<{ game: Game; transitionType: string } | null>(null);
  const [editedHomeTeam, setEditedHomeTeam] = useState('');
  const [editedAwayTeam, setEditedAwayTeam] = useState('');
  
  const { updateGame: offlineUpdateGame, isOnline, pendingCount } = useOfflineSync({
    gameCode: code || '',
    onSuccess: () => {
      setIsPendingUpdate(false);
    },
    onError: (error) => {
      console.error('Sync error:', error);
      setIsPendingUpdate(false);
    },
  });

  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (!user) {
        setCurrentUser(null);
        return;
      }
      
      try {
        const response = await fetch('/api/users/me');
        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data);
        }
      } catch (error) {
        console.error('Failed to fetch current user:', error);
      }
    };

    fetchCurrentUser();
  }, [user]);

  const fetchGame = async () => {
    if (isPendingUpdate) {
      return;
    }
    
    try {
      const response = await fetch(`/api/games/${code}`);
      if (response.ok) {
        const data = await response.json();
        setGame(data);
      }
    } catch (error) {
      console.error('Failed to fetch game:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGame();
    const interval = setInterval(fetchGame, 2000);
    return () => clearInterval(interval);
  }, [code, isPendingUpdate]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const calculateDisplayTime = (): number => {
    if (!game) return 0;
    
    const clockMode = game.clock_mode || 'running';
    const clockDirection = game.clock_direction || 'down';
    
    if (!game.is_running || clockMode === 'manual') {
      return game.time_remaining;
    }
    
    if (!game.clock_started_at || game.time_at_start === null || game.time_at_start === undefined) {
      return game.time_remaining;
    }
    
    const startTime = new Date(game.clock_started_at).getTime();
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - startTime) / 1000);
    
    let currentTime: number;
    if (clockDirection === 'down') {
      currentTime = game.time_at_start - elapsedSeconds;
      if (currentTime < 0) currentTime = 0;
    } else {
      currentTime = game.time_at_start + elapsedSeconds;
    }
    
    return currentTime;
  };

  const displayTime = calculateDisplayTime();

  const updateGame = async (updates: Partial<Game> | UpdateGameState) => {
    setIsPendingUpdate(true);
    
    if (game) {
      const updatedGame = { ...game, ...updates };
      setGame(updatedGame);
    }

    const result = await offlineUpdateGame(updates);
    
    if (result) {
      setGame(result);
      setIsPendingUpdate(false);
    }
  };

  const toggleClock = () => {
    if (!game) return;
    
    if (game.is_running) {
      const currentTime = calculateDisplayTime();
      updateGame({ 
        is_running: 0,
        time_remaining: currentTime,
        clock_started_at: null,
        time_at_start: null
      });
    } else {
      const now = new Date().toISOString();
      updateGame({ 
        is_running: 1,
        clock_started_at: now,
        time_at_start: game.time_remaining
      });
    }
  };

  const adjustScore = (team: 'home' | 'away', delta: number) => {
    if (!game) return;
    const key = team === 'home' ? 'home_score' : 'away_score';
    const newScore = Math.max(0, game[key] + delta);
    updateGame({ [key]: newScore });
  };

  const adjustTimeouts = (team: 'home' | 'away', delta: number) => {
    if (!game) return;
    const key = team === 'home' ? 'home_timeouts' : 'away_timeouts';
    const newValue = Math.max(0, Math.min(2, game[key] + delta));
    updateGame({ [key]: newValue });
  };

  const adjustBlitzes = (team: 'home' | 'away', delta: number) => {
    if (!game) return;
    const key = team === 'home' ? 'home_blitzes' : 'away_blitzes';
    const newValue = Math.max(0, Math.min(2, game[key] + delta));
    updateGame({ [key]: newValue });
  };

  const adjustTime = (delta: number) => {
    if (!game) return;
    const currentTime = calculateDisplayTime();
    const newTime = Math.max(0, currentTime + delta);
    updateGame({ 
      time_remaining: newTime,
      is_running: 0,
      clock_started_at: null,
      time_at_start: null
    });
  };

  const resetClock = () => {
    const direction = game?.clock_direction || 'down';
    const resetValue = direction === 'down' ? 1200 : 0;
    updateGame({ 
      time_remaining: resetValue, 
      is_running: 0,
      clock_started_at: null,
      time_at_start: null
    });
  };

  const nextPeriod = () => {
    if (game) {
      const direction = game.clock_direction || 'down';
      const resetValue = direction === 'down' ? 1200 : 0;
      const isBasketball = game.sport_type === 'basketball';
      
      const periodUpdates: UpdateGameState = {
        half: game.half + 1,
        time_remaining: resetValue,
        is_running: 0,
        clock_started_at: null,
        time_at_start: null,
        home_timeouts: 2,
        away_timeouts: 2,
      };
      
      // Reset fouls each half for basketball (not each quarter)
      if (isBasketball && game.half % 2 === 0) {
        periodUpdates.home_fouls = 0;
        periodUpdates.away_fouls = 0;
      }
      
      // Only reset blitzes for flag football
      if (game.sport_type === 'flag_football') {
        periodUpdates.home_blitzes = 2;
        periodUpdates.away_blitzes = 2;
      }
      
      updateGame(periodUpdates);
    }
  };

  // Helper to get period label based on sport
  const getPeriodLabel = () => {
    if (!game) return 'Half';
    if (game.sport_type === 'basketball') {
      return 'Quarter';
    }
    return 'Half';
  };

  const getPeriodDisplay = () => {
    if (!game) return '1st Half';
    const period = game.half;
    const suffix = period === 1 ? 'st' : period === 2 ? 'nd' : period === 3 ? 'rd' : 'th';
    return `${period}${suffix} ${getPeriodLabel()}`;
  };

  const transitionToNextGame = async () => {
    if (!game) return;
    
    setTransitioning(true);
    try {
      const response = await fetch(`/api/games/${code}/transition`, {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.nextGame) {
          setNextGameData({ game: data.nextGame, transitionType: data.transitionType });
          setEditedHomeTeam(data.nextGame.home_team || 'Home Team');
          setEditedAwayTeam(data.nextGame.away_team || 'Away Team');
          setShowTransitionDialog(true);
        }
      }
    } catch (error) {
      console.error('Failed to transition to next game:', error);
    } finally {
      setTransitioning(false);
    }
  };

  const confirmTransition = async () => {
    if (!nextGameData) return;
    
    try {
      if (editedHomeTeam !== nextGameData.game.home_team || editedAwayTeam !== nextGameData.game.away_team) {
        await fetch(`/api/games/${nextGameData.game.game_code}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            home_team: editedHomeTeam,
            away_team: editedAwayTeam,
          }),
        });
      }
      
      setShowTransitionDialog(false);
      navigate(`/referee/${nextGameData.game.game_code}`);
    } catch (error) {
      console.error('Failed to update team names:', error);
      setShowTransitionDialog(false);
      navigate(`/referee/${nextGameData.game.game_code}`);
    }
  };

  const cancelTransition = () => {
    setShowTransitionDialog(false);
    setNextGameData(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-xl font-bold text-white">Sign in required</h1>
          <p className="text-slate-400">You need to sign in to access the referee panel</p>
          <Button onClick={redirectToLogin}>Sign in with Google</Button>
        </div>
      </div>
    );
  }

  if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'referee') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-xl font-bold text-white">Access Denied</h1>
          <p className="text-slate-400">You need referee or admin access to view this page</p>
          <Button onClick={() => navigate('/')}>Return Home</Button>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-slate-400">Game not found</div>
          <Button onClick={() => navigate('/')}>Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-safe">
      {/* Compact Header */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm text-slate-400">
            Code: <span className="text-blue-400 font-mono font-bold">{game.game_code}</span>
          </div>
          <div className="text-sm text-slate-400">
            {getPeriodDisplay()}
            {!isOnline && <span className="ml-2 text-yellow-400">● Offline</span>}
            {isOnline && pendingCount > 0 && <span className="ml-2 text-blue-400">● Syncing</span>}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4 pb-4">
        {/* Clock Display & Controls */}
        {game.clock_mode !== 'manual' && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="text-center mb-4">
              <div className="text-5xl font-bold text-blue-400 font-mono mb-2">
                {formatTime(displayTime)}
              </div>
              <div className="text-sm text-slate-400">
                {game.clock_mode === 'running' ? 'Running' : 'Stop'} Clock • {game.clock_direction === 'up' ? 'Count Up' : 'Count Down'}
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mb-3">
              <Button
                onClick={toggleClock}
                size="lg"
                className={`col-span-2 h-14 text-base font-semibold ${
                  game.is_running
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {game.is_running ? (
                  <>
                    <Pause className="w-5 h-5 mr-2" />
                    Stop
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Start
                  </>
                )}
              </Button>
              <Button onClick={resetClock} size="lg" variant="outline" className="h-14">
                <RotateCcw className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={() => adjustTime(-60)} variant="outline" size="default" className="flex-1 h-11 text-sm">-1m</Button>
              <Button onClick={() => adjustTime(10)} variant="outline" size="default" className="flex-1 h-11 text-sm">+10s</Button>
              <Button onClick={() => adjustTime(60)} variant="outline" size="default" className="flex-1 h-11 text-sm">+1m</Button>
            </div>
          </div>
        )}

        {/* Team Scores - Compact Side by Side */}
        <div className="grid grid-cols-2 gap-3">
          {/* Home Team */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="text-sm font-bold text-blue-400 mb-3 truncate">{game.home_team}</div>
            
            {/* Score */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <Button
                onClick={() => adjustScore('home', -1)}
                size="default"
                variant="outline"
                className="h-12 w-12 p-0 touch-manipulation"
              >
                <Minus className="w-5 h-5" />
              </Button>
              <div className="text-4xl font-bold text-white">{game.home_score}</div>
              <Button
                onClick={() => adjustScore('home', 1)}
                size="default"
                variant="outline"
                className="h-12 w-12 p-0 touch-manipulation"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>

            {/* Basketball Quick Score Buttons */}
            {game.sport_type === 'basketball' && (
              <div className="flex gap-1.5 mb-3">
                <Button
                  onClick={() => adjustScore('home', 1)}
                  size="default"
                  className="flex-1 h-11 bg-green-600 hover:bg-green-700 text-white font-bold touch-manipulation"
                >
                  +1
                </Button>
                <Button
                  onClick={() => adjustScore('home', 2)}
                  size="default"
                  className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold touch-manipulation"
                >
                  +2
                </Button>
                <Button
                  onClick={() => adjustScore('home', 3)}
                  size="default"
                  className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold touch-manipulation"
                >
                  +3
                </Button>
              </div>
            )}

            {/* Spacer for non-basketball */}
            {game.sport_type !== 'basketball' && <div className="mb-2" />}

            {/* Timeouts */}
            <div className="mb-2">
              <div className="text-xs text-slate-400 mb-1.5">Timeouts</div>
              <div className="flex items-center justify-between">
                <Button
                  onClick={() => adjustTimeouts('home', -1)}
                  size="sm"
                  variant="outline"
                  disabled={game.home_timeouts === 0}
                  className="h-9 w-9 p-0 touch-manipulation"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <div className="flex gap-1.5">
                  {[...Array(2)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-7 h-7 rounded-full border-2 ${
                        i < game.home_timeouts
                          ? 'bg-green-500 border-green-600'
                          : 'bg-slate-800 border-slate-700'
                      }`}
                    />
                  ))}
                </div>
                <Button
                  onClick={() => adjustTimeouts('home', 1)}
                  size="sm"
                  variant="outline"
                  disabled={game.home_timeouts === 2}
                  className="h-9 w-9 p-0 touch-manipulation"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Blitzes - Flag Football only */}
            {game.sport_type === 'flag_football' && (
            <div>
              <div className="text-xs text-slate-400 mb-1.5">Blitzes</div>
              <div className="flex items-center justify-between">
                <Button
                  onClick={() => adjustBlitzes('home', -1)}
                  size="sm"
                  variant="outline"
                  disabled={game.home_blitzes === 0}
                  className="h-9 w-9 p-0 touch-manipulation"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <div className="flex gap-1.5">
                  {[...Array(2)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-7 h-7 rounded-full border-2 ${
                        i < game.home_blitzes
                          ? 'bg-red-500 border-red-600'
                          : 'bg-slate-800 border-slate-700'
                      }`}
                    />
                  ))}
                </div>
                <Button
                  onClick={() => adjustBlitzes('home', 1)}
                  size="sm"
                  variant="outline"
                  disabled={game.home_blitzes === 2}
                  className="h-9 w-9 p-0 touch-manipulation"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            )}

            {/* Fouls - Basketball only */}
            {game.sport_type === 'basketball' && (
            <div>
              <div className="text-xs text-slate-400 mb-1.5">Fouls</div>
              <div className="flex items-center justify-between">
                <Button
                  onClick={() => updateGame({ home_fouls: Math.max(0, (game.home_fouls || 0) - 1) })}
                  size="sm"
                  variant="outline"
                  disabled={(game.home_fouls || 0) === 0}
                  className="h-9 w-9 p-0 touch-manipulation"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <div className="text-2xl font-bold text-white w-10 text-center">
                  {game.home_fouls || 0}
                </div>
                <Button
                  onClick={() => updateGame({ home_fouls: (game.home_fouls || 0) + 1 })}
                  size="sm"
                  variant="outline"
                  className="h-9 w-9 p-0 touch-manipulation"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {(game.away_fouls || 0) >= 7 && (
                <div className={`mt-1.5 text-xs font-bold text-center ${(game.away_fouls || 0) >= 10 ? 'text-red-400' : 'text-yellow-400'}`}>
                  {(game.away_fouls || 0) >= 10 ? 'DOUBLE BONUS' : 'BONUS'}
                </div>
              )}
            </div>
            )}
          </div>

          {/* Away Team */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="text-sm font-bold text-sky-400 mb-3 truncate">{game.away_team}</div>
            
            {/* Score */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <Button
                onClick={() => adjustScore('away', -1)}
                size="default"
                variant="outline"
                className="h-12 w-12 p-0 touch-manipulation"
              >
                <Minus className="w-5 h-5" />
              </Button>
              <div className="text-4xl font-bold text-white">{game.away_score}</div>
              <Button
                onClick={() => adjustScore('away', 1)}
                size="default"
                variant="outline"
                className="h-12 w-12 p-0 touch-manipulation"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>

            {/* Basketball Quick Score Buttons */}
            {game.sport_type === 'basketball' && (
              <div className="flex gap-1.5 mb-3">
                <Button
                  onClick={() => adjustScore('away', 1)}
                  size="default"
                  className="flex-1 h-11 bg-green-600 hover:bg-green-700 text-white font-bold touch-manipulation"
                >
                  +1
                </Button>
                <Button
                  onClick={() => adjustScore('away', 2)}
                  size="default"
                  className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold touch-manipulation"
                >
                  +2
                </Button>
                <Button
                  onClick={() => adjustScore('away', 3)}
                  size="default"
                  className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold touch-manipulation"
                >
                  +3
                </Button>
              </div>
            )}

            {/* Spacer for non-basketball */}
            {game.sport_type !== 'basketball' && <div className="mb-2" />}

            {/* Timeouts */}
            <div className="mb-2">
              <div className="text-xs text-slate-400 mb-1.5">Timeouts</div>
              <div className="flex items-center justify-between">
                <Button
                  onClick={() => adjustTimeouts('away', -1)}
                  size="sm"
                  variant="outline"
                  disabled={game.away_timeouts === 0}
                  className="h-9 w-9 p-0 touch-manipulation"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <div className="flex gap-1.5">
                  {[...Array(2)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-7 h-7 rounded-full border-2 ${
                        i < game.away_timeouts
                          ? 'bg-green-500 border-green-600'
                          : 'bg-slate-800 border-slate-700'
                      }`}
                    />
                  ))}
                </div>
                <Button
                  onClick={() => adjustTimeouts('away', 1)}
                  size="sm"
                  variant="outline"
                  disabled={game.away_timeouts === 2}
                  className="h-9 w-9 p-0 touch-manipulation"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Blitzes - Flag Football only */}
            {game.sport_type === 'flag_football' && (
            <div>
              <div className="text-xs text-slate-400 mb-1.5">Blitzes</div>
              <div className="flex items-center justify-between">
                <Button
                  onClick={() => adjustBlitzes('away', -1)}
                  size="sm"
                  variant="outline"
                  disabled={game.away_blitzes === 0}
                  className="h-9 w-9 p-0 touch-manipulation"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <div className="flex gap-1.5">
                  {[...Array(2)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-7 h-7 rounded-full border-2 ${
                        i < game.away_blitzes
                          ? 'bg-red-500 border-red-600'
                          : 'bg-slate-800 border-slate-700'
                      }`}
                    />
                  ))}
                </div>
                <Button
                  onClick={() => adjustBlitzes('away', 1)}
                  size="sm"
                  variant="outline"
                  disabled={game.away_blitzes === 2}
                  className="h-9 w-9 p-0 touch-manipulation"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            )}

            {/* Fouls - Basketball only */}
            {game.sport_type === 'basketball' && (
            <div>
              <div className="text-xs text-slate-400 mb-1.5">Fouls</div>
              <div className="flex items-center justify-between">
                <Button
                  onClick={() => updateGame({ away_fouls: Math.max(0, (game.away_fouls || 0) - 1) })}
                  size="sm"
                  variant="outline"
                  disabled={(game.away_fouls || 0) === 0}
                  className="h-9 w-9 p-0 touch-manipulation"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <div className="text-2xl font-bold text-white w-10 text-center">
                  {game.away_fouls || 0}
                </div>
                <Button
                  onClick={() => updateGame({ away_fouls: (game.away_fouls || 0) + 1 })}
                  size="sm"
                  variant="outline"
                  className="h-9 w-9 p-0 touch-manipulation"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {(game.home_fouls || 0) >= 7 && (
                <div className={`mt-1.5 text-xs font-bold text-center ${(game.home_fouls || 0) >= 10 ? 'text-red-400' : 'text-yellow-400'}`}>
                  {(game.home_fouls || 0) >= 10 ? 'DOUBLE BONUS' : 'BONUS'}
                </div>
              )}
            </div>
            )}
          </div>
        </div>

        {/* Soccer Controls */}
        {game.sport_type === 'soccer' && (
          <SoccerControls game={game} onUpdate={updateGame} />
        )}

        {/* Basketball Controls */}
        {game.sport_type === 'basketball' && (
          <BasketballControls game={game} onUpdate={updateGame} />
        )}

        {/* Volleyball Controls */}
        {game.sport_type === 'volleyball' && (
          <VolleyballControls game={game} onUpdate={updateGame} />
        )}

        {/* Football Controls */}
        {game.sport_type === 'tackle_football' && (
          <FootballControls game={game} onUpdate={updateGame} />
        )}

        {/* Baseball Controls */}
        {game.sport_type === 'baseball_softball' && (
          <BaseballControls game={game} onUpdate={updateGame} />
        )}

        {/* Hockey Controls */}
        {game.sport_type === 'hockey' && (
          <HockeyControls game={game} onUpdate={updateGame} />
        )}

        {/* Tennis Controls */}
        {game.sport_type === 'tennis' && (
          <TennisControls game={game} onUpdate={updateGame} />
        )}

        {/* Lacrosse Controls */}
        {game.sport_type === 'lacrosse' && (
          <LacrosseControls game={game} updateGameState={updateGame} />
        )}

        {/* Field Hockey Controls */}
        {game.sport_type === 'field_hockey' && (
          <FieldHockeyControls game={game} onUpdate={updateGame} />
        )}

        {/* Game Control Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={nextPeriod} size="lg" variant="outline" className="h-14 text-base font-semibold touch-manipulation">
            Next {getPeriodLabel()}
          </Button>
          <Button 
            onClick={transitionToNextGame}
            disabled={transitioning}
            size="lg"
            className="h-14 text-base font-semibold bg-blue-600 hover:bg-blue-700 touch-manipulation"
          >
            {transitioning ? 'Transitioning...' : (
              <>
                End Game
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Transition Dialog */}
      <Dialog open={showTransitionDialog} onOpenChange={setShowTransitionDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-blue-400">
              {nextGameData?.transitionType === 'scheduled' ? 'Start Next Scheduled Game' : 'Start New Game'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {nextGameData?.transitionType === 'scheduled' 
                ? 'Review and edit team names before starting the next game.'
                : 'A new game has been created. Set the team names below.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Home Team</label>
              <Input
                value={editedHomeTeam}
                onChange={(e) => setEditedHomeTeam(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="Home Team"
              />
            </div>
            
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Away Team</label>
              <Input
                value={editedAwayTeam}
                onChange={(e) => setEditedAwayTeam(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="Away Team"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={cancelTransition}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={confirmTransition}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="w-4 h-4 mr-2" />
              Start Game
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
