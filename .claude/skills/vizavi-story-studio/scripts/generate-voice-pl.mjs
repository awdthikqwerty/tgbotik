// Generate Polish voice lines via ElevenLabs with word-level alignment.
// Usage: node scripts/generate-voice-pl.mjs
import { generateSpeech } from "../audio/voice/elevenlabs.ts";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";

const VOICES = {
  narrator: { id: "JBFqnCBsd6RMkjVDRZzb", settings: { stability: 0.62, similarity_boost: 0.8, style: 0.1, speed: 0.98 } }, // George
  denis:    { id: "TX3LPaxmHKxFdv7VOQHJ", settings: { stability: 0.45, similarity_boost: 0.78, style: 0.35, speed: 1.04 } }, // Liam
  maja:     { id: "cgSgspJ2msm6clMCkdW9", settings: { stability: 0.5,  similarity_boost: 0.78, style: 0.3,  speed: 1.02 } }  // Jessica
};

// id, speaker, text, planned start (s)
const CUES = [
  ["n1", "narrator", "Sylwester. Północ. Denis siedzi w domu i przegląda Instagram.", 0.4],
  ["d1", "denis",    "Napisać do niej? A jeśli nie odpisze?", 5.0],
  ["n2", "narrator", "Wreszcie pisze. Telegram. Do Mai.", 8.9],
  ["d2", "denis",    "Maja, jestem w Tobie zakochany. Zostaniesz moją dziewczyną?", 11.6],
  ["m1", "maja",     "O Boże...", 16.3],
  ["m2", "maja",     "Tak! Tak, chcę!", 17.6],
  ["n3", "narrator", "Trzy dni później. Czwarty stycznia. Park.", 19.9],
  ["d3", "denis",    "Cześć...", 23.6],
  ["m3", "maja",     "Cześć.", 25.6],
  ["d4", "denis",    "Myślałem, że się rozmyślisz.", 27.4],
  ["m4", "maja",     "Nigdy. Kocham cię od dawna.", 30.0],
  ["n4", "narrator", "I tak zaczęła się ich historia.", 33.6]
];

const outDir = "output/voice";
await mkdir(outDir, { recursive: true });

const timeline = [];
for (const [id, speaker, text, planned] of CUES) {
  const v = VOICES[speaker];
  const outputPath = join(outDir, `${id}.mp3`);
  const result = await generateSpeech({
    text,
    voiceId: v.id,
    modelId: "eleven_multilingual_v2",
    language: "pl",
    settings: v.settings,
    outputPath,
    alignment: true,
    maxRetries: 3
  });
  // read alignment
  let dur = 1.5;
  try {
    const a = JSON.parse(await readFile(result.alignmentPath, "utf8"));
    const chars = a.alignment.characters || a.alignment.normalized_characters || [];
    const times = a.alignment.character_end_times_seconds || a.alignment.normalized_character_end_times_seconds;
    if (times?.length) dur = times[times.length - 1];
  } catch {}
  timeline.push({ id, speaker, text, start: planned, duration: dur, file: outputPath, alignment: result.alignmentPath });
  console.log(`${id} [${speaker}] ${dur.toFixed(2)}s  ${result.cacheHit ? "cache" : "generated"}`);
}

await writeFile("output/voice/timeline.json", JSON.stringify(timeline, null, 2));
console.log("Timeline saved:", timeline.length, "lines");
