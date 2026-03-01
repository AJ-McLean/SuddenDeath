import { useState, useRef, useEffect, useCallback } from "react";
import { usePortal } from "@/context/PortalContext";
import { sendMessage } from "@/services/backendApi";
import { Mic, MicOff } from "lucide-react";
import { motion } from "framer-motion";

const BAR_COUNT = 48;

export function VoiceInput() {
  const {
    state, setState, sessionId, addMessage,
    cameraEnabled, setAssistantState, setOutcome,
    setQuestionResult, setCurrentQuestion,
  } = usePortal();

  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [analyserData, setAnalyserData] = useState<number[]>(new Array(BAR_COUNT).fill(0));
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>();
  const recognitionRef = useRef<any>(null);
  const isWaiting = state === "quiz.waitingResponse";
  const mutedRef = useRef(isMuted);
  mutedRef.current = isMuted;
  const isListeningRef = useRef(isListening);
  isListeningRef.current = isListening;
  const isWaitingRef = useRef(isWaiting);
  isWaitingRef.current = isWaiting;

  // Waveform animation loop
  const updateWaveform = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const step = Math.max(1, Math.floor(data.length / BAR_COUNT));
    const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
      const idx = i * step;
      const avg = (data[idx] + (data[idx + 1] || data[idx])) / 2;
      return mutedRef.current ? 0 : avg / 255;
    });
    setAnalyserData(bars);
    animFrameRef.current = requestAnimationFrame(updateWaveform);
  }, []);

  // Auto-start listening when entering quiz.ready
  useEffect(() => {
    if (state === "quiz.ready" && !isListening) {
      startListening();
    }
  }, [state]);

  // Spacebar mute toggle — use document level with capture to intercept before anything else
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        e.stopPropagation();
        setIsMuted(prev => !prev);
      }
    };
    // Use capture phase to ensure we get the event first
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  const startRecognition = useCallback(() => {
    // Try to reuse the recognition started during user gesture
    const existing = (window as any).__portalRecognition;
    if (existing && !recognitionRef.current) {
      recognitionRef.current = existing;
      existing.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            const transcript = event.results[i][0].transcript.trim();
            if (transcript) handleSend(transcript);
          }
        }
      };
      existing.onerror = () => {};
      existing.onend = () => {
        if (!mutedRef.current) {
          try { existing.start(); } catch {}
        }
      };
      // Already started from gesture, just wire up handlers
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0].transcript.trim();
          if (transcript) handleSend(transcript);
        }
      }
    };

    recognition.onerror = () => {};

    recognition.onend = () => {
      if (!mutedRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    try { recognition.start(); } catch {}
  }, []);

  // Mute/unmute speech recognition only (waveform keeps running)
  useEffect(() => {
    if (isMuted) {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
        recognitionRef.current = null;
      }
    } else {
      if (isListeningRef.current && !isWaitingRef.current && !recognitionRef.current) {
        startRecognition();
      }
    }
  }, [isMuted, startRecognition]);
  const startListening = useCallback(async () => {
    try {
      // Reuse the stream acquired during the user gesture (button click)
      let stream = (window as any).__portalStream as MediaStream | undefined;
      if (!stream || stream.getAudioTracks().length === 0) {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100
          } 
        });
      }
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      
      // CRITICAL: Only connect to analyser, NEVER to destination (speakers)
      source.connect(analyser);
      
      // Ensure the stream audio tracks don't output to speakers
      stream.getAudioTracks().forEach(track => {
        track.enabled = true; // Keep enabled for processing
        // Ensure no echo/monitoring
        if ('getSettings' in track) {
          const settings = track.getSettings();
          console.log('Audio track settings:', settings);
        }
      });
      
      analyserRef.current = analyser;

      setIsListening(true);
      updateWaveform();

      if (!isMuted) {
        startRecognition();
      }
    } catch {
      console.error("Microphone access denied");
    }
  }, [updateWaveform, startRecognition, isMuted]);

  // Expose voice input controls to global scope for AudioPlayer coordination
  useEffect(() => {
    (window as any).__voiceInput = {
      isMuted,
      setMuted: setIsMuted
    };
  }, [isMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      // Clean up global reference
      delete (window as any).__voiceInput;
    };
  }, []);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    addMessage({ role: "user", content: text, timestamp: Date.now() });
    setState("quiz.waitingResponse");
    setAssistantState("thinking");

    try {
      const res = await sendMessage({
        sessionId,
        message: text,
        clientMeta: { cameraEnabled, viewport: `${window.innerWidth}x${window.innerHeight}` },
      });

      setAssistantState(res.assistantState || "speaking");
      addMessage({ role: "assistant", content: res.assistantMessage, timestamp: Date.now() });

      if (res.questionResult && res.questionIndex !== undefined) {
        setQuestionResult(res.questionIndex, res.questionResult);
        setCurrentQuestion(res.questionIndex + 1);
      }

      // Play audio sequence if available
      if (res.preUrl || res.liveUrl || res.pollUrl || res.postUrl || res.audioUrl || res.startAudioEndpoint) {
        const audioPlayer = (window as any).__audioPlayer;
        if (audioPlayer) {
          await audioPlayer.playSequence({
            preUrl: res.preUrl,
            liveUrl: res.liveUrl || res.audioUrl,
            pollUrl: res.pollUrl,
            postUrl: res.postUrl,
            sessionId: sessionId,
            startAudioEndpoint: res.startAudioEndpoint,
          });
        }
      }

      if (res.ended && res.outcome) {
        setOutcome(res);
        setTimeout(() => {
          setState(res.outcome === "win" ? "quiz.ended.win" : "quiz.ended.lose");
          setAssistantState("idle");
        }, 1500);
      } else {
        setState("quiz.ready");
        setTimeout(() => setAssistantState("idle"), 2000);
      }
    } catch {
      setAssistantState("idle");
      addMessage({
        role: "assistant",
        content: "[SYSTEM ERROR] Connection to testing mainframe lost. Please try again.",
        timestamp: Date.now(),
      });
      setState("quiz.ready");
    }
  };

  // Mirror: left half is reversed copy of right half
  const halfCount = BAR_COUNT / 2;
  const rightHalf = analyserData.slice(0, halfCount);
  const leftHalf = [...rightHalf].reverse();
  const mirroredData = [...leftHalf, ...rightHalf];

  return (
    <>
      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
      {/* Mirrored waveform — centered, fluid */}
      <div className="flex items-center justify-center gap-[1.5px] h-20 w-[min(80vw,500px)]">
        {mirroredData.map((val, i) => {
          const distFromCenter = Math.abs(i - halfCount) / halfCount;
          const heightScale = 1 - distFromCenter * 0.3; // taller in center
          const barHeight = isListening
            ? Math.max(2, val * 80 * heightScale)
            : 2;

          return (
            <motion.div
              key={i}
              className="rounded-full"
              style={{
                width: 4,
                background: isListening
                  ? `hsl(var(--primary) / ${0.3 + val * 0.7})`
                  : `hsl(var(--muted-foreground) / 0.15)`,
              }}
              animate={{ height: barHeight }}
              transition={{ duration: 0.06, ease: "easeOut" }}
            />
          );
        })}
      </div>

      {/* Fixed bottom-left mute status */}
      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 pointer-events-none">
        {isMuted ? (
          <motion.div
            className="flex items-center gap-2 px-3 py-1.5 rounded-sm border border-destructive/30 bg-background/30 backdrop-blur-sm"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <MicOff className="w-3.5 h-3.5 text-destructive" />
            <span className="text-[10px] font-mono text-destructive uppercase tracking-widest">
              Muted
            </span>
            <span className="text-[8px] font-mono text-muted-foreground ml-1">
              [space]
            </span>
          </motion.div>
        ) : (
          <motion.div
            className="flex items-center gap-2 px-3 py-1.5 rounded-sm border border-primary/20 bg-background/20 backdrop-blur-sm"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Mic className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-mono text-primary/70 uppercase tracking-widest">
              {isWaiting ? "Processing" : isListening ? "Live" : "Init"}
            </span>
            <span className="text-[8px] font-mono text-muted-foreground ml-1">
              [space]
            </span>
          </motion.div>
        )}
      </div>
      {!isMuted && (
        <span className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest">
          {isWaiting ? "Processing…" : isListening ? "Listening — space to mute" : "Initializing…"}
        </span>
      )}
    </motion.div>
    </>
  );
}
