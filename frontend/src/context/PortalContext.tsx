import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { AppState, ChatMessage, BackendResponse, QuestionResult } from "@/types/portal";

interface PortalContextValue {
  state: AppState;
  setState: (s: AppState) => void;
  sessionId: string;
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  cameraEnabled: boolean;
  setCameraEnabled: (v: boolean) => void;
  outcome: BackendResponse | null;
  setOutcome: (o: BackendResponse | null) => void;
  assistantState: "speaking" | "thinking" | "idle";
  setAssistantState: (s: "speaking" | "thinking" | "idle") => void;
  resetSession: () => void;
  questionResults: QuestionResult[];
  setQuestionResult: (index: number, result: QuestionResult) => void;
  totalQuestions: number;
  setTotalQuestions: (n: number) => void;
  currentQuestion: number;
  setCurrentQuestion: (n: number) => void;
}

const PortalContext = createContext<PortalContextValue | null>(null);

export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error("usePortal must be used within PortalProvider");
  return ctx;
}

function generateSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function PortalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>("landing");
  const [sessionId, setSessionId] = useState(generateSessionId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [outcome, setOutcome] = useState<BackendResponse | null>(null);
  const [assistantState, setAssistantState] = useState<"speaking" | "thinking" | "idle">("idle");
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const setQuestionResult = useCallback((index: number, result: QuestionResult) => {
    setQuestionResults((prev) => {
      const next = [...prev];
      while (next.length <= index) next.push("pending");
      next[index] = result;
      return next;
    });
  }, []);

  const resetSession = useCallback(() => {
    setSessionId(generateSessionId());
    setMessages([]);
    setOutcome(null);
    setAssistantState("idle");
    setState("landing");
    setCameraEnabled(false);
    setQuestionResults([]);
    setCurrentQuestion(0);
  }, []);

  return (
    <PortalContext.Provider
      value={{
        state, setState,
        sessionId, messages, addMessage,
        cameraEnabled, setCameraEnabled,
        outcome, setOutcome,
        assistantState, setAssistantState,
        resetSession,
        questionResults, setQuestionResult,
        totalQuestions, setTotalQuestions,
        currentQuestion, setCurrentQuestion,
      }}
    >
      {children}
    </PortalContext.Provider>
  );
}
