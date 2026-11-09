// Generates the SFX cues with the ElevenLabs Sound Effects API, cached in ./sfx/<name>.mp3 (existing files are skipped).
// Hard budget: stops before total spend (measured via /v1/user/subscription character_count) would exceed BUDGET.
// Usage: node gen-sfx.mjs            (from this directory or anywhere)
import { el } from "../../../scripts/el-api.mjs";
import { existsSync } from "node:fs";
import { writeFile, readFile, mkdir } from "node:fs/promises";

const BUDGET = 2000;
const dir = new URL("./sfx/", import.meta.url);
const ledgerUrl = new URL("./sfx/ledger.json", import.meta.url);
await mkdir(dir, { recursive: true });

// priority order: hardest to synthesize convincingly first
const CUES = [
  ["fireworks_bed", 10, 0.45, "Distant New Year's Eve fireworks over a city at night, soft muffled booms and gentle crackles far away, continuous, no voices, no music"],
  ["fireworks_big", 5, 0.5, "Several big close firework bursts exploding in the sky with sparkling crackle tails, New Year's Eve, no voices, no music"],
  ["phone_vibrate", 1.2, 0.6, "Smartphone vibrating buzz on silent mode, two short buzzes, close up, clean, no ringtone"],
  ["message_sent", 0.6, 0.6, "Soft modern messenger app 'message sent' swoosh sound, short airy whoosh up, clean UI sound"],
  ["message_ding", 0.8, 0.6, "Gentle soft message notification chime, two-note pleasant bell, clean phone UI sound"],
  ["gasp", 0.8, 0.6, "Young woman's soft short surprised happy gasp, close microphone, no words"],
  ["breath", 1.5, 0.6, "Teenage boy takes one deep nervous breath in and slowly breathes out, close microphone, no words"],
  ["dog_bark", 1, 0.6, "Tiny Yorkshire terrier puppy gives one playful happy high-pitched yip bark"],
  ["sea_waves", 3, 0.45, "Gentle calm sea waves washing on a sandy beach at sunset, soft foam, no wind noise, no voices"],
  ["birds_winter", 9, 0.4, "Quiet winter park ambience, a few small birds chirping occasionally, light soft breeze, calm, no voices, no music"],
  ["footsteps_snow", 3, 0.55, "Two people slowly walking, footsteps crunching on fresh snow, close, calm pace"],
  ["birds_summer", 3, 0.45, "Sunny summer park ambience with cheerful songbirds chirping, light, no voices, no music"],
  ["footsteps_walk", 3, 0.55, "Calm footsteps of two people walking on a park path with dry autumn leaves, relaxed pace"],
  ["flowers_rustle", 1, 0.6, "Bouquet of flowers in paper wrapping rustling as it is handed over, close up"],
  ["kiss", 0.5, 0.6, "Soft gentle quick kiss on the cheek, short smooch sound, close microphone"],
  ["key_tap", 2, 0.55, "Soft quiet smartphone touchscreen keyboard taps, typing a short message, light clicks"],
  ["transition", 1.5, 0.5, "Gentle magical shimmer swish transition, soft airy sparkle sweep, dreamy, cinematic"],
  ["whoosh_soft", 0.8, 0.5, "Soft airy short transition whoosh, gentle, smooth, cinematic"],
  ["sparkle", 2, 0.5, "Soft magical twinkle chime, delicate glittering bell sparkle, dreamy fairy-tale, gentle"],
];

const credits = async () => (await el("/v1/user/subscription")).character_count;
let ledger = existsSync(ledgerUrl) ? JSON.parse(await readFile(ledgerUrl, "utf8")) : { start: null, spent: 0, items: {} };
const before = await credits();
if (ledger.start === null) ledger.start = before;
let rate = 40; // credits per second (conservative guess until measured)
const measured = Object.values(ledger.items).filter((i) => i.cost > 0);
if (measured.length) rate = Math.max(...measured.map((i) => i.cost / i.dur));
let now = before;
console.log(`credits used at start: ${before}`);

for (const [name, dur, infl, text] of CUES) {
  const out = new URL(`${name}.mp3`, dir);
  if (existsSync(out)) { console.log(`skip ${name} (cached)`); continue; }
  const spent = now - ledger.start;
  const est = Math.ceil(rate * dur);
  if (spent + est > BUDGET) { console.log(`BUDGET: skip ${name} (spent ${spent}, est ${est}) -> procedural`); ledger.items[name] = { skipped: true, dur }; continue; }
  try {
    const res = await el("/v1/sound-generation", { method: "POST", raw: true, body: { text, duration_seconds: dur, prompt_influence: infl } });
    await writeFile(out, Buffer.from(await res.arrayBuffer()));
  } catch (e) { console.log(`FAIL ${name}: ${String(e.message).slice(0, 200)}`); ledger.items[name] = { failed: true, dur }; continue; }
  const after = await credits();
  const cost = after - now;
  now = after;
  if (cost > 0) rate = Math.max(rate === 40 && !measured.length ? 0 : rate, cost / dur);
  ledger.items[name] = { dur, cost };
  console.log(`ok ${name} ${dur}s cost ${cost} (total spent ${now - ledger.start})`);
  await writeFile(ledgerUrl, JSON.stringify(ledger, null, 1));
}
ledger.spent = now - ledger.start;
await writeFile(ledgerUrl, JSON.stringify(ledger, null, 1));
console.log(`credits used: start ${ledger.start} -> now ${now}; SFX spend ${ledger.spent}`);
