// Memory: beach at sunset — big soft sun, rolling foam, shimmering sun path, wet-sand reflections, gulls.
import type { Background } from "../lib/types";
import { type G, rng, rgba, mix, lerp, clamp, circle, noise1 } from "../lib/util";
import {
  X0, X1, Y0, Y1, once, worldLayer, drawWorld, blurred, fillSky, sun, ridge, streakCloud, glowSprite, drawSprite,
  grain, linGrad, radGrad, sprite, wrap,
} from "./day-kit";

const HZ = 1120, SHORE = 1455;      // horizon, mean waterline
const SUN = { x: 650, y: 1035, r: 112 };

const sky = once(() => worldLayer((g) => {
  fillSky(g, [[0, "#7f7bd0"], [0.2, "#a993d8"], [0.42, "#e7a2cc"], [0.6, "#f8a8b0"], [0.76, "#fbb08c"], [0.9, "#ffc888"], [1, "#ffdca0"]], Y0, HZ);
  sun(g, SUN.x, SUN.y, SUN.r, "#fff1c2", "#ffc28a", 9);
  streakCloud(g, 260, -120, 900, 130, 41, "#9a8ad6", "#f5a8c8", 0.75);
  streakCloud(g, 900, 180, 760, 100, 42, "#b796d6", "#ffb6b6", 0.7);
  streakCloud(g, 120, 480, 640, 70, 43, "#e09cc6", "#ffc8a0", 0.65);
  streakCloud(g, 860, 760, 600, 50, 44, "#f4a6b0", "#ffd8a4", 0.6);
  streakCloud(g, 300, 930, 520, 30, 45, "#f8b0a0", "#ffe6b8", 0.5);
}, 0.5));

const clouds = once(() => [
  sprite(900, 220, (g) => streakCloud(g, 450, 110, 760, 90, 51, "#c39ad8", "#ffc0b0", 0.55)),
  sprite(700, 160, (g) => streakCloud(g, 350, 80, 600, 50, 52, "#f2a8b8", "#ffdcaa", 0.5)),
]);

const water = once(() => worldLayer((g) => {
  // distant headland on the left horizon
  blurred(g, 2, (g) => {
    g.fillStyle = "#b98cc0";
    g.beginPath(); g.moveTo(X0, HZ + 2); g.lineTo(X0, HZ - 120);
    for (let x = X0; x < 260; x += 10) g.lineTo(x, HZ - 120 + (x - X0) * 0.22 + 12 * noise1(x * 0.02, 4) + Math.max(0, x - 120) * 0.5);
    g.lineTo(300, HZ + 2); g.closePath(); g.fill();
    g.fillStyle = "#c79cc8"; g.beginPath(); g.ellipse(960, HZ, 70, 14, 0, Math.PI, 0); g.fill();
  });
  // water body
  g.fillStyle = linGrad(g, 0, HZ, 0, SHORE + 40, [[0, "#f8c0b0"], [0.12, "#e9a6c0"], [0.45, "#ad94d2"], [1, "#8c8fd0"]]);
  g.fillRect(X0, HZ, X1 - X0, SHORE + 40 - HZ);
  // horizon glow on water
  g.save(); g.globalCompositeOperation = "screen";
  g.translate(SUN.x, HZ); g.scale(3, 0.35);
  g.fillStyle = radGrad(g, 0, 0, 0, 400, [[0, "rgba(255,225,170,0.9)"], [0.5, "rgba(255,190,160,0.25)"], [1, "rgba(255,190,160,0)"]]);
  g.fillRect(-400, -400, 800, 800); g.restore();
  // broad reflection column
  g.save(); g.globalCompositeOperation = "screen"; g.filter = "blur(18px)";
  g.fillStyle = linGrad(g, 0, HZ, 0, SHORE, [[0, "rgba(255,226,170,0.75)"], [1, "rgba(255,200,170,0.15)"]]);
  g.beginPath(); g.moveTo(SUN.x - 90, HZ); g.lineTo(SUN.x + 90, HZ); g.lineTo(SUN.x + 260, SHORE); g.lineTo(SUN.x - 260, SHORE); g.closePath(); g.fill();
  g.restore();
  // static long swell bands
  const r = rng(61);
  for (let y = HZ + 6; y < SHORE; y += 4 + (y - HZ) * 0.06) {
    const d = (y - HZ) / (SHORE - HZ);
    g.strokeStyle = r() > 0.5 ? `rgba(255,220,230,${0.12 + d * 0.1})` : `rgba(90,80,170,${0.08 + d * 0.12})`;
    g.lineWidth = 1 + d * 3;
    g.beginPath();
    for (let x = X0; x <= X1; x += 20) g.lineTo(x, y + Math.sin(x * 0.01 * (1.5 - d) + y) * (1 + d * 4));
    g.stroke();
  }
}));

const sand = once(() => worldLayer((g) => {
  // wet sand mirrors the sky
  g.fillStyle = linGrad(g, 0, SHORE - 20, 0, 1640, [[0, "#d6a0c4"], [0.4, "#e9b0b4"], [1, "#efc0a4"]]);
  g.fillRect(X0, SHORE - 30, X1 - X0, Y1 - SHORE + 30);
  g.save(); g.globalCompositeOperation = "screen"; g.filter = "blur(16px)";
  g.fillStyle = "rgba(255,214,170,0.55)";
  g.beginPath(); g.moveTo(SUN.x - 120, SHORE); g.lineTo(SUN.x + 120, SHORE); g.lineTo(SUN.x + 200, 1620); g.lineTo(SUN.x - 200, 1620); g.closePath(); g.fill();
  g.restore();
  // dry sand: wavy boundary
  g.beginPath(); g.moveTo(X0, Y1);
  for (let x = X0; x <= X1; x += 10) g.lineTo(x, 1585 + 22 * noise1(x * 0.006, 7) + 6 * noise1(x * 0.03, 8));
  g.lineTo(X1, Y1); g.closePath();
  g.fillStyle = linGrad(g, 0, 1560, 0, Y1, [[0, "#f6c9a6"], [0.3, "#f2bc98"], [1, "#d99a86"]]);
  g.fill();
  // ripple marks + specks
  const r = rng(71);
  g.save(); g.lineCap = "round";
  for (let i = 0; i < 260; i++) {
    const y = lerp(1600, Y1, r() ** 0.9), x = X0 + r() * 1480, d = (y - 1600) / 640;
    g.strokeStyle = r() > 0.5 ? "rgba(255,230,205,0.45)" : "rgba(180,110,120,0.22)";
    g.lineWidth = 1.5 + d * 3;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 40 + d * 60, y - 6, x + 90 + d * 140, y + 2); g.stroke();
  }
  for (let i = 0; i < 1600; i++) {
    const y = lerp(1590, Y1, r()), x = X0 + r() * 1480;
    g.fillStyle = r() > 0.5 ? "rgba(255,240,220,0.5)" : "rgba(150,90,110,0.25)";
    g.fillRect(x, y, 1.5 + r() * 2, 1.5 + r() * 2);
  }
  g.restore();
  // shells and a starfish in the corners (away from feet)
  for (const [x, y, s, c] of [[90, 1880, 1, "#fff0e6"], [980, 1760, 0.8, "#ffd6d0"], [150, 2060, 1.3, "#ffe8d8"]] as const) {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.fillStyle = "rgba(150,90,110,0.25)"; g.beginPath(); g.ellipse(4, 10, 26, 8, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = c; g.beginPath(); g.moveTo(-22, 6); g.quadraticCurveTo(0, -36, 22, 6); g.quadraticCurveTo(0, 12, -22, 6); g.fill();
    g.strokeStyle = "rgba(200,130,140,0.6)"; g.lineWidth = 2;
    for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(0, 8); g.lineTo(k * 8, -18 + Math.abs(k) * 5); g.stroke(); }
    g.restore();
  }
  g.save(); g.translate(1000, 2020); g.rotate(0.3); g.fillStyle = "#f58f7c";
  g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? 14 : 38; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill();
  g.restore();
  grain(g, 0.07, 0.04, 81);
}));

/** Dune grass tufts in the bottom corners (sway). */
const dune = once(() => {
  const mk = (seed: number) => sprite(420, 420, (g) => {
    const r = rng(seed);
    g.lineCap = "round";
    for (let i = 0; i < 46; i++) {
      const x = 210 + (r() - 0.5) * 160, l = 160 + r() * 220, lean = (r() - 0.5) * 220;
      g.strokeStyle = ["#c58a6a", "#e0aa7a", "#a8705e", "#f2c48e"][Math.floor(r() * 4)];
      g.lineWidth = 3 + r() * 4;
      g.beginPath(); g.moveTo(x, 420); g.quadraticCurveTo(x + lean * 0.2, 420 - l * 0.6, x + lean, 420 - l); g.stroke();
    }
  });
  return [mk(91), mk(92)];
});

const glowS = once(() => glowSprite("#fff0c8", 64, 0.4));
const gulls = Array.from({ length: 5 }, (_, i) => { const r = rng(300 + i); return { x: r() * 1400 - 300, y: 220 + r() * 520, s: 0.6 + r() * 0.7, v: 25 + r() * 30, ph: r() * 6 }; });

function wavesAt(t: number) {
  // shore wave cycle: rush up the sand, then draw back
  const cyc = (t * 0.22) % 1;
  const reach = cyc < 0.55 ? Math.sin((cyc / 0.55) * Math.PI / 2) : 1 - ((cyc - 0.55) / 0.45) ** 1.2;
  return { reach, cyc };
}

function draw(g: G, t: number) {
  g.save();
  drawWorld(g, sky());
  const [c1, c2] = clouds();
  g.drawImage(c1, wrap(-400 + t * 14, X0 - 900, X1), 60);
  g.drawImage(c2, wrap(1000 - t * 10, X0 - 700, X1), 640);
  // gulls
  g.strokeStyle = "rgba(90,60,110,0.75)"; g.lineCap = "round"; g.lineJoin = "round";
  for (const b of gulls) {
    const x = wrap(b.x + t * b.v, X0 - 60, X1 + 60), y = b.y + Math.sin(t * 0.8 + b.ph) * 10, f = Math.sin(t * 7 + b.ph);
    const w = 22 * b.s; g.lineWidth = 2.5 * b.s;
    g.beginPath(); g.moveTo(x - w, y - f * 8 * b.s); g.quadraticCurveTo(x - w * 0.4, y - 6 * b.s, x, y); g.quadraticCurveTo(x + w * 0.4, y - 6 * b.s, x + w, y - f * 8 * b.s); g.stroke();
  }
  drawWorld(g, water());
  // moving wave crests on open water
  for (let i = 0; i < 46; i++) {
    const r = rng(500 + i);
    const d = r(), y = HZ + 8 + d * d * (SHORE - HZ - 20);
    const x = wrap(r() * 1480 + t * (8 + d * 30) * (r() > 0.5 ? 1 : -1), X0, X1);
    const len = 30 + d * 160;
    const a = 0.25 + 0.35 * Math.max(0, Math.sin(t * 1.5 + r() * 6));
    g.strokeStyle = `rgba(255,236,236,${a})`; g.lineWidth = 1 + d * 3;
    g.beginPath(); g.moveTo(x - len / 2, y); g.quadraticCurveTo(x, y - 2 - d * 4, x + len / 2, y); g.stroke();
  }
  // shimmering sun path
  g.globalCompositeOperation = "screen";
  for (let i = 0; i < 90; i++) {
    const r = rng(900 + i);
    const d = r(), y = HZ + 6 + d ** 1.4 * (SHORE - HZ - 10);
    const spread = 40 + d * 230;
    const x = SUN.x + (r() - 0.5) * 2 * spread * (0.4 + 0.6 * r());
    const a = Math.max(0, Math.sin(t * (2 + r() * 3) + r() * 6.3));
    if (a < 0.1) continue;
    const len = 10 + d * 60 * r();
    g.fillStyle = `rgba(255,238,200,${a * 0.85})`;
    g.fillRect(x - len / 2, y, len, 1.5 + d * 3);
  }
  g.globalCompositeOperation = "source-over";
  drawWorld(g, sand());
  // shore wave: sheet of water rushing up the sand, foam lace at its edge
  const { reach } = wavesAt(t);
  const front = SHORE + 10 + reach * 95;
  const edge = (x: number, k: number) => front + k + 14 * noise1(x * 0.008 + t * 0.3, 3) + 6 * noise1(x * 0.03, 5);
  g.beginPath(); g.moveTo(X0, SHORE - 40);
  for (let x = X0; x <= X1; x += 12) g.lineTo(x, edge(x, 0));
  g.lineTo(X1, SHORE - 40); g.closePath();
  g.fillStyle = linGrad(g, 0, SHORE - 40, 0, front + 20, [[0, "rgba(160,150,215,0.85)"], [0.6, "rgba(220,180,215,0.55)"], [1, "rgba(255,230,230,0.35)"]]);
  g.fill();
  g.lineCap = "round";
  for (const [k, w, a] of [[0, 7, 0.9], [-14, 3, 0.55], [-32, 2, 0.35]] as const) {
    g.strokeStyle = `rgba(255,248,245,${a * (0.6 + 0.4 * reach)})`; g.lineWidth = w;
    g.beginPath(); for (let x = X0; x <= X1; x += 12) g.lineTo(x, edge(x, k) + 3 * Math.sin(x * 0.05 + t * 2)); g.stroke();
  }
  // foam bubbles along the edge
  for (let i = 0; i < 70; i++) {
    const r = rng(700 + i); const x = X0 + r() * 1480;
    g.fillStyle = `rgba(255,255,255,${0.5 * r()})`; circle(g, x, edge(x, -4 - r() * 10), 1.5 + r() * 3); g.fill();
  }
  // breaker line further out
  const by = SHORE - 70 + reach * 30;
  g.strokeStyle = `rgba(255,240,245,${0.5 - 0.3 * reach})`; g.lineWidth = 5;
  g.beginPath(); for (let x = X0; x <= X1; x += 14) g.lineTo(x, by + 8 * noise1(x * 0.01 - t * 0.2, 9)); g.stroke();
  // sun glints
  g.globalCompositeOperation = "screen";
  drawSprite(g, glowS(), SUN.x, SUN.y, 760 + 30 * Math.sin(t), 0, 0.45);
  g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
  // dune grass corners
  const [d1, d2] = dune();
  for (const [s, x, y, ph] of [[d1, -150, 1700, 0], [d2, 860, 1780, 2]] as const) {
    g.save(); g.translate(x + 210, y + 420); g.rotate(0.03 * Math.sin(t * 1.4 + ph)); g.drawImage(s, -210, -420); g.restore();
  }
  g.restore();
}

export const sea: Background = {
  draw, groundY: 1600,
  light: { key: "#ffc08e", keyDir: 1, ambient: "#9a86c8", rim: "#ffd0a0", strength: 0.45 },
  anchors: { sun: { x: SUN.x, y: SUN.y }, waterline: { x: 540, y: SHORE + 60 } },
};
