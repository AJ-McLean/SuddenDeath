import { useWebcam } from "@/hooks/useWebcam";
import { usePortal } from "@/context/PortalContext";
import { useEffect } from "react";

interface WebcamFrameProps {
  fullscreen?: boolean;
}

export function WebcamFrame({ fullscreen = false }: WebcamFrameProps) {
  const { videoRef, isLoading, hasPermission, startCamera } = useWebcam();
  const { state, setCameraEnabled } = usePortal();

  useEffect(() => {
    if (state === "quiz.loadingCamera" || state === "quiz.ready") {
      // Try to use the pre-acquired stream from user gesture
      const existingStream = (window as any).__portalStream as MediaStream | undefined;
      if (existingStream && videoRef.current) {
        const videoTracks = existingStream.getVideoTracks();
        if (videoTracks.length > 0) {
          videoRef.current.srcObject = existingStream;
          setCameraEnabled(true);
          return;
        }
      }
      // Fallback: request camera (may fail without gesture)
      startCamera().then(() => setCameraEnabled(true)).catch(() => {});
    }
  }, [state, startCamera, setCameraEnabled, videoRef]);

  if (fullscreen) {
    return (
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover scale-x-[-1]"
        />
        {/* Subtle vignette overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, transparent 40%, hsl(var(--background) / 0.6) 100%)",
          }}
        />
        {/* Scanline overlay */}
        <div className="absolute inset-0 pointer-events-none scanline-overlay scanline-moving opacity-30" />
      </div>
    );
  }

  return (
    <div className="relative w-48 h-48 flex-shrink-0">
      <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-primary/30 glow-border">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover scale-x-[-1]"
        />
      </div>
    </div>
  );
}
