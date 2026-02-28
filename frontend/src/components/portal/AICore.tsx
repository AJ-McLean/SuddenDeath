import { usePortal } from "@/context/PortalContext";
import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";

interface AICoreProps {
  size?: number;
}

export function AICore({ size = 100 }: AICoreProps) {
  const { assistantState } = usePortal();
  const controls = useAnimation();
  const blobControls = useAnimation();

  // Continuous ferrofluid morph loop
  useEffect(() => {
    let active = true;

    const randomRadius = (base: number, variance: number) =>
      `${base + (Math.random() - 0.5) * variance}%`;

    const morph = async () => {
      while (active) {
        const isSpeaking = assistantState === "speaking";
        const isThinking = assistantState === "thinking";

        const variance = isSpeaking ? 30 : isThinking ? 18 : 10;
        const duration = isSpeaking ? 0.3 + Math.random() * 0.3 : isThinking ? 0.8 + Math.random() * 0.5 : 1.2 + Math.random() * 0.8;
        const scaleRange = isSpeaking ? 0.15 : isThinking ? 0.08 : 0.04;

        const radii = Array.from({ length: 8 }, () => randomRadius(50, variance));

        await blobControls.start({
          borderRadius: `${radii[0]} ${radii[1]} ${radii[2]} ${radii[3]} / ${radii[4]} ${radii[5]} ${radii[6]} ${radii[7]}`,
          scale: 1 + (Math.random() - 0.5) * scaleRange * 2,
          rotate: (Math.random() - 0.5) * (isSpeaking ? 12 : 4),
          transition: { duration, ease: "easeInOut" },
        });
      }
    };

    morph();
    return () => { active = false; };
  }, [assistantState, blobControls]);

  // Positional movement
  useEffect(() => {
    const isSpeaking = assistantState === "speaking";
    const isThinking = assistantState === "thinking";

    controls.start({
      y: isSpeaking ? [0, -6, 3, -4, 1, -3, 0] : isThinking ? [0, -2, 0] : [0, -2, 0, -1, 0],
      x: isSpeaking ? [0, 4, -2, 5, -2, 3, 0] : isThinking ? [0, -1, 1, 0] : [0, 1, -0.5, 0],
      transition: {
        duration: isSpeaking ? 1 : isThinking ? 2.5 : 5,
        repeat: Infinity,
        ease: "easeInOut",
      },
    });
  }, [assistantState, controls]);

  const getGlowIntensity = () => {
    switch (assistantState) {
      case "speaking":
        return `0 0 ${size * 0.4}px hsl(var(--glow-primary) / 0.8), 0 0 ${size * 0.8}px hsl(var(--glow-primary) / 0.4), 0 0 ${size * 1.2}px hsl(var(--glow-primary) / 0.15)`;
      case "thinking":
        return `0 0 ${size * 0.25}px hsl(var(--glow-primary) / 0.5), 0 0 ${size * 0.5}px hsl(var(--glow-primary) / 0.2)`;
      default:
        return `0 0 ${size * 0.18}px hsl(var(--glow-primary) / 0.35), 0 0 ${size * 0.35}px hsl(var(--glow-primary) / 0.12)`;
    }
  };

  const orbSize = assistantState === "speaking" ? size * 1.15 : size;

  return (
    <motion.div
      className="relative flex items-center justify-center"
      style={{ width: size * 2, height: size * 2 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
    >
      {/* Ambient glow backdrop */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: size * 2.5,
          height: size * 2.5,
          background: `radial-gradient(circle, hsl(var(--glow-primary) / 0.2) 0%, transparent 70%)`,
        }}
        animate={{
          scale: assistantState === "speaking" ? [1, 1.4, 1] : [1, 1.1, 1],
          opacity: assistantState === "speaking" ? [0.5, 1, 0.5] : [0.3, 0.5, 0.3],
        }}
        transition={{ duration: assistantState === "speaking" ? 0.8 : 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Ferrofluid core */}
      <motion.div animate={controls}>
        <motion.div
          animate={blobControls}
          style={{
            width: orbSize,
            height: orbSize,
            background: `radial-gradient(circle at 30% 30%, hsl(var(--glow-primary) / 0.95), hsl(var(--primary)) 45%, hsl(var(--glow-primary) / 0.5) 80%, hsl(var(--primary) / 0.8))`,
            boxShadow: getGlowIntensity(),
            borderRadius: "50%",
          }}
        />
      </motion.div>

      {/* Inner highlight */}
      <motion.div
        className="absolute"
        style={{
          width: orbSize * 0.3,
          height: orbSize * 0.3,
          background: `radial-gradient(circle at 40% 40%, hsl(var(--primary-foreground) / 0.9), hsl(var(--primary-foreground) / 0.5))`,
          boxShadow: "inset 0 0 8px hsl(var(--glow-primary) / 0.4)",
          borderRadius: "50%",
        }}
        animate={assistantState === "speaking" ? {
          scale: [1, 0.7, 1.2, 0.8, 1],
          x: [0, 4, -3, 5, 0],
          y: [0, -3, 2, -4, 0],
        } : {
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: assistantState === "speaking" ? 0.6 : 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </motion.div>
  );
}
