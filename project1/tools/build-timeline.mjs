// Builds the locked timeline (seconds) from real voice durations/alignment. Shared by video, subtitles, lip-sync and audio mix.
// Usage: node build-timeline.mjs [narratorTempo]
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const root = new URL("../", import.meta.url);
const NARR_TEMPO = Number(process.argv[2] ?? 1.0);
const FPS = 30;

async function voice(id, start) {
  const m = JSON.parse(await readFile(new URL(`voice/${id}.json`, root), "utf8"));
  const file = new URL(`voice/${id}.mp3`, root).pathname;
  const raw = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString());
  // n1 keeps the 1.1 pace the opening shots were staged to (absolute times up to ~21 s).
  const tempo = m.speaker === "narrator" ? (id === "n1" ? 1.1 : NARR_TEMPO) : 1;
  const a = m.alignment;
  // Drop [audio tags] from the character stream; keep absolute timing for the rest.
  const chars = [];
  let depth = 0;
  for (let i = 0; i < a.characters.length; i++) {
    const c = a.characters[i];
    if (c === "[") { depth++; continue; }
    if (c === "]") { depth--; continue; }
    if (depth) continue;
    chars.push({ c, s: +(start + a.character_start_times_seconds[i] / tempo).toFixed(3), e: +(start + a.character_end_times_seconds[i] / tempo).toFixed(3) });
  }
  while (chars.length && chars[0].c === " ") chars.shift();
  const words = [];
  let cur = null;
  for (const ch of chars) {
    if (/\s/.test(ch.c)) { if (cur) words.push(cur); cur = null; continue; }
    if (!cur) cur = { w: "", s: ch.s, e: ch.e };
    cur.w += ch.c; cur.e = ch.e;
  }
  if (cur) words.push(cur);
  const speechEnd = words.length ? words[words.length - 1].e : start + raw / tempo;
  return { id, speaker: m.speaker, file: `voice/${id}.mp3`, start: +start.toFixed(3), tempo, duration: +(raw / tempo).toFixed(3), end: +speechEnd.toFixed(3), text: words.map((w) => w.w).join(" "), words, chars };
}

const V = [], shots = [], sfx = [], events = {};
const shot = (id, start) => { if (shots.length) shots[shots.length - 1].end = +start.toFixed(3); shots.push({ id, start: +start.toFixed(3) }); };
const cue = (name, t, extra = {}) => sfx.push({ name, t: +t.toFixed(3), ...extra });
const ev = (name, t) => { events[name] = +t.toFixed(3); };
const add = async (id, t) => { const v = await voice(id, t); V.push(v); return v; };

// S1 night sky
shot("sky", 0);
cue("fireworks_bed", 0, { until: "maja_end" });
const n1 = await add("n1", 0.3);
// S2 Denis room: type (with d1), delete, retype, breath, send
let t = n1.end + 0.35;
shot("room", t); ev("room_in", t);
const d1 = await add("d1", t + 0.6);
ev("type1_start", d1.start + 0.1); ev("type1_end", d1.end - 0.1);
ev("delete_start", d1.end + 0.3); ev("delete_end", d1.end + 0.95);
ev("retype_start", d1.end + 1.15); ev("retype_end", d1.end + 1.95);
ev("breath", d1.end + 2.0); cue("breath", d1.end + 2.0);
ev("send", d1.end + 2.75); cue("message_sent", d1.end + 2.78);
for (let k = 0; k < 6; k++) cue("key_tap", d1.start + 0.3 + k * 0.5);
// S3 Maja with friend, fireworks
t = events.send + 0.55;
shot("maja", t); ev("maja_in", t);
ev("buzz", t + 0.55); cue("phone_vibrate", t + 0.55);
ev("maja_look", t + 0.95); ev("maja_surprise", t + 1.5); ev("maja_smile", t + 2.3); cue("gasp", t + 1.5);
const m1 = { end: t + 2.6 };
ev("maja_type_start", m1.end + 0.2);
const m2 = await add("m2", m1.end + 0.45);
ev("maja_send", m2.end + 0.25); cue("message_sent", m2.end + 0.28);
ev("maja_end", m2.end + 0.75);
// S4 Denis reads the answer
t = events.maja_end;
shot("denis_reads", t);
cue("message_ding", t + 0.2); ev("ding", t + 0.2);
const d4 = await add("d4", t + 0.9);
// S5 wide fireworks city (narration)
const n2 = await add("n2", d4.end + 0.35);
shot("city", d4.end + 0.7);
cue("fireworks_big", d4.end + 0.9);
// S6 park, 04.01.2025
t = n2.end + 0.45;
shot("park", t); cue("transition", t - 0.3); cue("birds_winter", t, { until: t + 9 }); cue("footsteps_snow", t + 0.4);
const n3 = await add("n3", t + 0.85);
// S7 memories montage
t = n3.end + 0.6;
shot("memories", t); cue("transition", t - 0.3);
const n4 = await add("n4", t + 0.3);
const memEnd = n4.end + 0.35;
// Cut each vignette on the narration word that names it ("kwiaty, wspólne filmy, wakacje, spacery, muzyka i ... śmiechu").
// The list is spoken faster than a vignette can read, so later cuts trail their word slightly; everyday needs >= 2.25 s.
const wordAt = (re) => n4.words.find((w) => re.test(w.w)).s;
const cuts = [t, wordAt(/^wspólne/) - 0.1, wordAt(/^wakacje/) + 0.3, wordAt(/^muzyka/) + 0.35, wordAt(/^A$/) + 0.2, Math.min(wordAt(/^że$/) - 0.2, memEnd - 2.3), memEnd];
const vign = ["flowers", "film", "sea", "dog", "dance", "everyday"].map((id, i) => ({ id, start: +cuts[i].toFixed(3), end: +cuts[i + 1].toFixed(3) }));
const vs = (id) => vign.find((v) => v.id === id);
cue("sea_waves", vs("sea").start, { until: vs("sea").end });
cue("laugh", vs("dog").start + 0.35); cue("dog_bark", vs("dog").start + 0.9);
cue("birds_summer", vs("dog").start, { until: vs("dog").end });
cue("footsteps_walk", vs("everyday").start);
for (const v of vign.slice(1)) cue("whoosh_soft", v.start - 0.15);
// S8 finale 09.11.2026
t = memEnd;
shot("finale", t); cue("transition", t - 0.3); ev("finale_in", t);
cue("footsteps_walk", t + 0.3);
ev("give_flowers", t + 2.2); cue("flowers_rustle", t + 2.2);
const m5 = await add("m5", t + 2.6);
ev("hug", m5.end + 0.2); ev("kiss", m5.end + 0.9); cue("kiss", m5.end + 0.95);
ev("hands", m5.end + 2.6);
const n5 = await add("n5", m5.end + 0.4);
const lastSentence = n5.words.findIndex((w) => /^Bo$/.test(w.w));
ev("end_card_1", n5.words[lastSentence].s);
ev("end_card_2", n5.end + 0.2);
cue("sparkle", events.end_card_1); cue("sparkle", events.end_card_2);
const end = n5.end + 1.8;
shots[shots.length - 1].end = +end.toFixed(3);

const tl = { fps: FPS, narratorTempo: NARR_TEMPO, duration: +end.toFixed(3), frames: Math.ceil(end * FPS), shots, vignettes: vign, events, sfx, voice: V };
await writeFile(new URL("timeline.json", root), JSON.stringify(tl, null, 1));
await writeFile(new URL("src/timeline.json", root), JSON.stringify(tl));
console.log("duration", tl.duration, "frames", tl.frames);
for (const s of shots) console.log(s.id.padEnd(12), s.start.toFixed(2), "-", s.end.toFixed(2), `(${(s.end - s.start).toFixed(1)}s)`);
for (const v of V) console.log("  ", v.id, v.start.toFixed(2), "-", v.end.toFixed(2), v.text);
