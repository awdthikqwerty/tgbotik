#!/usr/bin/env node
import { listModels, listVoices } from "../audio/voice/elevenlabs.ts";
const languages = ["ru", "en", "pl"];
for (const language of languages) {
  const voices = await listVoices(language);
  console.log(`\n${language.toUpperCase()} voices`);
  for (const v of voices) {
    const verified = (v.verified_languages ?? []).map((x) => `${x.language}${x.accent ? ` (${x.accent})` : ""}`).join(", ");
    console.log(JSON.stringify({ name: v.name, voiceId: v.voice_id, category: v.category, labels: v.labels, verifiedLanguages: verified }));
  }
}
console.log("\nTTS models");
for (const model of await listModels()) console.log(JSON.stringify({ model_id: model.model_id, name: model.name, can_use_style: model.can_use_style, languages: model.languages?.map((x) => x.language_id ?? x.name) }));
