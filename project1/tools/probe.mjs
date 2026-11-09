// Account capability probe: quota, own voices, Polish library voices.
import { el } from "../../.claude/skills/vizavi-story-studio/scripts/el-api.mjs";

const sub = await el("/v1/user/subscription").catch((e) => ({ err: e.message }));
console.log("SUB", JSON.stringify({ tier: sub.tier, used: sub.character_count, limit: sub.character_limit, voice_slots: sub.voice_slots_used, voice_limit: sub.voice_limit, err: sub.err }));

const mine = await el("/v2/voices", { query: { page_size: 100 } });
console.log("ACCOUNT VOICES", mine.voices.length);
for (const v of mine.voices) {
  const pl = (v.verified_languages || []).filter((x) => x.language === "pl").map((x) => x.accent || "pl").join("|");
  console.log(" ", v.voice_id, v.name, v.category, JSON.stringify(v.labels), pl ? `PL:${pl}` : "");
}

for (const gender of ["male", "female"]) {
  const lib = await el("/v1/shared-voices", { query: { page_size: 40, language: "pl", gender, sort: "usage_character_count_1y" } }).catch((e) => ({ err: e.message }));
  if (lib.err) { console.log("LIB ERR", lib.err); continue; }
  console.log(`\nLIBRARY PL ${gender}: ${lib.voices.length}`);
  for (const v of lib.voices) {
    console.log(" ", v.public_owner_id, v.voice_id, "|", v.name, "|", v.age, "|", v.accent, "|", v.use_case, "|", v.descriptive, "|",
      (v.description || "").replace(/\s+/g, " ").slice(0, 80), "| free:", v.free_users_allowed);
  }
}
