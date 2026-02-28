import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface GlitchTextProps {
  text: string;
  className?: string;
  delay?: number;
}

export function GlitchText({ text, className = "", delay = 0 }: GlitchTextProps) {
  const [displayed, setDisplayed] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    let idx = 0;
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        if (idx <= text.length) {
          setDisplayed(text.slice(0, idx));
          idx++;
        } else {
          clearInterval(interval);
          setTimeout(() => setShowCursor(false), 1500);
        }
      }, 50);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, delay]);

  return (
    <motion.span
      className={`glitch-text ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: delay / 1000 }}
    >
      {displayed}
      {showCursor && (
        <span
          className="inline-block w-0.5 h-[1em] ml-0.5 bg-primary align-middle"
          style={{ animation: "type-cursor 0.8s steps(1) infinite" }}
        />
      )}
    </motion.span>
  );
}
