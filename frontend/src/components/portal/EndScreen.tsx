import { motion } from "framer-motion";
import { usePortal } from "@/context/PortalContext";
import { RotateCcw, Home } from "lucide-react";

export function EndScreen() {
  const { state, outcome, resetSession } = usePortal();
  const isWin = state === "quiz.ended.win";
  const themeClass = isWin ? "theme-win" : "theme-lose";

  return (
    <motion.div
      className={`min-h-screen flex flex-col items-center justify-center p-6 ${themeClass}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isWin
            ? "radial-gradient(ellipse at center, hsl(200 80% 50% / 0.08) 0%, transparent 60%)"
            : "radial-gradient(ellipse at center, hsl(0 75% 50% / 0.08) 0%, transparent 60%)",
        }}
      />

      {/* Flicker overlay */}
      <motion.div
        className="absolute inset-0 bg-background pointer-events-none"
        initial={{ opacity: 1 }}
        animate={{ opacity: [1, 0, 1, 0, 1, 0, 0] }}
        transition={{ duration: 0.8, times: [0, 0.1, 0.15, 0.25, 0.3, 0.4, 1] }}
      />

      {/* Status indicator */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
        className={`w-20 h-20 rounded-full border-2 flex items-center justify-center mb-8 ${
          isWin ? "border-primary/40 glow-border" : "border-destructive/40 glow-border-danger"
        }`}
      >
        <span className="text-3xl font-display font-bold">
          {isWin ? (
            <span className="text-primary">✓</span>
          ) : (
            <span className="text-destructive">✗</span>
          )}
        </span>
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className={`text-3xl md:text-5xl font-display font-bold tracking-wider mb-4 ${
          isWin ? "text-primary text-glow" : "text-destructive text-glow-danger"
        }`}
      >
        {outcome?.title || (isWin ? "TEST COMPLETE" : "TEST FAILED")}
      </motion.h1>

      {/* Body */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3 }}
        className="text-sm md:text-base text-muted-foreground max-w-md text-center mb-8 font-mono"
      >
        {outcome?.body || (isWin
          ? "Subject has demonstrated acceptable cognitive function."
          : "Subject has failed to meet minimum testing requirements."
        )}
      </motion.p>

      {/* Log lines */}
      {outcome?.logLines && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6 }}
          className="panel-beveled p-4 mb-8 max-w-lg w-full"
        >
          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
            System Log
          </div>
          <div className="space-y-1">
            {outcome.logLines.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.8 + i * 0.15 }}
                className="console-text text-xs"
              >
                {line}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
        className="flex gap-3"
      >
        <button
          onClick={resetSession}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary/10 border border-primary/30 rounded-sm font-display text-xs tracking-[0.15em] uppercase text-primary hover:bg-primary/20 hover:border-primary/50 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Retry Test
        </button>
        <button
          onClick={resetSession}
          className="flex items-center gap-2 px-6 py-2.5 border border-border rounded-sm font-display text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground hover:border-primary/20 transition-all"
        >
          <Home className="w-3.5 h-3.5" />
          Return
        </button>
      </motion.div>
    </motion.div>
  );
}
