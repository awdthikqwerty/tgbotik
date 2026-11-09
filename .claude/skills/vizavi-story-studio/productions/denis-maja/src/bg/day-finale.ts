// 9 Nov 2026 — finale: autumn park avenue at sunset, lanterns, falling leaves, floating light motes.
import type { Background } from "../lib/types";
import { type G, rng, rgba, mix, lerp, clamp, circle, noise1 } from "../lib/util";
import {
  X0, X1, Y0, Y1, once, worldLayer, drawWorld, blurred, fillSky, sun, ridge, streakCloud, lampPost, foliage, limb, branches,
  glowSprite, bokehSprite, drawSprite, particles, wrap, grain, linGrad, radGrad, sprite, type FolPal,
  foliageMass, worldSprite, drawSway, type WorldSprite, grassStrokes, trunk, soft,
} from "./day-kit";

const HZ = 1130, VPX = 560;
const SUN = { x: 585, y: 1005, r: 92 };
const K = 1110, CAM = 1.6;            // perspective: groundY(z) = HZ + K / z
const pY = (z: number) => HZ + K / z;
const pS = (z: number) => K / CAM / z; // px per metre at depth z
const pX = (X: number, z: number) => VPX + X * pS(z);
const HAZE = "#f7b8a4";

const PALS: FolPal[] = [
  { dark: "#7a2f3e", mid: "#c9523e", light: "#f2884a", hi: "#ffd27a" },   // red-orange
  { dark: "#8a4a2e", mid: "#d9822e", light: "#f7b34a", hi: "#fff0a0" },   // gold
  { dark: "#6e2a4a", mid: "#b8434e", light: "#ec7a5c", hi: "#ffc48a" },   // crimson
];
// haze quantised so trees at similar depths share cached foliage stamps
const hazePal = (p: FolPal, h0: number, h = Math.round(h0 * 10) / 10): FolPal => ({ dark: mix(p.dark, HAZE, h), mid: mix(p.mid, HAZE, h), light: mix(p.light, HAZE, h * 0.9), hi: mix(p.hi, "#ffe8c0", h * 0.6) });

/** Autumn tree in local units (s = px per metre). Light comes from the sun (towards the centre). */
function autumnTree(g: G, x: number, base: number, s: number, pal: FolPal, seed: number, lx: number, haze = 0) {
  const r = rng(seed);
  const bark = mix("#4e3048", HAZE, haze), barkLit = mix("#c77a5e", HAZE, haze * 0.7);
  const h = (6.5 + r() * 2) * s;
  limb(g, x, base + 4, x + (r() - 0.5) * s * 0.6, base - h * 0.55, s * 0.55, s * 0.3, (r() - 0.5) * s * 0.4,
    linGrad(g, x - s * 0.3, 0, x + s * 0.3, 0, lx > 0 ? [[0, bark], [0.7, bark], [1, barkLit]] : [[0, barkLit], [0.3, bark], [1, bark]]));
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i - 1) * 0.6 + (r() - 0.5) * 0.3;
    limb(g, x, base - h * 0.45, x + Math.cos(a) * h * 0.35, base - h * 0.45 + Math.sin(a) * h * 0.35, s * 0.25, s * 0.08, 0, bark);
  }
  const p = hazePal(pal, haze);
  const masses = 3 + Math.floor(r() * 2);
  const rimC = mix("#ffe0a0", HAZE, haze * 0.5);
  for (let i = 0; i < masses; i++) {
    const cx = x + (r() - 0.5) * s * 2.6, cy = base - h * (0.62 + r() * 0.25);
    foliageMass(g, cx, cy, s * (1.5 + r() * 0.8), s * (1.3 + r() * 0.6), p, seed * 13 + i, lx, 0.2, Math.round(lerp(50, 140, clamp(s / 100))), 0.8, rimC);
  }
  foliageMass(g, x, base - h * 0.95, s * 1.6, s * 1.2, p, seed * 7, lx, 0.1, Math.round(lerp(40, 120, clamp(s / 100))), 0.8, rimC);
}

const sky = once(() => worldLayer((g) => {
  fillSky(g, [[0, "#5f56a8"], [0.18, "#8a74c8"], [0.38, "#c58bd0"], [0.55, "#f29bbd"], [0.7, "#f9a48e"], [0.84, "#ffb27a"], [0.95, "#ffc48a"], [1, "#ffd59c"]], Y0, HZ + 20);
  // soft secondary glow band along horizon
  g.save(); g.globalCompositeOperation = "screen";
  g.fillStyle = linGrad(g, 0, HZ - 420, 0, HZ + 40, [[0, "rgba(255,200,150,0)"], [1, "rgba(255,210,150,0.55)"]]);
  g.fillRect(X0, HZ - 420, X1 - X0, 460);
  g.restore();
  sun(g, SUN.x, SUN.y, SUN.r, "#fff3c8", "#ffc98a", 10);
  streakCloud(g, 120, -150, 900, 120, 3, "#8f7cc8", "#f7a9c0", 0.7);
  streakCloud(g, 980, 40, 800, 110, 4, "#a58ad2", "#ffb2b0", 0.7);
  streakCloud(g, 300, 330, 700, 80, 5, "#d394c4", "#ffc49a", 0.65);
  streakCloud(g, 1000, 560, 560, 60, 6, "#ee9fb6", "#ffd39a", 0.6);
  streakCloud(g, 150, 760, 520, 44, 7, "#f4a6a6", "#ffe0a8", 0.55);
  streakCloud(g, 900, 880, 420, 30, 8, "#f8b29a", "#fff0c0", 0.5);
  // first evening stars at the very top
  const r = rng(2);
  for (let i = 0; i < 70; i++) {
    const y = Y0 + r() * 500; g.fillStyle = `rgba(255,245,255,${0.25 + r() * 0.5})`;
    circle(g, X0 + r() * 1480, y, 0.8 + r() * 1.6); g.fill();
  }
}, 0.5));

const clouds = once(() => [
  sprite(1000, 260, (g) => streakCloud(g, 500, 130, 860, 110, 31, "#9c86d0", "#ffb4b8", 0.6)),
  sprite(800, 200, (g) => streakCloud(g, 400, 100, 680, 70, 32, "#e29ac0", "#ffcf9e", 0.55)),
  sprite(700, 160, (g) => streakCloud(g, 350, 80, 560, 46, 33, "#f6aaa4", "#ffe6b0", 0.5)),
]);

/** God-ray fan sprite centred on the sun. */
const rays = once(() => sprite(1200, 1200, (g) => {
  const c = 600, r = rng(17);
  g.translate(c, c);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + r() * 0.2, w = 0.03 + r() * 0.06;
    g.fillStyle = radGrad(g, 0, 0, 0, 600, [[0, "rgba(255,236,190,0.5)"], [0.5, "rgba(255,210,170,0.15)"], [1, "rgba(255,200,170,0)"]]);
    g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 600, a - w, a + w); g.closePath(); g.fill();
  }
}));

const lampHeads: Array<{ x: number; y: number; s: number }> = [];

const scene = once(() => worldLayer((g) => {
  // distant hills + far tree line in haze
  blurred(g, 4, (g) => {
    ridge(g, HZ - 40, 90, 0.004, 11, "#e6a6b8", 0.2);
    ridge(g, HZ - 5, 60, 0.007, 12, "#e9a49c", 0.4);
    const r = rng(61);
    for (let x = X0; x < X1; x += 22 + r() * 26) {
      const hh = 30 + r() * 60, col = mix(["#e48a7a", "#eb9d78", "#d98490"][Math.floor(r() * 3)], HAZE, 0.55);
      g.fillStyle = col; g.beginPath(); g.ellipse(x, HZ - hh * 0.6, 20 + r() * 18, hh * 0.75, 0, 0, Math.PI * 2); g.fill();
    }
  }, 1, [HZ - 220, HZ + 40]);
  // ground: golden autumn lawn
  g.fillStyle = linGrad(g, 0, HZ, 0, Y1, [[0, "#ffcf98"], [0.06, "#f1ad7e"], [0.25, "#d98a66"], [0.6, "#b86a5c"], [1, "#9a5462"]]);
  g.fillRect(X0, HZ, X1 - X0, Y1 - HZ);
  grassStrokes(g, HZ + 8, Y1, 5200, 404, ["#c97a52", "#e8a066", "#a85e58", "#f2b874", "#b9705e"], 34);
  // backlit glow on the ground under the sun
  g.save(); g.globalCompositeOperation = "screen";
  g.translate(SUN.x, HZ + 10); g.scale(2.2, 0.45);
  g.fillStyle = radGrad(g, 0, 0, 0, 520, [[0, "rgba(255,220,160,0.85)"], [0.4, "rgba(255,190,140,0.3)"], [1, "rgba(255,180,140,0)"]]);
  g.fillRect(-520, -520, 1040, 1040);
  g.restore();
  // path (cobbled, lit), converging to the vanishing point
  const edge = (X: number) => { const pts: Array<[number, number]> = []; for (let z = 60; z >= 0.95; z *= 0.9) pts.push([pX(X + 0.25 * Math.sin(z * 0.15), z), pY(z)]); return pts; };
  const L = edge(-1.7), R = edge(1.7);
  g.beginPath(); L.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); for (let i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]); g.closePath();
  g.fillStyle = linGrad(g, 0, HZ, 0, Y1, [[0, "#fff0c8"], [0.08, "#ffd3a6"], [0.3, "#eba88c"], [0.7, "#c98482"], [1, "#a8687a"]]);
  g.fill();
  g.save(); g.clip();
  // cobble pattern rows
  // irregular paving stones, perspective-scaled
  const cr = rng(303);
  for (let z = 1; z < 40; z *= 1.07) {
    const y = pY(z), s = pS(z), rowH = pY(z) - pY(z * 1.07);
    for (let X = -1.8 + cr() * 0.3; X < 1.8; X += 0.32 + cr() * 0.12) {
      g.fillStyle = cr() > 0.5 ? "rgba(255,235,210,0.07)" : "rgba(130,70,100,0.07)";
      g.beginPath(); g.ellipse(pX(X, z), y - rowH * 0.5, s * 0.14, Math.max(0.6, rowH * 0.36), 0, 0, Math.PI * 2); g.fill();
    }
  }
  // central sun reflection along the path
  g.globalCompositeOperation = "screen";
  soft(g, 24, SUN.x - 300, HZ, SUN.x + 300, Y1, (g) => {
    g.fillStyle = linGrad(g, 0, HZ, 0, Y1, [[0, "rgba(255,240,200,0.75)"], [0.35, "rgba(255,210,170,0.22)"], [1, "rgba(255,200,170,0)"]]);
    g.beginPath(); g.moveTo(SUN.x - 10, HZ); g.lineTo(SUN.x + 10, HZ); g.lineTo(SUN.x + 300, Y1); g.lineTo(SUN.x - 300, Y1); g.closePath(); g.fill();
  });
  g.restore();
  // path border (low stone kerb)
  g.strokeStyle = "rgba(120,70,90,0.35)"; g.lineWidth = 4;
  for (const P of [L, R]) { g.beginPath(); P.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
  // long backlit shadows running towards the camera
  g.save(); g.globalCompositeOperation = "multiply";
  soft(g, 10, X0, HZ, X1, Y1, (g) => {
    for (const X of [-5.2, -2.4, 2.4, 5.0]) for (const z of [7, 12, 20]) {
      const x0 = pX(X, z), y0 = pY(z), x1 = pX(X * 1.15, z * 0.35), y1 = pY(z * 0.35);
      const w = pS(z) * (Math.abs(X) > 3 ? 0.5 : 0.12);
      g.fillStyle = "rgba(170,120,190,0.35)";
      g.beginPath(); g.moveTo(x0 - w, y0); g.lineTo(x0 + w, y0); g.lineTo(x1 + w * 2.6, y1); g.lineTo(x1 - w * 2.6, y1); g.closePath(); g.fill();
    }
  });
  g.restore();
  // avenue of autumn trees and lanterns, far to near
  type Item = { z: number; f: () => void };
  const items: Item[] = [];
  const r = rng(101);
  for (const z of [44, 34, 26, 20, 15.5, 12, 9.2]) for (const side of [-1, 1]) {
    const X = side * (4.4 + r() * 1.4), pal = PALS[Math.floor(r() * 3)], sd = Math.floor(r() * 1e5);
    items.push({ z, f: () => autumnTree(g, pX(X, z), pY(z), pS(z), pal, sd, -side * 0.8, clamp((z - 7) / 34) * 0.85) });
  }
  for (const z of [30, 18, 11, 6.5]) for (const side of [-1, 1]) {
    items.push({ z: z - 0.01, f: () => {
      const s = pS(z), x = pX(side * 2.3, z), y = pY(z);
      const hz = clamp((z - 5) / 28) * 0.6;
      lampHeads.push(lampPost(g, x, y, 3.6 * s, mix("#3d2c48", HAZE, hz), "#ffe6a8", "#ffc890", side > 0 ? -1 : 1));
    } });
  }
  items.sort((a, b) => b.z - a.z).forEach((it) => it.f());
  // fallen leaf carpet
  const lr = rng(202), leafCols = ["#e8743e", "#f2a03e", "#c94a3e", "#ffc65a", "#b8455a", "#f58f7c"];
  for (let i = 0; i < 2600; i++) {
    const y = lerp(HZ + 6, Y1, lr() ** 1.5), d = (y - HZ) / (Y1 - HZ);
    const x = X0 + lr() * 1480, sz = 1 + d * 11 * (0.6 + lr() * 0.6);
    const onPath = Math.abs(x - VPX) < 1.7 * (y - HZ) / CAM;
    if (onPath && lr() > 0.3) continue;
    g.fillStyle = leafCols[Math.floor(lr() * leafCols.length)];
    g.globalAlpha = 0.65 + lr() * 0.35;
    g.beginPath(); g.ellipse(x, y, sz, sz * 0.5, lr() * Math.PI, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
  // bushes along the lawn edges
  for (const [x, y, w, p] of [[-120, 1520, 260, 0], [1180, 1500, 260, 2], [-60, 1900, 300, 1], [1160, 1950, 320, 0]] as const) {
    foliageMass(g, x, y, w, w * 0.5, PALS[p], x * 3 + y, x < 540 ? 0.8 : -0.8, -0.3, 160, 0.6, "#ffd59a");
  }
  grain(g, 0.06, 0.045, 71);
}));

/** Big framing trees as separate sprites so they can sway. Pivot = trunk base. */
type TreeSpr = { s: WorldSprite; px: number; py: number };
const bigTrees = once((): TreeSpr[] => {
  // canopies confined to the top corners so the sky, sun and avenue stay open behind the couple
  const make = (side: -1 | 1, seed: number, pal: FolPal, pal2: FolPal): TreeSpr => {
    const X = (x: number) => (side < 0 ? x : 1080 - x);
    const s = worldSprite(side < 0 ? X0 : 380, Y0, side < 0 ? 700 : X1, Y1 + 40, (g) => {
      const r = rng(seed), lx = -side * 0.55, ly = 0.65;
      const bark = "#3f2742", barkLit = "#e3916a";
      trunk(g, X(20), Y1 + 40, X(38), 330, 170, 84, side * 30, "#2e1d36", bark, barkLit, side < 0 ? 1 : -1, seed);
      const masses: Array<[number, number, number, number, FolPal]> = [
        [-90, -60, 340, 260, pal2], [210, -180, 300, 200, pal], [430, -120, 230, 150, pal2], [330, 150, 230, 160, pal],
        [70, 300, 260, 170, pal], [-140, 520, 210, 190, pal2], [180, 430, 160, 110, pal2],
      ];
      // limbs end inside the foliage masses so no bare twigs poke into the sky
      for (const [cx, cy] of masses) {
        const sy = Math.min(900, cy + 380);
        limb(g, X(35), sy, X(cx * 0.85), cy + 20, 46, 16, side * (r() - 0.3) * 60, bark, barkLit, side < 0 ? 1 : -1);
      }
      for (const [i, [cx, cy, rx, ry, p]] of masses.entries()) foliageMass(g, X(cx), cy, rx, ry, p, seed * 31 + i, lx, ly, 220, 0.75, "#ffe0a0");
    });
    return { s, px: X(20), py: Y1 + 40 };
  };
  return [make(-1, 7, PALS[0], PALS[2]), make(1, 9, PALS[1], PALS[0])];
});

// leaf sprites (sharp + blurred) for falling leaves
const leafSprites = once(() => {
  const cols = ["#f2883e", "#e0563e", "#ffbe4a", "#c8405a", "#f6a05a"];
  const mk = (col: string, blur: number) => sprite(64, 64, (g) => {
    g.filter = blur ? `blur(${blur}px)` : "none";
    g.translate(32, 32);
    g.fillStyle = col;
    g.beginPath(); g.moveTo(0, -24);
    g.bezierCurveTo(16, -18, 20, 4, 0, 24); g.bezierCurveTo(-20, 4, -16, -18, 0, -24); g.fill();
    g.strokeStyle = mix(col, "#5a2030", 0.45); g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(0, -20); g.lineTo(0, 26); g.stroke();
    for (const k of [-1, 1]) for (const y of [-8, 2, 12]) { g.beginPath(); g.moveTo(0, y); g.lineTo(k * 9, y - 7); g.stroke(); }
    g.fillStyle = "rgba(255,240,200,0.35)"; g.beginPath(); g.ellipse(-5, -6, 4, 10, 0.2, 0, Math.PI * 2); g.fill();
  });
  return { sharp: cols.map((c) => mk(c, 0)), soft: cols.map((c) => mk(c, 4)) };
});
const moteS = once(() => glowSprite("#ffd08a", 96, 0.3));
const moteP = once(() => glowSprite("#ffb0c8", 96, 0.3));
const lampG = once(() => glowSprite("#ffc074", 256, 0.28));
const bokS = once(() => bokehSprite("#ffd6a8", 128));

const backLeaves = particles(26, 404), frontLeaves = particles(30, 505), motes = particles(70, 606);

function leaf(g: G, p: (typeof backLeaves)[number], t: number, size: number, soft: boolean, fall: number) {
  const L = leafSprites(), arr = soft ? L.soft : L.sharp;
  const y = wrap(p.y + t * fall, Y0 - 80, Y1 + 80);
  const x = wrap(p.x + Math.sin(t * 0.9 * p.f + p.ph) * 60 + t * 22, X0 - 80, X1 + 80);
  const rot = p.ph + t * (1.2 * p.f) * (p.a > 0.5 ? 1 : -1);
  const flip = Math.cos(t * 2.2 * p.f + p.ph);
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(0.35 + 0.65 * Math.abs(flip), 1);
  g.drawImage(arr[Math.floor(p.s * arr.length)], -size / 2, -size / 2, size, size);
  g.restore();
}

function draw(g: G, t: number) {
  g.save();
  drawWorld(g, sky());
  const [c1, c2, c3] = clouds();
  g.drawImage(c1, wrap(-500 + t * 10, X0 - 1000, X1), -260);
  g.drawImage(c2, wrap(900 - t * 7, X0 - 800, X1), 220);
  g.drawImage(c3, wrap(-100 + t * 5, X0 - 700, X1), 640);
  // breathing god rays
  g.globalCompositeOperation = "screen";
  g.save(); g.translate(SUN.x, SUN.y); g.rotate(t * 0.012); g.globalAlpha = 0.32 + 0.1 * Math.sin(t * 0.5);
  g.drawImage(rays(), -1300, -1300, 2600, 2600); g.restore();
  g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
  drawWorld(g, scene());
  // sun bloom over the horizon trees
  g.globalCompositeOperation = "screen";
  drawSprite(g, lampG(), SUN.x, SUN.y + 30, 900 + 40 * Math.sin(t * 0.7), 0, 0.55);
  lampHeads.forEach((h, i) => {
    const f = 0.85 + 0.15 * noise1(t * 2.5 + i * 5, i);
    drawSprite(g, lampG(), h.x, h.y, 300 * h.s * 2.2, 0, f);
  });
  // drifting motes behind characters
  for (let i = 0; i < 40; i++) {
    const p = motes[i];
    const y = wrap(p.y - t * (12 + p.z * 25), Y0, Y1), x = p.x + Math.sin(t * 0.4 * p.f + p.ph) * 40;
    const a = 0.35 + 0.5 * Math.max(0, Math.sin(t * p.f + p.ph));
    drawSprite(g, p.a > 0.6 ? moteP() : moteS(), x, y, 14 + p.z * 26, 0, a);
  }
  g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
  // swaying framing trees
  bigTrees().forEach((tr, i) => {
    const sway = 0.0045 * Math.sin(t * 0.55 + i * 1.7) + 0.002 * Math.sin(t * 1.3 + i);
    drawSway(g, tr.s, tr.px, tr.py, sway);
  });
  for (let i = 0; i < backLeaves.length; i++) leaf(g, backLeaves[i], t, 16 + backLeaves[i].z * 14, false, 50 + backLeaves[i].z * 40);
  g.restore();
}

function front(g: G, t: number) {
  g.save();
  for (const p of frontLeaves) {
    const near = p.z > 0.82;
    // big defocused leaves stay at the frame edges, away from faces
    if (near) { const ex = p.x < 540 ? X0 + (p.x - X0) * 0.25 : X1 - (X1 - p.x) * 0.25; leaf(g, { ...p, x: ex }, t, 70 + p.s * 40, true, 120); }
    else leaf(g, p, t, 20 + p.z * 18, false, 70 + p.z * 50);
  }
  g.globalCompositeOperation = "screen";
  for (let i = 40; i < motes.length; i++) {
    const p = motes[i];
    const y = wrap(p.y - t * (20 + p.z * 30), Y0, Y1), x = p.x + Math.sin(t * 0.5 * p.f + p.ph) * 50;
    const a = 0.3 + 0.6 * Math.max(0, Math.sin(t * 0.8 * p.f + p.ph));
    if (p.z > 0.85) drawSprite(g, bokS(), x, y, 50 + p.s * 50, 0, a * 0.45);
    else drawSprite(g, p.a > 0.5 ? moteP() : moteS(), x, y, 12 + p.z * 22, 0, a);
  }
  g.restore();
}

export const finale: Background = {
  draw, front, groundY: 1600,
  light: { key: "#ffc890", keyDir: 1, ambient: "#a77fb8", rim: "#ffd59a", strength: 0.45 },
  anchors: { sun: { x: SUN.x, y: SUN.y }, vanish: { x: VPX, y: HZ }, path: { x: VPX, y: 1600, w: 2 * 1.7 * pS(K / (1600 - HZ)) } },
};
