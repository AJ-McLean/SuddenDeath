import { motion } from "framer-motion";
import { PortalRing } from "@/components/portal/PortalRing";
import { GlitchText } from "@/components/portal/GlitchText";
import { usePortal } from "@/context/PortalContext";

export function PortalLanding() {
  const { setState, setCameraEnabled } = usePortal();

  const handleStart = async () => {
    // Request permissions directly in the click handler (user gesture context)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      (window as any).__portalStream = stream;
      setCameraEnabled(true);
    } catch {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
