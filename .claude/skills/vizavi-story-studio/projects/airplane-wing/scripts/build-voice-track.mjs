#!/usr/bin/env node
// Places the trimmed ElevenLabs segments on the locked timeline -> public/audio/voice.wav (48 kHz mono).
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const timing = JSON.parse(await readFile(resolve(root, "src/timing.json"), "utf8"));
if (timing.mode !== "voice") throw new Error(`timing mode is ${timing.mode}; generate voice and rerun build-timing first`);
const args = ["-y", "-v", "error"];
const filters = [];
timing.segments.forEach((s, i) => {
  args.push("-i", resolve(root, `public/audio/voice/${s.id}.mp3`));
  const ms = Math.round(s.start * 1000);
  const dur = s.trimEnd - s.trimStart;
  filters.push(`[${i}:a]atrim=start=${s.trimStart.toFixed(3)}:end=${s.trimEnd.toFixed(3)},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=mono,afade=t=in:d=0.01,afade=t=out:st=${(dur - 0.04).toFixed(3)}:d=0.04,adelay=${ms}:all=1[a${i}]`);
});
const n = timing.segments.length;
filters.push(`${timing.segments.map((_, i) => `[a${i}]`).join("")}amix=inputs=${n}:normalize=0:duration=longest,apad=whole_dur=${timing.total.toFixed(3)},atrim=0:${timing.total.toFixed(3)}[out]`);
args.push("-filter_complex", filters.join(";"), "-map", "[out]", "-ar", "48000", "-ac", "1", resolve(root, "public/audio/voice.wav"));
const r = spawnSync("ffmpeg", args, { encoding: "utf8" });
if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
console.log("voice.wav written");
