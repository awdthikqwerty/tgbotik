// Shared painting kit for the night/evening backgrounds: baked layers, grain, glow sprites,
// stars, deterministic fireworks, skylines, snow and bokeh.
import { OVERSCAN, rng, rgba, clamp, lerp, mix, G, easeOut } from "../lib/util";

export const X0 = OVERSCAN.x0, Y0 = OVERSCAN.y0, X1 = OVERSCAN.x1, Y1 = OVERSCAN.y1;
export const OW = X1 - X0, OH = Y1 - Y0;

export function once<T>(f: () => T): () => T {
  let v: T | undefined;
  return () => (v === undefined ? (v = f()) : v);
}
export function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return c;
}

/** Offscreen layer covering a world-space rect, painted once in world coordinates. */
export type Layer = { c: HTMLCanvasElement; x: number; y: number; w: number; h: number };
export function bake(x: number, y: number, w: number, h: number, paint: (g: G) => void, res = 1, blurPx = 0): Layer {
  const c = canvas(w * res, h * res);
  const g = c.getContext("2d")!;
  g.scale(res, res); g.translate(-x, -y);
  paint(g);
  if (blurPx > 0) { // blur the finished layer once (ctx.filter per draw call is extremely slow in software)
    const c2 = canvas(c.width, c.height), g2 = c2.getContext("2d")!;
    g2.filter = `blur(${blurPx * res}px)`; g2.drawImage(c, 0, 0);
    return { c: c2, x, y, w, h };
  }
  return { c, x, y, w, h };
}
export function blit(g: G, L: Layer, dx = 0, dy = 0) {
  g.drawImage(L.c, L.x + dx, L.y + dy, L.w, L.h);
}

/** Cheap hash in [0,1). */
export const hash = (n: number) => { const s = Math.sin(n * 91.3458 + 17.17) * 47453.5453; return s - Math.floor(s); };

// ---------- texture ----------
const grainTex = once(() => {
  const c = canvas(256, 256), g = c.getContext("2d")!;
  const im = g.createImageData(256, 256), r = rng(4242);
  for (let i = 0; i < im.data.length; i += 4) {
    const v = 128 + (r() - 0.5) * 70 + (r() - 0.5) * 40;
    im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  return c;
});
/** Fine paper grain (bake time only). */
export function grain(g: G, x: number, y: number, w: number, h: number, a = 0.07) {
  g.save();
  g.globalCompositeOperation = "overlay"; g.globalAlpha = a;
  g.fillStyle = g.createPattern(grainTex(), "repeat")!;
  g.fillRect(x, y, w, h);
  g.restore();
}
/** Large soft colour blotches = hand-painted unevenness (bake time only). */
export function wash(g: G, seed: number, x: number, y: number, w: number, h: number, colors: string[], n = 14, a = 0.18, op: GlobalCompositeOperation = "soft-light") {
  const r = rng(seed);
  g.save(); g.globalCompositeOperation = op;
  for (let i = 0; i < n; i++) {
    const cx = x + r() * w, cy = y + r() * h, rr = (0.12 + r() * 0.3) * Math.max(w, h);
    const c = colors[i % colors.length];
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rr);
    gr.addColorStop(0, rgba(c, a)); gr.addColorStop(1, rgba(c, 0));
    g.fillStyle = gr; g.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
  }
  g.restore();
}
/** Soft vignette in world space. */
export function vignette(g: G, cx: number, cy: number, r0: number, r1: number, color: string, a: number) {
  const gr = g.createRadialGradient(cx, cy, r0, cx, cy, r1);
  gr.addColorStop(0, rgba(color, 0)); gr.addColorStop(1, rgba(color, a));
  g.fillStyle = gr; g.fillRect(X0, Y0, OW, OH);
}
export function radial(g: G, x: number, y: number, r: number, color: string, a: number, mid = 0.35) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(color, a)); gr.addColorStop(mid, rgba(color, a * 0.45)); gr.addColorStop(1, rgba(color, 0));
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}

// ---------- glow sprites ----------
const sprites = new Map<string, HTMLCanvasElement>();
/** 64px soft dot: white-hot core → colour → transparent. */
export function sprite(color: string, hot = 0.8): HTMLCanvasElement {
  const key = color + hot;
  let c = sprites.get(key);
  if (!c) {
    c = canvas(64, 64);
    const g = c.getContext("2d")!, gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, rgba(mix(color, "#ffffff", hot), 1));
    gr.addColorStop(0.18, rgba(mix(color, "#ffffff", hot * 0.4), 0.9));
    gr.addColorStop(0.42, rgba(color, 0.32));
    gr.addColorStop(1, rgba(color, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    sprites.set(key, c);
  }
  return c;
}
export function spot(g: G, color: string, x: number, y: number, r: number, a = 1, hot = 0.8) {
  if (a <= 0.003 || r <= 0.2) return;
  g.globalAlpha = Math.min(1, a);
  g.drawImage(sprite(color, hot), x - r, y - r, r * 2, r * 2);
}

// ---------- stars ----------
export function bakeStars(g: G, seed: number, n: number, x0: number, y0: number, x1: number, y1: number, fade?: (y: number) => number) {
  const r = rng(seed);
  g.save();
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, r()), y = lerp(y0, y1, r()), s = r();
    const f = fade ? fade(y) : 1;
    if (f <= 0.02) continue;
    const c = s > 0.85 ? "#ffe9c9" : s > 0.6 ? "#d9d4ff" : "#ffffff";
    g.globalAlpha = (0.25 + 0.6 * r()) * f;
    g.fillStyle = c;
    const rad = 0.6 + s * s * 1.6;
    g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}
export function twinkleStars(g: G, seed: number, n: number, x0: number, y0: number, x1: number, y1: number, t: number, dy = 0, fade?: (y: number) => number) {
  const r = rng(seed);
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, r()), y = lerp(y0, y1, r()), ph = r() * 6.28, sp = 1.5 + r() * 3, sz = 5 + r() * 9;
    const f = fade ? fade(y) : 1;
    const tw = 0.55 + 0.45 * Math.sin(t * sp + ph);
    const a = tw * f;
    if (a < 0.03) continue;
    const yy = y + dy;
    if (yy < Y0 - 20 || yy > Y1 + 20) continue;
    spot(g, i % 4 === 0 ? "#ffe2b8" : "#dcd6ff", x, yy, sz, a * 0.9, 0.9);
    if (sz > 11) { // four-point sparkle
      g.globalAlpha = a * 0.5; g.fillStyle = "#ffffff";
      g.fillRect(x - sz * 1.3, yy - 0.6, sz * 2.6, 1.2);
      g.fillRect(x - 0.6, yy - sz * 1.3, 1.2, sz * 2.6);
    }
  }
  g.restore();
}

// ---------- fireworks ----------
export type Kind = "peony" | "ring" | "willow" | "chrys" | "heart" | "palm";
export type Burst = { t: number; x: number; y: number; r: number; col: string; col2?: string; kind?: Kind; n?: number; seed?: number; rise?: number; life?: number };
type P = { dx: number; dy: number; tw: number; sz: number };
const pcache = new WeakMap<Burst, P[]>();
const K = 3.1; // air drag: displacement fraction = 1 - e^(-K·age)

function particles(b: Burst): P[] {
  let ps = pcache.get(b);
  if (ps) return ps;
  const r = rng(b.seed ?? Math.floor(b.t * 1000 + b.x * 7 + b.y * 13));
  const kind = b.kind ?? "peony";
  const n = b.n ?? (kind === "heart" ? 120 : kind === "ring" ? 46 : kind === "palm" ? 9 : kind === "willow" ? 54 : 72);
  ps = [];
  const tilt = r() * Math.PI;
  for (let i = 0; i < n; i++) {
    let dx: number, dy: number;
    if (kind === "heart") {
      const a = (i / n) * Math.PI * 2;
      const hx = 16 * Math.sin(a) ** 3;
      const hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
      dx = hx / 17; dy = (hy + 2.5) / 17;
    } else if (kind === "ring") {
      const a = (i / n) * Math.PI * 2;
      dx = Math.cos(a); dy = Math.sin(a) * 0.55;
      const c = Math.cos(tilt), s = Math.sin(tilt) * 0.5;
      [dx, dy] = [dx * c - dy * s, dx * s + dy * c];
    } else if (kind === "palm") {
      const a = (i / n) * Math.PI * 2 + r() * 0.2;
      dx = Math.cos(a); dy = Math.sin(a) * 0.8 - 0.25;
    } else {
      const a = (i / n) * Math.PI * 2 + (r() - 0.5) * 0.25;
      const u = r();
      const sp = Math.sqrt(1 - u * u * 0.85) * (0.9 + r() * 0.12);
      dx = Math.cos(a) * sp; dy = Math.sin(a) * sp;
    }
    ps.push({ dx, dy, tw: r(), sz: 0.75 + r() * 0.5 });
  }
  pcache.set(b, ps);
  return ps;
}
export function lifeOf(b: Burst) {
  const k = b.kind ?? "peony";
  return b.life ?? (k === "willow" ? 2.9 : k === "heart" ? 2.7 : k === "chrys" ? 2.2 : k === "palm" ? 2.4 : 1.9);
}
const gravOf = (b: Burst) => {
  const k = b.kind ?? "peony";
  return (k === "willow" ? 95 : k === "heart" ? 20 : k === "palm" ? 90 : 48) * (b.r / 250);
};
function pos(b: Burst, p: P, a: number): [number, number] {
  const d = 1 - Math.exp(-K * a);
  return [b.x + p.dx * b.r * d, b.y + p.dy * b.r * d + 0.5 * gravOf(b) * a * a];
}
/** 0..1 brightness of a burst at age a. */
function fadeOf(b: Burst, a: number) {
  const L = lifeOf(b), hold = b.kind === "heart" ? 0.72 : 0.5;
  if (a < 0 || a > L) return 0;
  const x = a / L;
  return x < hold ? 1 : Math.pow(1 - (x - hold) / (1 - hold), 1.4);
}

/** Draw fireworks; dy shifts everything vertically (parallax), s scales sprite/line sizes. */
export function drawFireworks(g: G, bursts: Burst[], t: number, dy = 0, s = 1) {
  g.save();
  g.translate(0, dy);
  g.globalCompositeOperation = "lighter";
  g.lineCap = "round"; g.lineJoin = "round";
  const frameN = Math.floor(t * 30);
  for (const b of bursts) {
    const a = t - b.t, L = lifeOf(b), rise = b.rise ?? 0.65;
    // rocket climbing
    if (a < 0 && a > -rise && b.kind !== "palm") {
      const k = easeOut(0, 1, 1 + a / rise);
      const y0 = b.y + b.r * 1.9, yy = lerp(y0, b.y, k), xx = b.x + Math.sin(b.t * 9) * 12 * (1 - k);
      for (let j = 1; j < 9; j++) spot(g, "#ffcf8a", xx + Math.sin(j * 2.1 + b.t) * 2, yy + j * 11 * s, (4 - j * 0.3) * s, 0.5 * (1 - j / 9), 0.6);
      spot(g, "#ffe3b0", xx, yy, 11 * s, 0.95);
      continue;
    }
    if (a < 0 || a > L) continue;
    const f = fadeOf(b, a), ps = particles(b);
    const late = a / L;
    const kind = b.kind ?? "peony";
    // initial flash + lingering smoke glow
    if (a < 0.35) spot(g, b.col, b.x, b.y, b.r * (0.5 + a * 1.6), (1 - a / 0.35) * 0.8, 0.6);
    spot(g, b.col, b.x, b.y + 0.25 * gravOf(b) * a * a, b.r * 1.5, 0.22 * f, 0.05);
    const col = b.col2 && late > 0.45 ? mix(b.col, b.col2, Math.round(clamp((late - 0.45) * 3) * 8) / 8) : b.col;
    // trails: a few segments with decreasing alpha so long trails fade out along their length
    const segs: number[][] = kind === "willow" || kind === "palm" ? [[0, 0.14, 0.8], [0.14, 0.38, 0.38], [0.38, 0.75, 0.16]]
      : kind === "chrys" ? [[0, 0.12, 0.8], [0.12, 0.3, 0.32]] : kind === "heart" ? [[0, 0.1, 0.85], [0.1, 0.22, 0.3]] : [[0, 0.09, 0.75], [0.09, 0.2, 0.25]];
    g.strokeStyle = col;
    segs.forEach(([s0, s1, al], si) => {
      const aA = Math.max(0, a - s1), aB = Math.max(0, a - s0);
      if (aB <= aA) return;
      const am = (aA + aB) / 2;
      g.globalAlpha = f * al;
      g.lineWidth = Math.max(1.2, (b.r / 100) * s) * (si === 0 ? 1 : 0.7);
      g.beginPath();
      for (const p of ps) {
        const [x0, y0] = pos(b, p, aA), [x1, y1] = pos(b, p, am), [x2, y2] = pos(b, p, aB);
        g.moveTo(x0, y0); g.quadraticCurveTo(x1, y1, x2, y2);
      }
      g.stroke();
    });
    // heads
    const spr = sprite(col, 0.5);
    const hs = Math.max(4.5, b.r / 21) * s * (kind === "heart" ? 1.2 : 1);
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      let al = f;
      if (late > 0.35) al *= 0.35 + 0.65 * (hash(i * 13.1 + frameN * 0.77 + b.t) > 0.45 ? 1 : 0.25);
      if (al < 0.03) continue;
      const [x, y] = pos(b, p, a);
      const r = hs * p.sz;
      g.globalAlpha = al;
      g.drawImage(spr, x - r, y - r, r * 2, r * 2);
    }
  }
  g.restore();
}
/** Overall flash (0..~1) and dominant colour, for tinting the sky / a room. */
export function flashOf(bursts: Burst[], t: number) {
  let tot = 0, best = 0, col = "#ffffff";
  for (const b of bursts) {
    const a = t - b.t;
    if (a < 0 || a > lifeOf(b)) continue;
    const v = (a < 0.08 ? a / 0.08 : Math.exp(-(a - 0.08) * 2.4)) * clamp(b.r / 260, 0.3, 1.4) + 0.12 * fadeOf(b, a);
    tot += v;
    if (v > best) { best = v; col = b.col; }
  }
  return { a: clamp(tot, 0, 1.2), col };
}
/** Water reflections: stretched glow columns + shimmering dashes below waterY. */
export function reflectFireworks(g: G, bursts: Burst[], t: number, waterY: number, depth: number, dy = 0, strength = 1) {
  g.save(); g.globalCompositeOperation = "lighter";
  for (const b of bursts) {
    const a = t - b.t;
    if (a < 0 || a > lifeOf(b)) continue;
    const f = fadeOf(b, a) * (a < 0.4 ? 1.4 - a : 1) * strength;
    const by = b.y + dy;
    const ry = waterY + (waterY - by) * 0.35; // mirrored centre, compressed
    const w = b.r * 0.9;
    g.globalAlpha = 0.22 * f;
    g.drawImage(sprite(b.col, 0.3), b.x - w, waterY, w * 2, Math.min(depth, (ry - waterY) * 2.2 + 80));
    g.fillStyle = b.col;
    const n = 14;
    for (let k = 0; k < n; k++) {
      const yy = waterY + 6 + (k / n) * Math.min(depth, (ry - waterY) * 2 + 60);
      const h = hash(k * 7.7 + Math.floor(t * 9) + b.t * 3);
      const ww = w * (0.25 + h * 0.9) * (1 - k / n * 0.5);
      g.globalAlpha = 0.35 * f * (1 - k / n) * (0.4 + h);
      g.fillRect(b.x - ww / 2 + (h - 0.5) * 30, yy, ww, 2.2 + h * 2);
    }
  }
  g.restore();
}
/** Helper to generate a deterministic schedule of bursts. */
export function schedule(seed: number, t0: number, t1: number, every: number, area: { x0: number; x1: number; y0: number; y1: number }, rMin: number, rMax: number, palette: string[][], kinds: Kind[] = ["peony", "peony", "chrys", "ring", "willow"]) {
  const r = rng(seed), out: Burst[] = [];
  let t = t0;
  while (t < t1) {
    const p = palette[Math.floor(r() * palette.length)];
    out.push({ t, x: lerp(area.x0, area.x1, r()), y: lerp(area.y0, area.y1, r()), r: lerp(rMin, rMax, r()), col: p[0], col2: p[1], kind: kinds[Math.floor(r() * kinds.length)], seed: Math.floor(r() * 1e6) });
    t += every * (0.6 + r() * 0.8);
  }
  return out;
}
export const FW_PALETTE: string[][] = [
  ["#ff8fcf", "#ffc2e4"], ["#ffd27a", "#ff9f6b"], ["#8fe9ff", "#c9a8ff"], ["#c9a8ff", "#ff8fcf"], ["#fff1d6", "#ffd27a"], ["#ff7aa8", "#ffd0e0"],
];

// ---------- skylines ----------
export type SkyOpts = {
  seed: number; x0: number; x1: number; base: number; hMin: number; hMax: number; wMin: number; wMax: number;
  top: string; bottom: string; lit?: number; win?: [number, number]; snow?: string; rim?: string; edge?: string;
  spires?: boolean; gap?: number;
};
/** Row of city buildings with snowy roofs and lit windows (bake time). */
export function skyline(g: G, o: SkyOpts) {
  const r = rng(o.seed);
  let x = o.x0;
  const [ww, wh] = o.win ?? [6, 8];
  const lits = ["#ffd38a", "#ffd38a", "#ffe6b0", "#ffbf80", "#ffb0c8", "#bfe0ff"];
  while (x < o.x1) {
    const w = lerp(o.wMin, o.wMax, r());
    const h = lerp(o.hMin, o.hMax, Math.pow(r(), 1.4));
    const top = o.base - h;
    const typ = r();
    const grd = g.createLinearGradient(0, top, 0, o.base);
    grd.addColorStop(0, o.top); grd.addColorStop(1, o.bottom);
    g.fillStyle = grd;
    let roofTop = top;
    g.beginPath();
    if (typ < 0.38) { // pitched kamienica roof
      const rh = w * (0.28 + r() * 0.18);
      roofTop = top - rh;
      g.moveTo(x, o.base); g.lineTo(x, top); g.lineTo(x + w * 0.12, top - rh); g.lineTo(x + w * 0.88, top - rh); g.lineTo(x + w, top); g.lineTo(x + w, o.base);
    } else if (typ < 0.5 && o.spires !== false) { // church tower with spire
      const tw = w * 0.42, tx = x + (w - tw) / 2, th = h * 0.5, sp = h * 0.55;
      roofTop = top - th - sp;
      g.moveTo(x, o.base); g.lineTo(x, top); g.lineTo(tx, top); g.lineTo(tx, top - th); g.lineTo(tx + tw / 2, top - th - sp); g.lineTo(tx + tw, top - th); g.lineTo(tx + tw, top); g.lineTo(x + w, top); g.lineTo(x + w, o.base);
    } else if (typ < 0.58) { // dome
      g.moveTo(x, o.base); g.lineTo(x, top); g.arc(x + w / 2, top, w / 2, Math.PI, 0); g.lineTo(x + w, o.base);
      roofTop = top - w / 2;
    } else { // flat block, maybe with setback
      g.moveTo(x, o.base); g.lineTo(x, top);
      if (r() < 0.4) { g.lineTo(x + w * 0.2, top); g.lineTo(x + w * 0.2, top - h * 0.12); g.lineTo(x + w * 0.8, top - h * 0.12); g.lineTo(x + w * 0.8, top); roofTop = top - h * 0.12; }
      g.lineTo(x + w, top); g.lineTo(x + w, o.base);
    }
    g.closePath(); g.fill();
    if (o.edge) { g.strokeStyle = o.edge; g.lineWidth = 1.5; g.stroke(); }
    // rim light along the top edge
    if (o.rim) {
      g.save(); g.clip();
      const rg = g.createLinearGradient(0, roofTop, 0, roofTop + 40);
      rg.addColorStop(0, rgba(o.rim, 0.45)); rg.addColorStop(1, rgba(o.rim, 0));
      g.fillStyle = rg; g.fillRect(x, roofTop, w, 40);
      g.restore();
    }
    // snow on roof
    if (o.snow) {
      g.fillStyle = o.snow;
      if (typ < 0.38) {
        const rh = top - roofTop;
        g.beginPath(); g.moveTo(x - 2, top + 2); g.lineTo(x + w * 0.12, roofTop - 2); g.lineTo(x + w * 0.88, roofTop - 2); g.lineTo(x + w + 2, top + 2);
        g.lineTo(x + w * 0.8, top - rh * 0.25); g.lineTo(x + w * 0.2, top - rh * 0.2); g.closePath(); g.fill();
      } else if (typ >= 0.58) {
        g.fillRect(x - 1, roofTop - 3, (typ >= 0.58 && roofTop < top) ? w + 2 : w + 2, 4);
        if (roofTop < top) { g.fillRect(x - 1, top - 3, w * 0.22, 4); g.fillRect(x + w * 0.78, top - 3, w * 0.23, 4); }
      }
    }
    // windows
    if (o.lit) {
      const gx = ww * 2.1, gy = wh * 1.9;
      for (let yy = top + gy * 0.8; yy < o.base - wh; yy += gy) {
        for (let xx = x + ww * 0.9; xx < x + w - ww * 1.2; xx += gx) {
          if (r() < o.lit) {
            g.fillStyle = lits[Math.floor(r() * lits.length)];
            g.globalAlpha = 0.55 + r() * 0.45;
            g.fillRect(xx, yy, ww, wh);
            g.globalAlpha = 1;
          }
        }
      }
    }
    x += w + (o.gap ?? 0) * r();
  }
}

// ---------- weather & lens ----------
/** Falling snow; flakes wrap inside the overscan box. */
export function snowfall(g: G, seed: number, t: number, n: number, sMin = 2, sMax = 6, speed = 70, a = 0.8, box = { x0: X0, y0: Y0, x1: X1, y1: Y1 }) {
  const r = rng(seed), w = box.x1 - box.x0, h = box.y1 - box.y0;
  g.save();
  const spr = sprite("#ffffff", 1);
  for (let i = 0; i < n; i++) {
    const depth = r(), sz = lerp(sMin, sMax, depth * depth);
    const x0 = r() * w, y0 = r() * h, ph = r() * 6.28, sp = speed * (0.5 + depth);
    let y = (y0 + t * sp) % h; if (y < 0) y += h;
    let x = (x0 + Math.sin(t * (0.6 + depth) + ph) * 18 + t * 12) % w; if (x < 0) x += w;
    g.globalAlpha = a * (0.45 + 0.55 * depth);
    g.drawImage(spr, box.x0 + x - sz, box.y0 + y - sz, sz * 2, sz * 2);
  }
  g.restore();
}
/** Big out-of-focus light discs drifting slowly (use near frame edges). */
export function bokeh(g: G, seed: number, t: number, spots: { x: number; y: number; r: number; c: string }[], a = 0.35) {
  g.save(); g.globalCompositeOperation = "screen";
  spots.forEach((s, i) => {
    const x = s.x + Math.sin(t * 0.5 + i * 1.7 + seed) * 14, y = s.y + Math.cos(t * 0.4 + i) * 10;
    const al = a * (0.75 + 0.25 * Math.sin(t * 1.3 + i * 2.1));
    const gr = g.createRadialGradient(x, y, s.r * 0.55, x, y, s.r);
    gr.addColorStop(0, rgba(s.c, al)); gr.addColorStop(0.85, rgba(s.c, al * 0.8)); gr.addColorStop(1, rgba(s.c, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, s.r, 0, Math.PI * 2); g.fill();
  });
  g.restore();
}
/** Catenary-ish string of fairy lights; returns bulb positions. */
export function fairyPath(x0: number, y0: number, x1: number, y1: number, sag: number, spacing: number) {
  const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / spacing));
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    pts.push([lerp(x0, x1, u), lerp(y0, y1, u) + sag * 4 * u * (1 - u)]);
  }
  return pts;
}
export function drawWire(g: G, pts: [number, number][], color: string, w = 2) {
  g.save(); g.strokeStyle = color; g.lineWidth = w; g.lineCap = "round"; g.lineJoin = "round";
  g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); g.restore();
}
export function drawBulbs(g: G, pts: [number, number][], t: number, seed: number, colors: string[], r = 14, a = 1) {
  g.save(); g.globalCompositeOperation = "lighter";
  pts.forEach(([x, y], i) => {
    const tw = 0.62 + 0.38 * Math.sin(t * (1.6 + hash(i + seed) * 2.2) + i * 1.9 + seed);
    const c = colors[i % colors.length];
    spot(g, c, x, y + 4, r * 2.4, 0.22 * tw * a, 0.2);
    spot(g, c, x, y + 4, r * 0.7, 0.95 * tw * a, 0.9);
  });
  g.restore();
}
