import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export default function QRTest() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      console.log('QRTest: Attempting to generate QR code');
      console.log('Canvas element:', canvasRef.current);
      
      QRCode.toCanvas(
        canvasRef.current,
        'https://example.com/test',
        {
          width: 300,
          margin: 2,
        },
        (error) => {
          if (error) {
            console.error('QRTest: Generation error:', error);
          } else {
            console.log('QRTest: QR code generated successfully');
          }
        }
      );
    } else {
      console.error('QRTest: Canvas ref is null');
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">QR Code Test Page</h1>
        <div className="bg-white p-8 rounded-xl">
          <h2 className="text-xl font-semibold mb-4">Test QR Code:</h2>
          <canvas 
            ref={canvasRef} 
            width="300" 
            height="300" 
            style={{ border: '2px solid #000' }}
          />
        </div>
        <p className="text-slate-400 mt-4">
          Check the browser console for debug messages
        </p>
      </div>
    </div>
  );
}
