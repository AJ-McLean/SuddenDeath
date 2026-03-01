import { useState, useRef, useEffect, useCallback } from "react";
import { usePortal } from "@/context/PortalContext";
import { pollAudioJob, startAudioGeneration } from "@/services/backendApi";

interface AudioSequence {
  preUrl?: string;
  liveUrl?: string;
  pollUrl?: string;
  postUrl?: string;
  sessionId?: string;
  startAudioEndpoint?: string;
}

interface AudioPlayerProps {
  playIntroOnMount?: boolean;
}

export function AudioPlayer({ playIntroOnMount = false }: AudioPlayerProps = {}) {
  const { setAssistantState } = usePortal();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSequence, setCurrentSequence] = useState<AudioSequence | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const playSequence = useCallback(async (sequence: AudioSequence) => {
    setCurrentSequence(sequence);
    setIsPlaying(true);
    setAssistantState("speaking");

    // Mute speech recognition during playback to prevent feedback
    const voiceInput = (window as any).__voiceInput;
    const originalMuted = voiceInput?.isMuted || false;
    if (voiceInput && !originalMuted) {
      voiceInput.setMuted(true);
    }

    try {
      // Step 1: Play pre-audio and trigger TTS generation when playback starts
      if (sequence.preUrl) {
        // Start playing pre-audio
        const preAudioPromise = playAudio(sequence.preUrl);
        
        // CRITICAL: Trigger TTS generation when pre-audio actually starts playing
        if (sequence.sessionId && sequence.startAudioEndpoint) {
          // Wait a tiny bit to ensure audio is actually playing
          setTimeout(async () => {
            try {
              const ttsResult = await startAudioGeneration(sequence.sessionId!);
              if (ttsResult.pollUrl) {
                sequence.pollUrl = ttsResult.pollUrl;
              } else if (ttsResult.audioUrl) {
                sequence.liveUrl = ttsResult.audioUrl;
              }
            } catch (error) {
              console.error("Failed to start TTS generation:", error);
            }
          }, 100); // 100ms delay to ensure audio playback started
        }
        
        // Wait for pre-audio to finish
        await preAudioPromise;
      }

      // Step 2: Get live audio (either directly or via polling)
      let liveUrl = sequence.liveUrl;
      if (!liveUrl && sequence.pollUrl) {
        liveUrl = await pollForLiveAudio(sequence.pollUrl);
      }

      // Step 3: Play live audio if available
      if (liveUrl) {
        await playAudio(liveUrl);
      }

      // Step 4: Play post-audio if available
      if (sequence.postUrl) {
        await playAudio(sequence.postUrl);
      }

      setAssistantState("idle");
    } catch (error) {
      console.error("Audio playback error:", error);
      setAssistantState("idle");
    } finally {
      setIsPlaying(false);
      setCurrentSequence(null);
      
      // Restore original mute state after playback
      if (voiceInput && !originalMuted) {
        // Wait a bit before unmuting to avoid feedback
        setTimeout(() => {
          voiceInput.setMuted(false);
        }, 500);
      }
    }
  }, [setAssistantState]);

  const playAudio = (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!audioRef.current) {
        reject(new Error("Audio element not available"));
        return;
      }

      const audio = audioRef.current;
      
      const handleEnded = () => {
        audio.removeEventListener("ended", handleEnded);
        audio.removeEventListener("error", handleError);
        resolve();
      };

      const handleError = (error: any) => {
        audio.removeEventListener("ended", handleEnded);
        audio.removeEventListener("error", handleError);
        console.error("Audio playback error:", error);
        reject(new Error(`Failed to play audio: ${url}`));
      };

      audio.addEventListener("ended", handleEnded);
      audio.addEventListener("error", handleError);

      audio.src = url;
      audio.muted = false;
      audio.volume = 1.0;
      
      // Try multiple strategies to play audio
      const attemptPlay = async () => {
        try {
          await audio.play();
        } catch (error: any) {
          console.error("Initial play failed:", error);
          // Try with a slight delay
          setTimeout(async () => {
            try {
              await audio.play();
            } catch (retryError) {
              console.error("Retry play failed:", retryError);
              handleError(retryError);
            }
          }, 100);
        }
      };
      
      attemptPlay();
    });
  };

  const pollForLiveAudio = async (pollUrl: string): Promise<string | null> => {
    setAssistantState("thinking");
    
    const maxAttempts = 30; // 30 seconds max
    let attempts = 0;

    return new Promise((resolve) => {
      const poll = async () => {
        try {
          const status = await pollAudioJob(pollUrl);
          
          if (status.status === "completed" && status.audioUrl) {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            resolve(status.audioUrl);
          } else if (status.status === "failed" || attempts >= maxAttempts) {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            console.error("Audio generation failed or timed out");
            resolve(null);
          } else {
            attempts++;
          }
        } catch (error) {
          console.error("Polling error:", error);
          attempts++;
          if (attempts >= maxAttempts) {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            resolve(null);
          }
        }
      };

      // Start polling
      pollIntervalRef.current = setInterval(poll, 1000);
      poll(); // Initial poll
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Play intro audio on component mount
  const playIntroAudio = useCallback(async () => {
    try {
      const introUrl = `${import.meta.env.VITE_API_BASE || 'http://localhost:3001'}/api/audio/intro?t=${Date.now()}`;
      await playAudio(introUrl);
    } catch (error) {
      console.error("Failed to play intro audio:", error);
    }
  }, []);

  // Auto-play intro on mount (only if prop is true)
  useEffect(() => {
    if (playIntroOnMount) {
      // Try immediate playback
      const timer = setTimeout(() => {
        playIntroAudio();
      }, 100);
      
      // Also try on any user interaction
      const handleUserInteraction = () => {
        playIntroAudio();
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('keydown', handleUserInteraction);
        document.removeEventListener('touchstart', handleUserInteraction);
      };
      
      document.addEventListener('click', handleUserInteraction);
      document.addEventListener('keydown', handleUserInteraction);
      document.addEventListener('touchstart', handleUserInteraction);
      
      return () => {
        clearTimeout(timer);
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('keydown', handleUserInteraction);
        document.removeEventListener('touchstart', handleUserInteraction);
      };
    }
  }, [playIntroAudio, playIntroOnMount]);

  // Expose playSequence and playIntroAudio to parent components
  useEffect(() => {
    (window as any).__audioPlayer = { playSequence, playIntroAudio };
  }, [playSequence, playIntroAudio]);

  return (
    <audio
      ref={audioRef}
      preload="auto"
      autoPlay
      muted={false}
      style={{ display: "none" }}
    />
  );
}