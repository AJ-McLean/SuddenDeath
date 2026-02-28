import { useState, useRef, useEffect } from "react";
import { usePortal } from "@/context/PortalContext";
import { sendMessage } from "@/services/backendApi";
import { Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function ChatConsole() {
  const {
    state, setState, sessionId, messages, addMessage,
    cameraEnabled, setAssistantState, setOutcome,
  } = usePortal();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isWaiting = state === "quiz.waitingResponse";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (state === "quiz.ready" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [state, messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isWaiting) return;

    addMessage({ role: "user", content: text, timestamp: Date.now() });
    setInput("");
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

      if (res.ended && res.outcome) {
        setOutcome(res);
        // Brief pause before showing end screen
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

  return (
    <div className="flex flex-col h-full panel-beveled">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
        <div className="w-2 h-2 rounded-full bg-primary/60" />
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          Communication Log
        </span>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground">
          {messages.length} entries
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-3 py-2 rounded-sm text-sm ${
                  msg.role === "user"
                    ? "bg-primary/10 border border-primary/20 text-foreground"
                    : "bg-secondary border border-border text-secondary-foreground"
                }`}
              >
                <span className="text-[10px] font-mono text-muted-foreground block mb-1">
                  {msg.role === "user" ? "SUBJECT" : "WHEATLEY"}
                </span>
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isWaiting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-xs font-mono text-primary/60"
          >
            <span className="inline-flex gap-0.5">
              <span className="animate-flicker">●</span>
              <span className="animate-flicker" style={{ animationDelay: "0.1s" }}>●</span>
              <span className="animate-flicker" style={{ animationDelay: "0.2s" }}>●</span>
            </span>
            Processing response...
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={isWaiting}
            placeholder={isWaiting ? "Awaiting response..." : "Type your response..."}
            className="flex-1 bg-secondary border border-border rounded-sm px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:glow-border disabled:opacity-50 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={isWaiting || !input.trim()}
            className="px-3 py-2 bg-primary/10 border border-primary/30 rounded-sm text-primary hover:bg-primary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
