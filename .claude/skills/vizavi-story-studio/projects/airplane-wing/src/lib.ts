import timing from "./timing.json";

export const FPS = 30;
export const W = 1080;
export const H = 1920;

export type Word = { w: string; s: number; e: number; k: boolean };
export type Segment = { id: string; text: string; mood: string; start: number; end: number; words: Word[] };
export type ShotSpec = { id: string; scene: string; set: string; transition: string; startF: number; endF: number };
export const timingData = timing as unknown as {
  mode: string; total: number; totalFrames: number; speechEnd: number;
  segments: Segment[]; events: Record<string, number>; shots: ShotSpec[];
};
export const EV = timingData.events;
export const TOTAL_FRAMES = timingData.totalFrames;

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = (t: number) => clamp(t) * clamp(t) * clamp(t);
export const mix3 = (a: number[], b: number[], t: number) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)] as [number, number, number];

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** Smooth deterministic pseudo-noise in [-1, 1]. */
export const noise = (x: number, seed = 0) =>
  (Math.sin(x * 1.0 + seed * 12.9898) * 0.5 + Math.sin(x * 2.3 + seed * 78.233) * 0.3 + Math.sin(x * 5.1 + seed * 37.719) * 0.2);

export function shotAt(frame: number) {
  const shots = timingData.shots;
  let idx = shots.findIndex((s) => frame >= s.startF && frame < s.endF);
  if (idx < 0) idx = frame < shots[0].startF ? 0 : shots.length - 1;
  const shot = shots[idx];
  const dur = shot.endF - shot.startF;
  const f = frame - shot.startF;
  return { shot, idx, f, dur, u: clamp(f / Math.max(1, dur - 1)), tl: f / FPS, durSec: dur / FPS };
}

/** Time since an event (seconds), negative before it. */
export const since = (t: number, ev: number) => t - ev;
/** Progress 0..1 between two event times. */
export const prog = (t: number, a: number, b: number) => clamp((t - a) / Math.max(1e-6, b - a));
