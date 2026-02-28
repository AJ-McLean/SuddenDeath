import "dotenv/config";
import fs from "fs";
import path from "path";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { TEMPLATES } from "./templates.mjs";

const VOICE_ID = "dTtuO9q1gaF6JeIDjwri";
const MODEL_ID = "eleven_v3";
const OUTPUT_FORMAT = "mp3_44100_128";

const PRE_DIR = "/Users/angusmclean/Wheatly/Audio/Pre-Audio";
const POST_DIR = "/Users/angusmclean/Wheatly/Audio/Post-Audio";

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

async function streamToBuffer(stream) {
  const reader = stream.getReader();
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

async function generate(text, outPath) {
  const audio = await elevenlabs.textToSpeech.convert(VOICE_ID, {
    text,
    modelId: MODEL_ID,
    outputFormat: OUTPUT_FORMAT,
  });

  const buffer = await streamToBuffer(audio);
  fs.writeFileSync(outPath, buffer);
}

async function main() {
  fs.mkdirSync(PRE_DIR, { recursive: true });
  fs.mkdirSync(POST_DIR, { recursive: true });

  for (const t of TEMPLATES) {
    console.log("Generating:", t.id);

    await generate(
      t.pre_recorded_pre_q_wav,
      path.join(PRE_DIR, `${t.id}_pre.mp3`)
    );

    await generate(
      t.pre_recorded_post_q_wav,
      path.join(POST_DIR, `${t.id}_post.mp3`)
    );
  }

  console.log("Done.");
}

main();
