import { usePortal } from "@/context/PortalContext";
import { motion } from "framer-motion";

export function QuestionHUD() {
  const { questionResults, totalQuestions, currentQuestion } = usePortal();

  const indicators = Array.from({ length: totalQuestions }, (_, i) => {
    const result = questionResults[i] || "pending";
    return { index: i, result };
  });

  const getColor = (result: string, isActive: boolean) => {
    switch (result) {
      case "correct":
        return {
          bg: "hsl(150 70% 45%)",
          border: "hsl(150 70% 55%)",
          shadow: "0 0 12px hsl(150 70% 45% / 0.6), 0 0 24px hsl(150 70% 45% / 0.2)",
        };
      case "incorrect":
        return {
          bg: "hsl(var(--destructive))",
          border: "hsl(var(--destructive))",
          shadow: "0 0 12px hsl(var(--glow-danger) / 0.6), 0 0 24px hsl(var(--glow-danger) / 0.2)",
        };
      case "neutral":
        return {
          bg: "hsl(var(--muted-foreground))",
          border: "hsl(var(--muted-foreground))",
          shadow: "0 0 8px hsl(var(--muted-foreground) / 0.3)",
        };
      default:
        return {
          bg: isActive ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.25)",
          border: isActive ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.3)",
          shadow: isActive
            ? "0 0 12px hsl(var(--glow-primary) / 0.5), 0 0 24px hsl(var(--glow-primary) / 0.15)"
            : "none",
        };
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Label */}
      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">
        Evaluation Progress
      </span>

      {/* Indicator row */}
      <div className="flex items-center gap-3">
        {indicators.map(({ index, result }) => {
          const isActive = index === currentQuestion && result === "pending";
          const colors = getColor(result, isActive);

          return (
            <motion.div
              key={index}
              className="relative flex items-center justify-center"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.08, type: "spring", stiffness: 300 }}
            >
              {/* Pip */}
              <motion.div
                className="w-3.5 h-3.5 rounded-full"
                style={{
                  background: colors.bg,
                  border: `1.5px solid ${colors.border}`,
                  boxShadow: colors.shadow,
                }}
                animate={
                  isActive
                    ? { scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] }
                    : result !== "pending"
                    ? { scale: [1, 1.15, 1] }
                    : {}
                }
                transition={
                  isActive
                    ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                    : { duration: 0.4 }
                }
              />

              {/* Question number */}
              <span
                className="absolute -bottom-4 text-[8px] font-mono"
                style={{
                  color: result !== "pending" ? colors.bg : "hsl(var(--muted-foreground) / 0.6)",
                }}
              >
                {index + 1}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Connecting line behind pips */}
      <div className="relative w-full flex justify-center -mt-7 -z-10">
        <div
          className="h-px"
          style={{
            width: `${(totalQuestions - 1) * 28}px`,
            background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.2), transparent)",
          }}
        />
      </div>
    </div>
  );
}
