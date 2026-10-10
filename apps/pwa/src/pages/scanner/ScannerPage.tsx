import { useState, useRef, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Alert } from '../../components/ui/Alert';

export function ScannerPage() {
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (cameraActive) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch((err) => {
          console.error("Camera access error:", err);
          setError("Unable to access camera. Please check permissions or use manual entry.");
          setCameraActive(false);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraActive]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;

    let token = manualInput.trim();
    // Try to extract ATR_xxx if full URL is pasted
    const match = token.match(/qr\/(ATR_[a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      token = match[1];
    } else if (token.includes('/')) {
      const parts = token.split('/');
      token = parts[parts.length - 1];
    }

    if (!token) {
      setError("Invalid QR code format.");
      return;
    }

    navigate(`/qr/${token}`);
  };

  return (
    <div className="max-w-md mx-auto p-4 sm:p-6 space-y-6 pb-20">
      <h1 className="text-2xl font-bold text-slate-900 text-center">Scan Equipment QR</h1>
      
      {error && <Alert variant="error" title="Error">{error}</Alert>}

      <Card className="p-4 overflow-hidden">
        {cameraActive ? (
          <div className="relative aspect-square bg-black rounded-lg overflow-hidden flex items-center justify-center">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Viewfinder overlay */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="w-48 h-48 border-2 border-emerald-500 rounded-lg relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-500" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-500" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-500" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-500" />
              </div>
              <p className="mt-8 text-white font-medium bg-black/50 px-3 py-1 rounded">
                Point camera at QR Code
              </p>
              <p className="mt-2 text-white/80 text-xs bg-black/50 px-3 py-1 rounded">
                (Visual preview only. Use manual entry below.)
              </p>
            </div>
            <button 
              onClick={() => setCameraActive(false)}
              className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        ) : (
          <div className="aspect-square bg-slate-100 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-slate-300 p-6 text-center">
            <svg className="w-16 h-16 text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-slate-600 mb-4 text-sm">
              Use your device's camera to scan an equipment QR code.
            </p>
            <Button onClick={() => setCameraActive(true)} variant="outline">
              Open Camera Preview
            </Button>
          </div>
        )}
      </Card>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-slate-50 text-slate-500">Or enter manually</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="QR Token or URL"
          placeholder="e.g. ATR_123456"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
        />
        <Button type="submit" className="w-full" disabled={!manualInput.trim()}>
          Go to Equipment
        </Button>
      </form>
    </div>
  );
}
