// Scene "room": Denis's cozy bedroom on New Year's night. Window (left) with fireworks, lamp key light (right).
import type { Background } from "../lib/types";
import { G, rgba, rng, lerp, vGrad } from "../lib/util";
import {
  X0, X1, Y0, Y1, OW, OH, once, bake, blit, grain, wash, radial, bakeStars, drawFireworks, flashOf, schedule, FW_PALETTE,
  skyline, snowfall, fairyPath, drawWire, drawBulbs, spot, hash, vignette,
} from "./night-kit";

// window geometry
const WO = { x0: 40, y0: 300, x1: 420, y1: 1080 };
const PANES = [[66, 326, 157, 222], [237, 326, 157, 222], [66, 562, 157, 488], [237, 562, 157, 488]];
const GL = { x0: 66, y0: 326, x1: 394, y1: 1050 };
const FLOOR = 1540;
const LAMP = { x: 985, y: 1100 };

const viewL = once(() => bake(GL.x0, GL.y0, GL.x1 - GL.x0, GL.y1 - GL.y0, (g) => {
  g.fillStyle = vGrad(g, GL.y0, GL.y1, [[0, "#1c1a4a"], [0.45, "#3f2d72"], [0.75, "#a35ea4"], [1, "#f2a08f"]]);
  g.fillRect(GL.x0, GL.y0, GL.x1 - GL.x0, GL.y1 - GL.y0);
  bakeStars(g, 4, 140, GL.x0, GL.y0, GL.x1, 760);
  radial(g, 330, 420, 90, "#fff1d6", 0.35);
  g.fillStyle = "#fff4dc"; g.beginPath(); g.arc(330, 420, 22, 0, Math.PI * 2); g.fill();
  skyline(g, { seed: 41, x0: GL.x0 - 20, x1: GL.x1 + 20, base: 1060, hMin: 90, hMax: 210, wMin: 26, wMax: 60, top: "#8b6fb0", bottom: "#5b4a8a", lit: 0.2, win: [3, 4], snow: "#e8e1fb", rim: "#f7a98b" });
  skyline(g, { seed: 42, x0: GL.x0 - 30, x1: GL.x1 + 30, base: 1080, hMin: 40, hMax: 110, wMin: 50, wMax: 90, top: "#4d3d7e", bottom: "#33295e", lit: 0.35, win: [6, 8], snow: "#f1eefd", spires: false });
}));
const glassL = once(() => bake(GL.x0, GL.y0, GL.x1 - GL.x0, GL.y1 - GL.y0, (g) => {
  g.fillStyle = rgba("#b9a8ff", 0.06); g.fillRect(GL.x0, GL.y0, GL.x1 - GL.x0, GL.y1 - GL.y0);
  g.fillStyle = rgba("#ffffff", 0.07);
  g.beginPath(); g.moveTo(GL.x0, 760); g.lineTo(GL.x0 + 200, GL.y0); g.lineTo(GL.x0 + 260, GL.y0); g.lineTo(GL.x0, 860); g.fill();
  g.beginPath(); g.moveTo(GL.x0 + 60, GL.y1); g.lineTo(GL.x1, 640); g.lineTo(GL.x1, 680); g.lineTo(GL.x0 + 100, GL.y1); g.fill();
  // frost in the corners
  for (const [cx, cy] of [[GL.x0, GL.y1], [GL.x1, GL.y1], [GL.x0, GL.y0]]) radial(g, cx, cy, 120, "#eef0ff", 0.25, 0.3);
}));

function curtain(g: G, x0: number, x1: number, y0: number, y1: number, folds: number, base: string, light: string, seed: number, gather?: number) {
  const r = rng(seed);
  const w = x1 - x0;
  g.save();
  g.beginPath();
  g.moveTo(x0, y0); g.lineTo(x1, y0);
  if (gather) { g.quadraticCurveTo(x1 - w * 0.15, gather, x1 - w * 0.45, gather + 30); g.quadraticCurveTo(x1, gather + 200, x1 + 10, y1); }
  else g.lineTo(x1 + 6, y1);
  for (let i = folds; i >= 0; i--) g.lineTo(x0 + (w * i) / folds, y1 + (i % 2 ? 14 : 0));
  g.closePath();
  g.fillStyle = base; g.fill();
  g.clip();
  for (let i = 0; i < folds; i++) {
    const fx = x0 + (w * (i + 0.5)) / folds + (r() - 0.5) * 10, fw = (w / folds) * (0.5 + r() * 0.3);
    const gr = g.createLinearGradient(fx - fw / 2, 0, fx + fw / 2, 0);
    gr.addColorStop(0, rgba(light, 0)); gr.addColorStop(0.5, rgba(light, 0.55)); gr.addColorStop(1, rgba(light, 0));
    g.fillStyle = gr; g.fillRect(fx - fw / 2, y0, fw, y1 - y0 + 20);
    g.fillStyle = rgba("#2a1f4a", 0.18); g.fillRect(fx + fw / 2 - 3, y0, 6, y1 - y0 + 20);
  }
  g.fillStyle = vGrad(g, y0, y1, [[0, rgba("#2a1f4a", 0.25)], [0.3, rgba("#2a1f4a", 0)], [1, rgba("#2a1f4a", 0.2)]]);
  g.fillRect(x0 - 20, y0, w + 60, y1 - y0 + 20);
  g.restore();
}

function book(g: G, x: number, yb: number, w: number, h: number, c: string, lean = 0) {
  g.save(); g.translate(x, yb); g.rotate(lean);
  g.fillStyle = c; g.fillRect(0, -h, w, h);
  g.fillStyle = rgba("#ffffff", 0.22); g.fillRect(2, -h + 8, w - 4, 3); g.fillRect(2, -16, w - 4, 3);
  g.fillStyle = rgba("#1d1436", 0.25); g.fillRect(w - 3, -h, 3, h);
  g.restore();
}

function leaf(g: G, x: number, y: number, len: number, wid: number, ang: number, c: string, slits = false) {
  g.save(); g.translate(x, y); g.rotate(ang);
  const gr = g.createLinearGradient(0, -wid, 0, wid);
  gr.addColorStop(0, c); gr.addColorStop(1, rgba("#1f3a40", 0.9));
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(len * 0.3, -wid, len * 0.8, -wid * 0.8, len, 0); g.bezierCurveTo(len * 0.8, wid * 0.8, len * 0.3, wid, 0, 0); g.fill();
  g.strokeStyle = rgba("#d7f0e0", 0.35); g.lineWidth = 2; g.beginPath(); g.moveTo(4, 0); g.lineTo(len * 0.92, 0); g.stroke();
  if (slits) {
    g.strokeStyle = "#3a2f62"; g.lineWidth = 4;
    for (let k = 1; k < 4; k++) { const sx = len * (0.25 + k * 0.17); g.beginPath(); g.moveTo(sx, -wid * 0.75); g.lineTo(sx - 10, -wid * 0.35); g.moveTo(sx, wid * 0.75); g.lineTo(sx - 10, wid * 0.35); g.stroke(); }
  }
  g.restore();
}

const FAIRY = [
  fairyPath(-140, 150, 520, 200, 90, 40),
  fairyPath(520, 200, 1220, 140, 100, 40),
  fairyPath(30, 268, 430, 268, 46, 34),
];
const POLA = fairyPath(560, 600, 830, 590, 26, 1000);

const roomL = once(() => bake(X0, Y0, OW, OH, (g) => {
  // ---- wall ----
  g.fillStyle = vGrad(g, Y0, FLOOR, [[0, "#2a2452"], [0.3, "#3f3474"], [0.75, "#57478a"], [1, "#614d8e"]]);
  g.fillRect(X0, Y0, OW, FLOOR - Y0);
  // wallpaper: tiny star/dot motif
  g.save(); g.fillStyle = rgba("#d9cfff", 0.07);
  for (let y = -300; y < FLOOR; y += 46) for (let x = -200 + ((y / 46) % 2) * 23; x < X1; x += 46) { g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill(); }
  g.restore();
  wash(g, 3, X0, Y0, OW, FLOOR - Y0, ["#8f6fd0", "#e08ab8", "#2c2560"], 14, 0.28);
  // ceiling edge + cove shadow
  g.fillStyle = vGrad(g, Y0, -40, [[0, "#1e1a40"], [1, "#2d275a"]]); g.fillRect(X0, Y0, OW, -40 - Y0);
  g.fillStyle = vGrad(g, -40, 60, [[0, rgba("#1a1538", 0.5)], [1, rgba("#1a1538", 0)]]); g.fillRect(X0, -40, OW, 100);
  // lamp warmth on the wall (right) and cool window light (left)
  radial(g, LAMP.x, LAMP.y, 1100, "#ff9f6a", 0.42, 0.3);
  radial(g, LAMP.x, LAMP.y, 420, "#ffd49a", 0.4, 0.4);
  radial(g, 230, 700, 760, "#8f90f0", 0.18);

  // ---- floor ----
  g.fillStyle = vGrad(g, FLOOR, Y1, [[0, "#5d4270"], [0.4, "#6f4e74"], [1, "#4a3358"]]);
  g.fillRect(X0, FLOOR, OW, Y1 - FLOOR);
  g.save(); g.strokeStyle = rgba("#2c1d3e", 0.35); g.lineWidth = 2;
  for (let i = -14; i <= 14; i++) { g.beginPath(); g.moveTo(540 + i * 34, FLOOR); g.lineTo(540 + i * 150, Y1); g.stroke(); }
  g.restore();
  radial(g, 900, 1700, 700, "#ffb27a", 0.28);
  radial(g, 230, 1640, 420, "#9f9cf0", 0.12);
  // skirting board
  g.fillStyle = vGrad(g, FLOOR - 26, FLOOR, [[0, "#8a76b4"], [1, "#6a5694"]]); g.fillRect(X0, FLOOR - 26, OW, 26);
  g.fillStyle = rgba("#ffffff", 0.18); g.fillRect(X0, FLOOR - 26, OW, 3);
  // rug
  g.save(); g.translate(540, 1845); g.scale(1, 0.32);
  const rg = g.createRadialGradient(0, 0, 0, 0, 0, 600);
  rg.addColorStop(0, "#f2b5c6"); rg.addColorStop(0.7, "#d993b1"); rg.addColorStop(1, "#b87599");
  g.fillStyle = rg; g.beginPath(); g.arc(0, 0, 600, 0, Math.PI * 2); g.fill();
  g.strokeStyle = rgba("#fff0e8", 0.6); g.lineWidth = 14; g.beginPath(); g.arc(0, 0, 540, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 6; g.beginPath(); g.arc(0, 0, 380, 0, Math.PI * 2); g.stroke();
  g.restore();

  // ---- posters, photos, shelf ----
  const poster = (cx: number, cy: number, w: number, h: number, rot: number, paint: (x: number, y: number) => void) => {
    g.save(); g.translate(cx, cy); g.rotate(rot);
    g.fillStyle = rgba("#140f2a", 0.3); g.fillRect(-w / 2 + 8, -h / 2 + 10, w, h);
    g.save(); g.beginPath(); g.rect(-w / 2, -h / 2, w, h); g.clip(); paint(-w / 2, -h / 2); g.restore();
    g.strokeStyle = "#f4ecff"; g.lineWidth = 6; g.strokeRect(-w / 2, -h / 2, w, h);
    g.fillStyle = rgba("#fff6d8", 0.7); g.fillRect(-18, -h / 2 - 10, 36, 16);
    g.restore();
  };
  poster(690, 400, 200, 270, -0.04, (x, y) => { // space poster
    g.fillStyle = vGrad(g, y, y + 270, [[0, "#2b2f7a"], [1, "#c86fb0"]]); g.fillRect(x, y, 200, 270);
    bakeStars(g, 9, 60, x, y, x + 200, y + 200);
    g.fillStyle = "#ffcf9a"; g.beginPath(); g.arc(x + 120, y + 110, 46, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#ffe9c9"; g.lineWidth = 6; g.beginPath(); g.ellipse(x + 120, y + 110, 80, 18, -0.3, 0, Math.PI * 2); g.stroke();
    g.fillStyle = "#3a2a6a"; g.beginPath(); g.moveTo(x, y + 270); g.lineTo(x + 60, y + 210); g.lineTo(x + 110, y + 240); g.lineTo(x + 160, y + 200); g.lineTo(x + 200, y + 230); g.lineTo(x + 200, y + 270); g.fill();
  });
  poster(925, 440, 170, 230, 0.05, (x, y) => { // retro sunset / music poster
    g.fillStyle = vGrad(g, y, y + 230, [[0, "#ffd29a"], [0.5, "#ff9fb5"], [1, "#8f6fd0"]]); g.fillRect(x, y, 170, 230);
    g.fillStyle = "#fff1c9"; g.beginPath(); g.arc(x + 85, y + 120, 50, Math.PI, 0); g.fill();
    g.fillStyle = "#6b4fa6"; for (let k = 0; k < 5; k++) g.fillRect(x, y + 124 + k * 18, 170, 7 + k);
    g.strokeStyle = "#3a2a6a"; g.lineWidth = 5; g.beginPath(); g.arc(x + 85, y + 50, 18, 0, Math.PI * 2); g.moveTo(x + 103, y + 50); g.lineTo(x + 103, y + 10); g.stroke();
  });
  // polaroid string
  drawWire(g, POLA, rgba("#e8dcff", 0.6), 2);
  [[600, -0.08, "#ffb8c8"], [680, 0.05, "#9fd3ff"], [760, -0.04, "#ffd9a0"]].forEach(([px, rot, c]) => {
    const u = ((px as number) - 560) / 270, py = lerp(600, 590, u) + 26 * 4 * u * (1 - u);
    g.save(); g.translate(px as number, py); g.rotate(rot as number);
    g.fillStyle = rgba("#140f2a", 0.25); g.fillRect(-26, 4, 56, 64);
    g.fillStyle = "#fbf7ff"; g.fillRect(-30, 0, 56, 66);
    g.fillStyle = c as string; g.fillRect(-25, 5, 46, 42);
    g.fillStyle = rgba("#ffffff", 0.5); g.beginPath(); g.arc(-2, 26, 9, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#c9a07a"; g.fillRect(-6, -6, 8, 12);
    g.restore();
  });
  // shelf
  const SH = 760;
  g.fillStyle = rgba("#140f2a", 0.3); g.fillRect(700, SH + 16, 380, 30);
  const bcol = ["#e98fa8", "#8fb1e8", "#f2c879", "#a58fe0", "#7cc7b0", "#f4a07a", "#d9b8f2", "#6f7fd0"];
  let bx = 712; const br = rng(17);
  while (bx < 940) { const w = 18 + br() * 16, h = 70 + br() * 45; book(g, bx, SH, w, h, bcol[Math.floor(br() * bcol.length)], bx > 900 ? 0.18 : 0); bx += w + 2; }
  // little globe + trailing plant
  g.fillStyle = "#c9a07a"; g.fillRect(990, SH - 12, 40, 12);
  g.fillStyle = "#e9a0b4"; g.fillRect(1000, SH - 60, 46, 48);
  for (let k = 0; k < 9; k++) leaf(g, 1012 + (k % 3) * 12, SH - 50 + k * 26, 30, 11, 1.2 + (k % 2) * 1.2, "#7fb79c");
  g.fillStyle = vGrad(g, SH, SH + 18, [[0, "#c39a7c"], [1, "#94705e"]]); g.fillRect(700, SH, 400, 18);
  g.fillStyle = rgba("#fff1d6", 0.35); g.fillRect(700, SH, 400, 3);

  // ---- window ----
  g.fillStyle = rgba("#140f2a", 0.35); g.fillRect(WO.x0 + 10, WO.y0 + 14, WO.x1 - WO.x0, WO.y1 - WO.y0 + 30);
  g.fillStyle = vGrad(g, WO.y0, WO.y1, [[0, "#cdbdf0"], [1, "#a996d6"]]); g.fillRect(WO.x0, WO.y0, WO.x1 - WO.x0, WO.y1 - WO.y0);
  g.fillStyle = "#8f7cc0"; g.fillRect(GL.x0 - 8, GL.y0 - 8, GL.x1 - GL.x0 + 16, GL.y1 - GL.y0 + 16);
  // sill
  g.fillStyle = vGrad(g, WO.y1, WO.y1 + 40, [[0, "#efe6ff"], [1, "#b5a3dc"]]); g.fillRect(WO.x0 - 30, WO.y1 - 6, WO.x1 - WO.x0 + 60, 40);
  g.fillStyle = rgba("#140f2a", 0.3); g.fillRect(WO.x0 - 30, WO.y1 + 34, WO.x1 - WO.x0 + 60, 18);
  // cut the glass panes
  g.save(); g.globalCompositeOperation = "destination-out";
  for (const [x, y, w, h] of PANES) g.fillRect(x, y, w, h);
  g.restore();
  // pane edges
  g.strokeStyle = rgba("#f4eeff", 0.9); g.lineWidth = 3;
  for (const [x, y, w, h] of PANES) g.strokeRect(x - 1.5, y - 1.5, w + 3, h + 3);
  // sill props: candle jar, cactus, books
  g.fillStyle = rgba("#ffe7c4", 0.55); g.fillRect(96, WO.y1 - 52, 40, 48);
  g.fillStyle = "#fff4e0"; g.fillRect(104, WO.y1 - 40, 24, 34);
  book(g, 170, WO.y1 - 6, 70, 14, "#8fb1e8"); book(g, 176, WO.y1 - 20, 60, 12, "#f2c879");
  g.fillStyle = "#e08a7a"; g.beginPath(); g.moveTo(312, WO.y1 - 6); g.lineTo(306, WO.y1 - 46); g.lineTo(358, WO.y1 - 46); g.lineTo(352, WO.y1 - 6); g.fill();
  g.fillStyle = "#6fa889"; g.beginPath(); g.ellipse(332, WO.y1 - 74, 16, 30, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(350, WO.y1 - 70, 9, 16, 0.6, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#ff9fc0"; g.beginPath(); g.arc(332, WO.y1 - 104, 6, 0, Math.PI * 2); g.fill();
  // rod + curtains
  g.fillStyle = "#d9b98f"; g.fillRect(-80, 246, 590, 10);
  for (const ex of [-80, 510]) { g.beginPath(); g.arc(ex, 251, 13, 0, Math.PI * 2); g.fill(); }
  curtain(g, -110, 120, 252, 1520, 6, "#b07fbe", "#f0c4e4", 5);
  curtain(g, 370, 500, 252, 1500, 4, "#b07fbe", "#f0c4e4", 6, 760);
  g.fillStyle = "#f2d29a"; g.beginPath(); g.ellipse(420, 780, 46, 12, -0.2, 0, Math.PI * 2); g.fill();

  // ---- nightstand + lamp ----
  const NX0 = 868, NX1 = 1140, NT = 1262;
  g.fillStyle = rgba("#140f2a", 0.35); g.beginPath(); g.ellipse(1000, FLOOR + 8, 190, 22, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = vGrad(g, NT, FLOOR, [[0, "#d6a98c"], [1, "#9a6f6a"]]); g.fillRect(NX0, NT + 18, NX1 - NX0, FLOOR - NT - 12);
  g.fillStyle = vGrad(g, NT, NT + 20, [[0, "#f0cfb2"], [1, "#c99a84"]]); g.fillRect(NX0 - 10, NT, NX1 - NX0 + 20, 22);
  g.strokeStyle = rgba("#5a3a4e", 0.5); g.lineWidth = 3; g.strokeRect(NX0 + 20, NT + 60, NX1 - NX0 - 40, 110); g.strokeRect(NX0 + 20, NT + 190, NX1 - NX0 - 40, 70);
  g.fillStyle = "#f6e1c4"; g.beginPath(); g.arc(1004, NT + 115, 8, 0, Math.PI * 2); g.arc(1004, NT + 225, 8, 0, Math.PI * 2); g.fill();
  radial(g, LAMP.x, NT + 10, 220, "#ffd49a", 0.45);
  // lamp body
  g.fillStyle = vGrad(g, 1150, NT, [[0, "#f6d7e6"], [1, "#c99ac0"]]); g.beginPath(); g.ellipse(LAMP.x, NT - 50, 48, 56, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#e7c49a"; g.fillRect(LAMP.x - 5, 1120, 10, 80);
  // shade (glowing)
  const shade = new Path2D(`M ${LAMP.x - 66} 1050 L ${LAMP.x + 66} 1050 L ${LAMP.x + 100} 1140 L ${LAMP.x - 100} 1140 Z`);
  const sg = g.createLinearGradient(0, 1050, 0, 1140); sg.addColorStop(0, "#fff3d6"); sg.addColorStop(1, "#ffd08a");
  g.fillStyle = sg; g.fill(shade);
  g.fillStyle = rgba("#ffffff", 0.5); g.fillRect(LAMP.x - 66, 1050, 132, 4);
  // mug + alarm clock
  g.fillStyle = "#9fd3e8"; g.fillRect(890, NT - 44, 34, 44); g.strokeStyle = "#9fd3e8"; g.lineWidth = 6; g.beginPath(); g.arc(924, NT - 24, 10, -1.2, 1.2); g.stroke();
  g.fillStyle = rgba("#ffffff", 0.35); g.fillRect(894, NT - 40, 6, 36);
  book(g, 1060, NT, 64, 12, "#a58fe0"); book(g, 1064, NT - 12, 56, 12, "#f4a07a");

  // ---- bed ----
  const BX0 = 110, BX1 = 880, TOP_B = 1326, TOP_F = 1394;
  g.fillStyle = rgba("#140f2a", 0.4); g.beginPath(); g.ellipse((BX0 + BX1) / 2, FLOOR + 30, 460, 40, 0, 0, Math.PI * 2); g.fill();
  // headboard (left end)
  g.fillStyle = vGrad(g, 1080, FLOOR, [[0, "#d9ad8f"], [1, "#9c7268"]]);
  g.beginPath(); g.roundRect(BX0 - 30, 1090, 70, FLOOR + 40 - 1090, [30, 30, 6, 6]); g.fill();
  g.fillStyle = rgba("#ffffff", 0.2); g.fillRect(BX0 - 22, 1110, 8, 420);
  // frame
  g.fillStyle = vGrad(g, 1500, 1590, [[0, "#c99a84"], [1, "#8a5f62"]]); g.fillRect(BX0, 1500, BX1 - BX0, 70);
  g.fillStyle = "#7a5258"; g.fillRect(BX0 + 10, 1565, 24, 40); g.fillRect(BX1 - 34, 1565, 24, 40);
  // mattress top
  g.fillStyle = "#efe6fa"; g.beginPath(); g.moveTo(BX0 + 10, TOP_B); g.lineTo(BX1, TOP_B); g.lineTo(BX1 + 6, TOP_F); g.lineTo(BX0 + 6, TOP_F); g.fill();
  // pillows
  const pillow = (x: number, y: number, w: number, h: number, c: string, rot: number) => {
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = c; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, h * 0.45); g.fill();
    g.fillStyle = rgba("#ffffff", 0.35); g.beginPath(); g.ellipse(-w * 0.1, -h * 0.18, w * 0.32, h * 0.16, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  };
  pillow(215, 1280, 190, 110, "#e9e4fb", -0.12);
  pillow(300, 1300, 170, 100, "#f6b9cc", 0.08);
  // duvet: covers the top and drapes over the front with a wavy hem
  const dv = new Path2D();
  dv.moveTo(330, TOP_B + 6); dv.lineTo(BX1 + 8, TOP_B + 4); dv.lineTo(BX1 + 16, 1520);
  for (let x = BX1 + 16; x > BX0; x -= 60) dv.quadraticCurveTo(x - 30, 1548 + hash(x) * 12, x - 60, 1522);
  dv.lineTo(BX0 + 4, TOP_F); dv.quadraticCurveTo(220, 1360, 330, TOP_B + 6); dv.closePath();
  g.fillStyle = vGrad(g, TOP_B, 1550, [[0, "#b9c2f4"], [0.25, "#9aa6ea"], [1, "#6f75c8"]]); g.fill(dv);
  g.save(); g.clip(dv);
  // fold shading + quilt stitching + warm lamp side
  for (let i = 0; i < 9; i++) { const fx = 170 + i * 85 + hash(i) * 20; const gr = g.createLinearGradient(fx - 26, 0, fx + 26, 0); gr.addColorStop(0, rgba("#4a4fa0", 0)); gr.addColorStop(0.5, rgba("#4a4fa0", 0.25)); gr.addColorStop(1, rgba("#4a4fa0", 0)); g.fillStyle = gr; g.fillRect(fx - 26, TOP_F, 52, 170); }
  g.strokeStyle = rgba("#e9ecff", 0.35); g.lineWidth = 2; g.setLineDash([8, 8]);
  for (let y = 1440; y < 1540; y += 50) { g.beginPath(); g.moveTo(BX0, y); g.lineTo(BX1 + 20, y + 4); g.stroke(); }
  g.setLineDash([]);
  g.fillStyle = rgba("#ffffff", 0.35); g.fillRect(BX0, TOP_F - 4, BX1 - BX0 + 20, 8);
  radial(g, BX1, 1420, 420, "#ffb27a", 0.35);
  g.restore();
  // plush bunny near the pillows + folded hoodie at the foot
  g.fillStyle = "#f3d9c4"; g.beginPath(); g.ellipse(410, 1318, 30, 26, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(398, 1280, 9, 24, -0.2, 0, Math.PI * 2); g.ellipse(420, 1280, 9, 24, 0.2, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#3a2a4a"; g.fillRect(400, 1312, 4, 4); g.fillRect(416, 1312, 4, 4);
  g.fillStyle = "#7cc7b0"; g.beginPath(); g.roundRect(740, 1352, 120, 40, 12); g.fill();
  g.fillStyle = rgba("#ffffff", 0.25); g.fillRect(750, 1358, 100, 6);

  // ---- monstera in the corner ----
  g.fillStyle = rgba("#140f2a", 0.4); g.beginPath(); g.ellipse(70, 1650, 110, 18, 0, 0, Math.PI * 2); g.fill();
  const lr = rng(23);
  for (let k = 0; k < 11; k++) {
    const ang = -Math.PI / 2 + (lr() - 0.5) * 2.2, len = 150 + lr() * 140;
    const sx = 70 + (lr() - 0.5) * 30, sy = 1500;
    const ex = sx + Math.cos(ang) * len * 1.2, ey = sy + Math.sin(ang) * len * 1.3;
    g.strokeStyle = "#4f8070"; g.lineWidth = 5; g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(sx, (sy + ey) / 2, ex, ey); g.stroke();
    leaf(g, ex, ey, 110 + lr() * 60, 46 + lr() * 18, ang + (lr() - 0.5) * 0.8, lr() < 0.5 ? "#7fbfa8" : "#5f9f90", true);
  }
  g.fillStyle = vGrad(g, 1490, 1650, [[0, "#f2c6a8"], [1, "#c98f88"]]);
  g.beginPath(); g.moveTo(-10, 1490); g.lineTo(150, 1490); g.lineTo(130, 1650); g.lineTo(10, 1650); g.fill();
  g.fillStyle = rgba("#ffffff", 0.25); g.fillRect(-10, 1490, 160, 8);

  // fairy-light wires
  for (const p of FAIRY) drawWire(g, p, rgba("#2a2046", 0.85), 2);
  vignette(g, 540, 900, 700, 1700, "#120d2a", 0.55);
  grain(g, X0, Y0, OW, OH, 0.06);
}));

const BURSTS = once(() => schedule(301, -1.2, 10, 0.62, { x0: 100, x1: 360, y0: 380, y1: 760 }, 50, 105, FW_PALETTE));
const MOTES = Array.from({ length: 22 }, (_, i) => ({ x: 760 + hash(i) * 380, y: 900 + hash(i + 50) * 520, s: 2 + hash(i + 9) * 3, p: hash(i + 99) * 6.28 }));

export const ROOM: Background = {
  groundY: 1620,
  light: { key: "#ffc58f", keyDir: 1, ambient: "#6d5fa8", rim: "#c9a8ff", strength: 0.5 },
  anchors: {
    bedSeat: { x: 540, y: 1390, w: 620 },
    window: { x: (GL.x0 + GL.x1) / 2, y: (GL.y0 + GL.y1) / 2, w: GL.x1 - GL.x0, h: GL.y1 - GL.y0 },
    lamp: { x: LAMP.x, y: LAMP.y },
  },
  draw(g: G, t: number) {
    const bursts = BURSTS();
    const fl = flashOf(bursts, t);
    g.save();
    // night view through the window
    blit(g, viewL());
    g.save();
    g.beginPath(); g.rect(GL.x0, GL.y0, GL.x1 - GL.x0, GL.y1 - GL.y0); g.clip();
    if (fl.a > 0.02) { g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.18 * fl.a; g.fillStyle = fl.col; g.fillRect(GL.x0, GL.y0, GL.x1 - GL.x0, 600); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; }
    drawFireworks(g, bursts, t, 0, 0.8);
    snowfall(g, 61, t, 40, 1.5, 4, 60, 0.8, { x0: GL.x0, y0: GL.y0, x1: GL.x1, y1: GL.y1 });
    g.restore();
    blit(g, glassL());
    blit(g, roomL());
    // firework light washing into the room from the window
    if (fl.a > 0.02) {
      g.globalCompositeOperation = "lighter";
      radial(g, 230, 760, 900, fl.col, 0.13 * fl.a, 0.25);
      g.globalCompositeOperation = "source-over";
    }
    // lamp breathing, candle flicker, dust motes
    g.globalCompositeOperation = "lighter";
    const br = 0.9 + 0.1 * Math.sin(t * 1.7) + 0.03 * Math.sin(t * 7.3);
    radial(g, LAMP.x, 1100, 360, "#ffc078", 0.16 * br);
    const fk = 0.75 + 0.25 * Math.sin(t * 11) * Math.sin(t * 7.1 + 1);
    spot(g, "#ffb35a", 116, 1036, 48 * fk, 0.5, 0.6);
    spot(g, "#fff1c4", 116, 1032, 9, 0.9 * fk, 1);
    MOTES.forEach((m, i) => {
      const x = m.x + Math.sin(t * 0.4 + m.p) * 30, y = m.y - ((t * 12 + i * 37) % 160);
      spot(g, "#ffe1b0", x, y, m.s * 2.4, 0.35 * (0.5 + 0.5 * Math.sin(t * 1.3 + m.p)), 0.9);
    });
    g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
    FAIRY.forEach((p, i) => drawBulbs(g, p, t, 3 + i * 7, ["#ffd38a", "#ffb0d0", "#fff3c4", "#c9a8ff"], 7));
    g.restore();
  },
};

