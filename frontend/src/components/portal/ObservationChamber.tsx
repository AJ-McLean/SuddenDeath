import { useEffect } from "react";
import { motion } from "framer-motion";
import { usePortal } from "@/context/PortalContext";
import { WebcamFrame } from "@/components/portal/WebcamFrame";
import { AICore } from "@/components/portal/AICore";
import { QuestionHUD } from "@/components/portal/QuestionHUD";
import { VoiceInput } from "@/components/portal/VoiceInput";
import { AudioPlayer } from "@/components/portal/AudioPlayer";
import { RotateCcw } from "lucide-react";
import wheatleyImg from "@/assets/wheatley.png";

export function ObservationChamber() {
  const { state, setState, addMessage, resetSession, assistantState } = usePortal();

  useEffect(() => {
    if (state === "quiz.loadingCamera") {
      const timer = setTimeout(() => {
        setState("quiz.ready");
        addMessage({
          role: "assistant",
          content: "Welcome to the Aperture Science Cognitive Evaluation Chamber.",
          timestamp: Date.now(),
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state, setState, addMessage]);

  const isSpeaking = assistantState === "speaking";
  const isThinking = assistantState === "thinking";

  return (
    <motion.div
      className="relative w-full h-screen overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <AudioPlayer />
      {/* Fullscreen webcam mirror */}
      <WebcamFrame fullscreen />

      {/* HUD overlay layer */}
      <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">

        {/* Top HUD bar */}
        <div className="flex items-center justify-between px-5 py-3 pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-primary animate-portal-pulse" />
            <span className="text-[10px] font-mono text-primary/70 uppercase tracking-[0.15em] drop-shadow-lg">
              Observation Chamber — Active
            </span>
          </div>
          <button
            onClick={resetSession}
            className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-mono text-primary/60 hover:text-primary border border-primary/20 rounded-sm hover:border-primary/40 transition-colors backdrop-blur-sm bg-background/20"
          >
            <RotateCcw className="w-3 h-3" />
            Restart
          </button>
        </div>

        {/* Question HUD — top center */}
        <div className="flex justify-center pt-1 pointer-events-auto">
          <QuestionHUD />
        </div>

        {/* Wheatley — top right, alive */}
        <motion.div
          className="absolute top-20 right-4 md:right-8"
          // Gentle float
          animate={{
            y: [0, -6, 2, -3, 0],
            rotate: isSpeaking ? [0, 2, -1.5, 1, -0.5, 0] : [0, 0.5, -0.5, 0],
          }}
          transition={{
            duration: isSpeaking ? 1.5 : 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* Scale breathe — bigger when speaking */}
          <motion.div
            className="relative w-36 h-36 md:w-48 md:h-48"
            animate={{
              scale: isSpeaking ? [1, 1.12, 0.95, 1.08, 1] : isThinking ? [1, 1.04, 1] : [1, 1.02, 1],
            }}
            transition={{
              duration: isSpeaking ? 0.8 : isThinking ? 2 : 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {/* Eye glow spill */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              style={{ transform: "translate(-2%, -5%)" }}
            >
              <motion.div
                className="rounded-full"
                style={{
                  width: "50%",
                  height: "50%",
                  background: `radial-gradient(circle, hsl(var(--glow-primary) / 0.25) 0%, transparent 70%)`,
                  filter: "blur(15px)",
                }}
                animate={{
                  scale: isSpeaking ? [1, 1.5, 1] : [1, 1.1, 1],
                  opacity: isSpeaking ? [0.5, 1, 0.5] : [0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: isSpeaking ? 0.6 : 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </motion.div>

            {/* Wheatley image */}
            <img
              src={wheatleyImg}
              alt="Wheatley"
              className="w-full h-full object-contain relative z-10"
              style={{
                filter: `drop-shadow(0 0 20px hsl(var(--glow-primary) / 0.25)) drop-shadow(0 0 40px hsl(var(--glow-primary) / 0.1))`,
              }}
            />

            {/* Orb eye overlay */}
            <div
              className="absolute inset-0 z-20 flex items-center justify-center"
              style={{ transform: "translate(-2%, -4%)" }}
            >
              <AICore size={32} />
            </div>
          </motion.div>

          {/* State label */}
          <motion.div
            className="text-center mt-1 text-[9px] font-mono text-primary/40 uppercase tracking-[0.2em]"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {assistantState === "idle" ? "standby" : assistantState}
          </motion.div>
        </motion.div>

        {/* Waveform — positioned at 3/4 down */}
        <div className="flex-1" />
        <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-auto">
          <VoiceInput />
        </div>
      </div>
    </motion.div>
  );
}
