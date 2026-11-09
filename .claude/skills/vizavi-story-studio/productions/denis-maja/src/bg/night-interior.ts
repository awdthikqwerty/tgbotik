// Memory-montage interiors: "film" (sofa movie night at dusk) and "dance" (fairy-lit room with a record player).
import type { Background } from "../lib/types";
import { G, rgba, rng, vGrad, clamp } from "../lib/util";
import {
  X0, X1, Y0, Y1, OW, OH, once, bake, blit, grain, wash, radial, bakeStars, skyline, fairyPath, drawWire, drawBulbs, spot, hash,
  vignette, houseplant, kitLeaf,
} from "./night-kit";

function floorBoards(g: G, y0: number, top: string, bottom: string, vx = 540) {
  g.fillStyle = vGrad(g, y0, Y1, [[0, top], [1, bottom]]); g.fillRect(X0, y0, OW, Y1 - y0);
  g.save(); g.strokeStyle = rgba("#3a2236", 0.22); g.lineWidth = 2;
  for (let i = -16; i <= 16; i++) { g.beginPath(); g.moveTo(vx + i * 40, y0); g.lineTo(vx + i * 170, Y1); g.stroke(); }
  g.restore();
}
function rug(g: G, cx: number, cy: number, rx: number, ry: number, c0: string, c1: string, ring: string) {
  g.save(); g.translate(cx, cy); g.scale(1, ry / rx);
  g.fillStyle = rgba("#2a1836", 0.25); g.beginPath(); g.arc(0, 16, rx, 0, Math.PI * 2); g.fill();
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, c0); gr.addColorStop(1, c1);
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, Math.PI * 2); g.fill();
  g.strokeStyle = ring; g.lineWidth = 12; g.beginPath(); g.arc(0, 0, rx * 0.88, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 5; g.setLineDash([18, 14]); g.beginPath(); g.arc(0, 0, rx * 0.64, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
  g.restore();
}
function pot(g: G, x: number, y: number, w: number, h: number, c: string) {
  g.fillStyle = vGrad(g, y, y + h, [[0, c], [1, rgba("#6a3a50", 0.9)]]);
  g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x + w / 2, y); g.lineTo(x + w * 0.38, y + h); g.lineTo(x - w * 0.38, y + h); g.fill();
  g.fillStyle = rgba("#ffffff", 0.25); g.fillRect(x - w / 2, y, w, 7);
  g.fillStyle = rgba("#2a1836", 0.3); g.beginPath(); g.ellipse(x, y + h + 4, w * 0.55, 10, 0, 0, Math.PI * 2); g.fill();
}
function hangingPlant(g: G, x: number, y: number, seed: number) {
  g.strokeStyle = rgba("#f3e2c8", 0.8); g.lineWidth = 2;
  g.beginPath(); g.moveTo(x, Y0); g.lineTo(x - 30, y); g.moveTo(x, Y0); g.lineTo(x + 30, y); g.stroke();
  const r = rng(seed);
  for (let s = 0; s < 6; s++) {
    let px = x + (s - 2.5) * 14, py = y + 10;
    for (let k = 0; k < 7 + s % 3; k++) {
      px += (r() - 0.5) * 18; py += 26;
      kitLeaf(g, px, py, 30, 12, Math.PI / 2 + (k % 2 ? 0.9 : -0.9), k % 2 ? "#8fcaa8" : "#76b796");
    }
  }
  g.fillStyle = vGrad(g, y - 10, y + 50, [[0, "#f5c9b4"], [1, "#d48f8f"]]);
  g.beginPath(); g.moveTo(x - 46, y - 6); g.lineTo(x + 46, y - 6); g.quadraticCurveTo(x + 40, y + 52, x, y + 54); g.quadraticCurveTo(x - 40, y + 52, x - 46, y - 6); g.fill();
}

// ================================ FILM ================================
const F_WALL_FLOOR = 1470;
const FL = { x: 975, y: 760 }; // floor-lamp shade centre
const FW = { x0: 80, y0: 230, x1: 470, y1: 830 };
const filmL = once(() => bake(X0, Y0, OW, OH, (g) => {
  // wall
  g.fillStyle = vGrad(g, Y0, F_WALL_FLOOR, [[0, "#9b6f98"], [0.35, "#cf94a4"], [0.8, "#e9b1a8"], [1, "#efbfae"]]);
  g.fillRect(X0, Y0, OW, F_WALL_FLOOR - Y0);
  // subtle vertical stripe wallpaper
  g.save(); for (let x = X0; x < X1; x += 36) { g.fillStyle = rgba("#fff3ea", 0.05); g.fillRect(x, Y0, 14, F_WALL_FLOOR - Y0); } g.restore();
  wash(g, 31, X0, Y0, OW, F_WALL_FLOOR - Y0, ["#ffd2b0", "#b07fb8", "#ffe6c8"], 12, 0.3);
  radial(g, FL.x, FL.y + 40, 1000, "#ffc58a", 0.38, 0.3);
  radial(g, 280, 540, 700, "#ffb3c6", 0.22);
  // crown moulding
  g.fillStyle = vGrad(g, -90, -40, [[0, "#f7e3d8"], [1, "#d9a9a8"]]); g.fillRect(X0, -90, OW, 50);
  g.fillStyle = vGrad(g, Y0, -90, [[0, "#7a5682"], [1, "#a77a9a"]]); g.fillRect(X0, Y0, OW, -90 - Y0);

  // ---- window with dusk sky ----
  const { x0, y0, x1, y1 } = FW;
  g.fillStyle = rgba("#5a2f50", 0.25); g.fillRect(x0 + 10, y0 + 14, x1 - x0, y1 - y0 + 20);
  g.fillStyle = "#fbefe6"; g.fillRect(x0 - 16, y0 - 16, x1 - x0 + 32, y1 - y0 + 32);
  g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip();
  g.fillStyle = vGrad(g, y0, y1, [[0, "#7f6fc8"], [0.35, "#c592c8"], [0.65, "#f6a6b4"], [0.88, "#ffc69e"], [1, "#ffd9a8"]]); g.fillRect(x0, y0, x1 - x0, y1 - y0);
  bakeStars(g, 77, 40, x0, y0, x1, y0 + 220);
  radial(g, 380, 330, 70, "#fff6e0", 0.4); g.fillStyle = "#fff8ea"; g.beginPath(); g.arc(380, 330, 18, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#f6a6b4"; g.beginPath(); g.arc(388, 324, 16, 0, Math.PI * 2); g.globalAlpha = 0.95; g.fill(); g.globalAlpha = 1;
  skyline(g, { seed: 88, x0: x0 - 20, x1: x1 + 20, base: y1 + 10, hMin: 60, hMax: 170, wMin: 30, wMax: 70, top: "#b58bc0", bottom: "#8a6aa8", lit: 0.25, win: [4, 5], rim: "#ffd2a8" });
  skyline(g, { seed: 89, x0: x0 - 20, x1: x1 + 20, base: y1 + 10, hMin: 20, hMax: 80, wMin: 50, wMax: 90, top: "#7c5a92", bottom: "#5f4478", lit: 0.4, win: [6, 7], spires: false });
  g.fillStyle = rgba("#ffffff", 0.1); g.beginPath(); g.moveTo(x0, y0 + 300); g.lineTo(x0 + 200, y0); g.lineTo(x0 + 260, y0); g.lineTo(x0, y0 + 380); g.fill();
  g.restore();
  g.strokeStyle = "#fbefe6"; g.lineWidth = 12;
  g.beginPath(); g.moveTo((x0 + x1) / 2, y0); g.lineTo((x0 + x1) / 2, y1); g.moveTo(x0, y0 + 210); g.lineTo(x1, y0 + 210); g.stroke();
  g.fillStyle = vGrad(g, y1 + 10, y1 + 50, [[0, "#fff6ee"], [1, "#e1b8b0"]]); g.fillRect(x0 - 36, y1 + 10, x1 - x0 + 72, 30);
  // sheer curtains
  for (const [cx, dir] of [[x0 - 10, 1], [x1 + 10, -1]] as [number, number][]) {
    const gr = g.createLinearGradient(cx - 70 * dir, 0, cx + 90 * dir, 0);
    gr.addColorStop(0, rgba("#fff3f0", 0.85)); gr.addColorStop(1, rgba("#fff3f0", 0.1));
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(cx - 80 * dir, y0 - 50); g.lineTo(cx + 70 * dir, y0 - 50); g.quadraticCurveTo(cx + 30 * dir, y0 + 400, cx + 60 * dir, F_WALL_FLOOR - 40); g.lineTo(cx - 80 * dir, F_WALL_FLOOR - 40); g.fill();
    g.strokeStyle = rgba("#e8c6c8", 0.5); g.lineWidth = 3;
    for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(cx - (60 - k * 30) * dir, y0 - 50); g.lineTo(cx - (60 - k * 34) * dir, F_WALL_FLOOR - 40); g.stroke(); }
  }
  g.fillStyle = "#d9b48f"; g.fillRect(x0 - 110, y0 - 56, x1 - x0 + 220, 9);
  // ---- framed art + floating shelf (right) ----
  g.fillStyle = rgba("#5a2f50", 0.22); g.fillRect(618, 318, 300, 240);
  g.fillStyle = "#fff6ee"; g.fillRect(606, 300, 300, 240);
  g.fillStyle = vGrad(g, 316, 524, [[0, "#ffd2b8"], [1, "#f2a3b6"]]); g.fillRect(622, 316, 268, 208);
  g.fillStyle = "#c48fc4"; g.beginPath(); g.moveTo(622, 524); g.lineTo(700, 420); g.lineTo(760, 470); g.lineTo(830, 390); g.lineTo(890, 460); g.lineTo(890, 524); g.fill();
  g.fillStyle = "#9b74b8"; g.beginPath(); g.moveTo(622, 524); g.lineTo(720, 470); g.lineTo(800, 500); g.lineTo(890, 480); g.lineTo(890, 524); g.fill();
  g.fillStyle = "#fff4dc"; g.beginPath(); g.arc(800, 380, 22, 0, Math.PI * 2); g.fill();
  g.fillStyle = vGrad(g, 640, 660, [[0, "#e7c7a8"], [1, "#b98f7c"]]); g.fillRect(620, 640, 290, 18);
  g.fillStyle = rgba("#5a2f50", 0.2); g.fillRect(620, 658, 290, 16);
  pot(g, 660, 596, 46, 44, "#f3c2b0"); houseplant(g, 660, 600, 5, 1, 0.35);
  g.fillStyle = "#fff6ee"; g.fillRect(740, 570, 56, 70); g.fillStyle = "#f6b6c8"; g.fillRect(748, 578, 40, 46);
  g.fillStyle = "#c9b0e8"; g.fillRect(830, 600, 22, 40); g.fillStyle = "#9fd3c0"; g.fillRect(854, 590, 20, 50);
  // ---- floor ----
  floorBoards(g, F_WALL_FLOOR, "#b98584", "#8a5a6c");
  g.fillStyle = vGrad(g, F_WALL_FLOOR - 24, F_WALL_FLOOR, [[0, "#fbefe6"], [1, "#e0bdb4"]]); g.fillRect(X0, F_WALL_FLOOR - 24, OW, 24);
  radial(g, FL.x, 1560, 600, "#ffc58a", 0.3);
  rug(g, 540, 1720, 620, 190, "#fbe3d8", "#f0bfc0", rgba("#d68fa8", 0.6));
  // ---- floor lamp (right) ----
  g.fillStyle = rgba("#2a1836", 0.3); g.beginPath(); g.ellipse(FL.x, 1560, 90, 16, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#c9a07a"; g.fillRect(FL.x - 5, FL.y + 50, 10, 1560 - FL.y - 50);
  g.beginPath(); g.ellipse(FL.x, 1556, 60, 12, 0, 0, Math.PI * 2); g.fill();
  const shade = new Path2D(`M ${FL.x - 70} ${FL.y - 60} L ${FL.x + 70} ${FL.y - 60} L ${FL.x + 105} ${FL.y + 55} L ${FL.x - 105} ${FL.y + 55} Z`);
  g.fillStyle = vGrad(g, FL.y - 60, FL.y + 55, [[0, "#fff4dc"], [1, "#ffd59a"]]); g.fill(shade);
  // light cone under the shade
  const cg = g.createLinearGradient(0, FL.y + 55, 0, FL.y + 600); cg.addColorStop(0, rgba("#ffe0a8", 0.35)); cg.addColorStop(1, rgba("#ffe0a8", 0));
  g.fillStyle = cg; g.beginPath(); g.moveTo(FL.x - 100, FL.y + 55); g.lineTo(FL.x + 100, FL.y + 55); g.lineTo(FL.x + 330, FL.y + 640); g.lineTo(FL.x - 330, FL.y + 640); g.fill();
  // ---- tall plant (left) ----
  houseplant(g, 90, 1400, 44, 1, 1.05, ["#8fcaa8", "#76b796", "#a6d8b8"]);
  pot(g, 90, 1390, 140, 150, "#f3c2b0");
  hangingPlant(g, 560, 150, 9);

  // ---- sofa ----
  const SX0 = 170, SX1 = 910, BACK_T = 1040, SEAT = 1330;
  g.fillStyle = rgba("#2a1836", 0.32); g.beginPath(); g.ellipse(540, 1505, 420, 34, 0, 0, Math.PI * 2); g.fill();
  const body = "#b48fc4", dark = "#8a68a6", light = "#d4b4e0";
  // back
  g.fillStyle = vGrad(g, BACK_T, SEAT, [[0, light], [1, body]]);
  g.beginPath(); g.roundRect(SX0 + 40, BACK_T, SX1 - SX0 - 80, SEAT - BACK_T + 20, [60, 60, 0, 0]); g.fill();
  // back cushions
  for (const [cx, w] of [[395, 290], [685, 290]]) {
    g.fillStyle = vGrad(g, BACK_T + 40, SEAT, [[0, "#dcc2e8"], [1, "#a985c0"]]);
    g.beginPath(); g.roundRect(cx - w / 2, BACK_T + 40, w, SEAT - BACK_T - 30, 40); g.fill();
    g.fillStyle = rgba("#ffffff", 0.18); g.beginPath(); g.ellipse(cx - 30, BACK_T + 90, w * 0.35, 26, 0, 0, Math.PI * 2); g.fill();
  }
  // seat cushions
  for (const [cx, w] of [[395, 292], [685, 292]]) {
    g.fillStyle = vGrad(g, SEAT - 30, SEAT + 20, [[0, "#e4cdee"], [1, "#c3a2d6"]]);
    g.beginPath(); g.roundRect(cx - w / 2, SEAT - 34, w, 52, 22); g.fill();
    g.fillStyle = vGrad(g, SEAT + 10, SEAT + 130, [[0, body], [1, dark]]);
    g.beginPath(); g.roundRect(cx - w / 2, SEAT + 8, w, 120, [0, 0, 18, 18]); g.fill();
  }
  // base + legs
  g.fillStyle = dark; g.fillRect(SX0 + 40, SEAT + 120, SX1 - SX0 - 80, 36);
  g.fillStyle = "#c9a07a"; for (const lx of [SX0 + 60, SX1 - 80]) g.fillRect(lx, SEAT + 150, 20, 30);
  // arms
  for (const [ax, dir] of [[SX0, 1], [SX1, -1]] as [number, number][]) {
    const x = dir > 0 ? ax : ax - 120;
    g.fillStyle = vGrad(g, SEAT - 140, SEAT + 160, [[0, light], [1, dark]]);
    g.beginPath(); g.roundRect(x, SEAT - 140, 120, 300, [50, 50, 14, 14]); g.fill();
    g.fillStyle = rgba("#ffffff", 0.2); g.beginPath(); g.ellipse(x + 60, SEAT - 116, 44, 16, 0, 0, Math.PI * 2); g.fill();
  }
  // throw pillows
  const pil = (x: number, y: number, s: number, c: string, rot: number) => {
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = c; g.beginPath(); g.roundRect(-55 * s, -55 * s, 110 * s, 110 * s, 34 * s); g.fill();
    g.fillStyle = rgba("#ffffff", 0.3); g.beginPath(); g.ellipse(-12 * s, -20 * s, 34 * s, 16 * s, -0.3, 0, Math.PI * 2); g.fill();
    g.restore();
  };
  pil(285, SEAT - 90, 1, "#f6b6c8", -0.25); pil(800, SEAT - 92, 1, "#fbe3c4", 0.22); pil(860, SEAT - 70, 0.75, "#9fd3c0", 0.4);
  // warm light on the sofa from the lamp
  g.save(); g.globalCompositeOperation = "soft-light"; radial(g, SX1, SEAT - 100, 600, "#ffd59a", 0.5); g.restore();

  // ---- coffee table (bottom edge) ----
  g.fillStyle = rgba("#2a1836", 0.3); g.beginPath(); g.ellipse(540, 1890, 360, 26, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = vGrad(g, 1740, 1790, [[0, "#f0cfb2"], [1, "#c99a84"]]); g.beginPath(); g.roundRect(200, 1740, 680, 50, 16); g.fill();
  g.fillStyle = "#a87766"; g.fillRect(240, 1790, 22, 140); g.fillRect(818, 1790, 22, 140);
  // popcorn bowl + mugs
  g.fillStyle = "#fffaf0"; for (let k = 0; k < 14; k++) { g.beginPath(); g.arc(470 + (hash(k) - 0.5) * 110, 1698 + hash(k + 5) * 20, 14, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = vGrad(g, 1700, 1750, [[0, "#ff9fb5"], [1, "#e0708f"]]); g.beginPath(); g.moveTo(400, 1706); g.lineTo(540, 1706); g.quadraticCurveTo(536, 1752, 470, 1752); g.quadraticCurveTo(404, 1752, 400, 1706); g.fill();
  g.fillStyle = "#fff"; for (let k = 0; k < 6; k++) g.fillRect(410 + k * 22, 1712, 10, 36);
  for (const [mx, c] of [[640, "#9fd3e8"], [700, "#f6c08a"]] as [number, string][]) {
    g.fillStyle = c; g.fillRect(mx, 1690, 40, 50); g.strokeStyle = c; g.lineWidth = 6; g.beginPath(); g.arc(mx + 42, 1714, 11, -1.2, 1.2); g.stroke();
    g.fillStyle = rgba("#ffffff", 0.35); g.fillRect(mx + 5, 1694, 7, 42);
  }
  vignette(g, 540, 1000, 750, 1700, "#4a2440", 0.4);
  grain(g, X0, Y0, OW, OH, 0.06);
}));
const F_STRING = fairyPath(FW.x0 - 100, FW.y0 - 46, FW.x1 + 100, FW.y0 - 46, 70, 30);
const F_MOTES = Array.from({ length: 26 }, (_, i) => ({ x: 760 + hash(i * 1.3) * 420, y: 760 + hash(i + 40) * 640, s: 2 + hash(i + 7) * 3, p: hash(i + 77) * 6.28 }));

export const FILM: Background = {
  groundY: 1580,
  light: { key: "#ffcf9a", keyDir: 1, ambient: "#a07fb0", rim: "#ffb08a", strength: 0.45 },
  anchors: { sofaSeat: { x: 540, y: 1330, w: 620 }, lamp: { x: FL.x, y: FL.y }, window: { x: (FW.x0 + FW.x1) / 2, y: (FW.y0 + FW.y1) / 2, w: FW.x1 - FW.x0, h: FW.y1 - FW.y0 } },
  draw(g: G, t: number) {
    g.save();
    blit(g, filmL());
    // string lights on the curtain rod (wire is part of the glow, drawn live so it sits on top of the curtains)
    drawWire(g, F_STRING, rgba("#6a4a5a", 0.7), 2);
    drawBulbs(g, F_STRING, t, 41, ["#ffd38a", "#fff3c4", "#ffb0c8"], 8);
    g.globalCompositeOperation = "lighter";
    const br = 0.92 + 0.08 * Math.sin(t * 2.1);
    radial(g, FL.x, FL.y, 300, "#ffcf8a", 0.25 * br);
    F_MOTES.forEach((m, i) => {
      const x = m.x + Math.sin(t * 0.5 + m.p) * 26, y = m.y - ((t * 14 + i * 41) % 180);
      spot(g, "#fff0c8", x, y, m.s * 2.2, 0.4 * (0.5 + 0.5 * Math.sin(t * 1.6 + m.p)), 0.9);
    });
    g.restore();
  },
};

// ================================ DANCE ================================
const D_FLOOR = 1540;
const DW = { x0: 300, y0: 180, x1: 780, y1: 720 };
const TT = { x: 140, y: 1268 }; // turntable platter centre
const SPK = { x: 965, y0: 1120, y1: 1560 };
const D_STRINGS = [
  fairyPath(-220, 110, 1300, 110, 170, 42),
  fairyPath(-220, 330, 300, 230, 80, 40),
  fairyPath(780, 230, 1300, 330, 80, 40),
];
const D_CURTAIN = Array.from({ length: 6 }, (_, i) => { const x = 1100 + i * 32; return fairyPath(x, 160, x + 4, 1100 - (i % 3) * 120, 0, 46); });

const danceL = once(() => bake(X0, Y0, OW, OH, (g) => {
  g.fillStyle = vGrad(g, Y0, D_FLOOR, [[0, "#5a4386"], [0.45, "#8a64a6"], [0.85, "#c08ab4"], [1, "#d29cb8"]]);
  g.fillRect(X0, Y0, OW, D_FLOOR - Y0);
  // dotted wallpaper
  g.save(); g.fillStyle = rgba("#ffe6f4", 0.07);
  for (let y = -300; y < D_FLOOR; y += 40) for (let x = -200 + ((y / 40) % 2) * 20; x < X1; x += 40) { g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill(); }
  g.restore();
  wash(g, 61, X0, Y0, OW, D_FLOOR - Y0, ["#ffb0d0", "#7a5ad0", "#ffd38a"], 14, 0.3);
  radial(g, 540, 700, 900, "#ffb0d0", 0.18);
  // ---- window: evening sky + city ----
  const { x0, y0, x1, y1 } = DW;
  g.fillStyle = rgba("#2a1836", 0.3); g.beginPath(); g.roundRect(x0 + 12, y0 + 16, x1 - x0, y1 - y0 + 20, [250, 250, 8, 8]); g.fill();
  g.fillStyle = "#f6e6f2"; g.beginPath(); g.roundRect(x0 - 18, y0 - 18, x1 - x0 + 36, y1 - y0 + 36, [260, 260, 8, 8]); g.fill();
  g.save(); g.beginPath(); g.roundRect(x0, y0, x1 - x0, y1 - y0, [240, 240, 2, 2]); g.clip();
  g.fillStyle = vGrad(g, y0, y1, [[0, "#3a2a78"], [0.45, "#7a4fa0"], [0.8, "#e48aae"], [1, "#ffc2a0"]]); g.fillRect(x0, y0, x1 - x0, y1 - y0);
  bakeStars(g, 12, 120, x0, y0, x1, y0 + 320);
  radial(g, 660, 300, 80, "#fff1d6", 0.4); g.fillStyle = "#fff6e2"; g.beginPath(); g.arc(660, 300, 24, 0, Math.PI * 2); g.fill();
  skyline(g, { seed: 18, x0: x0 - 20, x1: x1 + 20, base: y1 + 6, hMin: 70, hMax: 200, wMin: 30, wMax: 70, top: "#a586c4", bottom: "#7a64a8", lit: 0.2, win: [3, 4], rim: "#ffc2a0" });
  skyline(g, { seed: 19, x0: x0 - 20, x1: x1 + 20, base: y1 + 6, hMin: 30, hMax: 100, wMin: 50, wMax: 100, top: "#5a4889", bottom: "#3a2f68", lit: 0.42, win: [6, 8], spires: false });
  g.restore();
  g.strokeStyle = "#f6e6f2"; g.lineWidth = 12; g.beginPath(); g.moveTo(540, y0); g.lineTo(540, y1); g.moveTo(x0, 470); g.lineTo(x1, 470); g.stroke();
  g.fillStyle = vGrad(g, y1 + 14, y1 + 50, [[0, "#fff4fa"], [1, "#d8b0cc"]]); g.fillRect(x0 - 40, y1 + 14, x1 - x0 + 80, 30);
  // ---- floor + rug ----
  floorBoards(g, D_FLOOR, "#a2737f", "#6d4a66");
  g.fillStyle = vGrad(g, D_FLOOR - 24, D_FLOOR, [[0, "#f6e6f2"], [1, "#caa2c0"]]); g.fillRect(X0, D_FLOOR - 24, OW, 24);
  rug(g, 540, 1700, 560, 170, "#ffd9e6", "#e7a8c4", rgba("#ffffff", 0.55));
  // ---- record player on a low cabinet (left) ----
  const CT = 1310;
  g.fillStyle = rgba("#2a1836", 0.3); g.beginPath(); g.ellipse(120, D_FLOOR + 14, 220, 20, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = vGrad(g, CT, D_FLOOR, [[0, "#e8b9a0"], [1, "#b98278"]]); g.fillRect(-60, CT + 16, 360, D_FLOOR - CT);
  g.fillStyle = vGrad(g, CT, CT + 20, [[0, "#f7d6c0"], [1, "#d6a48e"]]); g.fillRect(-70, CT, 380, 20);
  g.strokeStyle = rgba("#6a3a50", 0.4); g.lineWidth = 3; g.strokeRect(-40, CT + 40, 150, 160); g.strokeRect(130, CT + 40, 150, 160);
  // vinyl sleeves inside
  for (let k = 0; k < 6; k++) { g.fillStyle = ["#ff9fb5", "#9fd3e8", "#ffd38a", "#c9a8ff", "#7cc7b0", "#f4a07a"][k]; g.fillRect(140 + k * 22, CT + 60 + (k % 2) * 6, 18, 134 - (k % 2) * 6); }
  // turntable box
  g.fillStyle = vGrad(g, CT - 56, CT, [[0, "#f3ddcc"], [1, "#c99a84"]]); g.beginPath(); g.roundRect(10, CT - 56, 270, 56, 8); g.fill();
  g.fillStyle = "#3a2a4a"; g.fillRect(250, CT - 32, 14, 10);
  houseplant(g, 1130, 1410, 71, -1, 1.0); pot(g, 1130, 1400, 120, 140, "#f3c2b0");
  // speaker (right)
  g.fillStyle = rgba("#2a1836", 0.35); g.beginPath(); g.ellipse(SPK.x, SPK.y1 + 6, 130, 18, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = vGrad(g, SPK.y0, SPK.y1, [[0, "#5a4a7a"], [1, "#3a2f58"]]); g.beginPath(); g.roundRect(SPK.x - 100, SPK.y0, 200, SPK.y1 - SPK.y0, 16); g.fill();
  g.fillStyle = rgba("#ffffff", 0.12); g.fillRect(SPK.x - 92, SPK.y0 + 8, 8, SPK.y1 - SPK.y0 - 16);
  // plants

  hangingPlant(g, 90, 140, 33);
  houseplant(g, 420, DW.y1 - 40, 3, 1, 0.3); pot(g, 420, DW.y1 - 40, 50, 54, "#9fd3c0");
  // fairy-light wires
  for (const p of [...D_STRINGS, ...D_CURTAIN]) drawWire(g, p, rgba("#3a2450", 0.8), 2);
  vignette(g, 540, 1000, 750, 1700, "#2a1840", 0.45);
  grain(g, X0, Y0, OW, OH, 0.06);
}));

/** Simple eighth-note glyph centred at (x,y). */
function note(g: G, x: number, y: number, s: number, double: boolean) {
  g.beginPath(); g.ellipse(x, y, 9 * s, 7 * s, -0.4, 0, Math.PI * 2); g.fill();
  g.fillRect(x + 6 * s, y - 34 * s, 3.5 * s, 34 * s);
  if (double) {
    g.beginPath(); g.ellipse(x + 30 * s, y - 6 * s, 9 * s, 7 * s, -0.4, 0, Math.PI * 2); g.fill();
    g.fillRect(x + 36 * s, y - 40 * s, 3.5 * s, 34 * s);
    g.beginPath(); g.moveTo(x + 6 * s, y - 34 * s); g.lineTo(x + 39.5 * s, y - 40 * s); g.lineTo(x + 39.5 * s, y - 32 * s); g.lineTo(x + 6 * s, y - 26 * s); g.fill();
  } else {
    g.beginPath(); g.moveTo(x + 9 * s, y - 34 * s); g.quadraticCurveTo(x + 26 * s, y - 26 * s, x + 20 * s, y - 10 * s); g.quadraticCurveTo(x + 20 * s, y - 22 * s, x + 9 * s, y - 24 * s); g.fill();
  }
}
const NOTES = Array.from({ length: 14 }, (_, i) => ({ src: i % 2, ph: hash(i * 3.3), sp: 0.55 + hash(i * 7.1) * 0.4, dx: (hash(i * 2.7) - 0.5) * 260, c: ["#ffd38a", "#ffb0d0", "#c9f0ff", "#e6c8ff"][i % 4], dbl: hash(i + 9) > 0.55 }));

export const DANCE: Background = {
  groundY: 1600,
  light: { key: "#ffc6d9", keyDir: -1, ambient: "#7a68b0", rim: "#ffe08a", strength: 0.45 },
  anchors: { floorCenter: { x: 540, y: 1600 }, turntable: { x: TT.x, y: TT.y }, speaker: { x: SPK.x, y: SPK.y0 } },
  draw(g: G, t: number) {
    g.save();
    blit(g, danceL());
    // drifting party-light blobs on the wall
    g.globalCompositeOperation = "screen";
    [["#ff9fcf", 0], ["#9fd8ff", 2.1], ["#ffd38a", 4.2]].forEach(([c, p]) => {
      const ph = p as number;
      radial(g, 540 + Math.sin(t * 0.9 + ph) * 420, 900 + Math.cos(t * 0.7 + ph) * 260, 340, c as string, 0.16, 0.3);
    });
    g.globalCompositeOperation = "source-over";
    // spinning record
    g.save(); g.translate(TT.x, TT.y); g.scale(1, 0.32);
    g.fillStyle = "#2a2238"; g.beginPath(); g.arc(0, 0, 100, 0, Math.PI * 2); g.fill();
    g.strokeStyle = rgba("#6a5a8a", 0.5); g.lineWidth = 2; for (let r = 40; r < 98; r += 12) { g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); }
    const a = t * 3.6;
    g.fillStyle = rgba("#ffffff", 0.22); g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 98, a, a + 0.5); g.fill(); g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 98, a + Math.PI, a + Math.PI + 0.5); g.fill();
    g.fillStyle = "#ff9fb5"; g.beginPath(); g.arc(0, 0, 30, 0, Math.PI * 2); g.fill();
    g.restore();
    g.strokeStyle = "#e8e0f0"; g.lineWidth = 5; g.lineCap = "round"; g.beginPath(); g.moveTo(250, TT.y - 30); g.lineTo(232, TT.y - 4); g.lineTo(180, TT.y + 8); g.stroke();
    // speaker cones pulse to the beat
    const beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * 4)), 6);
    for (const [cy, r] of [[SPK.y0 + 110, 46], [SPK.y0 + 290, 76]]) {
      const rr = r * (1 + 0.05 * beat);
      g.fillStyle = "#2a2240"; g.beginPath(); g.arc(SPK.x, cy, rr + 10, 0, Math.PI * 2); g.fill();
      const gr = g.createRadialGradient(SPK.x - 10, cy - 10, 2, SPK.x, cy, rr); gr.addColorStop(0, "#8a7aaa"); gr.addColorStop(1, "#3a2f58");
      g.fillStyle = gr; g.beginPath(); g.arc(SPK.x, cy, rr, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#c9b8e8"; g.beginPath(); g.arc(SPK.x, cy, rr * 0.25, 0, Math.PI * 2); g.fill();
    }
    g.globalCompositeOperation = "lighter";
    spot(g, "#ff9fcf", SPK.x, SPK.y0 + 40, 26, 0.5 + 0.5 * beat, 0.8);
    // floating music notes
    NOTES.forEach((n, i) => {
      const life = 2.6, u = ((t * n.sp + n.ph * life) % life) / life;
      const sx = n.src ? SPK.x - 40 : TT.x + 40, sy = n.src ? SPK.y0 + 40 : TT.y - 40;
      const x = sx + n.dx * u * (n.src ? -1 : 1) + Math.sin(u * 7 + i) * 26, y = sy - u * 620;
      const al = clamp(u * 5) * (1 - clamp((u - 0.7) / 0.3));
      g.globalCompositeOperation = "lighter";
      spot(g, n.c, x + 10, y - 14, 46, 0.35 * al, 0.3);
      g.globalCompositeOperation = "source-over";
      g.globalAlpha = 0.9 * al; g.fillStyle = n.c;
      note(g, x, y, 1 + 0.2 * Math.sin(t * 4 + i), n.dbl);
      g.globalAlpha = 1;
    });
    [...D_STRINGS, ...D_CURTAIN].forEach((p, i) => drawBulbs(g, p, t, 50 + i * 3, ["#ffd38a", "#ffb0d0", "#fff3c4", "#c9e8ff"], 9));
    g.restore();
  },
};

