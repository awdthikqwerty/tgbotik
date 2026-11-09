// Generate every line in lines.json with ElevenLabs (/with-timestamps). Skips lines already generated with identical input.
// Usage: node gen-lines.mjs [id ...]   (ids force regeneration)
import { el } from "../../.claude/skills/vizavi-story-studio/scripts/el-api.mjs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const root = new URL("../", import.meta.url);
const cfg = JSON.parse(await readFile(new URL("lines.json", root), "utf8"));
const force = new Set(process.argv.slice(2));
const dir = new URL("voice/", root);
await mkdir(dir, { recursive: true });
for (const line of cfg.lines) {
  const v = cfg.voices[line.speaker];
  const body = { text: line.text, model_id: v.model, language_code: "pl", voice_settings: v.settings };
  const key = createHash("sha256").update(JSON.stringify([v.voiceId, body])).digest("hex");
  const manifestUrl = new URL(`${line.id}.json`, dir);
  if (!force.has(line.id)) {
    try { if (JSON.parse(await readFile(manifestUrl, "utf8")).key === key) { console.log("cached", line.id); continue; } } catch {}
  }
  const r = await el(`/v1/text-to-speech/${v.voiceId}/with-timestamps`, { method: "POST", body, query: { output_format: "mp3_44100_128" } });
  await writeFile(new URL(`${line.id}.mp3`, dir), Buffer.from(r.audio_base64, "base64"));
  await writeFile(manifestUrl, JSON.stringify({ key, provider: "elevenlabs", speaker: line.speaker, voiceId: v.voiceId, voiceName: v.name, model: v.model, language: "pl", text: line.text, alignment: r.alignment }, null, 1));
  console.log("generated", line.id, line.speaker);
}
