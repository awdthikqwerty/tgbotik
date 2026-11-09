// 4 Jan 2025 — winter park at golden hour, bench centre, warm lamps, falling snow.
import type { Background } from "../lib/types";
import { type G, rng, rgba, mix, lerp, circle, ellipse, noise1 } from "../lib/util";
import {
  X0, X1, Y0, Y1, once, worldLayer, drawWorld, blurred, fillSky, sun, ridge, streakCloud, branches, lampPost, foliageMass,
  glowSprite, bokehSprite, drawSprite, particles, wrap, grain, linGrad, radGrad, sprite, trunk,
} from "./day-kit";

const HZ = 1090;               // horizon (snow line meets tree line)
const SUN = { x: 330, y: 945 };
const SEAT_Y = 1400;
const LAMPS: Array<{ x: number; base: number; h: number }> = [
  { x: 95, base: 1640, h: 900 }, { x: 975, base: 1560, h: 780 }, { x: 640, base: HZ + 40, h: 150 }, { x: 410, base: HZ + 22, h: 95 },
];
const lampHeads: Array<{ x: number; y: number; s: number }> = [];

const SNOW = "#fbf5f6", SNOW_SH = "#c9bfe6", BARK = "#5b4560", BARK_FAR = "#9d86a8";

function fir(g: G, x: number, base: number, h: number, col: string, snow: string, seed: number) {
  const r = rng(seed);
  g.fillStyle = mix(col, "#3a2a40", 0.3); g.fillRect(x - h * 0.03, base - h * 0.15, h * 0.06, h * 0.15);
  const tiers = 5;
  for (let i = 0; i < tiers; i++) {
    const t0 = i / tiers, y = base - h * 0.12 - t0 * h * 0.85, w = h * 0.36 * (1 - t0 * 0.8);
    const th = h * 0.32;
    g.fillStyle = col;
    g.beginPath(); g.moveTo(x, y - th); g.quadraticCurveTo(x + w * 0.4, y - th * 0.4, x + w, y);
    for (let k = 0; k <= 6; k++) g.lineTo(x + w - (k / 6) * 2 * w, y + (k % 2 ? 6 : -2) * h / 400);
    g.quadraticCurveTo(x - w * 0.4, y - th * 0.4, x, y - th); g.fill();
    g.fillStyle = snow;
    g.beginPath(); g.moveTo(x, y - th); g.quadraticCurveTo(x + w * 0.35, y - th * 0.5, x + w * 0.95, y - th * 0.02);
    for (let k = 0; k <= 8; k++) { const xx = x + w * 0.95 - (k / 8) * 1.9 * w; g.lineTo(xx, y - th * 0.18 - r() * th * 0.12); }
    g.quadraticCurveTo(x - w * 0.35, y - th * 0.5, x, y - th); g.fill();
  }
}

function bench(g: G) {
  const x0 = 250, x1 = 830, wood = "#8a5a52", woodLit = "#c98a6a", woodDk = "#5e3a40", iron = "#4a3650";
  // shadow on snow (long, toward the right, away from the low sun)
  g.save(); g.fillStyle = "rgba(120,100,180,0.28)"; g.filter = "blur(10px)";
  g.beginPath(); g.moveTo(x0 - 10, 1505); g.lineTo(x1 + 10, 1505); g.lineTo(x1 + 220, 1560); g.lineTo(x0 + 140, 1565); g.closePath(); g.fill();
  g.restore();
  // back legs
  g.fillStyle = iron;
  for (const x of [x0 + 40, x1 - 40]) { g.fillRect(x - 7, 1180, 14, 300); }
  // back slats
  for (let i = 0; i < 3; i++) {
    const y = 1190 + i * 52;
    g.fillStyle = linGrad(g, 0, y, 0, y + 40, [[0, woodLit], [0.5, wood], [1, woodDk]]);
    g.beginPath(); g.roundRect(x0 - 6, y, x1 - x0 + 12, 38, 8); g.fill();
    g.fillStyle = SNOW; g.beginPath(); g.ellipse(x0 + 70 + i * 40, y + 2, 60, 7, 0, Math.PI, 0); g.fill();
    g.beginPath(); g.ellipse(x1 - 90 + i * 20, y + 2, 70, 7, 0, Math.PI, 0); g.fill();
  }
  // seat top face
  g.fillStyle = linGrad(g, 0, SEAT_Y - 26, 0, SEAT_Y + 4, [[0, mix(woodLit, "#ffd2b0", 0.3)], [1, wood]]);
  g.beginPath(); g.moveTo(x0 + 10, SEAT_Y - 26); g.lineTo(x1 - 10, SEAT_Y - 26); g.lineTo(x1 + 14, SEAT_Y + 4); g.lineTo(x0 - 14, SEAT_Y + 4); g.closePath(); g.fill();
  g.strokeStyle = rgba(woodDk, 0.5); g.lineWidth = 2;
  for (let i = 1; i < 3; i++) { const y = SEAT_Y - 26 + i * 10; g.beginPath(); g.moveTo(x0 + 10 - i * 8, y); g.lineTo(x1 - 10 + i * 8, y); g.stroke(); }
  // snow on seat ends
  g.fillStyle = SNOW;
  g.beginPath(); g.ellipse(x0 + 30, SEAT_Y - 26, 50, 10, 0, Math.PI, 0); g.fill();
  g.beginPath(); g.ellipse(x1 - 36, SEAT_Y - 26, 56, 11, 0, Math.PI, 0); g.fill();
  // front edge
  g.fillStyle = linGrad(g, 0, SEAT_Y + 4, 0, SEAT_Y + 30, [[0, wood], [1, woodDk]]);
  g.beginPath(); g.roundRect(x0 - 16, SEAT_Y + 3, x1 - x0 + 32, 26, 6); g.fill();
  // front legs + armrests (cast iron scroll)
  g.strokeStyle = iron; g.lineWidth = 14; g.lineCap = "round";
  for (const [x, d] of [[x0 - 4, -1], [x1 + 4, 1]] as const) {
    g.beginPath(); g.moveTo(x, SEAT_Y + 28); g.quadraticCurveTo(x + d * 6, SEAT_Y + 70, x + d * 16, SEAT_Y + 108); g.stroke();
    g.beginPath(); g.moveTo(x - d * 20, SEAT_Y - 10); g.quadraticCurveTo(x + d * 18, SEAT_Y - 70, x - d * 6, SEAT_Y - 120); g.stroke();
    g.fillStyle = iron; circle(g, x - d * 6, SEAT_Y - 124, 12); g.fill();
    g.strokeStyle = rgba("#ffcf9e", 0.55); g.lineWidth = 4;
    g.beginPath(); g.moveTo(x - d * 18 - 4, SEAT_Y - 14); g.quadraticCurveTo(x + d * 16 - 4, SEAT_Y - 72, x - d * 6 - 4, SEAT_Y - 118); g.stroke();
    g.strokeStyle = iron; g.lineWidth = 14;
  }
}

const sky = once(() => worldLayer((g) => {
  fillSky(g, [[0, "#7d78c8"], [0.25, "#a99be0"], [0.5, "#e7a6cf"], [0.7, "#f8b4b4"], [0.85, "#ffcfa4"], [1, "#ffe6b0"]], Y0, HZ + 40);
  sun(g, SUN.x, SUN.y, 62, "#fff0c4", "#ffd49a", 9);
  streakCloud(g, 820, 160, 700, 90, 11, "#b6a3e0", "#ffc4b4", 0.8);
  streakCloud(g, 160, 420, 620, 70, 12, "#c7a6dc", "#ffcfae", 0.75);
  streakCloud(g, 960, 640, 520, 60, 13, "#e5a9cb", "#ffd9b0", 0.7);
  streakCloud(g, 300, 760, 640, 46, 14, "#f0b0c0", "#ffe2b8", 0.65);
}, 0.5));

const drift = once(() => [
  sprite(900, 220, (g) => streakCloud(g, 450, 110, 760, 90, 21, "#bba5e2", "#ffd0bc", 0.55)),
  sprite(700, 160, (g) => streakCloud(g, 350, 80, 600, 60, 22, "#e9b0d0", "#ffe0b8", 0.5)),
]);

const scene = once(() => worldLayer((g) => {
  // far city / treeline in haze
  blurred(g, 3, (g) => {
    ridge(g, HZ - 30, 70, 0.006, 3, "#c7a3d4", 0.3);
    g.fillStyle = "#c19bd0";
    const r = rng(41);
    for (let x = X0; x < X1; x += 18 + r() * 30) {
      const h = 20 + r() * 70; g.beginPath(); g.ellipse(x, HZ - 10 - h * 0.5, 14 + r() * 16, h * 0.7, 0, 0, Math.PI * 2); g.fill();
    }
  });
  // mid row of bare snowy trees, hazed lilac
  blurred(g, 1.2, (g) => {
    const r = rng(52);
    for (let i = 0; i < 9; i++) {
      const x = X0 + 60 + i * 175 + r() * 60; if (x > 330 && x < 760 && r() > 0.4) continue;
      branches(g, x, HZ + 5, -Math.PI / 2 + (r() - 0.5) * 0.15, 90 + r() * 50, 10, 5, r, "#a98fb4", { snow: "#f3e6f0", spread: 0.45 });
    }
    for (const [x, h] of [[-110, 330], [110, 230], [880, 300], [1150, 360]] as const) fir(g, x, HZ + 25, h, "#8e8cba", "#f6eef6", x | 0);
  });
  // snow field
  g.fillStyle = linGrad(g, 0, HZ - 10, 0, Y1, [[0, "#ffe2d2"], [0.08, "#f8d8de"], [0.3, "#ece0f2"], [0.6, "#e3dcf2"], [1, "#d9d6f0"]]);
  g.beginPath(); g.moveTo(X0, HZ + 10);
  for (let x = X0; x <= X1; x += 10) g.lineTo(x, HZ + 4 + 8 * noise1(x * 0.01, 9));
  g.lineTo(X1, Y1); g.lineTo(X0, Y1); g.fill();
  // warm sunlit glow on snow near horizon under the sun
  g.save(); g.globalCompositeOperation = "screen";
  g.fillStyle = radGrad(g, SUN.x, HZ + 30, 0, 700, [[0, "rgba(255,210,160,0.7)"], [0.5, "rgba(255,190,170,0.2)"], [1, "rgba(255,190,170,0)"]]);
  g.save(); g.translate(SUN.x, HZ + 30); g.scale(1.6, 0.35); g.translate(-SUN.x, -(HZ + 30)); g.fillRect(SUN.x - 700, HZ + 30 - 700, 1400, 1400); g.restore();
  g.restore();
  // snow drifts (soft mounds)
  const r = rng(77);
  for (let i = 0; i < 26; i++) {
    const y = lerp(HZ + 40, Y1, r() ** 1.6), x = X0 + r() * 1480, s = 0.4 + (y - HZ) / 900;
    g.fillStyle = radGrad(g, x - 30 * s, y - 20 * s, 0, 220 * s, [[0, "rgba(255,250,250,0.55)"], [1, "rgba(255,250,250,0)"]]);
    g.beginPath(); g.ellipse(x, y, 260 * s, 40 * s, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = rgba(SNOW_SH, 0.22);
    g.beginPath(); g.ellipse(x + 60 * s, y + 26 * s, 230 * s, 22 * s, 0, 0, Math.PI * 2); g.fill();
  }
  // path: winding from the distance to the plaza in front
  const pathPts: Array<[number, number, number]> = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40, y = lerp(HZ + 12, Y1, t ** 1.7);
    const cx = 610 + Math.sin(t * 3.2 + 0.4) * 140 * t - 80 * t;
    const w = lerp(16, 1500, t ** 1.5);
    pathPts.push([cx, y, w]);
  }
  g.beginPath();
  pathPts.forEach(([cx, y, w], i) => (i ? g.lineTo(cx - w / 2, y) : g.moveTo(cx - w / 2, y)));
  for (let i = pathPts.length - 1; i >= 0; i--) g.lineTo(pathPts[i][0] + pathPts[i][2] / 2, pathPts[i][1]);
  g.closePath();
  g.fillStyle = linGrad(g, 0, HZ, 0, Y1, [[0, "#f6c9b6"], [0.2, "#e9c0c4"], [0.5, "#d9c2d8"], [1, "#cbbadb"]]);
  g.save(); g.filter = "blur(4px)"; g.fill(); g.restore();
  // footprints & sled tracks on path
  g.save(); g.fillStyle = "rgba(150,125,185,0.25)";
  for (let i = 4; i < 38; i++) {
    const [cx, y, w] = pathPts[i]; const s = w / 900;
    for (const off of [-0.12, 0.12]) { ellipse(g, cx + off * w + (i % 2 ? 8 : -8) * s, y, 9 * s + 1, 4 * s + 0.6); g.fill(); }
  }
  g.restore();
  // long blue tree shadows across the snow (low sun from the left)
  g.save(); g.globalCompositeOperation = "multiply"; g.filter = "blur(14px)";
  for (const [x, y, len, w] of [[-120, 1820, 1200, 70], [80, 1240, 700, 30], [900, 1300, 600, 30], [1080, 1700, 900, 60]] as const) {
    g.fillStyle = "rgba(190,180,235,0.55)";
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y + len * 0.12); g.lineTo(x + len, y + len * 0.12 + w * 0.6); g.lineTo(x, y + w); g.closePath(); g.fill();
  }
  g.restore();
  // distant small lamps
  for (const L of LAMPS.slice(2)) {
    const h = lampPost(g, L.x, L.base, L.h, "#7f6690", "#ffe9b0", "#ffd2a0");
    lampHeads.push(h);
  }
  bench(g);
  // framing big bare trees with snow and warm rim from the sun
  const rL = rng(91), rR = rng(92);
  trunk(g, 0, Y1, 20, 260, 160, 80, 25, "#3a2846", BARK, "#d99a84", 1, 3);
  const U = { snow: SNOW, rim: "#ffb88f", up: true };
  branches(g, 20, 280, -1.0, 250, 64, 6, rL, BARK, { ...U, spread: 0.5, shrink: 0.7 });
  branches(g, 10, 520, -0.62, 230, 44, 5, rL, BARK, { ...U, spread: 0.45 });
  branches(g, 20, 140, -1.6, 260, 56, 5, rL, BARK, { ...U, spread: 0.6 });
  trunk(g, 1090, Y1, 1070, 330, 140, 72, -25, "#3a2846", BARK, "#d99a84", -1, 4);
  branches(g, 1070, 350, -2.15, 250, 56, 6, rR, BARK, { ...U, spread: 0.5, shrink: 0.7 });
  branches(g, 1080, 600, -2.55, 220, 40, 5, rR, BARK, { ...U, spread: 0.45 });
  branches(g, 1070, 200, -1.55, 240, 48, 5, rR, BARK, { ...U, spread: 0.6 });
  // snow resting in the trunk forks
  g.fillStyle = SNOW;
  for (const [x, y] of [[20, 268], [1070, 338]] as const) { g.beginPath(); g.ellipse(x, y, 46, 12, 0, Math.PI, 0); g.fill(); }
  // snowy shrubs at tree feet
  for (const [x, y, w] of [[60, 1560, 230], [-120, 1700, 260], [1030, 1520, 200], [1200, 1680, 260]] as const) {
    foliageMass(g, x, y, w, w * 0.42, { dark: "#a596c6", mid: "#cfc3e2", light: "#f4ecf6", hi: "#fffaf6" }, x * 7 + 3, -0.7, -0.9, 150, 0.55, "#ffd6c0");
  }
  // near lamps
  for (const L of LAMPS.slice(0, 2)) lampHeads.push(lampPost(g, L.x, L.base, L.h, "#3f2f4c", "#ffe2a0", "#ffbe92", -1));
  // sparkle dust in snow
  const rs = rng(5);
  g.fillStyle = "rgba(255,255,255,0.85)";
  for (let i = 0; i < 260; i++) { const y = lerp(HZ + 30, Y1, rs() ** 1.3); circle(g, X0 + rs() * 1480, y, 0.8 + rs() * 1.6 * (y - HZ) / 900); g.fill(); }
  grain(g, 0.06, 0.04, 33);
}));

const glowS = once(() => glowSprite("#ffc27a", 256, 0.3));
const flakeS = once(() => glowSprite("#ffffff", 64, 0.5));
const bokehS = once(() => bokehSprite("#ffe6ef", 128));
const flakes = particles(170, 99);

function draw(g: G, t: number) {
  g.save();
  drawWorld(g, sky());
  const [c1, c2] = drift();
  g.drawImage(c1, -300 + ((t * 9) % 1700) - 200, 40);
  g.drawImage(c2, 1100 - ((t * 6) % 1600), 520);
  drawWorld(g, scene());
  // lamp glows with gentle flicker
  g.globalCompositeOperation = "screen";
  lampHeads.forEach((h, i) => {
    const f = 0.85 + 0.15 * noise1(t * 3 + i * 7, i);
    drawSprite(g, glowS(), h.x, h.y, 520 * h.s * 1.6, 0, f);
    drawSprite(g, glowS(), h.x, h.y, 160 * h.s * 1.6, 0, 1);
  });
  drawSprite(g, glowS(), SUN.x, SUN.y, 700, 0, 0.45 + 0.08 * Math.sin(t * 1.3));
  // sun shimmer
  drawSprite(g, glowS(), SUN.x, SUN.y, 900, 0, 0.25 + 0.06 * Math.sin(t * 1.3));
  // twinkling snow glints
  const r = rng(808);
  for (let i = 0; i < 40; i++) {
    const x = X0 + r() * 1480, y = lerp(HZ + 40, 1900, r()), ph = r() * 6.28;
    const a = Math.max(0, Math.sin(t * (1.5 + r() * 2) + ph)) ** 6;
    if (a > 0.02) drawSprite(g, flakeS(), x, y, 18 + 20 * r(), 0, a);
  }
  g.restore();
}

function front(g: G, t: number) {
  g.save();
  g.globalCompositeOperation = "screen";
  for (const p of flakes) {
    const z = p.z, sp = 40 + z * 110;
    const y = wrap(p.y + t * sp, Y0 - 40, Y1 + 40);
    const x = wrap(p.x + Math.sin(t * p.f + p.ph) * 30 * (0.5 + z) + t * 12 * z, X0 - 40, X1 + 40);
    if (z > 0.93) drawSprite(g, bokehS(), x, y, 60 + p.s * 40, 0, 0.35);
    else drawSprite(g, flakeS(), x, y, 6 + z * 18, 0, 0.55 + 0.45 * z);
  }
  g.restore();
}

export const park: Background = {
  draw, front, groundY: 1600,
  light: { key: "#ffc49a", keyDir: -1, ambient: "#9a8ccc", rim: "#ffb8a0", strength: 0.42 },
  anchors: {
    bench: { x: 540, y: SEAT_Y - 12, w: 560 },
    sun: { x: SUN.x, y: SUN.y }, lampL: { x: 95, y: 1640 - 840 }, lampR: { x: 975, y: 1560 - 728 },
  },
};
