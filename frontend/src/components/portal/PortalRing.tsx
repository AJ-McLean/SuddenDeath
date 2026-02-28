import { motion } from "framer-motion";

export function PortalRing() {
  return (
    <div className="relative w-64 h-64 md:w-80 md:h-80">
      {/* Outer rotating ring */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ring-rotate"
        style={{
          background: "radial-gradient(circle, transparent 55%, hsl(var(--glow-primary) / 0.05) 70%, transparent 80%)",
        }}
      />
      {/* Middle pulsing ring */}
      <div
        className="absolute inset-4 rounded-full border border-primary/20 animate-portal-pulse"
      />
      {/* Inner glow */}
      <div
        className="absolute inset-8 rounded-full"
        style={{
          background: "radial-gradient(circle, hsl(var(--glow-primary) / 0.15) 0%, hsl(var(--glow-primary) / 0.05) 40%, transparent 70%)",
        }}
      />
      {/* Center dot */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-3 h-3 rounded-full bg-primary/60 animate-portal-pulse"
        />
      </div>
      {/* Decorative tick marks */}
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute top-1/2 left-1/2 w-0.5 h-3 bg-primary/20"
          style={{
            transform: `translate(-50%, -50%) rotate(${i * 30}deg) translateY(-120px)`,
          }}
        />
      ))}
    </div>
  );
}
