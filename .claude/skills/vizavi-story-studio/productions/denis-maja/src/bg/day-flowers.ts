// Memory: spring park — blooming cherry trees, tulip beds, soft daylight, drifting petals.
import type { Background } from "../lib/types";
import { type G, rng, rgba, mix, lerp, circle } from "../lib/util";
import {
  X0, X1, Y0, Y1, once, worldLayer, drawWorld, blurred, fillSky, ridge, puffCloud, foliageMass, limb, glowSprite,
  drawSprite, particles, wrap, grain, linGrad, radGrad, sprite, worldSprite, drawSway, grassStrokes, petalPath, trunk, soft, type FolPal,
} from "./day-kit";

const HZ = 1160;
const SUNP = { x: 930, y: 60 };
const CHERRY: FolPal = { dark: "#d27aa2", mid: "#f0a2c2", light: "#fbcfe0", hi: "#fff4f8" };
const CHERRY2: FolPal = { dark: "#c86e9a", mid: "#ec98bc", light: "#f9c4da", hi: "#fff0f6" };
const BARK = "#6a4658";

function cherryTree(g: G, x: number, base: number, s: number, seed: number, pal: FolPal, haze = 0) {
  const r = rng(seed);
  const p: FolPal = { dark: mix(pal.dark, "#f4d8e6", haze), mid: mix(pal.mid, "#f6e0ea", haze), light: mix(pal.light, "#fbeef4", haze), hi: pal.hi };
  const bark = mix(BARK, "#d8c0d4", haze);
  limb(g, x, base, x + (r() - 0.5) * s * 0.5, base - s * 3.2, s * 0.45, s * 0.25, (r() - 0.5) * s * 0.6, bark, mix("#f6c0b0", "#ffffff", haze), 1);
  const tops: Array<[number, number]> = [];
  for (let i = 0; i < 4; i++) {
    const a = -Math.PI / 2 + (i - 1.5) * 0.45 + (r() - 0.5) * 0.2, L = s * (2 + r());
    const x0 = x, y0 = base - s * 3;
    tops.push([x0 + Math.cos(a) * L, y0 + Math.sin(a) * L]);
    limb(g, x0, y0, x0 + Math.cos(a) * L, y0 + Math.sin(a) * L, s * 0.22, s * 0.06, (r() - 0.5) * s * 0.5, bark);
  }
  for (const [i, [tx, ty]] of tops.entries()) foliageMass(g, tx, ty, s * (1.4 + r() * 0.5), s * (1 + r() * 0.4), p, seed * 11 + i, 0.6, -0.7, 120, 0.7, "#ffffff");
  foliageMass(g, x, base - s * 5.4, s * 2, s * 1.3, p, seed * 5, 0.6, -0.7, 140, 0.7, "#ffffff");
}

function tulips(g: G, x0: number, x1: number, y0: number, y1: number, seed: number) {
  const r = rng(seed), cols = ["#f7a8c4", "#f58f7c", "#ffd27a", "#fff4ee", "#b9a7e8", "#f26f8e"];
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < 180; i++) pts.push([lerp(x0, x1, r()), lerp(y0, y1, r())]);
  pts.sort((a, b) => a[1] - b[1]);
  for (const [x, y] of pts) {
    const s = 0.5 + (y - HZ) / 900;
    const col = cols[Math.floor(r() * cols.length)];
    g.strokeStyle = "#5f9a6a"; g.lineWidth = 3 * s; g.lineCap = "round";
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 4 * s, y - 25 * s, x, y - 50 * s); g.stroke();
    g.fillStyle = "#7cbf80"; g.beginPath(); g.ellipse(x - 8 * s, y - 18 * s, 5 * s, 16 * s, -0.4, 0, Math.PI * 2); g.fill();
    g.fillStyle = col;
    g.beginPath(); g.moveTo(x - 11 * s, y - 62 * s); g.lineTo(x - 5 * s, y - 72 * s); g.lineTo(x, y - 64 * s); g.lineTo(x + 5 * s, y - 72 * s); g.lineTo(x + 11 * s, y - 62 * s);
    g.quadraticCurveTo(x + 12 * s, y - 46 * s, x, y - 46 * s); g.quadraticCurveTo(x - 12 * s, y - 46 * s, x - 11 * s, y - 62 * s); g.fill();
    g.fillStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.ellipse(x - 4 * s, y - 58 * s, 3 * s, 7 * s, 0, 0, Math.PI * 2); g.fill();
  }
}

const sky = once(() => worldLayer((g) => {
  fillSky(g, [[0, "#86c2f0"], [0.35, "#a9d4f5"], [0.7, "#d6eaf8"], [0.9, "#fbe6ea"], [1, "#ffe6da"]], Y0, HZ);
  g.save(); g.globalCompositeOperation = "screen";
  g.fillStyle = radGrad(g, SUNP.x, SUNP.y, 0, 900, [[0, "rgba(255,250,225,0.95)"], [0.2, "rgba(255,240,210,0.5)"], [1, "rgba(255,240,210,0)"]]);
  g.fillRect(X0, Y0, X1 - X0, 1400); g.restore();
  puffCloud(g, 240, 380, 520, 180, 3, "#d4d6f2", "#f6f4fb", "#ffffff", 0.4, -0.8);
  puffCloud(g, 820, 700, 420, 140, 4, "#d8d4ef", "#f8f2f8", "#ffffff", 0.4, -0.8);
}, 0.5));

const drifting = once(() => [sprite(600, 260, (g) => puffCloud(g, 300, 200, 480, 150, 13, "#d6d8f2", "#f7f5fb", "#ffffff", 0.4, -0.8))]);

const scene = once(() => worldLayer((g) => {
  blurred(g, 3, (g) => {
    ridge(g, HZ - 20, 110, 0.004, 21, "#c3dfd8", 0.2);
    ridge(g, HZ + 5, 60, 0.008, 22, "#b3dcc0", 0.3);
    const r = rng(23);
    for (let x = X0; x < X1; x += 40 + r() * 50) {
      g.fillStyle = r() > 0.5 ? "#f6cfe0" : "#e9eef0"; g.beginPath(); g.ellipse(x, HZ - 30, 30 + r() * 30, 26 + r() * 30, 0, 0, Math.PI * 2); g.fill();
    }
  }, 1, [HZ - 260, HZ + 40]);
  // lawn
  g.fillStyle = linGrad(g, 0, HZ, 0, Y1, [[0, "#cdeac0"], [0.15, "#ade0a6"], [0.5, "#8fd09a"], [1, "#6fb48a"]]);
  g.fillRect(X0, HZ, X1 - X0, Y1 - HZ);
  grassStrokes(g, HZ + 6, Y1, 4200, 31, ["#7fc28e", "#a9dc9e", "#6aa880", "#c6ecb0"], 30);
  // path: soft curve from back-left to the front
  soft(g, 2, X0, HZ, X1, Y1, (g) => {
    g.beginPath();
    for (let i = 0; i <= 30; i++) { const t = i / 30, y = lerp(HZ + 6, Y1, t ** 1.6), cx = lerp(420, 540, t) + Math.sin(t * 3) * 60 * t, w = lerp(30, 1100, t ** 1.4); i ? g.lineTo(cx - w / 2, y) : g.moveTo(cx - w / 2, y); }
    for (let i = 30; i >= 0; i--) { const t = i / 30, y = lerp(HZ + 6, Y1, t ** 1.6), cx = lerp(420, 540, t) + Math.sin(t * 3) * 60 * t, w = lerp(30, 1100, t ** 1.4); g.lineTo(cx + w / 2, y); }
    g.closePath(); g.fillStyle = linGrad(g, 0, HZ, 0, Y1, [[0, "#fbe8de"], [0.5, "#f3d8cc"], [1, "#e6c4bc"]]); g.fill();
  }, 0.5);
  // dappled shade from the canopies
  g.save(); g.globalCompositeOperation = "multiply";
  soft(g, 10, X0, HZ, X1, Y1, (g) => {
    const r = rng(41);
    for (let i = 0; i < 26; i++) {
      const y = lerp(HZ + 80, Y1, r()), x = r() < 0.5 ? X0 + r() * 500 : 640 + r() * 640, s = 0.4 + (y - HZ) / 900;
      g.fillStyle = "rgba(215,200,235,0.3)";
      for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(x + (r() - 0.5) * 160 * s, y + (r() - 0.5) * 20 * s, (40 + r() * 60) * s, (10 + r() * 10) * s, 0, 0, Math.PI * 2); g.fill(); }
    }
  });
  g.restore();
  // mid cherry trees
  for (const [x, s, h] of [[60, 34, 0.5], [300, 26, 0.6], [820, 28, 0.6], [1050, 38, 0.45], [580, 18, 0.7]] as const) cherryTree(g, x, HZ + 30 + s, s, x | 0, CHERRY2, h);
  // petals on the ground
  const pr = rng(51);
  for (let i = 0; i < 900; i++) {
    const y = lerp(HZ + 10, Y1, pr() ** 1.3), x = X0 + pr() * 1480, s = 1 + (y - HZ) / 140;
    g.fillStyle = pr() > 0.3 ? "rgba(250,190,215,0.9)" : "rgba(255,240,246,0.9)";
    g.beginPath(); g.ellipse(x, y, s * 1.4, s * 0.8, pr() * 3, 0, Math.PI * 2); g.fill();
  }
  // flower beds left and right
  tulips(g, X0, 170, 1380, 1650, 61);
  tulips(g, 910, X1, 1360, 1640, 62);
  tulips(g, X0, 120, 1700, 2100, 63);
  tulips(g, 960, X1, 1700, 2100, 64);
  // daisies scattered in the lawn
  const dr = rng(71);
  for (let i = 0; i < 260; i++) {
    const y = lerp(HZ + 30, Y1, dr() ** 1.2), x = X0 + dr() * 1480, s = 0.6 + (y - HZ) / 400;
    g.fillStyle = "#ffffff"; for (let k = 0; k < 5; k++) { const a = k * 1.256; circle(g, x + Math.cos(a) * 3 * s, y + Math.sin(a) * 1.8 * s, 2.2 * s); g.fill(); }
    g.fillStyle = "#ffd27a"; circle(g, x, y, 1.5 * s); g.fill();
  }
  grain(g, 0.06, 0.04, 91);
}));

const bigTrees = once(() => {
  const mk = (side: -1 | 1, seed: number) => {
    const X = (x: number) => (side < 0 ? x : 1080 - x);
    return {
      px: X(20), py: Y1 + 40,
      s: worldSprite(side < 0 ? X0 : 360, Y0, side < 0 ? 720 : X1, Y1 + 40, (g) => {
        const r = rng(seed);
        trunk(g, X(20), Y1 + 40, X(36), 420, 160, 80, side * 25, "#43283a", BARK, "#d9a0a4", side < 0 ? 1 : -1, seed);
        const masses: Array<[number, number, number, number]> = [[-80, -40, 340, 250], [230, -180, 300, 190], [420, -60, 220, 140], [300, 180, 240, 150], [40, 300, 260, 170], [-150, 560, 200, 170]];
        for (const [cx, cy] of masses) limb(g, X(35), Math.min(900, cy + 380), X(cx * 0.85), cy + 20, 42, 14, side * (r() - 0.3) * 60, BARK);
        for (const [i, [cx, cy, rx, ry]] of masses.entries()) foliageMass(g, X(cx), cy, rx, ry, i % 2 ? CHERRY : CHERRY2, seed * 17 + i, side * 0.5, -0.8, 220, 0.7, "#ffffff");
      }),
    };
  };
  return [mk(-1, 3), mk(1, 5)];
});

const petalS = once(() => ["#f9b8d0", "#fbd2e2", "#f49ab8", "#fff0f5"].map((c) => sprite(40, 40, (g) => {
  g.translate(20, 20); petalPath(g, 14); g.fillStyle = c; g.fill();
  g.fillStyle = "rgba(255,255,255,0.4)"; g.beginPath(); g.ellipse(-2, -4, 3, 7, 0.2, 0, Math.PI * 2); g.fill();
})));
const sunS = once(() => glowSprite("#fff6dc", 256, 0.3));
const petals = particles(70, 77);

function petal(g: G, p: (typeof petals)[number], t: number, size: number) {
  const y = wrap(p.y + t * (60 + p.z * 70), Y0 - 40, Y1 + 40);
  const x = wrap(p.x + t * (30 + 40 * p.z) + Math.sin(t * p.f * 1.4 + p.ph) * 50, X0 - 40, X1 + 40);
  g.save(); g.translate(x, y); g.rotate(p.ph + t * 2 * p.f); g.scale(1, 0.4 + 0.6 * Math.abs(Math.sin(t * 3 * p.f + p.ph)));
  const S = petalS(); g.drawImage(S[Math.floor(p.s * S.length)], -size / 2, -size / 2, size, size); g.restore();
}

function draw(g: G, t: number) {
  g.save();
  drawWorld(g, sky());
  g.drawImage(drifting()[0], wrap(-300 + t * 18, X0 - 600, X1), 60);
  drawWorld(g, scene());
  bigTrees().forEach((tr, i) => drawSway(g, tr.s, tr.px, tr.py, 0.004 * Math.sin(t * 0.9 + i * 2)));
  g.globalCompositeOperation = "screen";
  drawSprite(g, sunS(), SUNP.x, SUNP.y + 80, 1100, 0, 0.6 + 0.1 * Math.sin(t * 1.2));
  g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
  for (let i = 0; i < 30; i++) petal(g, petals[i], t, 14 + petals[i].z * 10);
  g.restore();
}

function front(g: G, t: number) {
  g.save();
  for (let i = 30; i < petals.length; i++) petal(g, petals[i], t, 18 + petals[i].z * 22);
  g.restore();
}

export const flowers: Background = {
  draw, front, groundY: 1600,
  light: { key: "#fff0dc", keyDir: 1, ambient: "#b8b0dc", rim: "#ffe4ec", strength: 0.3 },
  anchors: { sun: { x: SUNP.x, y: SUNP.y } },
};
