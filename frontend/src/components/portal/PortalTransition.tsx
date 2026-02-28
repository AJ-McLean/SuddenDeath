import { useEffect } from "react";
import { motion } from "framer-motion";
import { usePortal } from "@/context/PortalContext";

export function PortalTransition() {
  const { setState } = usePortal();

  useEffect(() => {
    const timer = setTimeout(() => {
      setState("quiz.loadingCamera");
    }, 1800);
    return () => clearTimeout(timer);
  }, [setState]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Warp effect */}
      <motion.div
        className="absolute inset-0 bg-background"
        initial={{ scale: 1 }}
        animate={{ scale: 1.5, opacity: 0 }}
        transition={{ duration: 1.5, ease: "easeIn" }}
      />

      {/* Portal burst */}
      <motion.div
        className="w-4 h-4 rounded-full bg-primary"
        initial={{ scale: 1, opacity: 1 }}
        animate={{ scale: 80, opacity: 0 }}
        transition={{ duration: 1.5, ease: "easeIn" }}
        style={{
          boxShadow: "0 0 60px hsl(var(--glow-primary) / 0.8), 0 0 120px hsl(var(--glow-primary) / 0.4)",
        }}
      />

      {/* Loading text */}
      <motion.div
        className="absolute text-xs font-mono text-primary/60 tracking-widest"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.8, times: [0, 0.3, 0.7, 1] }}
      >
        INITIALIZING CHAMBER...
      </motion.div>
    </motion.div>
  );
}
