import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface Game {
  id: number;
  home_team: string;
  away_team: string;
  scheduled_date?: string;
  scheduled_time?: string;
}

interface Field {
  id: number;
  name: string;
}

interface Branding {
  id: number;
  organization_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  accent_color: string;
}

interface Props {
  field: Field;
  games: Game[];
  branding: Branding | null;
}

export default function PrintableFieldSign({ field, games, branding }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const qrUrl = `${window.location.origin}/field/${field.id}`;
      setTimeout(() => {
        QRCode.toCanvas(canvasRef.current, qrUrl, {
          width: 280,
          margin: 2,
          color: {
            dark: branding ? branding.text_color : "#000000",
            light: branding ? branding.background_color : "#ffffff",
          },
        });
      }, 50);
    }
  }, [field.id, branding]);

  const bgColor = branding?.background_color || "#ffffff";
  const textColor = branding?.text_color || "#1e293b";
  const primaryColor = branding?.primary_color || "#2563EB";
  const accentColor = branding?.accent_color || "#3b82f6";
  const logoUrl = branding?.logo_url || "https://019d10b5-13db-77bf-8d2c-806760d8fabe.mochausercontent.com/Logo-No-Background-cropped2.png";
  const orgName = branding?.organization_name || "ScoreLink Live";
  const scoreLinkLogo = "https://019d10b5-13db-77bf-8d2c-806760d8fabe.mochausercontent.com/Logo-No-Background-cropped2.png";

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-field-sign, #printable-field-sign * {
            visibility: visible;
          }
          #printable-field-sign {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
        @page {
          size: letter portrait;
          margin: 0.5in;
        }
      `}</style>

      <div
        id="printable-field-sign"
        className="max-w-4xl mx-auto bg-white"
        style={{ backgroundColor: bgColor, color: textColor, padding: "24px" }}
      >
        {/* Professional Header */}
        <div className="text-center mb-6 pb-4" style={{ borderBottom: `3px solid ${primaryColor}` }}>
          <img
            src={logoUrl}
            alt={orgName}
            className="h-12 mx-auto mb-2 object-contain"
          />
          <h1
            className="text-3xl font-bold tracking-tight mb-1"
            style={{ color: primaryColor }}
          >
            {orgName}
          </h1>
          <div
            className="text-base font-medium uppercase tracking-wider"
            style={{ color: accentColor, opacity: 0.9 }}
          >
            Live Game Scoreboard
          </div>
        </div>

        {/* Field Name - Large and Prominent */}
        <div className="text-center mb-6">
          <div 
            className="inline-block px-6 py-3 rounded-2xl text-3xl font-bold uppercase tracking-wide shadow-lg"
            style={{ 
              backgroundColor: primaryColor, 
              color: bgColor,
              boxShadow: `0 4px 20px ${primaryColor}40`
            }}
          >
            {field.name}
          </div>
        </div>

        {/* Two Column Layout: QR Code + Schedule */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Left: QR Code */}
          <div className="text-center">
            <div className="mb-4">
              <canvas
                ref={canvasRef}
                className="mx-auto rounded-xl shadow-xl"
                style={{ 
                  border: `4px solid ${primaryColor}`,
                  borderRadius: "12px"
                }}
              />
            </div>
            <div className="space-y-2">
              <div className="text-xl font-bold" style={{ color: primaryColor }}>
                Scan to Watch Live
              </div>
              <div className="text-sm leading-relaxed" style={{ color: textColor, opacity: 0.7 }}>
                Use your phone camera to scan this QR code and view live scoreboards for all games on this field
              </div>
            </div>
          </div>

          {/* Right: Today's Schedule */}
          <div>
            <div 
              className="text-xl font-bold mb-3 pb-2 uppercase tracking-wide"
              style={{ 
                color: primaryColor,
                borderBottom: `2px solid ${accentColor}40`
              }}
            >
              Today's Games
            </div>
            
            {games.length === 0 ? (
              <div className="text-center py-6" style={{ color: textColor, opacity: 0.5 }}>
                <p className="text-base">No games scheduled yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {games.slice(0, 8).map((game, idx) => (
                  <div 
                    key={game.id}
                    className="rounded-lg p-2"
                    style={{ 
                      backgroundColor: idx % 2 === 0 ? `${accentColor}15` : "transparent",
                      border: `1px solid ${accentColor}30`
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-medium" style={{ color: primaryColor }}>
                        {game.scheduled_time || "TBD"}
                      </div>
                      <div className="flex-1 text-center">
                        <div className="text-sm font-semibold" style={{ color: textColor }}>
                          {game.home_team}
                          <span className="mx-2 font-normal" style={{ opacity: 0.5 }}>vs</span>
                          {game.away_team}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {games.length > 8 && (
                  <div className="text-center text-xs pt-1" style={{ color: textColor, opacity: 0.6 }}>
                    + {games.length - 8} more game{games.length - 8 !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Instructions Footer */}
        <div 
          className="text-center pt-4 mt-6 space-y-2"
          style={{ borderTop: `2px solid ${primaryColor}40` }}
        >
          <div className="text-base font-semibold" style={{ color: primaryColor }}>
            How It Works
          </div>
          <div className="flex justify-center gap-8 text-xs" style={{ color: textColor, opacity: 0.7 }}>
            <div className="flex items-center gap-2">
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs"
                style={{ backgroundColor: primaryColor, color: bgColor }}
              >
                1
              </div>
              <span>Scan QR Code</span>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs"
                style={{ backgroundColor: primaryColor, color: bgColor }}
              >
                2
              </div>
              <span>Select Your Game</span>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs"
                style={{ backgroundColor: primaryColor, color: bgColor }}
              >
                3
              </div>
              <span>Watch Live</span>
            </div>
          </div>
          
          {/* ScoreLink Logo Footer - Always shown */}
          <div className="pt-3 flex flex-col items-center gap-1">
            <img
              src={scoreLinkLogo}
              alt="ScoreLink Live"
              className="h-8 object-contain opacity-80"
            />
            <div className="text-xs" style={{ color: textColor, opacity: 0.5 }}>
              Keep Everyone in the Game
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
