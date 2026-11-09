// Voice Design: generate candidate voices for a role from a description + Polish preview text.
// Usage: node design.mjs <role> [seed]   (role config below)
import { el } from "../../.claude/skills/vizavi-story-studio/scripts/el-api.mjs";
import { mkdir, writeFile } from "node:fs/promises";

const ROLES = {
  denis: {
    description: "A 16-year-old Polish teenage boy speaking native Polish with a standard accent. Youthful, slightly higher voice that has just finished breaking, soft and a bit shy, nervous but sweet and sincere, natural and warm, emotional. Clean studio recording, close microphone, no background noise.",
    text: "Hej... chciałbym zapytać, czy chciałabyś ze mną być? Nie... to głupio brzmi. Dobra. Spokojnie, Denis. Biorę głęboki oddech i po prostu wysyłam.",
  },
  maja: {
    description: "A 16-year-old Polish teenage girl speaking native Polish with a standard accent. Young, bright, warm and gentle voice, cheerful and full of energy, sweet natural intonation, smiling while she speaks. Clean studio recording, close microphone, no background noise.",
    text: "Ojej... Denis do mnie napisał! Tak! Też tego chcę! Nie mogę przestać się uśmiechać, to chyba najpiękniejszy Nowy Rok w moim życiu.",
  },
  narrator: {
    description: "A professional Polish male narrator in his thirties, native Polish speaker with perfect standard pronunciation. Warm, calm, soft and gently moving storytelling voice, like the narrator of an animated romantic film. Expressive, never monotone, intimate and pleasant. Clean studio recording.",
    text: "Czasami najpiękniejsze historie zaczynają się od jednej, małej wiadomości. I tak, wśród noworocznych świateł, rozpoczęła się ich wspólna historia.",
  },
};
const role = process.argv[2];
const seed = Number(process.argv[3] ?? 7);
const cfg = ROLES[role];
const dir = new URL(`../auditions/design/${role}/`, import.meta.url);
await mkdir(dir, { recursive: true });
const r = await el("/v1/text-to-voice/design", {
  method: "POST",
  query: { output_format: "mp3_44100_128" },
  body: { voice_description: cfg.description, text: cfg.text, model_id: "eleven_ttv_v3", seed, guidance_scale: 5, loudness: 0.5 },
});
for (const [i, p] of r.previews.entries()) {
  const name = `s${seed}-${i}-${p.generated_voice_id}`;
  await writeFile(new URL(`${name}.mp3`, dir), Buffer.from(p.audio_base_64, "base64"));
  console.log(role, name, `${p.duration_secs?.toFixed?.(1)}s`, p.language ?? "");
}
await writeFile(new URL(`s${seed}-meta.json`, dir), JSON.stringify({ role, seed, description: cfg.description, text: r.text, ids: r.previews.map((p) => p.generated_voice_id) }, null, 2));
