#!/usr/bin/env node
import { readFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { generateSpeech } from "../../audio/voice/elevenlabs.ts";
const dir = dirname(new URL(import.meta.url).pathname);
const cue = JSON.parse(await readFile(resolve(dir, "audio-cues.json"), "utf8"));
const voiceConfig = JSON.parse(await readFile(resolve(dir, "../../audio/voice/voice-config.json"), "utf8"));
const narration = cue.narration;
const selected = voiceConfig.voices.narrator[narration.language];
if (!selected?.voiceId) throw new Error(`Set an auditioned ${narration.language.toUpperCase()} narrator voiceId in audio/voice/voice-config.json after running npm run voices.`);
const outputPath = resolve(dir, "public/audio/narration.mp3");
await mkdir(dirname(outputPath), { recursive: true });
const result = await generateSpeech({ ...narration, voiceId: selected.voiceId, modelId: selected.modelId || voiceConfig.defaultModelId, outputPath, alignment: true });
console.log(JSON.stringify({ provider: result.provider, voiceId: result.voiceId, modelId: result.modelId, language: result.language, outputPath: result.outputPath, cacheHit: result.cacheHit, requestId: result.requestId }, null, 2));
