import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { Timer, Flag, WifiOff, Wifi } from 'lucide-react';
import { Game } from '@/shared/types';
import { SoccerDisplay } from '@/react-app/components/sports/SoccerDisplay';
import { BasketballDisplay } from '@/react-app/components/sports/BasketballDisplay';
import { VolleyballDisplay } from '@/react-app/components/sports/VolleyballDisplay';
import { FootballDisplay } from '@/react-app/components/sports/FootballDisplay';
import { BaseballDisplay } from '@/react-app/components/sports/BaseballDisplay';
import { HockeyDisplay } from '@/react-app/components/sports/HockeyDisplay';
import { TennisDisplay } from '@/react-app/components/sports/TennisDisplay';
import { LacrosseDisplay } from '@/react-app/components/LacrosseDisplay';
import { FieldHockeyDisplay } from '@/react-app/components/sports/FieldHockeyDisplay';

interface Sponsor {
  id: number;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  additional_text: string | null;
}

interface GameWithBranding extends Game {
  branding_id?: number;
  branding_org_name?: string;
  branding_primary_color?: string;
  branding_secondary_color?: string;
  branding_background_color?: string;
  branding_text_color?: string;
  branding_accent_color?: string;
  branding_logo_url?: string;
}

export default function ScoreboardLarge() {
  const { code } = useParams();
  const [game, setGame] = useState<GameWithBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [currentSponsorIndex, setCurrentSponsorIndex] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Load cached game data on mount
  useEffect(() => {
    if (code) {
      const cached = localStorage.getItem(`scoreboard_${code}`);
      if (cached) {
        try {
          const cachedData = JSON.parse(cached);
          setGame(cachedData.game);
          setSponsors(cachedData.sponsors || []);
        } catch (error) {
          console.error('Failed to load cached data:', error);
        }
      }
    }
  }, [code]);

  // Monitor online/offline status
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

  const fetchGame = async () => {
    try {
      const response = await fetch(`/api/games/${code}`);
      if (response.ok) {
        const data = await response.json();
        setGame(data);
        setLastSyncTime(new Date());
        
        // Cache the data
        const cacheData = {
          game: data,
          sponsors: sponsors,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem(`scoreboard_${code}`, JSON.stringify(cacheData));
      }
    } catch (error) {
      console.error('Failed to fetch game:', error);
    } finally {
      if (!game) {
        setLoading(false);
      }
    }
  };

  const fetchSponsors = async () => {
    try {
      const response = await fetch(`/api/games/${code}/sponsors`);
      if (response.ok) {
        const data = await response.json();
        setSponsors(data);
        
        // Update cache with sponsors
        const cached = localStorage.getItem(`scoreboard_${code}`);
        if (cached) {
          const cacheData = JSON.parse(cached);
          cacheData.sponsors = data;
          localStorage.setItem(`scoreboard_${code}`, JSON.stringify(cacheData));
        }
      }
    } catch (error) {
      console.error('Failed to fetch sponsors:', error);
    }
  };

  useEffect(() => {
    if (code) {
      fetchGame();
      fetchSponsors();
      const interval = setInterval(() => {
        if (isOnline) {
          fetchGame();
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [code, isOnline]);

  // Rotate sponsors every 5 seconds
  useEffect(() => {
    if (sponsors.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSponsorIndex((prev) => (prev + 1) % sponsors.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [sponsors.length]);

  // Calculate display time based on server data
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    // Load Orbitron font for scoreboard numbers
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading game...</div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Game not found</div>
      </div>
    );
  }

  // Use branding colors if available, otherwise defaults
  const primaryColor = game.branding_primary_color || '#2563EB';
  const secondaryColor = game.branding_secondary_color || '#0ea5e9';
  const accentColor = game.branding_accent_color || '#60a5fa';
  const backgroundColor = game.branding_background_color || '#0f172a';
  const textColor = game.branding_text_color || '#ffffff';

  return (
    <div 
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ backgroundColor }}
    >
      {/* Header with Logo */}
      <div className="fixed top-4 left-4 z-50">
        {game.branding_logo_url ? (
          <img 
            src={game.branding_logo_url}
            alt={game.branding_org_name || "Organization"}
            className="h-20 md:h-32 max-w-[500px] object-contain cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => window.open('https://scorelink.live', '_blank')}
          />
        ) : (
          <Link to="/" className="block">
            <img 
              src="https://019d10b5-13db-77bf-8d2c-806760d8fabe.mochausercontent.com/Logo-No-Background-cropped2.png"
              alt="ScoreLink Live"
              className="h-20 md:h-32"
            />
          </Link>
        )}
      </div>

      {/* Connection Status Banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-orange-600 text-white px-4 py-3 flex items-center justify-center gap-2">
          <WifiOff className="w-5 h-5" />
          <span className="font-semibold">Offline - Showing last known data</span>
          {lastSyncTime && (
            <span className="text-orange-200 text-sm">
              (Last update: {lastSyncTime.toLocaleTimeString()})
            </span>
          )}
        </div>
      )}
      
      <div className="relative z-10 w-full max-w-7xl mx-auto flex-1 flex items-center justify-center p-8">
        <div className="w-full space-y-8">
          {/* Game Title */}
          <div className="text-center">
            <div 
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2"
              style={{ 
                backgroundColor: `${primaryColor}20`,
                borderColor: primaryColor
              }}
            >
              <Flag className="w-5 h-5" style={{ color: accentColor }} />
              <span className="font-bold tracking-wide" style={{ color: textColor }}>
                {game.sport_type.toUpperCase().replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Main Scoreboard */}
          <div 
            className="rounded-3xl overflow-hidden shadow-2xl border-4"
            style={{ 
              backgroundColor: `${backgroundColor}cc`,
              borderColor: `${primaryColor}60`
            }}
          >
            {/* Header with Period/Half */}
            <div 
              className="px-8 py-4 border-b-2 flex justify-between items-center"
              style={{ 
                backgroundColor: `${primaryColor}40`,
                borderColor: `${accentColor}60`
              }}
            >
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <>
                    <Wifi className="w-4 h-4" style={{ color: accentColor }} />
                    <div className="font-semibold tracking-wider" style={{ color: textColor }}>LIVE</div>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-orange-400" />
                    <div className="text-orange-400 font-semibold tracking-wider">OFFLINE</div>
                  </>
                )}
              </div>
              <div 
                className="flex items-center gap-3 px-6 py-2 rounded-full border-2"
                style={{ 
                  backgroundColor: `${backgroundColor}dd`,
                  borderColor: primaryColor
                }}
              >
                <span 
                  className="font-bold tracking-widest text-lg" 
                  style={{ fontFamily: 'Orbitron, monospace', color: primaryColor }}
                >
                  {game.half === 1 ? '1ST PERIOD' : '2ND PERIOD'}
                </span>
              </div>
              <div className="w-20"></div>
            </div>

            {/* Score Display */}
            <div className="grid grid-cols-3 gap-8 p-12">
              {/* Home Team */}
              <div className="flex flex-col items-center space-y-6">
                <div className="w-full">
                  <div className="text-center mb-4">
                    <h2 
                      className="text-4xl font-bold tracking-wide mb-2" 
                      style={{ fontFamily: 'Orbitron, monospace', color: primaryColor }}
                    >
                      {game.home_team.toUpperCase()}
                    </h2>
                    <div 
                      className="h-1 w-24 mx-auto rounded-full"
                      style={{ backgroundColor: primaryColor }}
                    ></div>
                  </div>
                  <div 
                    className="p-8 rounded-2xl border-4"
                    style={{ 
                      backgroundColor: `${backgroundColor}99`,
                      borderColor: `${primaryColor}60`
                    }}
                  >
                    <div 
                      className="text-9xl font-black text-center leading-none" 
                      style={{ 
                        fontFamily: 'Orbitron, monospace',
                        color: accentColor,
                        textShadow: `0 0 30px ${accentColor}80`
                      }}
                    >
                      {game.home_score}
                    </div>
                  </div>
                </div>

                {/* Home Team Stats - Flag Football */}
                {game.sport_type === 'flag_football' && (
                  <div className="w-full space-y-3">
                    <div 
                      className="px-4 py-3 rounded-lg border-2"
                      style={{ 
                        backgroundColor: `${primaryColor}15`,
                        borderColor: `${primaryColor}40`
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-base font-semibold tracking-wide" style={{ color: textColor }}>
                          TIMEOUTS
                        </span>
                        <div className="flex gap-1.5">
                          {[...Array(2)].map((_, i) => (
                            <div
                              key={i}
                              className="w-4 h-4 rounded-full"
                              style={{ 
                                backgroundColor: i < game.home_timeouts ? '#10b981' : `${textColor}30` 
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div 
                      className="px-4 py-3 rounded-lg border-2"
                      style={{ 
                        backgroundColor: `${primaryColor}15`,
                        borderColor: `${primaryColor}40`
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-base font-semibold tracking-wide" style={{ color: textColor }}>
                          BLITZES
                        </span>
                        <div className="flex gap-1.5">
                          {[...Array(2)].map((_, i) => (
                            <div
                              key={i}
                              className="w-4 h-4 rounded-full"
                              style={{ 
                                backgroundColor: i < game.home_blitzes ? '#ef4444' : `${textColor}30` 
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Clock */}
              <div className="flex flex-col items-center justify-center space-y-6">
                {game.clock_mode !== 'manual' ? (
                  <>
                    <div className="relative">
                      <div 
                        className="p-10 rounded-3xl border-4"
                        style={{ 
                          backgroundColor: `${backgroundColor}ee`,
                          borderColor: primaryColor
                        }}
                      >
                        <Timer 
                          className="w-12 h-12 mx-auto mb-4" 
                          style={{ color: primaryColor }}
                        />
                        <div 
                          className="text-8xl font-black text-center leading-none" 
                          style={{ 
                            fontFamily: 'Orbitron, monospace',
                            color: primaryColor,
                            textShadow: `0 0 40px ${primaryColor}99`
                          }}
                        >
                          {formatTime(displayTime)}
                        </div>
                      </div>
                    </div>
                    
                    <div 
                      className="flex items-center gap-2 px-4 py-2 rounded-full border-2"
                      style={{ 
                        backgroundColor: `${backgroundColor}cc`,
                        borderColor: `${primaryColor}40`
                      }}
                    >
                      {game.clock_mode === 'running' ? (
                        <>
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                          <span className="text-sm font-semibold tracking-wide" style={{ color: textColor }}>
                            RUNNING CLOCK
                          </span>
                        </>
                      ) : (
                        <>
                          <div className={`w-2 h-2 rounded-full ${game.is_running ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                          <span className="text-sm font-semibold tracking-wide" style={{ color: textColor }}>
                            {game.is_running ? 'RUNNING' : 'STOPPED'}
                          </span>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div 
                    className="p-10 rounded-3xl border-4"
                    style={{ 
                      backgroundColor: `${backgroundColor}ee`,
                      borderColor: accentColor
                    }}
                  >
                    <Flag className="w-16 h-16 mx-auto mb-4" style={{ color: accentColor }} />
                    <div 
                      className="text-2xl font-bold text-center tracking-wider" 
                      style={{ 
                        fontFamily: 'Orbitron, monospace',
                        color: accentColor
                      }}
                    >
                      MANUAL MODE
                    </div>
                    <div className="text-sm text-center mt-2" style={{ color: secondaryColor }}>
                      Score Only
                    </div>
                  </div>
                )}
              </div>

              {/* Away Team */}
              <div className="flex flex-col items-center space-y-6">
                <div className="w-full">
                  <div className="text-center mb-4">
                    <h2 
                      className="text-4xl font-bold tracking-wide mb-2" 
                      style={{ fontFamily: 'Orbitron, monospace', color: secondaryColor }}
                    >
                      {game.away_team.toUpperCase()}
                    </h2>
                    <div 
                      className="h-1 w-24 mx-auto rounded-full"
                      style={{ backgroundColor: secondaryColor }}
                    ></div>
                  </div>
                  <div 
                    className="p-8 rounded-2xl border-4"
                    style={{ 
                      backgroundColor: `${backgroundColor}99`,
                      borderColor: `${secondaryColor}60`
                    }}
                  >
                    <div 
                      className="text-9xl font-black text-center leading-none" 
                      style={{ 
                        fontFamily: 'Orbitron, monospace',
                        color: accentColor,
                        textShadow: `0 0 30px ${accentColor}80`
                      }}
                    >
                      {game.away_score}
                    </div>
                  </div>
                </div>

                {/* Away Team Stats - Flag Football */}
                {game.sport_type === 'flag_football' && (
                  <div className="w-full space-y-3">
                    <div 
                      className="px-4 py-3 rounded-lg border-2"
                      style={{ 
                        backgroundColor: `${primaryColor}15`,
                        borderColor: `${primaryColor}40`
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-base font-semibold tracking-wide" style={{ color: textColor }}>
                          TIMEOUTS
                        </span>
                        <div className="flex gap-1.5">
                          {[...Array(2)].map((_, i) => (
                            <div
                              key={i}
                              className="w-4 h-4 rounded-full"
                              style={{ 
                                backgroundColor: i < game.away_timeouts ? '#10b981' : `${textColor}30` 
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div 
                      className="px-4 py-3 rounded-lg border-2"
                      style={{ 
                        backgroundColor: `${primaryColor}15`,
                        borderColor: `${primaryColor}40`
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-base font-semibold tracking-wide" style={{ color: textColor }}>
                          BLITZES
                        </span>
                        <div className="flex gap-1.5">
                          {[...Array(2)].map((_, i) => (
                            <div
                              key={i}
                              className="w-4 h-4 rounded-full"
                              style={{ 
                                backgroundColor: i < game.away_blitzes ? '#ef4444' : `${textColor}30` 
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Soccer Stats */}
          {game.sport_type === 'soccer' && (
            <div className="max-w-lg mx-auto">
              <SoccerDisplay game={game} textColor={textColor} />
            </div>
          )}

          {/* Basketball Stats */}
          {game.sport_type === 'basketball' && (
            <div className="max-w-lg mx-auto">
              <BasketballDisplay game={game} primaryColor={primaryColor} secondaryColor={secondaryColor} textColor={textColor} />
            </div>
          )}

          {/* Volleyball Stats */}
          {game.sport_type === 'volleyball' && (
            <div className="max-w-lg mx-auto">
              <VolleyballDisplay game={game} primaryColor={primaryColor} secondaryColor={secondaryColor} textColor={textColor} />
            </div>
          )}

          {/* Football Stats */}
          {game.sport_type === 'tackle_football' && (
            <div className="max-w-lg mx-auto">
              <FootballDisplay game={game} />
            </div>
          )}

          {/* Baseball Stats */}
          {game.sport_type === 'baseball_softball' && (
            <div className="max-w-lg mx-auto">
              <BaseballDisplay game={game} primaryColor={primaryColor} secondaryColor={secondaryColor} textColor={textColor} />
            </div>
          )}

          {/* Hockey Stats */}
          {game.sport_type === 'hockey' && (
            <div className="max-w-lg mx-auto">
              <HockeyDisplay game={game} primaryColor={primaryColor} secondaryColor={secondaryColor} textColor={textColor} />
            </div>
          )}

          {/* Tennis Stats */}
          {game.sport_type === 'tennis' && (
            <div className="max-w-lg mx-auto">
              <TennisDisplay game={game} primaryColor={primaryColor} secondaryColor={secondaryColor} textColor={textColor} />
            </div>
          )}

          {/* Lacrosse Stats */}
          {game.sport_type === 'lacrosse' && (
            <div className="max-w-lg mx-auto">
              <LacrosseDisplay game={game} primaryColor={primaryColor} textColor={textColor} isMobile={false} />
            </div>
          )}

          {game.sport_type === 'field_hockey' && (
            <div className="max-w-lg mx-auto">
              <FieldHockeyDisplay game={game} primaryColor={primaryColor} textColor={textColor} />
            </div>
          )}

          {/* Sponsor Banner */}
          {sponsors.length > 0 && (
            <div 
              className="rounded-2xl p-8 border-2"
              style={{ 
                backgroundColor: `${backgroundColor}80`,
                borderColor: `${primaryColor}40`
              }}
            >
              <p className="text-center text-sm mb-6" style={{ color: secondaryColor }}>
                Game brought to you by
              </p>
              <div className="text-center">
                {sponsors[currentSponsorIndex].logo_url && (
                  <div className="bg-white rounded-xl p-4 mb-4 max-w-md mx-auto">
                    {sponsors[currentSponsorIndex].website_url ? (
                      <a
                        href={sponsors[currentSponsorIndex].website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={sponsors[currentSponsorIndex].logo_url}
                          alt={sponsors[currentSponsorIndex].name}
                          className="max-h-24 max-w-full object-contain mx-auto"
                        />
                      </a>
                    ) : (
                      <img
                        src={sponsors[currentSponsorIndex].logo_url}
                        alt={sponsors[currentSponsorIndex].name}
                        className="max-h-24 max-w-full object-contain mx-auto"
                      />
                    )}
                  </div>
                )}
                
                {sponsors[currentSponsorIndex].website_url ? (
                  <a
                    href={sponsors[currentSponsorIndex].website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-3xl font-bold hover:opacity-80 transition-opacity block mb-2"
                    style={{ fontFamily: 'Orbitron, monospace', color: accentColor }}
                  >
                    {sponsors[currentSponsorIndex].name}
                  </a>
                ) : (
                  <div className="text-3xl font-bold mb-2" style={{ fontFamily: 'Orbitron, monospace', color: accentColor }}>
                    {sponsors[currentSponsorIndex].name}
                  </div>
                )}
                
                {sponsors[currentSponsorIndex].additional_text && (
                  <div className="text-lg" style={{ color: textColor }}>
                    {sponsors[currentSponsorIndex].additional_text}
                  </div>
                )}
              </div>
              {sponsors.length > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  {sponsors.map((_, index) => (
                    <div
                      key={index}
                      className="w-2 h-2 rounded-full transition-colors"
                      style={{ 
                        backgroundColor: index === currentSponsorIndex ? accentColor : `${textColor}30` 
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 opacity-70">
              <span className="text-sm" style={{ color: secondaryColor }}>Powered by</span>
              <Link to="/">
                <img 
                  src="https://019d10b5-13db-77bf-8d2c-806760d8fabe.mochausercontent.com/Logo-No-Background-cropped2.png"
                  alt="ScoreLink Live"
                  className="h-8"
                />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
