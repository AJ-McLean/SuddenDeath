import "dotenv/config";
import fs from "fs";
import path from "path";
import os from "os";
import { spawn } from "child_process";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

// === Config ===
const VOICE_ID = "dTtuO9q1gaF6JeIDjwri";
const MODEL_ID = "eleven_v3";
const OUTPUT_FORMAT = "mp3_44100_128";

const ROOT = "/Users/angusmclean/Wheatly";
const PRE_DIR = path.join(ROOT, "Audio", "Pre-Audio");
const POST_DIR = path.join(ROOT, "Audio", "Post-Audio");
const QUESTIONS_PATH = path.join(ROOT, "Context", "test_questions.json");

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

// === Helpers ===
function playFile(filePath) {
  return new Promise((resolve, reject) => {
    const p = spawn("mpv", ["--no-terminal", "--really-quiet", filePath], {
      stdio: "ignore",
    });
    p.on("error", reject);
    p.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`mpv exited ${code}`))
    );
  });
}

async function streamToBuffer(stream) {
  // elevenlabs-js returns a Web ReadableStream in many environments
  if (stream?.getReader) {
    const reader = stream.getReader();
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks);
  }

  // fallback for Node streams
  if (stream?.on) {
    const chunks = [];
    await new Promise((resolve, reject) => {
      stream.on("data", (c) => chunks.push(Buffer.from(c)));
      stream.on("end", resolve);
      stream.on("error", reject);
    });
    return Buffer.concat(chunks);
  }

  // sometimes it might already be bytes
  if (Buffer.isBuffer(stream)) return stream;
  if (stream instanceof Uint8Array) return Buffer.from(stream);

  throw new Error("Unknown audio stream type from ElevenLabs");
}

async function ttsToTempMp3(text) {
  const audioStream = await elevenlabs.textToSpeech.convert(VOICE_ID, {
    text,
    modelId: MODEL_ID,
    outputFormat: OUTPUT_FORMAT,
  });

  const buf = await streamToBuffer(audioStream);
  const tmpPath = path.join(os.tmpdir(), `llm_q_${Date.now()}.mp3`);
  fs.writeFileSync(tmpPath, buf);
  return tmpPath;
}

function mustExist(p, label) {
  if (!fs.existsSync(p)) {
    throw new Error(`Missing ${label}: ${p}\nDid you run pregen for all templates?`);
  }
}

// === Main ===
async function main() {
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error("Missing ELEVENLABS_API_KEY env var");
  }

  const questions = JSON.parse(fs.readFileSync(QUESTIONS_PATH, "utf8"));

  console.log(`Loaded ${questions.length} questions from ${QUESTIONS_PATH}\n`);

  for (let i = 0; i < questions.length; i++) {
    const { q_type, llm_generated_q } = questions[i];

    const prePath = path.join(PRE_DIR, `${q_type}_pre.mp3`);
    const postPath = path.join(POST_DIR, `${q_type}_post.mp3`);
    mustExist(prePath, "pre audio");
    mustExist(postPath, "post audio");

    console.log(`\n[${i + 1}/${questions.length}] ${q_type}`);
    console.log(`Q: ${llm_generated_q}`);

    // IMPORTANT: start generating only once pre starts playing.
    // We do that by starting playback, THEN immediately kicking off TTS.
    const prePlaying = playFile(prePath);

    // Start TTS only after pre has started (we're after playFile() call)
    const liveGenPromise = ttsToTempMp3(llm_generated_q);

    // Wait for pre to finish
    await prePlaying;

    // If TTS isn't ready yet, we wait here (but most of the time it's ready)
    const livePath = await liveGenPromise;

    // Play LLM-generated question, then post
    await playFile(livePath);
    await playFile(postPath);

    // cleanup
    try {
      fs.unlinkSync(livePath);
    } catch {}
  }

  console.log("\nDone ✅");
}

main().catch((e) => {
  console.error("\nERROR:", e.message || e);
  process.exit(1);
});
