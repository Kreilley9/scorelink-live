import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/react-app/components/ui/button';
import { QrCode, Download, Copy, Check, X, Smartphone, Monitor } from 'lucide-react';
import { useCurrentUser } from '@/react-app/hooks/useCurrentUser';

type DisplayMode = 'mobile' | 'large';

interface GameQRCodeProps {
  gameCode: string;
  homeTeam: string;
  awayTeam: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GameQRCode({ gameCode, homeTeam, awayTeam, open, onOpenChange }: GameQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('mobile');
  const { hasFeature } = useCurrentUser();
  
  const hasPremium = hasFeature('large_display_mode');
  const scoreboardUrl = displayMode === 'large' 
    ? `${window.location.origin}/game/${gameCode}/large`
    : `${window.location.origin}/game/${gameCode}`;

  useEffect(() => {
    console.log('GameQRCode open state:', open, 'gameCode:', gameCode);
  }, [open, gameCode]);

  useEffect(() => {
    if (canvasRef.current && open && gameCode) {
      console.log('Attempting to generate QR code for URL:', scoreboardUrl);
      console.log('Canvas element:', canvasRef.current);
      
      // Add a small delay to ensure canvas is fully mounted
      const timer = setTimeout(() => {
        if (!canvasRef.current) {
          console.error('Canvas ref lost after timeout');
          return;
        }
        
        try {
          QRCode.toCanvas(
            canvasRef.current,
            scoreboardUrl,
            {
              width: 300,
              margin: 2,
              color: {
                dark: '#0F172A',
                light: '#FFFFFF',
              },
            },
            (error) => {
              if (error) {
                console.error('QR Code generation error:', error);
              } else {
                console.log('QR Code generated successfully for:', scoreboardUrl);
              }
            }
          );
        } catch (err) {
          console.error('QR Code generation exception:', err);
        }
      }, 50);
      
      return () => clearTimeout(timer);
    } else {
      console.log('QR Code generation skipped - canvasRef:', !!canvasRef.current, 'open:', open, 'gameCode:', gameCode);
    }
  }, [scoreboardUrl, open, gameCode]);

  const handleDownload = () => {
    if (!canvasRef.current) return;

    canvasRef.current.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-code-${gameCode}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(scoreboardUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 relative my-8 max-h-[calc(100vh-4rem)] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <QrCode className="w-6 h-6 text-blue-400" />
            <h2 className="text-white text-xl font-semibold">Scoreboard QR Code</h2>
          </div>
        </div>

        <div className="space-y-6">
          <div className="text-center">
            <div className="inline-block px-4 py-2 bg-slate-800/50 rounded-lg mb-2">
              <p className="text-slate-400 text-sm">Game Code</p>
              <p className="text-blue-400 font-bold text-2xl font-mono">{gameCode}</p>
            </div>
            <p className="text-white font-semibold">{homeTeam} vs {awayTeam}</p>
          </div>

          {/* Display Mode Selector - Premium Only */}
          {hasPremium && (
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-slate-400 text-xs mb-2 text-center">Display Mode</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setDisplayMode('mobile')}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    displayMode === 'mobile'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  Mobile
                </button>
                <button
                  onClick={() => setDisplayMode('large')}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    displayMode === 'large'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                  Large Display
                </button>
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-xl flex justify-center">
            <canvas ref={canvasRef} width="300" height="300" style={{ maxWidth: '100%', height: 'auto' }} />
          </div>

          <div className="space-y-3">
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <p className="text-slate-400 text-xs mb-1">Scoreboard Link</p>
              <p className="text-slate-300 text-sm break-all font-mono">{scoreboardUrl}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Link
                  </>
                )}
              </Button>
              <Button
                onClick={handleDownload}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                <Download className="w-4 h-4" />
                Download QR
              </Button>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-blue-400 text-sm">
              {displayMode === 'large' ? (
                <>
                  <strong>For Stadium Displays:</strong> Scan this QR code or visit the link above to show the scoreboard on a TV or projector.
                </>
              ) : (
                <>
                  <strong>For Parents & Coaches:</strong> Scan this QR code or visit the link above to view the live scoreboard on your phone.
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
