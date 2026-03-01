import { motion } from "framer-motion";
import { PortalRing } from "@/components/portal/PortalRing";
import { GlitchText } from "@/components/portal/GlitchText";
import { usePortal } from "@/context/PortalContext";
import { AudioPlayer } from "@/components/portal/AudioPlayer";
import { useState, useEffect } from "react";

export function PortalLanding() {
  const { setState, setCameraEnabled } = usePortal();

  const captureAndAnalyzeOutfit = async (stream: MediaStream) => {
    try {
      // Create video element to capture frame
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true; // CRITICAL: Mute to prevent microphone feedback!
      video.play();

      // Wait for video to be ready and playing
      await new Promise((resolve) => {
        video.addEventListener('loadedmetadata', resolve, { once: true });
      });
      
      // Wait a bit more for the camera to actually start showing video
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create canvas to capture frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx!.drawImage(video, 0, 0);

      // Convert to base64
      const imageData = canvas.toDataURL('image/jpeg', 0.8);

      // Send to backend for Gemini analysis
      const response = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:3001'}/api/analyze-outfit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageData }),
      });

      const result = await response.json();
      console.log('Wheatley says:', result.wittyOneLiner);
      
      // Store the TTS result and coordinate with Second Intro timing
      const playWheatleyWhenIntroEnds = (audioUrl: string) => {
        const introAudio = (window as any).__introAudio;
        if (introAudio && !introAudio.ended && !introAudio.paused) {
          // Second Intro is still playing, wait for it to finish
          introAudio.addEventListener('ended', () => {
            const audio = new Audio(`${import.meta.env.VITE_API_BASE || 'http://localhost:3001'}${audioUrl}`);
            audio.play().catch(console.error);
          }, { once: true });
        } else {
          // Second Intro already finished, play immediately
          const audio = new Audio(`${import.meta.env.VITE_API_BASE || 'http://localhost:3001'}${audioUrl}`);
          audio.play().catch(console.error);
        }
      };

      // Handle TTS response - either direct URL or polling
      if (result.audioUrl) {
        playWheatleyWhenIntroEnds(result.audioUrl);
      } else if (result.pollUrl) {
        // Poll for TTS completion and play when ready
        const pollForAudio = async () => {
          try {
            const pollResponse = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:3001'}${result.pollUrl}`);
            const pollResult = await pollResponse.json();
            
            if (pollResult.status === 'completed' && pollResult.audioUrl) {
              playWheatleyWhenIntroEnds(pollResult.audioUrl);
            } else if (pollResult.status === 'generating') {
              // Keep polling
              setTimeout(pollForAudio, 500);
            }
          } catch (error) {
            console.error('Failed to poll for TTS:', error);
          }
        };
        pollForAudio();
      }
      
    } catch (error) {
      console.error('Failed to capture and analyze outfit:', error);
    }
  };


  const handleStart = async () => {
    // Mute any currently playing audio (intro)
    const audioPlayer = (window as any).__audioPlayer;
    if (audioPlayer && audioPlayer.audioRef && audioPlayer.audioRef.current) {
      audioPlayer.audioRef.current.pause();
    }

    // Play "Second Intro.mp3" as latency buffer (cache-bust to get updated version)
    const secondIntroAudio = new Audio(`${import.meta.env.VITE_API_BASE || 'http://localhost:3001'}/api/audio/static/intro/second-intro?t=${Date.now()}`);
    (window as any).__introAudio = secondIntroAudio;
    
    try {
      await secondIntroAudio.play();
    } catch (error) {
      console.error('Failed to play second intro audio:', error);
    }

    // Request permissions directly in the click handler (user gesture context)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }, 
        video: true 
      });
      (window as any).__portalStream = stream;
      setCameraEnabled(true);
      
      // Wait for camera stream to initialize, then capture
      setTimeout(() => {
        captureAndAnalyzeOutfit(stream);
      }, 1000);
    } catch {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100
          } 
        });
        (window as any).__portalStream = stream;
      } catch {
        console.warn("No media permissions granted");
      }
    }

    // Start speech recognition in user gesture context
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "en-US";
      (window as any).__portalRecognition = recognition;
      recognition.start();
    }

    setState("transitioning");
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden">
      <AudioPlayer playIntroOnMount={true} />
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 30%, hsl(var(--chamber-bg)) 80%)",
        }}
      />

      {/* Portal ring */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="relative z-10 mb-10"
      >
        <PortalRing />
      </motion.div>

      {/* Title */}
      <div className="relative z-10 text-center space-y-3 mb-10">
        <h1 className="text-3xl md:text-5xl font-display font-bold tracking-wider text-glow">
          <GlitchText text="APERTURE TESTING" delay={500} />
        </h1>
        <p className="text-sm md:text-base font-mono text-muted-foreground max-w-md mx-auto">
          <GlitchText
            text="Observation Protocol v2.4 — Cognitive Evaluation Chamber"
            delay={1800}
          />
        </p>
      </div>

      {/* CTA */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 3, duration: 0.5 }}
        onClick={handleStart}
        className="relative z-10 group px-8 py-3 bg-primary/10 border border-primary/40 rounded-sm font-display text-sm tracking-[0.2em] uppercase text-primary transition-all hover:bg-primary/20 hover:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-background"
        style={{
          boxShadow: "0 0 20px hsl(var(--glow-primary) / 0.1)",
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLElement).style.boxShadow =
            "0 0 30px hsl(var(--glow-primary) / 0.3), 0 0 60px hsl(var(--glow-primary) / 0.1)";
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLElement).style.boxShadow =
            "0 0 20px hsl(var(--glow-primary) / 0.1)";
        }}
      >
        Begin Evaluation
      </motion.button>

      {/* Bottom console text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.5 }}
        className="absolute bottom-6 text-[10px] font-mono text-muted-foreground/40 tracking-wider"
      >
        APERTURE SCIENCE ENRICHMENT CENTER — ALL RIGHTS RESERVED
      </motion.div>
    </div>
  );
}
