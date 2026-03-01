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
  audioUrl?: string; // URL to MP3 of Wheatley's full spoken response
  preUrl?: string; // URL to pre-question audio
  postUrl?: string; // URL to post-question audio
  liveUrl?: string; // URL to live generated audio
  pollUrl?: string; // URL to poll for live audio readiness
}

export interface SendMessagePayload {
  sessionId: string;
  message: string;
  clientMeta?: {
    cameraEnabled: boolean;
    viewport: string;
  };
}
