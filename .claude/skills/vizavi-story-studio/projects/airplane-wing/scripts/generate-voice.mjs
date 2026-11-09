#!/usr/bin/env node
// Generates every narration segment with ONE fixed ElevenLabs voice (data/script.json -> voice.voiceId).
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateSpeech, listModels } from "../../../audio/voice/elevenlabs.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const script = JSON.parse(await readFile(resolve(root, "data/script.json"), "utf8"));
const VOICE_ID = script.voice.voiceId;
if (VOICE_ID !== "PoeEsLRfhERoseiWpFdi") throw new Error("Only the user's own voice PoeEsLRfhERoseiWpFdi is allowed");

const models = await listModels();
const supportsRu = (m) => (m.languages ?? []).some((l) => l.language_id === "ru");
const model = script.voice.preferredModels.map((id) => models.find((m) => m.model_id === id)).find((m) => m && supportsRu(m));
if (!model) throw new Error(`none of ${script.voice.preferredModels.join(", ")} is available with Russian support on this account`);
console.log(`model: ${model.model_id}`);

// Same voice everywhere; only delivery settings change with the beat.
const MOODS = {
  calm: { stability: 0.55, similarity_boost: 0.85, style: 0.2, speed: 1.0 },
  explain: { stability: 0.5, similarity_boost: 0.85, style: 0.3, speed: 1.03 },
  turn: { stability: 0.42, similarity_boost: 0.85, style: 0.4, speed: 1.0 },
  tense: { stability: 0.34, similarity_boost: 0.85, style: 0.5, speed: 1.06 },
};
const dir = resolve(root, "public/audio/voice");
await mkdir(dir, { recursive: true });
const manifest = [];
for (let i = 0; i < script.segments.length; i++) {
  const s = script.segments[i];
  const r = await generateSpeech({
    text: s.text, voiceId: VOICE_ID, modelId: model.model_id, language: "ru", settings: MOODS[s.mood],
    previousText: script.segments[i - 1]?.text, nextText: script.segments[i + 1]?.text,
    outputPath: resolve(dir, `${s.id}.mp3`), alignment: true,
  });
  manifest.push({ id: s.id, provider: r.provider, voiceId: r.voiceId, modelId: r.modelId, mood: s.mood, settings: MOODS[s.mood], requestId: r.requestId, cacheHit: r.cacheHit });
  console.log(s.id, r.cacheHit ? "cached" : "generated");
}
await writeFile(resolve(root, "production/voice-manifest.json"), JSON.stringify({ provider: "elevenlabs", voiceId: VOICE_ID, modelId: model.model_id, segments: manifest }, null, 2));
