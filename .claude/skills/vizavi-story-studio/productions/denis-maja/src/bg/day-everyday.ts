// Memory: golden-hour hilltop overlooking a small city — fence, path, lone tree, swaying grass, birds.
import type { Background } from "../lib/types";
import { type G, rng, mix, lerp, circle, noise1 } from "../lib/util";
import {
  X0, X1, Y0, Y1, once, worldLayer, drawWorld, blurred, fillSky, sun, ridge, streakCloud, foliageMass, limb, glowSprite,
  drawSprite, wrap, grain, linGrad, radGrad, sprite, worldSprite, drawSway, trunk, soft, type FolPal,
} from "./day-kit";

const HZ = 1170;
const SUN = { x: 760, y: 1050, r: 100 };
const CREST = 1390;          // hill crest line (city visible beyond)
const TREE: FolPal = { dark: "#5e5a5a", mid: "#9aa060", light: "#e8c06a", hi: "#ffe6a0" };

const sky = once(() => worldLayer((g) => {
  fillSky(g, [[0, "#7c7ccc"], [0.22, "#a690d6"], [0.45, "#ec9fc4"], [0.65, "#f9a088"], [0.82, "#ffad78"], [0.95, "#ffc282"], [1, "#ffd296"]], Y0, HZ);
  sun(g, SUN.x, SUN.y, SUN.r, "#fff3c6", "#ffc888", 10);
  streakCloud(g, 300, -80, 900, 120, 61, "#9a88d2", "#f6a8c4", 0.7);
  streakCloud(g, 900, 260, 700, 90, 62, "#c494d0", "#ffb6a8", 0.65);
  streakCloud(g, 200, 560, 620, 60, 63, "#ea9ebe", "#ffcc9c", 0.6);
  streakCloud(g, 950, 840, 560, 40, 64, "#f6a8a0", "#ffe0a8", 0.5);
}, 0.5));

const drifting = once(() => [sprite(820, 200, (g) => streakCloud(g, 410, 100, 700, 70, 71, "#cc98d0", "#ffc4a8", 0.5))]);

const windows: Array<[number, number, number]> = [];

const scene = once(() => worldLayer((g) => {
  // far mountains / hills
  blurred(g, 3, (g) => {
    ridge(g, HZ - 10, 160, 0.003, 81, "#d0a0c8", 0.25);
    ridge(g, HZ + 20, 90, 0.006, 82, "#c592c0", 0.3);
  }, 1, [HZ - 200, HZ + 240]);
  // city skyline in lavender haze
  const r = rng(91);
  blurred(g, 0.8, (g) => {
    for (let pass = 0; pass < 2; pass++) {
      const col = pass ? "#9a78b0" : "#b78cbc", base = HZ + 70 + pass * 50;
      for (let x = X0; x < X1;) {
        const w = 24 + r() * 50, h = (pass ? 60 : 40) + r() ** 2 * (pass ? 220 : 160);
        g.fillStyle = col; g.fillRect(x, base - h, w, h + 200);
        if (r() > 0.75) { g.fillRect(x + w * 0.4, base - h - 30, 4, 30); }
        if (r() > 0.8) { g.beginPath(); g.moveTo(x, base - h); g.lineTo(x + w / 2, base - h - 26); g.lineTo(x + w, base - h); g.fill(); }
        for (let wy = base - h + 10; wy < base; wy += 14) for (let wx = x + 5; wx < x + w - 6; wx += 11) if (r() > 0.82) windows.push([wx, wy, pass]);
        x += w + 2 + r() * 6;
      }
    }
    // church spire + tower for a recognisable Polish small-town silhouette
    g.fillStyle = "#8f6ea8";
    g.fillRect(300, HZ - 140, 46, 320); g.beginPath(); g.moveTo(292, HZ - 140); g.lineTo(323, HZ - 260); g.lineTo(354, HZ - 140); g.fill();
    g.fillRect(560, HZ - 60, 60, 200); g.beginPath(); g.ellipse(590, HZ - 60, 34, 40, 0, Math.PI, 0); g.fill();
  }, 1, [HZ - 300, CREST + 40]);
  // haze over city
  g.fillStyle = linGrad(g, 0, HZ - 100, 0, CREST, [[0, "rgba(255,200,170,0)"], [0.5, "rgba(255,196,170,0.35)"], [1, "rgba(250,180,170,0.6)"]]);
  g.fillRect(X0, HZ - 100, X1 - X0, CREST - HZ + 100);
  // hilltop meadow
  g.beginPath(); g.moveTo(X0, Y1); g.lineTo(X0, CREST + 30);
  for (let x = X0; x <= X1; x += 10) g.lineTo(x, CREST + 10 - 40 * Math.sin((x + 200) / 1480 * Math.PI) + 8 * noise1(x * 0.02, 3));
  g.lineTo(X1, Y1); g.closePath();
  g.fillStyle = linGrad(g, 0, CREST - 40, 0, Y1, [[0, "#f6c27a"], [0.12, "#dca86e"], [0.4, "#b98c66"], [1, "#8a6a6a"]]);
  g.fill();
  // grass texture
  const gr = rng(93); g.lineCap = "round";
  for (let i = 0; i < 6000; i++) {
    const y = lerp(CREST - 30, Y1, gr() ** 0.9), x = X0 + gr() * 1480, d = (y - CREST) / (Y1 - CREST);
    const l = (10 + d * 50) * (0.5 + gr());
    g.strokeStyle = ["#f2c47e", "#c8985e", "#e8b070", "#a8806a", "#ffd890"][Math.floor(gr() * 5)];
    g.lineWidth = 1 + d * 2.5;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (gr() - 0.3) * l * 0.4, y - l); g.stroke();
  }
  // rim light along the crest
  g.save(); g.globalCompositeOperation = "screen";
  soft(g, 6, X0, CREST - 60, X1, CREST + 40, (g) => {
    g.strokeStyle = "rgba(255,214,150,0.8)"; g.lineWidth = 10;
    g.beginPath(); for (let x = X0; x <= X1; x += 10) g.lineTo(x, CREST + 14 - 40 * Math.sin((x + 200) / 1480 * Math.PI) + 8 * noise1(x * 0.02, 3)); g.stroke();
  });
  g.restore();
  // dirt path sweeping across the hill
  soft(g, 2, X0, 1440, X1, 1710, (g) => {
    g.beginPath(); g.moveTo(X0, 1520); g.bezierCurveTo(300, 1470, 700, 1500, X1, 1450); g.lineTo(X1, 1560); g.bezierCurveTo(700, 1640, 300, 1610, X0, 1700); g.closePath();
    g.fillStyle = linGrad(g, 0, 1450, 0, 1700, [[0, "#f7d0a4"], [1, "#d8a888"]]); g.fill();
  });
  // wooden fence along the crest behind the path
  const fx = (x: number) => CREST - 36 * Math.sin((x + 200) / 1480 * Math.PI) - 10;
  g.strokeStyle = "#6e4c52"; g.lineCap = "round";
  for (let x = X0 + 20; x < X1; x += 150) {
    const y = fx(x);
    g.fillStyle = "#6e4c52"; g.fillRect(x - 7, y - 110, 14, 120);
    g.fillStyle = "rgba(255,200,140,0.7)"; g.fillRect(x + 3, y - 110, 4, 118);
  }
  for (const k of [-90, -45]) {
    g.lineWidth = 9; g.strokeStyle = "#7a5658";
    g.beginPath(); for (let x = X0; x <= X1; x += 20) g.lineTo(x, fx(x) + k); g.stroke();
    g.lineWidth = 2.5; g.strokeStyle = "rgba(255,206,150,0.8)";
    g.beginPath(); for (let x = X0; x <= X1; x += 20) g.lineTo(x, fx(x) + k - 3); g.stroke();
  }
  // wildflowers
  const fr = rng(95), cols = ["#f7a8c4", "#b9a7e8", "#fff4e0", "#ffd27a", "#f58f7c"];
  for (let i = 0; i < 420; i++) {
    const y = lerp(CREST, Y1, fr() ** 1.1), x = X0 + fr() * 1480, s = 0.6 + (y - CREST) / 300;
    if (y > 1470 && y < 1700 && fr() > 0.2) continue;
    g.fillStyle = cols[Math.floor(fr() * cols.length)]; circle(g, x, y, 2.2 * s); g.fill();
  }
  grain(g, 0.06, 0.045, 97);
}));

const tree = once(() => worldSprite(X0, Y0, 560, 1600, (g) => {
  const r = rng(5);
  trunk(g, 10, 1570, 40, 620, 130, 66, 30, "#3a2a3e", "#5e4450", "#f0a870", 1, 5);
  const masses: Array<[number, number, number, number]> = [[-60, 220, 320, 240], [220, 120, 280, 190], [360, 330, 170, 120], [60, 470, 250, 150], [-130, 640, 190, 150]];
  for (const [cx, cy] of masses) limb(g, 40, Math.min(1000, cy + 400), cx * 0.85, cy + 20, 40, 14, (r() - 0.4) * 60, "#5e4450", "#f0a870", 1);
  for (const [i, [cx, cy, rx, ry]] of masses.entries()) foliageMass(g, cx, cy, rx, ry, TREE, 50 + i, 0.8, 0.2, 200, 0.7, "#ffd890");
}));

const tuftS = once(() => [0, 1, 2].map((k) => sprite(300, 300, (g) => {
  const r = rng(30 + k); g.lineCap = "round";
  for (let i = 0; i < 36; i++) {
    const x = 150 + (r() - 0.5) * 140, l = 120 + r() * 160, lean = (r() - 0.4) * 140;
    g.strokeStyle = ["#e8b070", "#c8985e", "#ffd890", "#a8806a"][Math.floor(r() * 4)]; g.lineWidth = 3 + r() * 3;
    g.beginPath(); g.moveTo(x, 300); g.quadraticCurveTo(x + lean * 0.2, 300 - l * 0.6, x + lean, 300 - l); g.stroke();
  }
})));
const winS = once(() => glowSprite("#ffd890", 32, 0.45));
const sunS = once(() => glowSprite("#ffd8a0", 256, 0.3));
const birds = Array.from({ length: 6 }, (_, i) => { const r = rng(40 + i); return { x: 200 + r() * 300 + i * 40, y: 380 + r() * 160, s: 0.5 + r() * 0.4, ph: r() * 6 }; });

function draw(g: G, t: number) {
  g.save();
  drawWorld(g, sky());
  g.drawImage(drifting()[0], wrap(-200 + t * 16, X0 - 820, X1), 380);
  g.globalCompositeOperation = "screen";
  drawSprite(g, sunS(), SUN.x, SUN.y, 1000 + 40 * Math.sin(t), 0, 0.45);
  g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
  // flock of birds heading towards the sun
  g.strokeStyle = "rgba(90,60,110,0.7)"; g.lineCap = "round";
  for (const b of birds) {
    const x = b.x + t * 40, y = b.y - t * 6 + Math.sin(t + b.ph) * 6, f = Math.sin(t * 8 + b.ph), w = 16 * b.s;
    g.lineWidth = 2.2 * b.s; g.beginPath(); g.moveTo(x - w, y - f * 6 * b.s); g.quadraticCurveTo(x - w * 0.4, y - 5 * b.s, x, y); g.quadraticCurveTo(x + w * 0.4, y - 5 * b.s, x + w, y - f * 6 * b.s); g.stroke();
  }
  drawWorld(g, scene());
  // twinkling city windows
  g.globalCompositeOperation = "screen";
  windows.forEach(([x, y], i) => { const a = 0.4 + 0.6 * Math.max(0, Math.sin(t * 1.5 + i * 2.3)); drawSprite(g, winS(), x, y, 12, 0, a * 0.8); });
  g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
  drawSway(g, tree(), 10, 1570, 0.005 * Math.sin(t * 0.9));
  // swaying grass tufts in the foreground corners
  const T = tuftS();
  for (const [i, [x, y, s]] of ([[-150, 1880, 1.1], [-20, 2020, 1.3], [930, 1860, 1.1], [1060, 2010, 1.4], [120, 2150, 1.2], [820, 2140, 1.2]] as const).entries()) {
    g.save(); g.translate(x, y); g.rotate(0.05 * Math.sin(t * 1.6 + i)); g.scale(s, s); g.drawImage(T[i % 3], -150, -300); g.restore();
  }
  g.restore();
}

export const everyday: Background = {
  draw, groundY: 1600,
  light: { key: "#ffc88e", keyDir: 1, ambient: "#a088c0", rim: "#ffd8a0", strength: 0.45 },
  anchors: { sun: { x: SUN.x, y: SUN.y }, crest: { x: 540, y: CREST }, fence: { x: 540, y: CREST - 60 } },
};
