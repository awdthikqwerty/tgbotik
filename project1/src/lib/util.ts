// Shared math, color and canvas helpers for every layer (backgrounds, characters, UI).
export const W = 1080, H = 1920, FPS = 30;
/** Backgrounds must cover this rect so camera moves (zoom-out / pan) never reveal empty canvas. */
export const OVERSCAN = { x0: -200, y0: -320, x1: 1280, y1: 2240 };

export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** smoothstep from a..b */
export const ease = (a: number, b: number, t: number) => { const x = clamp((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const easeOut = (a: number, b: number, t: number) => { const x = clamp((t - a) / (b - a)); return 1 - (1 - x) ** 3; };
export const easeIn = (a: number, b: number, t: number) => { const x = clamp((t - a) / (b - a)); return x ** 3; };
export const easeInOut = (a: number, b: number, t: number) => { const x = clamp((t - a) / (b - a)); return x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2; };
/** 0→1→0 window with soft edges */
export const pulse = (a: number, b: number, t: number, edge = 0.25) => ease(a, a + edge, t) * (1 - ease(b - edge, b, t));

/** Deterministic PRNG (mulberry32); same seed → same sequence on every frame. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
}
/** Smooth 1D value noise in [-1,1]. */
export function noise1(x: number, seed = 0) {
  const h = (n: number) => { const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return (s - Math.floor(s)) * 2 - 1; };
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(h(i), h(i + 1), u);
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgba(hex: string, a = 1) { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }
/** Multiply brightness (f<1 darker, f>1 lighter). */
export function shade(hex: string, f: number) {
  const [r, g, b] = hexToRgb(hex);
  const c = (v: number) => Math.round(clamp(v * f, 0, 255));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}
export function mix(a: string, b: string, t: number) {
  const A = hexToRgb(a), B = hexToRgb(b);
  const c = (i: number) => Math.round(lerp(A[i], B[i], t)).toString(16).padStart(2, "0");
  return `#${c(0)}${c(1)}${c(2)}`;
}

export type G = CanvasRenderingContext2D;
export function ellipse(g: G, x: number, y: number, rx: number, ry: number, rot = 0) { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2); }
export function circle(g: G, x: number, y: number, r: number) { g.beginPath(); g.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2); }
export function fillPath(g: G, d: string, fill: string | CanvasGradient, stroke?: string, lw = 4) {
  const p = new Path2D(d); g.fillStyle = fill; g.fill(p);
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.lineJoin = "round"; g.lineCap = "round"; g.stroke(p); }
}
/** Soft radial glow (additive look when used with globalCompositeOperation 'lighter' or 'screen'). */
export function glow(g: G, x: number, y: number, r: number, color: string, a = 1) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(color, a)); gr.addColorStop(0.4, rgba(color, a * 0.35)); gr.addColorStop(1, rgba(color, 0));
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}
export function vGrad(g: G, y0: number, y1: number, stops: Array<[number, string]>) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  return gr;
}
