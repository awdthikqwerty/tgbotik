// Audition: synthesize a role line with several candidate voices/models via /with-timestamps.
// Usage: node audition.mjs <role> <model> <voiceId,...> "<text>"
import { el } from "../../../scripts/el-api.mjs";
import { mkdir, writeFile } from "node:fs/promises";

const [role, model, ids, text] = process.argv.slice(2);
const dir = new URL(`../auditions/${role}/`, import.meta.url);
await mkdir(dir, { recursive: true });
for (const id of ids.split(",")) {
  const t0 = Date.now();
  try {
    const body = { text, model_id: model, voice_settings: { stability: 0.5, similarity_boost: 0.8 } };
    if (model !== "eleven_multilingual_v2") body.language_code = "pl";
    const r = await el(`/v1/text-to-speech/${id}/with-timestamps`, { method: "POST", body, query: { output_format: "mp3_44100_128" } });
    const name = `${id}-${model}`;
    await writeFile(new URL(`${name}.mp3`, dir), Buffer.from(r.audio_base64, "base64"));
    await writeFile(new URL(`${name}.alignment.json`, dir), JSON.stringify(r.alignment ?? r.normalized_alignment ?? null));
    console.log("OK", role, name, `${Date.now() - t0}ms`, "alignment:", !!r.alignment);
  } catch (e) {
    console.log("FAIL", role, id, model, e.message);
  }
}
