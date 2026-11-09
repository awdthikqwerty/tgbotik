// Painting kit for the day backgrounds: offscreen layer cache, painterly foliage, clouds, grain, sprites.
import { type G, rng, clamp, lerp, mix, rgba, circle, ellipse, noise1 } from "../lib/util";

export const X0 = -200, Y0 = -320, OW = 1480, OH = 2560, X1 = X0 + OW, Y1 = Y0 + OH;
export type C = HTMLCanvasElement;

export function canvas(w: number, h: number): C {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return c;
}
export function ctx(c: C): G { return c.getContext("2d")!; }
export function once<T>(f: () => T): () => T { let v: T | undefined; return () => (v === undefined ? (v = f()) : v); }

/** Offscreen canvas in world coordinates covering the full overscan rect; s = resolution scale. */
export function worldLayer(paint: (g: G) => void, s = 1): C {
  const c = canvas(OW * s, OH * s), g = ctx(c);
  g.scale(s, s); g.translate(-X0, -Y0); paint(g);
  return c;
}
export function drawWorld(g: G, c: C, dx = 0, dy = 0) { g.drawImage(c, X0 + dx, Y0 + dy, OW, OH); }

/** Paint into a temp world layer and composite it blurred (atmospheric depth). */
export function blurred(g: G, px: number, paint: (g: G) => void, alpha = 1) {
  const tmp = worldLayer(paint);
  g.save(); g.filter = `blur(${px}px)`; g.globalAlpha = alpha; drawWorld(g, tmp); g.restore();
}

/** Local sprite canvas (origin top-left). */
export function sprite(w: number, h: number, paint: (g: G) => void): C {
  const c = canvas(w, h); paint(ctx(c)); return c;
}

const grainTex = once(() => sprite(256, 256, (g) => {
  const id = g.createImageData(256, 256), r = rng(1234);
  for (let i = 0; i < 256 * 256; i++) {
    const v = 128 + (r() - 0.5) * 200;
    id.data[i * 4] = v; id.data[i * 4 + 1] = v; id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255;
  }
  g.putImageData(id, 0, 0);
}));

/** Film/paper grain + low-frequency brush mottling, baked into a static layer. */
export function grain(g: G, amt = 0.07, mottle = 0.05, seed = 5) {
  g.save();
  g.globalCompositeOperation = "soft-light";
  const r = rng(seed);
  for (let i = 0; i < 90; i++) {
    const x = X0 + r() * OW, y = Y0 + r() * OH, rad = 60 + r() * 220;
    const light = r() > 0.5;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, light ? `rgba(255,255,255,${mottle})` : `rgba(60,30,70,${mottle})`);
    gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  g.globalCompositeOperation = "overlay"; g.globalAlpha = amt;
  g.fillStyle = g.createPattern(grainTex(), "repeat")!;
  g.fillRect(X0, Y0, OW, OH);
  g.restore();
}

export function linGrad(g: G, x0: number, y0: number, x1: number, y1: number, stops: Array<[number, string]>) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) gr.addColorStop(clamp(o), c);
  return gr;
}
export function radGrad(g: G, x: number, y: number, r0: number, r1: number, stops: Array<[number, string]>) {
  const gr = g.createRadialGradient(x, y, r0, x, y, r1);
  for (const [o, c] of stops) gr.addColorStop(clamp(o), c);
  return gr;
}
export function fillSky(g: G, stops: Array<[number, string]>, y0 = Y0, y1 = 1300) {
  g.fillStyle = linGrad(g, 0, y0, 0, y1, stops); g.fillRect(X0, Y0, OW, OH);
}

/** Big soft sun: core disc + layered halo. */
export function sun(g: G, x: number, y: number, r: number, core: string, haloCol: string, halo = 6) {
  g.save();
  g.globalCompositeOperation = "screen";
  g.fillStyle = radGrad(g, x, y, 0, r * halo, [[0, rgba(haloCol, 0.75)], [0.18, rgba(haloCol, 0.4)], [0.5, rgba(haloCol, 0.12)], [1, rgba(haloCol, 0)]]);
  g.fillRect(x - r * halo, y - r * halo, r * halo * 2, r * halo * 2);
  g.restore();
  g.save();
  g.fillStyle = radGrad(g, x, y, r * 0.2, r * 1.15, [[0, "#fffdf2"], [0.75, core], [0.86, rgba(core, 0.6)], [1, rgba(core, 0)]]);
  circle(g, x, y, r * 1.15); g.fill();
  g.restore();
}

/** Ridge/hill silhouette filled down to the bottom of the overscan. */
export function ridge(g: G, baseY: number, amp: number, freq: number, seed: number, fill: string | CanvasGradient, rough = 0.25) {
  g.beginPath(); g.moveTo(X0, Y1);
  for (let x = X0; x <= X1 + 10; x += 8) {
    const y = baseY - amp * (0.5 + 0.5 * noise1(x * freq, seed)) - amp * rough * noise1(x * freq * 5, seed + 3);
    g.lineTo(x, y);
  }
  g.lineTo(X1, Y1); g.closePath(); g.fillStyle = fill; g.fill();
}

/** Horizontal stratus cloud streak: lavender body, warm lit underside (sunset look). */
export function streakCloud(g: G, x: number, y: number, w: number, h: number, seed: number, body: string, lit: string, alpha = 0.9) {
  const r = rng(seed);
  g.save(); g.globalAlpha = alpha;
  const n = 7 + Math.floor(r() * 5);
  for (let i = 0; i < n; i++) {
    const px = x + (r() - 0.5) * w, py = y + (r() - 0.5) * h * 0.6;
    const rx = w * (0.18 + r() * 0.22), ry = h * (0.35 + r() * 0.35);
    g.fillStyle = radGrad(g, px, py, 0, rx, [[0, rgba(body, 0.85)], [0.6, rgba(body, 0.5)], [1, rgba(body, 0)]]);
    g.save(); g.translate(px, py); g.scale(1, ry / rx); circle(g, 0, 0, rx); g.restore(); g.fill();
  }
  // lit underside
  for (let i = 0; i < n; i++) {
    const px = x + (r() - 0.5) * w * 0.9, py = y + h * (0.12 + r() * 0.2);
    const rx = w * (0.12 + r() * 0.18), ry = h * (0.12 + r() * 0.12);
    g.fillStyle = radGrad(g, px, py, 0, rx, [[0, rgba(lit, 0.8)], [0.7, rgba(lit, 0.25)], [1, rgba(lit, 0)]]);
    g.save(); g.translate(px, py); g.scale(1, ry / rx); circle(g, 0, 0, rx); g.restore(); g.fill();
  }
  g.restore();
}

/** Cumulus puff cloud: shaded base + lit tops. lx/ly = light direction (-1..1). */
export function puffCloud(g: G, x: number, y: number, w: number, h: number, seed: number, shadeC: string, body: string, lit: string, lx = 0, ly = -1) {
  const r = rng(seed);
  const puffs: Array<[number, number, number]> = [];
  const n = 10 + Math.floor(r() * 6);
  for (let i = 0; i < n; i++) {
    const u = (r() - 0.5), px = x + u * w * 0.95;
    const hf = 1 - Math.abs(u) * 1.6;
    const pr = h * (0.22 + 0.3 * r()) * (0.55 + 0.45 * hf);
    const py = y - pr * 0.3 - r() * h * 0.45 * hf;
    puffs.push([px, py, pr]);
  }
  g.save();
  // flat-ish bottom
  g.beginPath(); g.rect(x - w, y - h * 3, w * 2, h * 3 + h * 0.08); g.clip();
  for (const [px, py, pr] of puffs) { g.fillStyle = shadeC; circle(g, px, py, pr); g.fill(); }
  for (const [px, py, pr] of puffs) {
    g.fillStyle = radGrad(g, px + lx * pr * 0.35, py + ly * pr * 0.35, 0, pr * 1.05, [[0, body], [0.75, body], [1, rgba(body, 0)]]);
    circle(g, px + lx * pr * 0.12, py + ly * pr * 0.12, pr * 0.92); g.fill();
  }
  for (const [px, py, pr] of puffs) {
    g.fillStyle = radGrad(g, px + lx * pr * 0.45, py + ly * pr * 0.45, 0, pr * 0.7, [[0, rgba(lit, 0.95)], [1, rgba(lit, 0)]]);
    circle(g, px + lx * pr * 0.45, py + ly * pr * 0.45, pr * 0.7); g.fill();
  }
  g.restore();
}

export type FolPal = { dark: string; mid: string; light: string; hi: string };
/** Painterly foliage mass: dark core, scalloped clumps sorted from shadow to light (volume), sparkle highlights. */
export function foliage(g: G, cx: number, cy: number, rx: number, ry: number, pal: FolPal, seed: number, lx = -0.6, ly = -0.8, n = 120, clumpK = 1) {
  const r = rng(seed);
  for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.55;
    g.fillStyle = pal.dark;
    circle(g, cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, Math.min(rx, ry) * (0.35 + r() * 0.2)); g.fill();
  }
  const clumps: Array<{ x: number; y: number; cr: number; lit: number; s: number }> = [];
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r());
    const nx = Math.cos(a) * d, ny = Math.sin(a) * d;
    const lit = clamp(0.45 + 0.55 * (nx * lx + ny * ly) * d + (r() - 0.5) * 0.35);
    clumps.push({ x: cx + nx * rx, y: cy + ny * ry, cr: Math.min(rx, ry) * (0.1 + r() * 0.13) * clumpK, lit, s: r() * 1e6 });
  }
  clumps.sort((a, b) => a.lit - b.lit);
  for (const c of clumps) {
    const rr = rng(c.s | 0);
    const col = c.lit < 0.35 ? mix(pal.dark, pal.mid, c.lit / 0.35) : c.lit < 0.75 ? mix(pal.mid, pal.light, (c.lit - 0.35) / 0.4) : mix(pal.light, pal.hi, (c.lit - 0.75) / 0.25);
    g.fillStyle = col;
    // solid core + leaf-shaped dabs around it (reads as painted foliage, not bubbles)
    circle(g, c.x, c.y, c.cr * 0.55); g.fill();
    const k = 9 + Math.floor(rr() * 6);
    for (let j = 0; j < k; j++) {
      const a = rr() * Math.PI * 2, d = c.cr * (0.3 + rr() * 0.6);
      const lr = c.cr * (0.22 + rr() * 0.22);
      g.beginPath(); g.ellipse(c.x + Math.cos(a) * d, c.y + Math.sin(a) * d * 0.85, lr, lr * 0.55, a + (rr() - 0.5) * 0.8, 0, Math.PI * 2); g.fill();
    }
    if (c.lit > 0.7) {
      g.fillStyle = rgba(pal.hi, 0.55);
      for (let j = 0; j < 3; j++) { circle(g, c.x + lx * c.cr * 0.4 + (rr() - 0.5) * c.cr * 0.6, c.y + ly * c.cr * 0.4 + (rr() - 0.5) * c.cr * 0.5, c.cr * (0.12 + rr() * 0.12)); g.fill(); }
    }
  }
}

/** Foliage painted in isolation, then volume-shaded (shadow away from light, warm rim toward it) before compositing. */
export function foliageMass(g: G, cx: number, cy: number, rx: number, ry: number, pal: FolPal, seed: number, lx = -0.6, ly = -0.8, n = 120, clumpK = 1, rim?: string) {
  const pad = Math.max(rx, ry) * 0.5;
  const x0 = cx - rx - pad, y0 = cy - ry - pad, w = (rx + pad) * 2, h = (ry + pad) * 2;
  const c = sprite(w, h, (s) => {
    s.translate(-x0, -y0);
    foliage(s, cx, cy, rx, ry, pal, seed, lx, ly, n, clumpK);
    s.globalCompositeOperation = "source-atop";
    const L = Math.hypot(lx, ly) || 1, ux = lx / L, uy = ly / L;
    s.fillStyle = linGrad(s, cx + ux * rx, cy + uy * ry, cx - ux * rx, cy - uy * ry, [[0, "rgba(0,0,0,0)"], [0.55, "rgba(0,0,0,0)"], [1, rgba(pal.dark, 0.55)]]);
    s.fillRect(x0, y0, w, h);
    if (rim) {
      s.fillStyle = linGrad(s, cx + ux * rx * 1.1, cy + uy * ry * 1.1, cx + ux * rx * 0.4, cy + uy * ry * 0.4, [[0, rgba(rim, 0.7)], [1, rgba(rim, 0)]]);
      s.fillRect(x0, y0, w, h);
    }
  });
  g.drawImage(c, x0, y0);
}

/** Sprite holding a world-space rect (for elements that animate as a unit, e.g. swaying trees). */
export type WorldSprite = { c: C; x0: number; y0: number };
export function worldSprite(x0: number, y0: number, x1: number, y1: number, paint: (g: G) => void): WorldSprite {
  const c = sprite(x1 - x0, y1 - y0, (g) => { g.translate(-x0, -y0); paint(g); });
  return { c, x0, y0 };
}
export function drawSway(g: G, s: WorldSprite, pivotX: number, pivotY: number, ang: number) {
  g.save(); g.translate(pivotX, pivotY); g.rotate(ang); g.translate(-pivotX, -pivotY); g.drawImage(s.c, s.x0, s.y0); g.restore();
}

/** Tapered curved trunk/limb as a filled shape. */
export function limb(g: G, x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, bend: number, fill: string | CanvasGradient, rim?: string, rimSide = -1) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const mx = (x0 + x1) / 2 + nx * bend, my = (y0 + y1) / 2 + ny * bend;
  const wm = (w0 + w1) / 2;
  g.beginPath();
  g.moveTo(x0 + nx * w0 / 2, y0 + ny * w0 / 2);
  g.quadraticCurveTo(mx + nx * wm / 2, my + ny * wm / 2, x1 + nx * w1 / 2, y1 + ny * w1 / 2);
  g.lineTo(x1 - nx * w1 / 2, y1 - ny * w1 / 2);
  g.quadraticCurveTo(mx - nx * wm / 2, my - ny * wm / 2, x0 - nx * w0 / 2, y0 - ny * w0 / 2);
  g.closePath(); g.fillStyle = fill; g.fill();
  if (rim) {
    const s = rimSide * Math.sign(nx || 1);
    g.beginPath();
    g.moveTo(x0 + s * nx * w0 * 0.38, y0 + s * ny * w0 * 0.38);
    g.quadraticCurveTo(mx + s * nx * wm * 0.38, my + s * ny * wm * 0.38, x1 + s * nx * w1 * 0.38, y1 + s * ny * w1 * 0.38);
    g.strokeStyle = rim; g.lineWidth = Math.max(1, wm * 0.22); g.lineCap = "round"; g.stroke();
  }
}

/** Recursive branching (bare winter trees or the skeleton under foliage). Optional snow on top of limbs. */
export function branches(g: G, x: number, y: number, ang: number, len: number, w: number, depth: number, r: () => number,
  col: string, opts: { snow?: string; rim?: string; spread?: number; shrink?: number; tips?: Array<[number, number]>; up?: boolean } = {}) {
  const spread = opts.spread ?? 0.5, shrink = opts.shrink ?? 0.74;
  const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
  const bend = (r() - 0.5) * len * 0.25;
  const w2 = Math.max(0.8, w * 0.68);
  limb(g, x, y, x2, y2, w, w2, bend, col, opts.rim, Math.cos(ang) > 0 ? -1 : 1);
  if (opts.snow && w > 1.6 && Math.abs(Math.cos(ang)) > 0.25) {
    const dx = x2 - x, dy = y2 - y, L = Math.hypot(dx, dy);
    const nx = dy / L, ny = -dx / L; // perpendicular, pick upward one
    const s = ny < 0 ? 1 : -1;
    const ox = nx * s * w * 0.42, oy = ny * s * w * 0.42;
    const a0 = 0.1 + r() * 0.2, a1 = 0.7 + r() * 0.3;
    limb(g, lerp(x, x2, a0) + ox, lerp(y, y2, a0) + oy, lerp(x, x2, a1) + ox, lerp(y, y2, a1) + oy, w * 0.5, w * 0.25, bend * 0.5, opts.snow);
  }
  if (depth <= 0) { opts.tips?.push([x2, y2]); return; }
  const k = depth > 4 ? 2 + (r() > 0.6 ? 1 : 0) : 2 + (r() > 0.4 ? 1 : 0);
  for (let i = 0; i < k; i++) {
    let a = ang + (i / (k - 1) - 0.5) * spread * 2 + (r() - 0.5) * 0.35;
    // keep crowns growing upward/outward so twigs never droop into the character zone
    if (opts.up) a = clamp(a, -Math.PI + 0.12, -0.12);
    branches(g, x2, y2, a, len * (shrink + (r() - 0.5) * 0.12), w2, depth - 1, r, col, opts);
  }
}

/** Victorian street lamp. Returns the lantern centre for glow placement. */
export function lampPost(g: G, x: number, baseY: number, h: number, metal: string, glass: string, rim: string, rimSide = -1) {
  const s = h / 700;
  g.save();
  // base
  g.fillStyle = metal;
  g.beginPath(); g.moveTo(x - 30 * s, baseY); g.lineTo(x + 30 * s, baseY); g.lineTo(x + 18 * s, baseY - 70 * s); g.lineTo(x - 18 * s, baseY - 70 * s); g.closePath(); g.fill();
  g.fillRect(x - 24 * s, baseY - 90 * s, 48 * s, 22 * s);
  // pole
  g.fillRect(x - 9 * s, baseY - h + 120 * s, 18 * s, h - 200 * s);
  for (const yy of [baseY - 300 * s, baseY - h + 160 * s]) g.fillRect(x - 15 * s, yy, 30 * s, 12 * s);
  // rim light on pole
  g.fillStyle = rgba(rim, 0.6); g.fillRect(x + rimSide * 6 * s - 2 * s, baseY - h + 120 * s, 4 * s, h - 200 * s);
  // lantern
  const ly = baseY - h + 60 * s;
  g.fillStyle = metal;
  g.beginPath(); g.moveTo(x - 40 * s, ly - 40 * s); g.lineTo(x + 40 * s, ly - 40 * s); g.lineTo(x, ly - 80 * s); g.closePath(); g.fill();
  circle(g, x, ly - 86 * s, 8 * s); g.fill();
  g.fillStyle = radGrad(g, x, ly, 0, 50 * s, [[0, "#fffbe8"], [0.5, glass], [1, mix(glass, "#ff9a5a", 0.4)]]);
  g.beginPath(); g.moveTo(x - 32 * s, ly - 40 * s); g.lineTo(x + 32 * s, ly - 40 * s); g.lineTo(x + 24 * s, ly + 50 * s); g.lineTo(x - 24 * s, ly + 50 * s); g.closePath(); g.fill();
  g.strokeStyle = metal; g.lineWidth = 5 * s;
  g.beginPath(); g.moveTo(x, ly - 40 * s); g.lineTo(x, ly + 50 * s); g.stroke();
  g.fillStyle = metal; g.fillRect(x - 30 * s, ly + 48 * s, 60 * s, 12 * s);
  g.restore();
  return { x, y: ly + 5 * s, s };
}

/** Pre-rendered round glow sprite (draw with 'lighter'/'screen'). */
export function glowSprite(color: string, size = 128, core = 0.35): C {
  return sprite(size, size, (g) => {
    const h = size / 2;
    g.fillStyle = radGrad(g, h, h, 0, h, [[0, rgba("#ffffff", 1)], [core * 0.4, rgba(color, 0.9)], [core, rgba(color, 0.35)], [1, rgba(color, 0)]]);
    g.fillRect(0, 0, size, size);
  });
}
/** Soft bokeh disc sprite. */
export function bokehSprite(color: string, size = 128): C {
  return sprite(size, size, (g) => {
    const h = size / 2;
    g.fillStyle = radGrad(g, h, h, 0, h, [[0, rgba(color, 0.55)], [0.7, rgba(color, 0.45)], [0.85, rgba(color, 0.6)], [1, rgba(color, 0)]]);
    g.fillRect(0, 0, size, size);
  });
}

export function drawSprite(g: G, s: C, x: number, y: number, size: number, rot = 0, alpha = 1) {
  g.globalAlpha = alpha;
  if (rot) { g.save(); g.translate(x, y); g.rotate(rot); g.drawImage(s, -size / 2, -size / 2 * (s.height / s.width), size, size * s.height / s.width); g.restore(); }
  else g.drawImage(s, x - size / 2, y - size / 2 * (s.height / s.width), size, size * s.height / s.width);
}

/** Particle field helper: deterministic per-index params, wrapped vertical fall/rise. */
export type Particle = { x: number; y: number; z: number; a: number; s: number; ph: number; f: number };
export function particles(n: number, seed: number): Particle[] {
  const r = rng(seed);
  return Array.from({ length: n }, () => ({ x: X0 + r() * OW, y: Y0 + r() * OH, z: r(), a: r(), s: r(), ph: r() * Math.PI * 2, f: 0.5 + r() }));
}
export const wrap = (v: number, lo: number, hi: number) => lo + ((((v - lo) % (hi - lo)) + (hi - lo)) % (hi - lo));

/** Simple painterly grass tuft strokes along a band. */
export function grassStrokes(g: G, y0: number, y1: number, n: number, seed: number, cols: string[], len = 30, x0 = X0, x1 = X1) {
  const r = rng(seed);
  g.save(); g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const y = lerp(y0, y1, r() ** 0.8), x = lerp(x0, x1, r());
    const depth = (y - y0) / Math.max(1, y1 - y0);
    const l = len * (0.4 + depth * 0.9) * (0.6 + r() * 0.6);
    g.strokeStyle = cols[Math.floor(r() * cols.length)];
    g.lineWidth = 1.5 + depth * 3 * r();
    const lean = (r() - 0.5) * l * 0.6;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + lean * 0.3, y - l * 0.6, x + lean, y - l); g.stroke();
  }
  g.restore();
}

export function petalPath(g: G, size: number) {
  g.beginPath();
  g.moveTo(0, -size);
  g.bezierCurveTo(size * 0.8, -size * 0.6, size * 0.7, size * 0.6, 0, size);
  g.bezierCurveTo(-size * 0.5, size * 0.4, -size * 0.8, -size * 0.6, 0, -size);
}

export { ellipse };
