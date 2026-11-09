// Subtitles (word-highlight, speaker-tinted), date cards and the end card.
import { G, clamp, ease, easeOut, rgba, W } from "../lib/util";
import { UI_FONT, SCRIPT_FONT } from "../lib/fonts";
import { VOICES } from "../chars/lipsync";
import { heartPath } from "./phone";

type Word = { w: string; s: number; e: number };
type Chunk = { words: Word[]; s: number; e: number; speaker: string };
const COLORS: Record<string, string> = { narrator: "#ffffff", denis: "#d6ecff", maja: "#ffe0ec" };

function chunks(): Chunk[] {
  const out: Chunk[] = [];
  for (const v of VOICES) {
    let cur: Word[] = [];
    const flush = () => { if (cur.length) out.push({ words: cur, s: cur[0].s, e: cur[cur.length - 1].e, speaker: v.speaker }); cur = []; };
    for (const w of v.words) {
      cur.push(w);
      const len = cur.map((x) => x.w).join(" ").length;
      if (/[.!?…,;:]$/.test(w.w) && len > 14) flush();
      else if (len > 26) flush();
    }
    flush();
  }
  // hold each chunk until the next one starts (max +0.6 s)
  for (let i = 0; i < out.length; i++) out[i].e = Math.min(out[i].e + 0.6, i + 1 < out.length ? out[i + 1].s - 0.02 : out[i].e + 0.6);
  return out;
}
const CHUNKS = chunks();

/** Subtitle band centred at y (default 1470) — below faces, above TikTok's bottom UI. */
export function drawSubtitles(g: G, t: number, y = 1470) {
  const c = CHUNKS.find((k) => t >= k.s - 0.08 && t <= k.e);
  if (!c) return;
  const a = clamp((t - (c.s - 0.08)) / 0.12) * clamp((c.e - t) / 0.12);
  g.save();
  g.font = `900 58px ${UI_FONT}`;
  g.textBaseline = "middle";
  const sp = Math.max(16, g.measureText(" ").width); // first frame in a fresh tab can report 0
  const widths = c.words.map((w) => g.measureText(w.w).width);
  // wrap to max 900px
  const lines: number[][] = [[]]; let lw = 0;
  c.words.forEach((_, i) => { const ww = widths[i] + (lines[lines.length - 1].length ? sp : 0); if (lw + ww > 900 && lines[lines.length - 1].length) { lines.push([]); lw = 0; } lines[lines.length - 1].push(i); lw += widths[i] + sp; });
  const lh = 74, y0 = y - ((lines.length - 1) * lh) / 2;
  const base = COLORS[c.speaker] ?? "#fff";
  lines.forEach((ln, li) => {
    const total = ln.reduce((s, i) => s + widths[i], 0) + sp * (ln.length - 1);
    let x = W / 2 - total / 2;
    for (const i of ln) {
      const w = c.words[i];
      const active = t >= w.s - 0.03 && t <= w.e + 0.05;
      const said = t > w.e;
      const pop = active ? 1 + 0.08 * Math.sin(clamp((t - w.s) / Math.max(0.08, w.e - w.s)) * Math.PI) : 1;
      g.save();
      g.translate(x + widths[i] / 2, y0 + li * lh); g.scale(pop, pop);
      g.globalAlpha = a * (active || said ? 1 : 0.62);
      g.lineJoin = "round"; g.lineWidth = 12; g.strokeStyle = "rgba(40,22,52,0.78)";
      g.strokeText(w.w, -widths[i] / 2, 0);
      g.fillStyle = active ? "#ffd86b" : base;
      g.fillText(w.w, -widths[i] / 2, 0);
      g.restore();
      x += widths[i] + sp;
    }
  });
  g.restore();
}

/** Elegant handwritten date card; t0..t1 visible window. */
export function drawDateCard(g: G, text: string, t: number, t0: number, t1: number, y = 330, sub?: string) {
  const a = ease(t0, t0 + 0.6, t) * (1 - ease(t1 - 0.5, t1, t));
  if (a <= 0) return;
  g.save();
  g.globalAlpha = a;
  const rise = (1 - easeOut(t0, t0 + 0.9, t)) * 30;
  g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `700 112px ${SCRIPT_FONT}`;
  g.shadowColor = "rgba(255,190,220,0.9)"; g.shadowBlur = 30;
  g.fillStyle = "#fffaf3"; g.fillText(text, W / 2, y + rise);
  g.shadowBlur = 0;
  // reveal line
  const lw = 340 * easeOut(t0 + 0.2, t0 + 1.2, t);
  g.strokeStyle = rgba("#fffaf3", 0.85); g.lineWidth = 3; g.lineCap = "round";
  g.beginPath(); g.moveTo(W / 2 - lw / 2, y + 74 + rise); g.lineTo(W / 2 + lw / 2, y + 74 + rise); g.stroke();
  if (sub) { g.font = `800 34px ${UI_FONT}`; g.fillStyle = rgba("#fffaf3", 0.92); g.fillText(sub, W / 2, y + 116 + rise); }
  g.restore();
}

/** Two-line ending with hearts. */
export function drawEndCard(g: G, t: number, t1: number, t2: number) {
  const lines = [
    { a: ease(t1, t1 + 0.8, t), date: "01.01.2025", text: "Początek naszej historii", heart: true, y: 300 },
    { a: ease(t2, t2 + 0.8, t), date: "09.11.2026", text: "I to dopiero początek…", heart: false, y: 470 },
  ];
  g.save(); g.textAlign = "center"; g.textBaseline = "middle";
  for (const l of lines) {
    if (l.a <= 0) continue;
    g.globalAlpha = l.a;
    const rise = (1 - l.a) * 26;
    g.shadowColor = "rgba(255,170,200,0.95)"; g.shadowBlur = 26;
    g.font = `900 46px ${UI_FONT}`; g.fillStyle = "#fffaf3";
    g.fillText(l.date, W / 2, l.y - 46 + rise);
    g.font = `700 82px ${SCRIPT_FONT}`;
    const tw = g.measureText(l.text).width;
    g.fillText(l.text, W / 2 - (l.heart ? 30 : 0), l.y + 26 + rise);
    g.shadowBlur = 0;
    if (l.heart) {
      const beat = 1 + 0.08 * Math.sin(t * 6);
      heartPath(g, W / 2 + tw / 2 + 20, l.y + 24 + rise, 54 * beat);
      const hg = g.createLinearGradient(0, l.y - 10, 0, l.y + 50); hg.addColorStop(0, "#ff7a9c"); hg.addColorStop(1, "#ff3b6b");
      g.fillStyle = hg; g.fill();
    }
  }
  g.restore();
}
