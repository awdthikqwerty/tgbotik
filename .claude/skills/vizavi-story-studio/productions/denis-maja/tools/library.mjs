// List young Polish library voices (free-tier usable) and download their free preview clips for auditioning.
import { el } from "../../../scripts/el-api.mjs";
import { mkdir, writeFile } from "node:fs/promises";

const out = new URL("../auditions/previews/", import.meta.url);
await mkdir(out, { recursive: true });
const seen = new Map();
const queries = [
  { age: "young", gender: "male" }, { age: "young", gender: "female" },
  { gender: "male", search: "młody" }, { gender: "female", search: "młoda" },
  { gender: "male", search: "teen" }, { gender: "female", search: "teen" },
  { gender: "male", search: "chłopak" }, { gender: "female", search: "dziewczyna" },
  { use_cases: "characters_animation" },
];
for (const q of queries) {
  const lib = await el("/v1/shared-voices", { query: { page_size: 50, language: "pl", sort: "usage_character_count_1y", ...q } }).catch((e) => ({ voices: [], err: e.message }));
  if (lib.err) console.log("ERR", JSON.stringify(q), lib.err);
  for (const v of lib.voices) if (v.free_users_allowed && !seen.has(v.voice_id)) seen.set(v.voice_id, v);
}
for (const v of seen.values()) {
  const file = `${v.gender}-${v.age}-${v.voice_id}.mp3`;
  if (v.preview_url) {
    const res = await fetch(v.preview_url);
    if (res.ok) await writeFile(new URL(file, out), Buffer.from(await res.arrayBuffer()));
  }
  console.log([v.voice_id, v.public_owner_id, v.gender, v.age, v.accent, v.use_case, v.descriptive, v.name, (v.description || "").replace(/\s+/g, " ").slice(0, 110)].join(" | "));
}
console.log("total", seen.size);
