// Checks whether the account can use Sound Effects and Music generation (tiny requests).
import { el } from "../../.claude/skills/vizavi-story-studio/scripts/el-api.mjs";
import { writeFile, mkdir } from "node:fs/promises";

await mkdir(new URL("../auditions/sfx/", import.meta.url), { recursive: true });
try {
  const res = await el("/v1/sound-generation", { method: "POST", raw: true, body: { text: "Smartphone vibrating on a table, short buzz", duration_seconds: 1.0, prompt_influence: 0.5 } });
  await writeFile(new URL("../auditions/sfx/probe.mp3", import.meta.url), Buffer.from(await res.arrayBuffer()));
  console.log("SFX OK");
} catch (e) { console.log("SFX FAIL", e.message.slice(0, 200)); }
try {
  const res = await el("/v1/music", { method: "POST", raw: true, body: { prompt: "soft romantic piano, 3 seconds", music_length_ms: 3000 } });
  await writeFile(new URL("../auditions/sfx/music-probe.mp3", import.meta.url), Buffer.from(await res.arrayBuffer()));
  console.log("MUSIC OK");
} catch (e) { console.log("MUSIC FAIL", e.message.slice(0, 200)); }
