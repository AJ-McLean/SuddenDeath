import { useRef, useEffect, useCallback, useState } from "react";

interface UseWebcamReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  isLoading: boolean;
  hasPermission: boolean | null;
  error: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
}

export function useWebcam(): UseWebcamReturn {
  const videoRef = useRef<HTMLVideoElement>(null!);
  const streamRef = useRef<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermission(true);
    } catch (err: any) {
      setHasPermission(false);
      setError(err.message || "Camera access denied");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return { videoRef, isLoading, hasPermission, error, startCamera, stopCamera };
}
