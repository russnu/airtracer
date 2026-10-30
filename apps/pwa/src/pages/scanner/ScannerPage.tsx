import { useState, useRef, useEffect, useCallback } from "react";
import type { FormEvent, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import jsQR from "jsqr";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import { Alert } from "../../components/ui/Alert";
import { parseQrToken } from "../../lib/qr";

export function ScannerPage() {
  const [manualInput, setManualInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();

  // Helper to stop all camera tracks and clear animation frames
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Handle a successfully resolved AirTracer token
  const handleTokenFound = useCallback(
    (token: string) => {
      // Provide haptic feedback on devices that support it
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(100);
        } catch {
          // Ignore vibration errors if blocked by browser policy
        }
      }
      stopCamera();
      navigate(`/qr/${token}`);
    },
    [navigate, stopCamera],
  );

  // Scanning loop for the active camera stream
  const scanFrame = useCallback(() => {
    if (!cameraActive || !videoRef.current) {
      return;
    }

    const video = videoRef.current;

    // Check if video is loaded and ready
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      const now = performance.now();
      // Throttle scanning to ~12 FPS (approx. every 80ms) for battery and performance
      if (now - lastScanTimeRef.current >= 80) {
        lastScanTimeRef.current = now;

        if (!canvasRef.current) {
          canvasRef.current = document.createElement("canvas");
        }
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code && code.data) {
            const token = parseQrToken(code.data);
            if (token) {
              handleTokenFound(token);
              return;
            } else {
              setWarning(
                "Detected QR code is not a valid AirTracer equipment tag.",
              );
            }
          }
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  }, [cameraActive, handleTokenFound]);

  // Manage camera lifecycle
  useEffect(() => {
    if (!cameraActive) {
      return;
    }

    let isMounted = true;
    setError(null);
    setWarning(null);

    // Check for MediaDevices support
    if (!navigator?.mediaDevices?.getUserMedia) {
      setError(
        "Camera access is not supported by your browser or environment. Please use manual entry.",
      );
      setCameraActive(false);
      return;
    }

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      .then((stream) => {
        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.play().catch((err) => {
            console.error("Video play error:", err);
          });
        }
        animationFrameRef.current = requestAnimationFrame(scanFrame);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        console.error("Camera access error:", err);

        const errorObj = err as { name?: string };
        if (
          errorObj.name === "NotAllowedError" ||
          errorObj.name === "PermissionDeniedError"
        ) {
          setError(
            "Camera permission was denied. Please allow camera access in your browser settings or use manual entry.",
          );
        } else if (
          errorObj.name === "NotFoundError" ||
          errorObj.name === "DevicesNotFoundError"
        ) {
          setError(
            "No camera found on your device. Please use manual entry or upload a photo.",
          );
        } else {
          setError(
            "Unable to access camera. Please check permissions or use manual entry.",
          );
        }
        setCameraActive(false);
      });

    return () => {
      isMounted = false;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [cameraActive, scanFrame]);

  // Handle manual form submission
  const handleManualSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setWarning(null);

    const token = parseQrToken(manualInput);
    if (!token) {
      setError(
        "Invalid QR code format. Please enter a valid ATR token or link.",
      );
      return;
    }

    handleTokenFound(token);
  };

  // Decode QR code from an uploaded image file
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setWarning(null);
    setIsProcessingFile(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        if (!ctx) {
          setError("Failed to process image context.");
          setIsProcessingFile(false);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth",
        });

        setIsProcessingFile(false);
        // Reset file input value so the same file can be selected again if needed
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        if (code && code.data) {
          const token = parseQrToken(code.data);
          if (token) {
            handleTokenFound(token);
          } else {
            setError(
              "Found a QR code in the image, but it is not a valid AirTracer equipment tag.",
            );
          }
        } else {
          setError(
            "No QR code detected in the selected image. Please try another photo.",
          );
        }
      };

      img.onerror = () => {
        setIsProcessingFile(false);
        setError("Could not load image file. Please try another image.");
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      setIsProcessingFile(false);
      setError("Failed to read the file.");
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-md mx-auto p-4 sm:p-6 space-y-6 pb-20">
      <h1 className="text-2xl font-bold text-brand-tertiary text-center">
        Scan Equipment QR
      </h1>

      {error && (
        <Alert variant="error" title="Error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {warning && (
        <Alert
          variant="warning"
          title="Notice"
          onDismiss={() => setWarning(null)}
        >
          {warning}
        </Alert>
      )}

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
              <div className="w-52 h-52 border-2 border-success-500 rounded-lg relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-success-500" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-success-500" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-success-500" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-success-500" />
              </div>
              <p className="mt-8 text-white text-sm font-medium bg-black/60 px-3 py-1.5 rounded-full">
                Align QR code within frame
              </p>
            </div>
            <button
              type="button"
              onClick={stopCamera}
              className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full hover:bg-black/80 transition-colors"
              aria-label="Close camera"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ) : (
          <div className="aspect-square bg-primary-100 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-primary-300 p-6 text-center">
            <svg
              className="w-16 h-16 text-primary-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <p className="text-primary-600 mb-5 text-sm">
              Use your device camera or upload an image to scan an equipment QR
              code.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs justify-center">
              <Button
                type="button"
                onClick={() => setCameraActive(true)}
                className="w-full"
              >
                Open Camera
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingFile}
                isLoading={isProcessingFile}
                className="w-full"
              >
                Upload Photo
              </Button>
            </div>
            {/* Hidden file input for gallery upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        )}
      </Card>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-primary-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-primary-50 text-primary-500">
            Or enter manually
          </span>
        </div>
      </div>

      <form onSubmit={handleManualSubmit} className="space-y-4">
        <Input
          label="QR Token or URL"
          placeholder="e.g. ATR_xxxx or full passport link"
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
