// Scenes "maja" (snowy riverside viewpoint) and "city" (panorama with the heart firework).
import type { Background } from "../lib/types";
import { G, rgba, rng, lerp, vGrad, clamp } from "../lib/util";
import {
  X0, X1, Y0, Y1, OW, once, bake, blit, grain, wash, radial, bakeStars, twinkleStars, drawFireworks, flashOf, reflectFireworks,
  schedule, FW_PALETTE, Burst, skyline, snowfall, bokeh, fairyPath, drawWire, drawBulbs, spot, hash, Layer,
} from "./night-kit";

// ---------- shared painters ----------
function nightSky(g: G, horizon: number, seed: number) {
  g.fillStyle = vGrad(g, Y0, horizon, [[0, "#0f0d33"], [0.25, "#1b1a45"], [0.55, "#3d2d6b"], [0.8, "#8a4f9a"], [0.92, "#c86fb0"], [1, "#f7a98b"]]);
  g.fillRect(X0, Y0, OW, horizon - Y0 + 40);
  wash(g, seed, X0, Y0, OW, horizon - Y0, ["#6b5bd0", "#c86fb0", "#2a2470"], 12, 0.22);
  bakeStars(g, seed + 1, 700, X0, Y0, X1, horizon - 200, (y) => clamp(1 - (y - Y0) / (horizon - Y0)));
  // soft clouds lit from below by the city
  const r = rng(seed + 2);
  for (let i = 0; i < 7; i++) {
    const cx = X0 + r() * OW, cy = lerp(Y0 + 200, horizon - 260, r()), w = 200 + r() * 300;
    for (let k = 0; k < 5; k++) {
      const x = cx + (r() - 0.5) * w, y = cy + (r() - 0.5) * 30, rx = 80 + r() * 120, ry = 14 + r() * 18;
      const gr = g.createLinearGradient(0, y - ry, 0, y + ry);
      gr.addColorStop(0, rgba("#5b4fa0", 0)); gr.addColorStop(1, rgba(cy > horizon - 600 ? "#f5a6c4" : "#9c8be0", 0.22));
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
    }
  }
  radial(g, 540, horizon, 900, "#f7a98b", 0.25, 0.3);
}

/** Stylised Palace of Culture tower (Warsaw) — a recognisable Polish skyline accent. */
function palace(g: G, cx: number, base: number, s: number, top: string, bottom: string) {
  const tiers: [number, number][] = [[150, 110], [82, 270], [60, 340], [44, 400], [30, 450], [16, 490]];
  const grd = g.createLinearGradient(0, base - 560 * s, 0, base);
  grd.addColorStop(0, top); grd.addColorStop(1, bottom);
  g.fillStyle = grd;
  for (const [hw, h] of tiers) g.fillRect(cx - hw * s, base - h * s, hw * 2 * s, h * s);
  g.beginPath(); g.moveTo(cx - 7 * s, base - 490 * s); g.lineTo(cx, base - 600 * s); g.lineTo(cx + 7 * s, base - 490 * s); g.fill();
  for (const px of [-82, -60, 60, 82]) { g.beginPath(); g.moveTo(cx + (px - 7) * s, base - 270 * s); g.lineTo(cx + px * s, base - 300 * s); g.lineTo(cx + (px + 7) * s, base - 270 * s); g.fill(); }
  // vertical window strips + lit clock band
  g.fillStyle = rgba("#ffd38a", 0.55);
  for (let x = -70; x <= 64; x += 14) g.fillRect(cx + x * s, base - 250 * s, 4 * s, 130 * s);
  for (let x = -40; x <= 36; x += 12) g.fillRect(cx + x * s, base - 390 * s, 3 * s, 40 * s);
  g.fillStyle = rgba("#fff1d6", 0.9); g.fillRect(cx - 20 * s, base - 430 * s, 40 * s, 8 * s);
  g.fillStyle = rgba("#ffb0d0", 0.9); g.beginPath(); g.arc(cx, base - 600 * s, 3 * s, 0, Math.PI * 2); g.fill();
}

/** City across a river: returns {city, refl} layers (skyline only, and its blurred reflection). */
function cityLayers(H0: number, seed: number, scale: number, riverH: number, extras: (g: G) => void): { city: Layer; refl: Layer } {
  const top = H0 - 700 * scale;
  const city = bake(X0, top, OW, H0 - top + 20, (g) => {
    skyline(g, { seed, x0: X0 - 20, x1: X1 + 20, base: H0 + 10, hMin: 120 * scale, hMax: 300 * scale, wMin: 40 * scale, wMax: 90 * scale, top: "#a586c4", bottom: "#7a64a8", lit: 0.12, win: [3 * scale, 4 * scale], snow: "#efe8ff", rim: "#f7b49b" });
    g.save(); g.globalCompositeOperation = "source-atop";
    g.fillStyle = vGrad(g, top, H0, [[0, rgba("#f7b49b", 0.35)], [1, rgba("#c86fb0", 0.2)]]); g.fillRect(X0, top, OW, H0 - top + 20);
    g.restore();
    extras(g);
    skyline(g, { seed: seed + 1, x0: X0 - 30, x1: X1 + 30, base: H0 + 14, hMin: 60 * scale, hMax: 200 * scale, wMin: 55 * scale, wMax: 120 * scale, top: "#5a4889", bottom: "#3a2f68", lit: 0.38, win: [5 * scale, 7 * scale], snow: "#f1eefd", rim: "#e48bb6", spires: true });
    // embankment wall with a row of lamps
    g.fillStyle = vGrad(g, H0, H0 + 20, [[0, "#4a3c78"], [1, "#2d2552"]]); g.fillRect(X0, H0 + 4, OW, 16);
    for (let x = X0 + 10; x < X1; x += 46 * scale) { spot(g, "#ffd38a", x, H0 + 2, 6 * scale, 0.9); }
    g.globalAlpha = 1;
  });
  const refl = bake(X0, H0, OW, riverH, (g) => {
    g.save(); g.translate(0, H0); g.scale(1, -0.75); g.translate(0, -H0 - 18);
    g.globalAlpha = 0.6; g.drawImage(city.c, city.x, city.y, city.w, city.h);
    g.restore();
    // break into ripples
    const r = rng(seed + 9);
    g.save(); g.globalCompositeOperation = "destination-out";
    for (let y = H0 + 4; y < H0 + riverH; y += 3 + r() * 5) { g.globalAlpha = 0.35 + r() * 0.5; g.fillStyle = "#000"; g.fillRect(X0, y, OW, 1 + r() * 2.5); }
    g.restore();
  }, 1, 1.4);
  return { city, refl };
}

function river(g: G, y0: number, y1: number, seed: number) {
  g.fillStyle = vGrad(g, y0, y1, [[0, "#d98aa6"], [0.12, "#8a5596"], [0.45, "#3d2d6b"], [1, "#1f1a48"]]);
  g.fillRect(X0, y0, OW, y1 - y0);
  const r = rng(seed);
  g.save();
  for (let i = 0; i < 260; i++) {
    const y = lerp(y0, y1, Math.pow(r(), 1.4)), w = 20 + r() * 140 * (0.4 + (y - y0) / (y1 - y0));
    g.globalAlpha = 0.06 + r() * 0.12; g.fillStyle = r() < 0.6 ? "#c9b8ff" : "#ffb3cf";
    g.fillRect(X0 + r() * OW, y, w, 1.5 + r() * 2);
  }
  g.restore();
}

function shimmer(g: G, t: number, y0: number, y1: number, seed: number, n = 40) {
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < n; i++) {
    const y = lerp(y0, y1, hash(i * 3.1 + seed)), ph = hash(i + seed * 2) * 6.28;
    const a = 0.5 + 0.5 * Math.sin(t * (1.5 + hash(i) * 2) + ph);
    const x = X0 + hash(i * 7.7 + seed) * OW + Math.sin(t * 0.6 + ph) * 20;
    g.globalAlpha = 0.18 * a; g.fillStyle = i % 3 ? "#ffd9ef" : "#fff1c4";
    g.fillRect(x, y, 30 + hash(i * 5.3) * 90, 2);
  }
  g.restore();
}

// =============================== MAJA ===============================
const MH = 1090;           // far bank / skyline base
const RAIL_TOP = 1252, LEDGE = 1440;
const M_LAMPS = [60, 1020];
const M_STRING = [fairyPath(-220, 300, 560, 380, 120, 44), fairyPath(560, 380, 1300, 290, 120, 44)];

const mSkyL = once(() => bake(X0, Y0, OW, MH + 60 - Y0, (g) => { nightSky(g, MH, 51); grain(g, X0, Y0, OW, MH + 60 - Y0, 0.05); }));
const mCity = once(() => cityLayers(MH, 61, 1, LEDGE - MH, (g) => {
  palace(g, 548, MH + 10, 0.72, "#9a7dc0", "#5f4b8f");
  radial(g, 548, MH - 300, 260, "#ffc2d8", 0.18);
}));
const mRiverL = once(() => bake(X0, MH, OW, LEDGE - MH + 20, (g) => river(g, MH, LEDGE + 20, 71)));

const mFrontL = once(() => bake(X0, 240, OW, Y1 - 240, (g) => {
  // ---- stone ledge (river wall top) ----
  g.fillStyle = vGrad(g, LEDGE - 10, LEDGE + 60, [[0, "#6a5c9a"], [1, "#3f3470"]]); g.fillRect(X0, LEDGE - 6, OW, 70);
  // ---- ground: snowy promenade ----
  g.fillStyle = vGrad(g, LEDGE + 40, Y1, [[0, "#9a8fd0"], [0.18, "#c7bdea"], [0.55, "#e4ddf7"], [1, "#d2c7ee"]]);
  g.fillRect(X0, LEDGE + 40, OW, Y1 - LEDGE - 40);
  wash(g, 7, X0, LEDGE + 40, OW, Y1 - LEDGE - 40, ["#ffc9da", "#a99cf0", "#ffffff"], 10, 0.35);
  // lamp light pools + firework-pink ambient on the snow
  for (const lx of M_LAMPS) { g.save(); g.translate(lx, 1600); g.scale(1, 0.3); radial(g, 0, 0, 520, "#ffcf9a", 0.55, 0.3); g.restore(); }
  radial(g, 540, 1560, 700, "#ff9fcf", 0.12);
  // footprints
  const r = rng(13);
  g.fillStyle = rgba("#8d82c4", 0.28);
  for (let k = 0; k < 26; k++) {
    const x = 120 + k * 33 + Math.sin(k * 0.7) * 30, y = 1700 + Math.sin(k * 0.9) * 50 + (k % 2) * 16;
    g.beginPath(); g.ellipse(x, y, 9, 4, 0.2, 0, Math.PI * 2); g.fill();
  }
  // snow drifts along the railing base
  g.fillStyle = vGrad(g, LEDGE - 30, LEDGE + 60, [[0, "#fbf9ff"], [1, "#cfc6ee"]]);
  g.beginPath(); g.moveTo(X0, LEDGE + 60);
  for (let x = X0; x <= X1; x += 60) g.quadraticCurveTo(x + 30, LEDGE - 6 - r() * 26, x + 60, LEDGE + 8 + r() * 10);
  g.lineTo(X1, LEDGE + 70); g.lineTo(X0, LEDGE + 70); g.fill();
  // sparkles
  g.fillStyle = "#ffffff";
  for (let i = 0; i < 160; i++) { g.globalAlpha = 0.3 + r() * 0.6; const s = 1 + r() * 2; g.fillRect(X0 + r() * OW, LEDGE + 60 + r() * (Y1 - LEDGE - 60), s, s); }
  g.globalAlpha = 1;

  // ---- railing ----
  const iron = "#2e2752";
  g.fillStyle = iron;
  g.fillRect(X0, RAIL_TOP, OW, 14); g.fillRect(X0, 1300, OW, 6); g.fillRect(X0, LEDGE - 26, OW, 8);
  for (let x = X0 + 10; x < X1; x += 34) {
    g.fillRect(x - 2.5, RAIL_TOP + 10, 5, LEDGE - RAIL_TOP - 14);
    g.strokeStyle = iron; g.lineWidth = 3;
    g.beginPath(); g.ellipse(x + 17, 1360, 10, 24, 0, 0, Math.PI * 2); g.stroke();
  }
  // posts
  for (const px of [140, 940]) {
    g.fillStyle = vGrad(g, RAIL_TOP - 40, LEDGE, [[0, "#7a6cae"], [1, "#4a3d7c"]]); g.fillRect(px - 26, RAIL_TOP - 30, 52, LEDGE - RAIL_TOP + 30);
    g.fillStyle = "#8f80c0"; g.fillRect(px - 32, RAIL_TOP - 40, 64, 14);
    g.fillStyle = "#f8f6ff"; g.beginPath(); g.ellipse(px, RAIL_TOP - 42, 36, 12, 0, Math.PI, 0); g.lineTo(px + 32, RAIL_TOP - 36); g.lineTo(px - 32, RAIL_TOP - 36); g.fill();
  }
  // rim light + snow on the top rail
  g.fillStyle = rgba("#ffb3d6", 0.55); g.fillRect(X0, RAIL_TOP + 12, OW, 2);
  g.fillStyle = "#f9f7ff";
  g.beginPath(); g.moveTo(X0, RAIL_TOP + 2);
  for (let x = X0; x <= X1; x += 40) g.quadraticCurveTo(x + 20, RAIL_TOP - 10 - hash(x) * 6, x + 40, RAIL_TOP + 1);
  g.lineTo(X1, RAIL_TOP + 4); g.lineTo(X0, RAIL_TOP + 4); g.fill();

  // ---- lamp posts ----
  for (const lx of M_LAMPS) {
    g.fillStyle = rgba("#1a1438", 0.35); g.beginPath(); g.ellipse(lx + 30, 1606, 70, 12, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = vGrad(g, 560, 1600, [[0, "#3b3266"], [1, "#241d46"]]);
    g.fillRect(lx - 9, 600, 18, 1000);
    g.fillRect(lx - 22, 1540, 44, 60); g.fillRect(lx - 16, 1500, 32, 40);
    g.fillRect(lx - 30, 596, 60, 10);
    // lantern
    radial(g, lx, 540, 240, "#ffc98a", 0.35);
    g.fillStyle = vGrad(g, 490, 590, [[0, "#fff4d6"], [1, "#ffc77e"]]);
    g.beginPath(); g.moveTo(lx - 26, 500); g.lineTo(lx + 26, 500); g.lineTo(lx + 20, 594); g.lineTo(lx - 20, 594); g.fill();
    g.strokeStyle = "#2e2752"; g.lineWidth = 4; g.strokeRect(lx - 24, 500, 48, 94);
    g.beginPath(); g.moveTo(lx, 500); g.lineTo(lx, 594); g.stroke();
    g.fillStyle = "#2e2752"; g.beginPath(); g.moveTo(lx - 36, 502); g.lineTo(lx, 466); g.lineTo(lx + 36, 502); g.fill();
    g.fillStyle = "#f8f6ff"; g.beginPath(); g.moveTo(lx - 38, 498); g.lineTo(lx, 460); g.lineTo(lx + 38, 498); g.lineTo(lx + 26, 494); g.lineTo(lx, 472); g.lineTo(lx - 26, 494); g.fill();
    g.fillStyle = "#2e2752"; g.beginPath(); g.arc(lx, 456, 7, 0, Math.PI * 2); g.fill();
  }
  // snowy shrubs at the corners
  for (const [bx, by, s] of [[-60, 1700, 1.2], [1140, 1680, 1.1]] as [number, number, number][]) {
    for (let k = 0; k < 6; k++) {
      const x = bx + (hash(k + bx) - 0.5) * 220 * s, y = by - hash(k * 3 + bx) * 120 * s, rr = (60 + hash(k * 7) * 50) * s;
      g.fillStyle = "#3d4f72"; g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill();
      g.fillStyle = vGrad(g, y - rr, y, [[0, "#fbf9ff"], [1, "#c3bce8"]]); g.beginPath(); g.ellipse(x, y - rr * 0.35, rr * 0.95, rr * 0.6, 0, Math.PI, 0); g.fill();
    }
  }
  for (const p of M_STRING) drawWire(g, p, rgba("#231c44", 0.9), 2);
  grain(g, X0, 240, OW, Y1 - 240, 0.06);
}));

const M_BURSTS = once((): Burst[] => [
  { t: -0.6, x: 300, y: 330, r: 230, col: "#ff8fcf", col2: "#ffc2e4", kind: "peony", seed: 5 },
  { t: 0.1, x: 820, y: 260, r: 250, col: "#ffd27a", col2: "#ff9f6b", kind: "chrys", seed: 6 },
  { t: 0.7, x: 520, y: 470, r: 200, col: "#8fe9ff", col2: "#c9a8ff", kind: "ring", seed: 7 },
  ...schedule(81, 1.2, 7, 0.55, { x0: 120, x1: 960, y0: 200, y1: 640 }, 150, 260, FW_PALETTE),
]);
const M_BOKEH = [
  { x: -40, y: 260, r: 120, c: "#ffb0d0" }, { x: 1120, y: 420, r: 150, c: "#ffd38a" }, { x: 1060, y: 1760, r: 110, c: "#c9a8ff" },
  { x: 30, y: 1540, r: 90, c: "#ffd38a" }, { x: 1150, y: 980, r: 70, c: "#ff9fcf" }, { x: -80, y: 900, r: 100, c: "#9fd8ff" },
];

export const MAJA: Background = {
  groundY: 1600,
  light: { key: "#ffcfa8", keyDir: -1, ambient: "#5a5aa8", rim: "#ff9fd0", strength: 0.45 },
  anchors: { majaFeet: { x: 400, y: 1600 }, friendFeet: { x: 700, y: 1600 }, railTop: { x: 540, y: RAIL_TOP, w: OW }, lampL: { x: 60, y: 545 }, lampR: { x: 1020, y: 545 } },
  draw(g: G, t: number) {
    const bursts = M_BURSTS(), fl = flashOf(bursts, t);
    g.save();
    blit(g, mSkyL());
    twinkleStars(g, 52, 50, X0, Y0, X1, 700, t);
    if (fl.a > 0.02) { g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.14 * fl.a; g.fillStyle = fl.col; g.fillRect(X0, Y0, OW, MH - Y0); g.globalCompositeOperation = "source-over"; g.globalAlpha = 1; }
    drawFireworks(g, bursts, t);
    const c = mCity();
    blit(g, c.city);
    blit(g, mRiverL());
    blit(g, c.refl);
    g.save(); g.beginPath(); g.rect(X0, MH + 6, OW, LEDGE - MH); g.clip();
    reflectFireworks(g, bursts, t, MH + 8, LEDGE - MH, 0, 1.1);
    shimmer(g, t, MH + 10, LEDGE, 3, 50);
    g.restore();
    blit(g, mFrontL());
    // lanterns breathe, string lights twinkle, fireworks tint the snow
    g.globalCompositeOperation = "lighter";
    for (const lx of M_LAMPS) { spot(g, "#ffc98a", lx, 545, 120 + 6 * Math.sin(t * 2 + lx), 0.5, 0.4); }
    if (fl.a > 0.02) { g.globalAlpha = 1; radial(g, 540, 1650, 900, fl.col, 0.1 * fl.a, 0.3); }
    g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
    M_STRING.forEach((p, i) => drawBulbs(g, p, t, 21 + i, ["#ffd38a", "#ffb0d0", "#fff3c4", "#9fe6ff"], 9));
    g.restore();
  },
  front(g: G, t: number) {
    g.save();
    snowfall(g, 91, t, 90, 2, 7, 80, 0.85);
    bokeh(g, 3, t, M_BOKEH, 0.22);
    g.restore();
  },
};

// =============================== CITY ===============================
const CH = 1180;
const HEART: Burst = { t: 1.6, x: 540, y: 600, r: 300, col: "#ff6f9f", col2: "#ffb3cf", kind: "heart", n: 150, seed: 77, rise: 0.8 };
const cSkyL = once(() => bake(X0, Y0, OW, CH + 60 - Y0, (g) => {
  nightSky(g, CH, 151);
  // moon low on the left
  radial(g, 130, 260, 260, "#d9ccff", 0.2);
  g.fillStyle = "#fff6e2"; g.beginPath(); g.arc(130, 260, 44, 0, Math.PI * 2); g.fill();
  grain(g, X0, Y0, OW, CH + 60 - Y0, 0.05);
}));
const cCity = once(() => cityLayers(CH, 161, 1.25, 1780 - CH, (g) => {
  palace(g, 880, CH + 10, 1.0, "#a385c8", "#5f4b8f");
  radial(g, 880, CH - 360, 320, "#ffc2d8", 0.16);
  // twin-spired church on the left
  g.fillStyle = vGrad(g, CH - 520, CH, [[0, "#9c80c2"], [1, "#5f4b8f"]]);
  g.fillRect(90, CH - 260, 220, 270);
  for (const sx of [110, 250]) { g.fillRect(sx, CH - 400, 50, 150); g.beginPath(); g.moveTo(sx - 4, CH - 400); g.lineTo(sx + 25, CH - 540); g.lineTo(sx + 54, CH - 400); g.fill(); }
  g.fillStyle = rgba("#ffd38a", 0.6); g.beginPath(); g.arc(200, CH - 170, 26, 0, Math.PI * 2); g.fill();
}));
const cRiverL = once(() => bake(X0, CH, OW, 1800 - CH, (g) => river(g, CH, 1800, 171)));
const cBankL = once(() => bake(X0, CH - 40, OW, Y1 - CH + 40, (g) => {
  // bridge spanning the right side, with lamps
  g.fillStyle = "#2f2756";
  g.fillRect(560, CH + 30, 760, 26);
  for (let k = 0; k < 5; k++) {
    const ax = 600 + k * 150;
    g.beginPath(); g.moveTo(ax, CH + 56); g.lineTo(ax, CH + 150); g.lineTo(ax + 22, CH + 150); g.quadraticCurveTo(ax + 75, CH + 60, ax + 128, CH + 150); g.lineTo(ax + 150, CH + 150); g.lineTo(ax + 150, CH + 56); g.fill();
  }
  g.fillStyle = "#f4f1ff"; g.fillRect(560, CH + 26, 760, 5);
  for (let x = 580; x < 1300; x += 50) spot(g, "#ffd38a", x, CH + 16, 10, 0.95);
  g.globalAlpha = 1;
  // near bank: snow with bare trees
  g.fillStyle = vGrad(g, 1760, Y1, [[0, "#4a3f7e"], [0.1, "#c9c0ec"], [1, "#9a8fd0"]]);
  g.beginPath(); g.moveTo(X0, 1800);
  for (let x = X0; x <= X1; x += 80) g.quadraticCurveTo(x + 40, 1760 + hash(x) * 20, x + 80, 1790);
  g.lineTo(X1, Y1); g.lineTo(X0, Y1); g.fill();
  const tree = (x: number, y: number, h: number, seed: number) => {
    const r = rng(seed);
    const branch = (x0: number, y0: number, ang: number, len: number, w: number, d: number) => {
      const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
      g.strokeStyle = "#2a2148"; g.lineWidth = w; g.lineCap = "round";
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      if (d > 0) { branch(x1, y1, ang - 0.35 - r() * 0.3, len * 0.72, w * 0.68, d - 1); branch(x1, y1, ang + 0.3 + r() * 0.3, len * 0.7, w * 0.66, d - 1); }
      else { g.fillStyle = rgba("#f4f1ff", 0.8); g.fillRect(x1 - 3, y1 - 2, 6, 3); }
    };
    branch(x, y, -Math.PI / 2, h * 0.35, h * 0.05, 6);
  };
  tree(40, 1830, 520, 4); tree(1080, 1840, 480, 9);
  grain(g, X0, CH, OW, Y1 - CH, 0.05);
}));
const C_BURSTS = once((): Burst[] => [
  { t: -0.5, x: 250, y: 420, r: 200, col: "#ffd27a", col2: "#ff9f6b", kind: "chrys", seed: 1 },
  { t: 0.05, x: 820, y: 330, r: 220, col: "#8fe9ff", col2: "#c9a8ff", kind: "peony", seed: 2 },
  { t: 0.55, x: 520, y: 560, r: 200, col: "#c9a8ff", col2: "#ff8fcf", kind: "peony", seed: 3 },
  { t: 1.05, x: 180, y: 700, r: 170, col: "#ff8fcf", col2: "#ffd0e0", kind: "ring", seed: 4 },
  HEART,
  { t: 1.75, x: 120, y: 330, r: 150, col: "#ffd27a", col2: "#fff1d6", kind: "willow", seed: 8 },
  { t: 2.1, x: 960, y: 260, r: 150, col: "#fff1d6", col2: "#ffd27a", kind: "chrys", seed: 9 },
  { t: 2.6, x: 90, y: 760, r: 130, col: "#8fe9ff", col2: "#c9a8ff", kind: "peony", seed: 10 },
  { t: 3.0, x: 990, y: 720, r: 140, col: "#ff8fcf", col2: "#c9a8ff", kind: "peony", seed: 11 },
  { t: 3.55, x: 300, y: 260, r: 200, col: "#ffd27a", col2: "#ff9f6b", kind: "willow", seed: 12 },
  { t: 3.8, x: 800, y: 330, r: 220, col: "#c9a8ff", col2: "#8fe9ff", kind: "peony", seed: 13 },
  { t: 4.15, x: 560, y: 500, r: 240, col: "#ff7aa8", col2: "#ffd0e0", kind: "chrys", seed: 14 },
  { t: 4.5, x: 200, y: 560, r: 180, col: "#8fe9ff", col2: "#ffffff", kind: "peony", seed: 15 },
]);

export const CITY: Background = {
  groundY: 1800,
  light: { key: "#ffb3cf", keyDir: 1, ambient: "#4f4a9a", rim: "#ff8fbf", strength: 0.35 },
  anchors: { heart: { x: HEART.x, y: HEART.y, w: HEART.r * 2, h: HEART.r * 1.7 } },
  draw(g: G, t: number) {
    const bursts = C_BURSTS(), fl = flashOf(bursts, t);
    g.save();
    blit(g, cSkyL());
    twinkleStars(g, 152, 60, X0, Y0, X1, 900, t);
    if (fl.a > 0.02) { g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.14 * fl.a; g.fillStyle = fl.col; g.fillRect(X0, Y0, OW, CH - Y0); g.globalCompositeOperation = "source-over"; g.globalAlpha = 1; }
    // the heart gets an extra warm halo while it hangs in the sky
    const ha = t - HEART.t;
    if (ha > 0 && ha < 2.7) { g.globalCompositeOperation = "lighter"; radial(g, HEART.x, HEART.y + 20, 480, "#ff6f9f", 0.22 * clamp(ha / 0.3) * (1 - clamp((ha - 2) / 0.7)), 0.3); g.globalCompositeOperation = "source-over"; }
    drawFireworks(g, bursts, t);
    const c = cCity();
    blit(g, c.city);
    blit(g, cRiverL());
    blit(g, c.refl);
    g.save(); g.beginPath(); g.rect(X0, CH + 6, OW, 1780 - CH); g.clip();
    reflectFireworks(g, bursts, t, CH + 8, 600, 0, 1.2);
    shimmer(g, t, CH + 10, 1760, 5, 60);
    blit(g, cBankL());
    g.restore();
    g.restore();
  },
};

