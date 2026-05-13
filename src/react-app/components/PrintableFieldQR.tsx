import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface Game {
  id: number;
  game_code: string;
  home_team: string;
  away_team: string;
  scheduled_date?: string;
  scheduled_time?: string;
  field_location?: string;
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
  game: Game;
  branding: Branding | null;
}

export default function PrintableFieldQR({ game, branding }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const qrUrl = `${window.location.origin}/game/${game.game_code}`;
      setTimeout(() => {
        QRCode.toCanvas(canvasRef.current, qrUrl, {
          width: 400,
          margin: 2,
          color: {
            dark: branding ? branding.text_color : "#000000",
            light: branding ? branding.background_color : "#ffffff",
          },
        });
      }, 50);
    }
  }, [game.game_code, branding]);

  const bgColor = branding?.background_color || "#ffffff";
  const textColor = branding?.text_color || "#000000";
  const primaryColor = branding?.primary_color || "#2563EB";
  const accentColor = branding?.accent_color || "#3b82f6";
  const logoUrl = branding?.logo_url || "https://mochausercontent.com/019d10b5-a9d6-7fac-9e6a-e76be4fb9dbe/Logo-No-Background-cropped2.png";
  const orgName = branding?.organization_name || "ScoreLink Live";

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-qr, #printable-qr * {
            visibility: visible;
          }
          #printable-qr {
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
        id="printable-qr"
        className="max-w-4xl mx-auto bg-white p-12"
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        {/* Header with Logo */}
        <div className="text-center mb-8">
          <img
            src={logoUrl}
            alt={orgName}
            className="h-24 mx-auto mb-4 object-contain"
          />
          <h1
            className="text-4xl font-bold mb-2"
            style={{ color: primaryColor }}
          >
            {orgName}
          </h1>
          <div
            className="text-2xl font-semibold"
            style={{ color: accentColor }}
          >
            Live Game Scoreboard
          </div>
        </div>

        {/* Game Info */}
        <div className="text-center mb-8 pb-8 border-b-2" style={{ borderColor: primaryColor }}>
          <div className="text-xl mb-4" style={{ color: textColor, opacity: 0.8 }}>
            {game.scheduled_date && new Date(game.scheduled_date).toLocaleDateString()}
            {game.scheduled_time && ` • ${game.scheduled_time}`}
          </div>
          <div className="text-5xl font-bold mb-4" style={{ color: primaryColor }}>
            {game.home_team}
            <span className="mx-6" style={{ color: textColor, opacity: 0.6 }}>vs</span>
            {game.away_team}
          </div>
          {game.field_location && (
            <div className="text-2xl font-semibold" style={{ color: accentColor }}>
              {game.field_location}
            </div>
          )}
        </div>

        {/* QR Code */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <canvas
              ref={canvasRef}
              className="mx-auto border-8 rounded-lg"
              style={{ borderColor: primaryColor }}
            />
          </div>
          <div
            className="inline-block px-8 py-4 rounded-lg text-3xl font-bold font-mono"
            style={{ backgroundColor: primaryColor, color: bgColor }}
          >
            {game.game_code}
          </div>
        </div>

        {/* Instructions */}
        <div className="text-center space-y-4">
          <div className="text-2xl font-bold" style={{ color: primaryColor }}>
            Scan to Watch Live
          </div>
          <div className="text-lg" style={{ color: textColor, opacity: 0.8 }}>
            Scan this QR code with your phone camera to view the live scoreboard
          </div>
          <div className="text-sm pt-6" style={{ color: textColor, opacity: 0.6 }}>
            Powered by ScoreLink Live • Keep Everyone in the Game
          </div>
        </div>
      </div>
    </>
  );
}
