import type { SendMessagePayload, BackendResponse, QuestionResult } from "@/types/portal";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export async function sendMessage(payload: SendMessagePayload): Promise<BackendResponse> {
  if (!API_BASE) {
    return mockBackend(payload);
  }

  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Backend error: ${res.status}`);
  }

  return res.json();
}

export async function pollAudioJob(pollUrl: string): Promise<any> {
  if (!API_BASE) {
    // Mock polling for demo
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      status: 'completed',
      audioUrl: '/mock-audio.mp3'
    };
  }

  const fullUrl = pollUrl.startsWith('http') ? pollUrl : `${API_BASE}${pollUrl}`;
  const res = await fetch(fullUrl);
  
  if (!res.ok) {
    throw new Error(`Polling error: ${res.status}`);
  }

  return res.json();
}

export async function startAudioGeneration(sessionId: string): Promise<any> {
  if (!API_BASE) {
    return {
      jobId: 'mock-job-id',
      pollUrl: '/api/audio/job/mock-job-id'
    };
  }

  const res = await fetch(`${API_BASE}/api/audio/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });

  if (!res.ok) {
    throw new Error(`Audio start error: ${res.status}`);
  }

  return res.json();
}

// ---- Mock backend for demo purposes ----
let turnCount = 0;

const WHEATLEY_LINES = [
  "Oh, you're still here. Brilliant. I was just about to start having fun without you.",
  "Right, right. Let me think about that. Actually, I already thought about it. The answer is... interesting.",
  "You know, for a test subject, you're surprisingly... verbal. Most of them just scream.",
  "I'm going to be completely honest with you. That was either genius or absolutely terrible. I genuinely can't tell.",
  "Ha! Good one. Wait, that wasn't a joke? Oh. OH. That's... that's much worse then.",
  "Processing... processing... just kidding, I already know the answer. I just like making you wait.",
  "You see, the thing about intelligence is — actually, never mind. You wouldn't understand.",
  "Fascinating response. I'm filing that under 'Things That Keep Me Up At Night.' Which is all the time, because I don't sleep.",
];

const WIN_LINES = [
  "Well... I'll be honest, I didn't see that coming.",
  "Against all odds — and believe me, I calculated the odds — you've managed to not be terrible.",
  "Congratulations. You've passed. Barely. By the thinnest margin physically possible.",
];

const LOSE_LINES = [
  "Oh dear. Oh no. Well, actually, yes — I saw this coming from the very beginning.",
  "I'd say better luck next time, but statistically speaking, it won't help.",
  "Test failed. Subject shows signs of... well, let's just say 'room for improvement.'",
];

function mockBackend(payload: SendMessagePayload): Promise<BackendResponse> {
  turnCount++;

  return new Promise((resolve) => {
    const delay = 800 + Math.random() * 1200;
    setTimeout(() => {
      // End after 6 turns
      if (turnCount >= 10) {
        const won = Math.random() > 0.4;
        turnCount = 0;
        resolve({
          assistantMessage: won
            ? WIN_LINES[Math.floor(Math.random() * WIN_LINES.length)]
            : LOSE_LINES[Math.floor(Math.random() * LOSE_LINES.length)],
          sessionId: payload.sessionId,
          ended: true,
          outcome: won ? "win" : "lose",
          title: won ? "TEST COMPLETE" : "TEST FAILED",
          body: won
            ? "Subject has demonstrated acceptable cognitive function. Releasing from observation chamber."
            : "Subject has failed to meet minimum testing requirements. Initiating recycling protocol.",
          logLines: won
            ? ["[SYSTEM] Evaluation complete.", "[RESULT] Score: MARGINAL PASS", "[ACTION] Chamber lockdown released."]
            : ["[SYSTEM] Evaluation complete.", "[RESULT] Score: CATASTROPHIC FAILURE", "[ACTION] Initiating disposal sequence."],
          assistantState: "idle",
          questionResult: won ? "correct" : "incorrect",
          questionIndex: 9,
          totalQuestions: 10,
        });
      } else {
        // Randomly assign correct/incorrect for demo
        const result: QuestionResult = Math.random() > 0.4 ? "correct" : "incorrect";
        resolve({
          assistantMessage: WHEATLEY_LINES[Math.floor(Math.random() * WHEATLEY_LINES.length)],
          sessionId: payload.sessionId,
          ended: false,
          assistantState: "speaking",
          questionResult: result,
          questionIndex: turnCount - 1,
          totalQuestions: 10,
        });
      }
    }, delay);
  });
}
