import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/react-app/components/ui/button';
import { Download, Copy, Check, Users, X } from 'lucide-react';

interface MultiFieldQRCodeProps {
  coordinatorId?: string;
  eventName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MultiFieldQRCode({ coordinatorId, eventName, open, onOpenChange }: MultiFieldQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  
  // Build URL with optional coordinator filter
  const params = new URLSearchParams();
  if (coordinatorId) params.append('coordinator', coordinatorId);
  const queryString = params.toString();
  const multifieldUrl = `${window.location.origin}/multifield${queryString ? `?${queryString}` : ''}`;

  useEffect(() => {
    console.log('MultiFieldQRCode open state:', open, 'URL:', multifieldUrl);
  }, [open, multifieldUrl]);

  useEffect(() => {
    if (canvasRef.current && open) {
      console.log('Attempting to generate Multi-Field QR code for:', multifieldUrl);
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
            multifieldUrl,
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
                console.error('Multi-Field QR Code generation error:', error);
              } else {
                console.log('Multi-Field QR Code generated successfully');
              }
            }
          );
        } catch (err) {
          console.error('Multi-Field QR Code generation exception:', err);
        }
      }, 50);
      
      return () => clearTimeout(timer);
    } else {
      console.log('Multi-Field QR Code generation skipped - canvasRef:', !!canvasRef.current, 'open:', open);
    }
  }, [multifieldUrl, open]);

  const handleDownload = () => {
    if (!canvasRef.current) return;

    canvasRef.current.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `multifield-qr-code.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(multifieldUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 relative"
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
            <Users className="w-6 h-6 text-amber-400" />
            <h2 className="text-white text-xl font-semibold">Multi-Field View QR Code</h2>
          </div>
        </div>

        <div className="space-y-6">
          <div className="text-center">
            <div className="inline-block px-4 py-2 bg-slate-800/50 rounded-lg mb-2">
              <p className="text-slate-400 text-sm">View Type</p>
              <p className="text-amber-400 font-bold text-lg">All Live Games</p>
            </div>
            {eventName && (
              <p className="text-white font-semibold">{eventName}</p>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl flex justify-center">
            <canvas ref={canvasRef} width="300" height="300" style={{ maxWidth: '100%', height: 'auto' }} />
          </div>

          <div className="space-y-3">
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <p className="text-slate-400 text-xs mb-1">Multi-Field Link</p>
              <p className="text-slate-300 text-sm break-all font-mono">{multifieldUrl}</p>
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
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 gap-2"
              >
                <Download className="w-4 h-4" />
                Download QR
              </Button>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-blue-400 text-sm">
              <strong>For Parents & Spectators:</strong> Scan this QR code to view all live game scores on a single page. Tap any game to see full scoreboard details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
