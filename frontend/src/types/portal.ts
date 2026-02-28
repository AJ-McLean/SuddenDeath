export type AppState =
  | "landing"
  | "transitioning"
  | "quiz.loadingCamera"
  | "quiz.ready"
  | "quiz.waitingResponse"
  | "quiz.ended.win"
  | "quiz.ended.lose"
  | "error";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export type QuestionResult = "pending" | "correct" | "incorrect" | "neutral";

export interface BackendResponse {
  assistantMessage: string;
  sessionId: string;
  ended: boolean;
  outcome?: "win" | "lose";
  title?: string;
  body?: string;
  logLines?: string[];
  assistantState?: "speaking" | "thinking" | "idle";
  questionResult?: QuestionResult;
  questionIndex?: number;
  totalQuestions?: number;
}

export interface SendMessagePayload {
  sessionId: string;
  message: string;
  clientMeta?: {
    cameraEnabled: boolean;
    viewport: string;
  };
}
