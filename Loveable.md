Frontend Architecture — SuddenDeath Web Client


State Machine
The app follows this flow:

landing → User clicks "Begin Evaluation" (this is where mic/camera permissions are granted via user gesture)
transitioning → 1.8s portal warp animation
quiz.loadingCamera → Camera/mic init (2s)
quiz.ready → Listening for user speech (always-on, spacebar to mute)
quiz.waitingResponse → User answer sent, awaiting backend response
quiz.ended.win / quiz.ended.lose → Theatrical end screen
API Contract
The frontend sends POST to {VITE_API_BASE}/api/chat with:


interface SendMessagePayload {
  sessionId: string;       // e.g. "session-1772300777-abc123"
  message: string;         // transcribed user speech
  clientMeta?: {
    cameraEnabled: boolean;
    viewport: string;      // e.g. "1920x1080"
  };
}
And expects back:


interface BackendResponse {
  assistantMessage: string;           // Wheatley's text response
  sessionId: string;
  ended: boolean;                     // true on final question
  outcome?: "win" | "lose";
  title?: string;                     // end screen title
  body?: string;                      // end screen body text
  logLines?: string[];                // end screen terminal lines
  assistantState?: "speaking" | "thinking" | "idle";
  questionResult?: "correct" | "incorrect" | "neutral" | "pending";
  questionIndex?: number;             // 0-indexed
  totalQuestions?: number;            // currently 10
}
Audio Integration Points
The frontend currently has no TTS. To integrate with your ElevenLabs orchestration:

Option A (recommended): Backend returns an audioUrl field in the response. Frontend fetches and plays it, setting assistantState: "speaking" during playback and driving the Wheatley orb animation.
Option B: Backend streams audio via WebSocket. Frontend plays chunks in real-time.
The frontend already reacts to assistantState — Wheatley's ferrofluid eye pulses aggressively during "speaking", wobbles during "thinking", and idles otherwise. So the backend just needs to signal state transitions.

Key Frontend Behaviors
10 evaluation questions tracked via HUD pips (blue → green/red)
Speech recognition is always-on (Web Speech API, continuous mode)
Webcam fills the entire screen as a mirror; all UI is HUD overlay
No text display — this is voice/audio only
The VITE_API_BASE env var controls the backend URL (empty = mock mode)
What the Backend Needs to Provide
POST /api/chat endpoint matching the contract above
Audio URL or stream for Wheatley's spoken response (to replace the current text-only mock)
Session management — the frontend sends a unique sessionId per evaluation run
Question evaluation — return questionResult + questionIndex so the HUD updates