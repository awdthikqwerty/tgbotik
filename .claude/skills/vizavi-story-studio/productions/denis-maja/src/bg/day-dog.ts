// Memory: bright summer afternoon park — lush sunlit trees, open lawn, flowers, cumulus clouds, butterflies.
import type { Background } from "../lib/types";
import { type G, rng, mix, lerp, circle } from "../lib/util";
import {
  X0, X1, Y0, Y1, once, worldLayer, drawWorld, blurred, fillSky, ridge, puffCloud, foliageMass, limb, glowSprite,
  drawSprite, wrap, grain, linGrad, radGrad, sprite, worldSprite, drawSway, grassStrokes, trunk, type FolPal,
} from "./day-kit";

const HZ = 1190;
const SUNP = { x: 140, y: -120 };
const GREEN: FolPal = { dark: "#3d7a62", mid: "#68ac6c", light: "#a6d878", hi: "#eef8a8" };
const GREEN2: FolPal = { dark: "#356e66", mid: "#5aa074", light: "#94cf80", hi: "#e2f6b0" };
const BARK = "#5e4a52";

function tree(g: G, x: number, base: number, s: number, seed: number, pal: FolPal, haze = 0) {
  const r = rng(seed), H = "#bfe0e8";
  const p: FolPal = { dark: mix(pal.dark, H, haze), mid: mix(pal.mid, H, haze), light: mix(pal.light, H, haze * 0.8), hi: pal.hi };
  const bark = mix(BARK, H, haze);
  limb(g, x, base, x, base - s * 3, s * 0.42, s * 0.26, (r() - 0.5) * s * 0.4, bark, mix("#e8c8a0", H, haze), -1);
  // clump count scales with size: tiny distant trees need few dabs (keeps the one-time cache build fast)
  const n = Math.round(Math.max(18, Math.min(130, s * 3)));
  for (let i = 0; i < 4; i++) {
    const cx = x + (r() - 0.5) * s * 3, cy = base - s * (4 + r() * 2.2);
    foliageMass(g, cx, cy, s * (1.5 + r() * 0.6), s * (1.2 + r() * 0.5), p, seed * 13 + i, -0.7, -0.7, n, 0.9, "#fff8c0");
  }
  foliageMass(g, x, base - s * 6.2, s * 1.8, s * 1.3, p, seed * 7, -0.7, -0.7, n, 0.9, "#fff8c0");
}

const sky = once(() => worldLayer((g) => {
  fillSky(g, [[0, "#5aa8ea"], [0.35, "#7dbcef"], [0.7, "#a9d4f5"], [1, "#e4f3f6"]], Y0, HZ);
  g.save(); g.globalCompositeOperation = "screen";
  g.fillStyle = radGrad(g, SUNP.x, SUNP.y, 0, 1100, [[0, "rgba(255,252,230,1)"], [0.15, "rgba(255,246,210,0.6)"], [1, "rgba(255,246,210,0)"]]);
  g.fillRect(X0, Y0, X1 - X0, 1600); g.restore();
  puffCloud(g, 820, 420, 600, 230, 31, "#b9c8ec", "#f4f7fd", "#fffdf4", -0.5, -0.8);
  puffCloud(g, 200, 760, 460, 170, 32, "#c0cdee", "#f6f8fd", "#fffdf4", -0.5, -0.8);
  puffCloud(g, 980, 960, 380, 120, 33, "#c6d2ee", "#f6f8fd", "#ffffff", -0.5, -0.8);
}, 0.5));

const drifting = once(() => [
  sprite(620, 280, (g) => puffCloud(g, 310, 230, 520, 180, 41, "#bccaec", "#f5f8fd", "#fffdf4", -0.5, -0.8)),
  sprite(480, 200, (g) => puffCloud(g, 240, 170, 380, 120, 42, "#c3cfee", "#f6f8fd", "#ffffff", -0.5, -0.8)),
]);

const scene = once(() => worldLayer((g) => {
  blurred(g, 3, (g) => {
    ridge(g, HZ - 30, 120, 0.0035, 51, "#a8cfe0", 0.2);
    ridge(g, HZ, 70, 0.007, 52, "#9fd0c0", 0.3);
  });
  // dense, layered tree line: far hazy row, then a nearer row with gaps around the centre
  blurred(g, 2, (g) => { const r = rng(55); for (let x = X0 - 40; x < X1 + 40; x += 40 + r() * 50) tree(g, x, HZ + 4, 9 + r() * 7, Math.floor(r() * 1e4), GREEN2, 0.6); });
  blurred(g, 0.8, (g) => {
    const r = rng(56);
    for (let x = X0 - 40; x < X1 + 40; x += 70 + r() * 80) { if (x > 380 && x < 700 && r() > 0.3) continue; tree(g, x, HZ + 14, 15 + r() * 9, Math.floor(r() * 1e4), r() > 0.5 ? GREEN : GREEN2, 0.3); }
    // low hedges/bushes along the lawn edge
    for (let x = X0; x < X1; x += 90 + r() * 60) foliageMass(g, x, HZ + 16, 60 + r() * 50, 26 + r() * 14, GREEN, Math.floor(r() * 1e4), -0.7, -0.8, 50, 0.9, "#fffac0");
  });
  // lawn with soft mowing stripes
  g.fillStyle = linGrad(g, 0, HZ, 0, Y1, [[0, "#c4e6a0"], [0.2, "#9fd58a"], [0.6, "#7fc47e"], [1, "#5fa874"]]);
  g.fillRect(X0, HZ + 18, X1 - X0, Y1 - HZ);
  g.save(); g.globalCompositeOperation = "soft-light";
  for (let i = -8; i <= 8; i++) {
    g.fillStyle = i % 2 ? "rgba(255,255,220,0.12)" : "rgba(40,90,70,0.07)";
    const xa = 540 + i * 40, xb = 540 + i * 40 * 22, xc = 540 + (i + 1) * 40 * 22, xd = 540 + (i + 1) * 40;
    g.beginPath(); g.moveTo(xa, HZ); g.lineTo(xb, Y1 + 1200); g.lineTo(xc, Y1 + 1200); g.lineTo(xd, HZ); g.closePath(); g.fill();
  }
  g.restore();
  grassStrokes(g, HZ + 20, Y1, 5200, 61, ["#7cbc80", "#a2d88e", "#6aa87a", "#c4eaa0"], 30);
  // dappled tree shadows on the lawn
  g.save(); g.globalCompositeOperation = "multiply"; g.filter = "blur(8px)";
  const r = rng(62);
  for (let i = 0; i < 30; i++) {
    const y = lerp(HZ + 60, Y1, r() ** 0.8), x = r() < 0.5 ? X0 + r() * 420 : 700 + r() * 580, s = 0.5 + (y - HZ) / 700;
    g.fillStyle = "rgba(120,170,160,0.45)"; g.beginPath(); g.ellipse(x, y, 140 * s, 30 * s, 0, 0, Math.PI * 2); g.fill();
  }
  g.restore();
  // flower clusters at the edges + scattered blossoms
  const fr = rng(71), cols = ["#ffd27a", "#f7a8c4", "#ffffff", "#b9a7e8", "#f58f7c"];
  for (const [bx, by, bw] of [[-60, 1420, 220], [1120, 1400, 220], [-100, 1860, 300], [1160, 1880, 300]] as const) {
    foliageMass(g, bx, by, bw, bw * 0.45, GREEN, bx + by, -0.6, -0.8, 140, 0.6, "#fff8c0");
    for (let i = 0; i < 70; i++) {
      const a = fr() * Math.PI * 2, d = Math.sqrt(fr());
      g.fillStyle = cols[Math.floor(fr() * cols.length)];
      circle(g, bx + Math.cos(a) * bw * d * 0.9, by + Math.sin(a) * bw * 0.4 * d - 10, 4 + fr() * 6); g.fill();
    }
  }
  for (let i = 0; i < 380; i++) {
    const y = lerp(HZ + 20, Y1, fr() ** 1.2), x = X0 + fr() * 1480, s = 0.5 + (y - HZ) / 450;
    g.fillStyle = cols[Math.floor(fr() * cols.length)]; circle(g, x, y, 2.4 * s); g.fill();
  }
  grain(g, 0.06, 0.04, 77);
}));

const bigTrees = once(() => {
  const mk = (side: -1 | 1, seed: number) => {
    const X = (x: number) => (side < 0 ? x : 1080 - x);
    return {
      px: X(20), py: Y1 + 40,
      s: worldSprite(side < 0 ? X0 : 380, Y0, side < 0 ? 700 : X1, Y1 + 40, (g) => {
        const r = rng(seed);
        trunk(g, X(20), Y1 + 40, X(36), 400, 160, 80, side * 25, "#3a2e3c", BARK, "#e6c49a", -1, seed);
        const masses: Array<[number, number, number, number]> = [[-80, -50, 340, 260], [220, -190, 300, 200], [420, -80, 220, 140], [290, 170, 230, 150], [40, 290, 260, 170], [-150, 540, 200, 170]];
        for (const [cx, cy] of masses) limb(g, X(35), Math.min(900, cy + 380), X(cx * 0.85), cy + 20, 42, 14, side * (r() - 0.3) * 60, BARK);
        for (const [i, [cx, cy, rx, ry]] of masses.entries()) foliageMass(g, X(cx), cy, rx, ry, i % 2 ? GREEN : GREEN2, seed * 17 + i, -0.7, -0.7, 220, 0.7, "#fffac0");
      }),
    };
  };
  return [mk(-1, 11), mk(1, 12)];
});

const sunS = once(() => glowSprite("#fffbe0", 256, 0.3));
const moteS = once(() => glowSprite("#fff6c8", 48, 0.4));
const flies = Array.from({ length: 4 }, (_, i) => { const r = rng(900 + i); return { x: r() * 1300 - 100, y: 300 + r() * 1300, ph: r() * 6, c: ["#f7a8c4", "#ffd27a", "#b9a7e8", "#a9d4f5"][i] }; });

function draw(g: G, t: number) {
  g.save();
  drawWorld(g, sky());
  const [c1, c2] = drifting();
  g.drawImage(c1, wrap(-500 + t * 20, X0 - 620, X1), 40);
  g.drawImage(c2, wrap(800 - t * 14, X0 - 480, X1), 560);
  drawWorld(g, scene());
  bigTrees().forEach((tr, i) => drawSway(g, tr.s, tr.px, tr.py, 0.004 * Math.sin(t * 1.1 + i * 2)));
  g.globalCompositeOperation = "screen";
  drawSprite(g, sunS(), SUNP.x + 60, SUNP.y + 160, 1300, 0, 0.65 + 0.08 * Math.sin(t * 1.5));
  // pollen motes in the sunlight
  for (let i = 0; i < 26; i++) {
    const r = rng(1200 + i);
    const x = wrap(r() * 1480 + t * 14, X0, X1), y = wrap(r() * 1700 - t * 10 + Math.sin(t + i) * 20, Y0, 1500);
    drawSprite(g, moteS(), x, y, 10 + r() * 14, 0, 0.4 + 0.4 * Math.sin(t * 2 + i));
  }
  g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
  g.restore();
}

function front(g: G, t: number) {
  // two or three butterflies fluttering at the edges
  g.save();
  for (const [i, b] of flies.entries()) {
    const x = b.x + Math.sin(t * 0.6 + b.ph) * 160 + t * 18, y = b.y + Math.sin(t * 1.3 + b.ph) * 60;
    const xx = wrap(x, X0, X1);
    if (xx > 230 && xx < 850 && y > 450 && y < 1000) continue; // keep faces clear
    const flap = Math.abs(Math.sin(t * 14 + i));
    g.save(); g.translate(xx, y); g.rotate(Math.sin(t * 2 + i) * 0.3);
    g.fillStyle = b.c;
    for (const s of [-1, 1]) { g.save(); g.scale(s * (0.25 + 0.75 * flap), 1); g.beginPath(); g.ellipse(9, -6, 10, 8, -0.4, 0, Math.PI * 2); g.ellipse(7, 7, 7, 6, 0.4, 0, Math.PI * 2); g.fill(); g.restore(); }
    g.fillStyle = "#5e4a52"; g.fillRect(-1.5, -9, 3, 18);
    g.restore();
  }
  g.restore();
}

export const dog: Background = {
  draw, front, groundY: 1620,
  light: { key: "#fff4d6", keyDir: -1, ambient: "#8fb8c8", rim: "#fff8d0", strength: 0.25 },
  anchors: { sun: { x: SUNP.x, y: SUNP.y } },
};
