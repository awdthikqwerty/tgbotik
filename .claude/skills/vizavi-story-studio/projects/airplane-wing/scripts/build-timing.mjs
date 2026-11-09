#!/usr/bin/env node
// Builds src/timing.json: word timings (ElevenLabs alignment when available, otherwise estimated), event anchors, shot frame ranges.
import { readFile, writeFile, access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const script = JSON.parse(await readFile(resolve(root, "data/script.json"), "utf8"));
const events = JSON.parse(await readFile(resolve(root, "data/events.json"), "utf8")).events;
const board = JSON.parse(await readFile(resolve(root, "data/storyboard.json"), "utf8"));
const FPS = board.fps;
const voiceDir = resolve(root, "public/audio/voice");
const exists = (p) => access(p).then(() => true, () => false);

const penalties = [[/\.\.\.$/, 0.4], [/[.!]$/, 0.28], [/\?$/, 0.25], [/:$/, 0.2], [/,$/, 0.16], [/^—$/, 0.12]];
function estimate(words) {
  let t = 0;
  return words.map((w) => {
    const base = Math.max(0.12, w.replace(/[^\p{L}\p{N}]/gu, "").length * 0.062 + 0.05);
    const s = t; const e = t + base;
    t = e + (penalties.find(([re]) => re.test(w))?.[1] ?? 0.02);
    return { w, s, e };
  });
}
function alignedWords(text, al) {
  const chars = al.characters, st = al.character_start_times_seconds, en = al.character_end_times_seconds;
  const out = []; let cur = null;
  chars.forEach((c, i) => {
    if (/\s/.test(c)) { if (cur) { out.push(cur); cur = null; } return; }
    if (!cur) cur = { w: "", s: st[i], e: en[i] };
    cur.w += c; cur.e = en[i];
  });
  if (cur) out.push(cur);
  const tokens = text.split(/\s+/).filter(Boolean);
  if (tokens.length !== out.length) throw new Error(`alignment word count ${out.length} != text tokens ${tokens.length}`);
  return out.map((o, i) => ({ w: tokens[i], s: o.s, e: o.e }));
}
function audioDuration(file) {
  const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file], { encoding: "utf8" });
  return parseFloat(r.stdout);
}

let cursor = script.lead; const segments = []; let realCount = 0;
for (const seg of script.segments) {
  const mp3 = resolve(voiceDir, `${seg.id}.mp3`), alp = `${mp3}.alignment.json`;
  const tokens = seg.text.split(/\s+/).filter(Boolean);
  let words, trimStart = 0, trimEnd, real = false;
  if (await exists(mp3) && await exists(alp)) {
    const al = JSON.parse(await readFile(alp, "utf8")).alignment;
    words = alignedWords(seg.text, al); real = true; realCount++;
    trimStart = Math.max(0, words[0].s - 0.05);
    trimEnd = Math.min(audioDuration(mp3), words.at(-1).e + 0.14);
  } else { words = estimate(tokens); trimEnd = words.at(-1).e + 0.1; }
  const dur = trimEnd - trimStart;
  const kw = new Set(seg.keywords.map((k) => k.toLowerCase()));
  segments.push({
    id: seg.id, text: seg.text, mood: seg.mood, real, trimStart, trimEnd, start: cursor, end: cursor + dur,
    words: words.map((x) => ({ w: x.w, s: +(cursor + x.s - trimStart).toFixed(3), e: +(cursor + x.e - trimStart).toFixed(3),
      k: kw.has(x.w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "")) })),
  });
  cursor += dur + seg.gapAfter;
}
const speechEnd = segments.at(-1).end;
const total = speechEnd + script.outro;
const byId = Object.fromEntries(segments.map((s) => [s.id, s]));
function resolveAnchor(a) {
  const m = /^(zero|end|seg\d+)(?:@(start|end|word:(\d+)))?([+-]\d+(?:\.\d+)?)?$/.exec(a);
  if (!m) throw new Error(`bad anchor ${a}`);
  const [, base, what, idx, off] = m; let t;
  if (base === "zero") t = 0; else if (base === "end") t = total;
  else { const s = byId[base]; if (!s) throw new Error(`unknown segment in ${a}`);
    t = what === "end" ? s.end : what?.startsWith("word") ? s.words[+idx].s : s.start; }
  return +(t + (off ? parseFloat(off) : 0)).toFixed(3);
}
const ev = Object.fromEntries(Object.entries(events).map(([k, v]) => [k, resolveAnchor(v)]));

const shots = [];
for (const sc of board.scenes) {
  const a = resolveAnchor(sc.from), b = resolveAnchor(sc.to);
  const sum = sc.shots.reduce((x, s) => x + s.w, 0); let acc = 0;
  sc.shots.forEach((s, i) => {
    const s0 = Math.round((a + (b - a) * acc / sum) * FPS);
    acc += s.w;
    const s1 = i === sc.shots.length - 1 ? Math.round(b * FPS) : Math.round((a + (b - a) * acc / sum) * FPS);
    shots.push({ id: s.id, scene: sc.id, set: s.set, transition: s.transition, startF: s0, endF: s1 });
  });
}
shots[0].startF = 0; shots.at(-1).endF = Math.round(total * FPS);
for (let i = 1; i < shots.length; i++) if (shots[i].startF !== shots[i - 1].endF) {
  console.warn(`gap/overlap ${shots[i - 1].id}->${shots[i].id}: ${shots[i - 1].endF} vs ${shots[i].startF}; snapping`);
  shots[i].startF = shots[i - 1].endF;
}
const out = { mode: realCount === segments.length ? "voice" : realCount ? "partial" : "estimated", fps: FPS, total: +total.toFixed(3),
  totalFrames: Math.round(total * FPS), speechEnd: +speechEnd.toFixed(3), segments, events: ev, shots };
await writeFile(resolve(root, "src/timing.json"), JSON.stringify(out, null, 1));
console.log(`timing mode=${out.mode} total=${out.total}s frames=${out.totalFrames} speechEnd=${out.speechEnd}s shots=${shots.length}`);
console.log(shots.map((s) => `${s.id}:${(s.startF / FPS).toFixed(1)}-${(s.endF / FPS).toFixed(1)}`).join(" "));
