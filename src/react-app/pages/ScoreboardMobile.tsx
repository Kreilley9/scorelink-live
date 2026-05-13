import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { Button } from "@/react-app/components/ui/button";
import { ArrowLeft, WifiOff, Wifi } from "lucide-react";
import { Game } from "@/shared/types";
import { SoccerDisplay } from "@/react-app/components/sports/SoccerDisplay";
import { BasketballDisplay } from "@/react-app/components/sports/BasketballDisplay";
import { VolleyballDisplay } from "@/react-app/components/sports/VolleyballDisplay";
import { FootballDisplay } from "@/react-app/components/sports/FootballDisplay";
import { BaseballDisplay } from "@/react-app/components/sports/BaseballDisplay";
import { HockeyDisplay } from "@/react-app/components/sports/HockeyDisplay";
import { TennisDisplay } from "@/react-app/components/sports/TennisDisplay";
import { LacrosseDisplay } from "@/react-app/components/LacrosseDisplay";
import { FieldHockeyDisplay } from "@/react-app/components/sports/FieldHockeyDisplay";

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

interface Sponsor {
  id: number;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  additional_text: string | null;
}

export default function ScoreboardMobile() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<GameWithBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [currentSponsorIndex, setCurrentSponsorIndex] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const fromMultifield = new URLSearchParams(window.location.search).get('from') === 'multifield';

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
        setLoading(false);
        
        const cacheData = {
          game: data,
          timestamp: Date.now(),
          sponsors: sponsors
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
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Game not found</div>
      </div>
    );
  }

  const currentSponsor = sponsors[currentSponsorIndex];

  // Use branding colors if available, otherwise defaults
  const primaryColor = game.branding_primary_color || '#2563EB';
  const secondaryColor = game.branding_secondary_color || '#0ea5e9';
  const accentColor = game.branding_accent_color || '#60a5fa';
  const backgroundColor = game.branding_background_color || '#0f172a';
  const textColor = game.branding_text_color || '#ffffff';

  return (
    <div 
      className="h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor }}
    >
      {/* Connection Status Banner */}
      {!isOnline && (
        <div className="bg-orange-600 text-white px-3 py-2 flex items-center justify-center gap-2 text-sm">
          <WifiOff className="w-4 h-4" />
          <span className="font-semibold">Offline - showing last known state</span>
        </div>
      )}

      {/* Header with Logo */}
      <div 
        className="flex-none py-4 px-6 flex items-center justify-between border-b-2"
        style={{ 
          backgroundColor: primaryColor,
          borderColor: accentColor
        }}
      >
        {game.branding_logo_url ? (
          <img 
            src={game.branding_logo_url} 
            alt={game.branding_org_name || "Organization"}
            className="h-20 max-w-[300px] object-contain cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => window.open('https://scorelink.live', '_blank')}
          />
        ) : (
          <span 
            className="text-3xl font-black"
            style={{ color: textColor }}
          >
            {game.home_team} vs {game.away_team}
          </span>
        )}
        {fromMultifield && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/multifield')}
            style={{ color: textColor }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}
      </div>

      {/* Score Section */}
      <div className="flex-1 flex flex-col justify-center px-4 py-6">
        <div className="grid grid-cols-3 gap-3 items-center mb-6">
          {/* Home Team */}
          <div className="text-center">
            <div 
              className="text-xs font-semibold mb-1.5 uppercase tracking-wider"
              style={{ color: secondaryColor }}
            >
              Home
            </div>
            <div 
              className="text-5xl sm:text-6xl font-black mb-1.5"
              style={{ color: accentColor }}
            >
              {game.home_score}
            </div>
            <div 
              className="text-sm sm:text-base font-medium truncate px-1"
              style={{ color: textColor }}
            >
              {game.home_team}
            </div>
          </div>

          {/* Period/Clock */}
          <div className="text-center">
            <div 
              className="text-xs font-semibold mb-1.5 uppercase tracking-wider"
              style={{ color: secondaryColor }}
            >
              {game.half === 1 ? '1st' : '2nd'} Period
            </div>
            <div 
              className="text-4xl sm:text-5xl font-black"
              style={{ color: textColor }}
            >
              {game.clock_mode === 'manual' ? '--:--' : formatTime(displayTime)}
            </div>
            {game.clock_mode !== 'manual' && (
              <div className="flex items-center justify-center gap-2 mt-1.5">
                {isOnline ? (
                  <Wifi className="w-3 h-3" style={{ color: accentColor }} />
                ) : (
                  <WifiOff className="w-3 h-3 text-orange-400" />
                )}
              </div>
            )}
          </div>

          {/* Away Team */}
          <div className="text-center">
            <div 
              className="text-xs font-semibold mb-1.5 uppercase tracking-wider"
              style={{ color: secondaryColor }}
            >
              Away
            </div>
            <div 
              className="text-5xl sm:text-6xl font-black mb-1.5"
              style={{ color: accentColor }}
            >
              {game.away_score}
            </div>
            <div 
              className="text-sm sm:text-base font-medium truncate px-1"
              style={{ color: textColor }}
            >
              {game.away_team}
            </div>
          </div>
        </div>

        {/* Flag Football Stats */}
        {game.sport_type === 'flag_football' && (
          <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
            {/* Home Team Stats */}
            <div className="space-y-2">
              <div 
                className="px-2.5 py-2 rounded-lg text-center"
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                <div className="text-xs uppercase tracking-wider mb-1" style={{ color: textColor }}>
                  Timeouts
                </div>
                <div className="flex gap-1.5 justify-center">
                  {[...Array(2)].map((_, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: i < game.home_timeouts ? accentColor : `${textColor}30` }}
                    />
                  ))}
                </div>
              </div>
              <div 
                className="px-2.5 py-2 rounded-lg text-center"
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                <div className="text-xs uppercase tracking-wider mb-1" style={{ color: textColor }}>
                  Blitzes
                </div>
                <div className="flex gap-1.5 justify-center">
                  {[...Array(2)].map((_, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: i < game.home_blitzes ? '#ef4444' : `${textColor}30` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Away Team Stats */}
            <div className="space-y-2">
              <div 
                className="px-2.5 py-2 rounded-lg text-center"
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                <div className="text-xs uppercase tracking-wider mb-1" style={{ color: textColor }}>
                  Timeouts
                </div>
                <div className="flex gap-1.5 justify-center">
                  {[...Array(2)].map((_, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: i < game.away_timeouts ? accentColor : `${textColor}30` }}
                    />
                  ))}
                </div>
              </div>
              <div 
                className="px-2.5 py-2 rounded-lg text-center"
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                <div className="text-xs uppercase tracking-wider mb-1" style={{ color: textColor }}>
                  Blitzes
                </div>
                <div className="flex gap-1.5 justify-center">
                  {[...Array(2)].map((_, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: i < game.away_blitzes ? '#ef4444' : `${textColor}30` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Soccer Stats */}
        {game.sport_type === 'soccer' && (
          <div className="max-w-md mx-auto">
            <SoccerDisplay game={game} textColor={textColor} />
          </div>
        )}

        {/* Basketball Stats */}
        {game.sport_type === 'basketball' && (
          <div className="max-w-md mx-auto">
            <BasketballDisplay game={game} primaryColor={primaryColor} secondaryColor={secondaryColor} textColor={textColor} />
          </div>
        )}

        {/* Volleyball Stats */}
        {game.sport_type === 'volleyball' && (
          <div className="max-w-md mx-auto">
            <VolleyballDisplay game={game} primaryColor={primaryColor} secondaryColor={secondaryColor} textColor={textColor} />
          </div>
        )}

        {/* Football Stats */}
        {game.sport_type === 'tackle_football' && (
          <div className="max-w-md mx-auto">
            <FootballDisplay game={game} />
          </div>
        )}

        {/* Baseball Stats */}
        {game.sport_type === 'baseball_softball' && (
          <div className="max-w-md mx-auto">
            <BaseballDisplay game={game} primaryColor={primaryColor} secondaryColor={secondaryColor} textColor={textColor} />
          </div>
        )}

        {/* Hockey Stats */}
        {game.sport_type === 'hockey' && (
          <div className="max-w-md mx-auto">
            <HockeyDisplay game={game} primaryColor={primaryColor} secondaryColor={secondaryColor} textColor={textColor} />
          </div>
        )}

        {/* Tennis Stats */}
        {game.sport_type === 'tennis' && (
          <div className="max-w-md mx-auto">
            <TennisDisplay game={game} primaryColor={primaryColor} secondaryColor={secondaryColor} textColor={textColor} />
          </div>
        )}

        {/* Lacrosse Stats */}
        {game.sport_type === 'lacrosse' && (
          <div className="max-w-md mx-auto">
            <LacrosseDisplay game={game} primaryColor={primaryColor} textColor={textColor} isMobile={true} />
          </div>
        )}

        {game.sport_type === 'field_hockey' && (
          <div className="max-w-md mx-auto">
            <FieldHockeyDisplay game={game} primaryColor={primaryColor} textColor={textColor} />
          </div>
        )}
      </div>

      {/* Sponsor Section */}
      {currentSponsor && (
        <div className="flex-none bg-white py-4 px-4">
          {currentSponsor.website_url ? (
            <a
              href={currentSponsor.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-2 hover:opacity-80 transition-opacity"
            >
              {currentSponsor.logo_url && (
                <img 
                  src={currentSponsor.logo_url} 
                  alt={currentSponsor.name}
                  className="h-12 sm:h-14 object-contain"
                />
              )}
              <div className="text-center">
                <div className="text-base sm:text-lg font-bold text-slate-900">
                  {currentSponsor.name}
                </div>
                {currentSponsor.additional_text && (
                  <div className="text-xs sm:text-sm text-slate-600 mt-0.5">
                    {currentSponsor.additional_text}
                  </div>
                )}
              </div>
            </a>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2">
              {currentSponsor.logo_url && (
                <img 
                  src={currentSponsor.logo_url} 
                  alt={currentSponsor.name}
                  className="h-12 sm:h-14 object-contain"
                />
              )}
              <div className="text-center">
                <div className="text-base sm:text-lg font-bold text-slate-900">
                  {currentSponsor.name}
                </div>
                {currentSponsor.additional_text && (
                  <div className="text-xs sm:text-sm text-slate-600 mt-0.5">
                    {currentSponsor.additional_text}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer Accent */}
      <div 
        className="flex-none h-3"
        style={{ backgroundColor: accentColor }}
      ></div>

      {/* ScoreLink Branding Footer */}
      <div 
        className="flex-none py-2 flex items-center justify-center gap-2"
        style={{ backgroundColor: `${backgroundColor}dd` }}
      >
        <span className="text-xs" style={{ color: `${textColor}99` }}>Powered by</span>
        <Link to="/">
          <img 
            src="https://019d10b5-13db-77bf-8d2c-806760d8fabe.mochausercontent.com/Logo-No-Background-cropped2.png"
            alt="ScoreLink Live"
            className="h-4"
          />
        </Link>
      </div>
    </div>
  );
}
