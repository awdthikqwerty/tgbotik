// Scene "sky": starry New Year sky that tilts down to snowy rooftops and Denis's lit window.
import type { Background } from "../lib/types";
import { G, easeInOut, rgba, rng, clamp, vGrad, lerp } from "../lib/util";
import {
  X0, X1, Y0, Y1, OW, once, bake, blit, grain, wash, radial, bakeStars, twinkleStars, drawFireworks, flashOf, Burst,
  skyline, snowfall, fairyPath, drawBulbs, drawWire, hash,
} from "./night-kit";

const D = 1650; // vertical camera travel (px) of the nearest layer
const F = { sky: 0.5, fw: 0.62, far: 0.78, mid: 0.9, near: 1, fg: 1.15 };
const pitch = (t: number) => 1 - easeInOut(0.3, 3.9, t);
const off = (f: number, t: number) => f * D * pitch(t);

const WIN = { x: 465, y: 900, w: 150, h: 200 }; // Denis's window (final framing)

// ---- sky layer (sky-space y from -1160 to 1340) ----
const SKY_Y0 = -1160, SKY_Y1 = 1340;
const skyL = once(() => bake(X0, SKY_Y0, OW, SKY_Y1 - SKY_Y0, (g) => {
  const span = SKY_Y1 - SKY_Y0, o = (y: number) => clamp((y - SKY_Y0) / span);
  g.fillStyle = vGrad(g, SKY_Y0, SKY_Y1, [
    [0, "#0d0c30"], [o(-560), "#1b1a45"], [o(120), "#33286a"], [o(520), "#5d3d86"], [o(780), "#a65ea6"], [o(930), "#e5899f"], [o(1060), "#f7a98b"], [1, "#fbc6a2"],
  ]);
  g.fillRect(X0, SKY_Y0, OW, span);
  wash(g, 11, X0, SKY_Y0, OW, span, ["#6b5bd0", "#c86fb0", "#2a2470", "#8f7fe0"], 16, 0.22, "soft-light");
  // milky band
  g.save(); g.translate(540, -350); g.rotate(-0.5);
  const mg = g.createLinearGradient(0, -260, 0, 260);
  mg.addColorStop(0, rgba("#b9a8ff", 0)); mg.addColorStop(0.5, rgba("#c9b8ff", 0.13)); mg.addColorStop(1, rgba("#b9a8ff", 0));
  g.fillStyle = mg; g.fillRect(-1400, -260, 2800, 520); g.restore();
  bakeStars(g, 21, 1100, X0, SKY_Y0, X1, 900, (y) => clamp(1 - (y + 200) / 1100, 0.05, 1));
  // moon
  const mx = 790, my = -440;
  radial(g, mx, my, 520, "#c9b8ff", 0.22, 0.25);
  radial(g, mx, my, 180, "#fff1d6", 0.35, 0.4);
  const mgr = g.createRadialGradient(mx - 22, my - 26, 8, mx, my, 64);
  mgr.addColorStop(0, "#fffaf0"); mgr.addColorStop(0.7, "#fbecd2"); mgr.addColorStop(1, "#f0dcc4");
  g.fillStyle = mgr; g.beginPath(); g.arc(mx, my, 62, 0, Math.PI * 2); g.fill();
  g.fillStyle = rgba("#d8c2b0", 0.35);
  [[-18, -10, 13], [20, 14, 9], [6, -28, 6], [-6, 26, 7], [26, -16, 5]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(mx + dx, my + dy, r, 0, Math.PI * 2); g.fill(); });
  grain(g, X0, SKY_Y0, OW, span, 0.06);
}));
const cloudsL = once(() => bake(X0 - 300, SKY_Y0, OW + 600, 1700, (g) => {
  const r = rng(77);
  for (let i = 0; i < 9; i++) {
    const cx = X0 - 200 + r() * (OW + 400), cy = -950 + r() * 1350, w = 260 + r() * 420;
    const lit = cy > 200 ? "#f2a6c0" : "#8a7cc9";
    for (let k = 0; k < 7; k++) {
      const x = cx + (r() - 0.5) * w, y = cy + (r() - 0.5) * 50, rx = 70 + r() * 140, ry = 16 + r() * 26;
      const gr = g.createLinearGradient(0, y - ry, 0, y + ry);
      gr.addColorStop(0, rgba("#5b4fa0", 0.0)); gr.addColorStop(0.5, rgba(lit, 0.28)); gr.addColorStop(1, rgba("#ffd2c4", 0.38));
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
    }
  }
}, 0.5, 14));

/** Tint only what is already painted (atmospheric haze on buildings, not on the sky gap). */
function hazeAtop(g: G, y0: number, y1: number, stops: Array<[number, string]>) {
  g.save(); g.globalCompositeOperation = "source-atop";
  g.fillStyle = vGrad(g, y0, y1, stops); g.fillRect(X0, y0, OW, y1 - y0);
  g.restore();
}

// ---- far / mid city ----
const farL = once(() => bake(X0, 640, OW, Y1 - 640, (g) => {
  skyline(g, { seed: 5, x0: X0 - 20, x1: X1 + 20, base: 1500, hMin: 520, hMax: 760, wMin: 50, wMax: 120, top: "#8b6fb0", bottom: "#5b4a8a", lit: 0.16, win: [4, 6], snow: "#e3dbf7", rim: "#f7a98b" });
  g.fillStyle = "#5b4a8a"; g.fillRect(X0, 1490, OW, Y1 - 1490);
  hazeAtop(g, 700, 1500, [[0, rgba("#f7b49b", 0.5)], [0.45, rgba("#e48bb6", 0.25)], [1, rgba("#8b6fb0", 0)]]);
}, 1, 1.2));
const midL = once(() => bake(X0, 820, OW, Y1 - 820, (g) => {
  skyline(g, { seed: 9, x0: X0 - 30, x1: X1 + 30, base: 1700, hMin: 560, hMax: 760, wMin: 120, wMax: 210, top: "#5f4b8f", bottom: "#3a2f68", lit: 0.26, win: [9, 13], snow: "#ece8fd", rim: "#e48bb6", spires: false });
  g.fillStyle = "#3a2f68"; g.fillRect(X0, 1690, OW, Y1 - 1690);
  hazeAtop(g, 880, 1500, [[0, rgba("#d98ab8", 0.32)], [1, rgba("#5f4b8f", 0)]]);
  grain(g, X0, 820, OW, Y1 - 820, 0.06);
}));

// ---- painterly helpers ----
function stucco(g: G, x0: number, y0: number, x1: number, y1: number, seed: number) {
  wash(g, seed, x0, y0, x1 - x0, y1 - y0, ["#c2a4e6", "#5f4690", "#e2a5c9", "#8a7ad0"], 14, 0.3);
  const r = rng(seed + 1);
  g.save();
  for (let i = 0; i < 140; i++) {
    const x = lerp(x0, x1, r()), y = lerp(y0, y1, r()), h = 30 + r() * 220;
    g.globalAlpha = 0.03 + r() * 0.05;
    g.fillStyle = r() < 0.5 ? "#2c2152" : "#e9dcff";
    g.fillRect(x, y, 2 + r() * 5, h);
  }
  g.restore();
}
/** Shadow cast just below a ledge. */
function ao(g: G, x0: number, x1: number, y: number, h = 46, a = 0.35) {
  g.fillStyle = vGrad(g, y, y + h, [[0, rgba("#24183f", a)], [1, rgba("#24183f", 0)]]);
  g.fillRect(x0, y, x1 - x0, h);
}
/** Snow blanket with a lumpy overhanging lower edge: top polyline, bottom edge from x1→x0 at y. */
function snowBlanket(g: G, top: [number, number][], xR: number, xL: number, y: number, seed: number, light = "#fbfaff", shadow = "#b4a9e0") {
  const minY = Math.min(...top.map((p) => p[1]));
  g.fillStyle = vGrad(g, minY, y + 26, [[0, light], [0.65, "#e4def9"], [1, shadow]]);
  g.beginPath();
  top.forEach(([x, yy], i) => (i ? g.lineTo(x, yy) : g.moveTo(x, yy)));
  g.lineTo(xR, y);
  const r = rng(seed);
  let x = xR;
  while (x > xL) {
    const step = 22 + r() * 30, nx = Math.max(xL, x - step);
    g.quadraticCurveTo((x + nx) / 2, y + 10 + r() * 18, nx, y);
    x = nx;
  }
  g.closePath(); g.fill();
  // sparkle flecks
  g.save(); g.fillStyle = "#ffffff";
  for (let i = 0; i < 40; i++) { g.globalAlpha = 0.3 + r() * 0.5; g.fillRect(lerp(xL, xR, r()), lerp(minY + 6, y - 4, r()), 2, 2); }
  g.restore();
}
function icicles(g: G, x0: number, x1: number, y: number, seed: number) {
  const r = rng(seed);
  for (let x = x0 + 10; x < x1 - 10; x += 14 + r() * 26) {
    const l = 10 + r() * 26;
    const gr = g.createLinearGradient(0, y, 0, y + l);
    gr.addColorStop(0, rgba("#f4f2ff", 0.95)); gr.addColorStop(1, rgba("#c9dcff", 0.2));
    g.fillStyle = gr; g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x, y + l); g.lineTo(x + 3, y); g.fill();
  }
}

// ---- hero building ----
type WinState = "warm" | "dim" | "dark" | "tv" | "denis";
function paintWindow(g: G, cx: number, y: number, w: number, h: number, st: WinState, top: boolean) {
  const x = cx - w / 2;
  // stucco surround + cap
  g.fillStyle = vGrad(g, y - 14, y + h + 14, [[0, "#d4c0ec"], [1, "#b49bd4"]]); g.fillRect(x - 14, y - 14, w + 28, h + 28);
  g.fillStyle = "#9b80c0"; g.fillRect(x - 14, y + h + 4, w + 28, 10);
  g.fillStyle = "#ddcdf1";
  g.beginPath();
  if (top) { g.moveTo(x - 24, y - 16); g.lineTo(cx, y - 62); g.lineTo(x + w + 24, y - 16); }
  else { g.moveTo(x - 24, y - 16); g.lineTo(x - 18, y - 34); g.lineTo(x + w + 18, y - 34); g.lineTo(x + w + 24, y - 16); }
  g.closePath(); g.fill();
  ao(g, x - 14, x + w + 14, y - 14, 16, 0.25);
  // snow on the cap
  g.fillStyle = "#f6f3ff";
  g.beginPath();
  if (top) { g.moveTo(x - 26, y - 14); g.lineTo(cx, y - 66); g.lineTo(x + w + 26, y - 14); g.quadraticCurveTo(x + w + 10, y - 12, x + w + 8, y - 20); g.lineTo(cx, y - 52); g.lineTo(x - 8, y - 20); g.quadraticCurveTo(x - 12, y - 10, x - 26, y - 14); }
  else { g.moveTo(x - 22, y - 32); g.quadraticCurveTo(cx, y - 48, x + w + 22, y - 32); g.quadraticCurveTo(x + w + 24, y - 24, x + w + 14, y - 26); g.lineTo(x - 14, y - 26); g.quadraticCurveTo(x - 24, y - 24, x - 22, y - 32); }
  g.closePath(); g.fill();
  // glass
  let gr: CanvasGradient;
  if (st === "denis") { gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, "#ffefc4"); gr.addColorStop(0.55, "#ffd28e"); gr.addColorStop(1, "#ffae78"); }
  else if (st === "warm") { gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, "#f6d39a"); gr.addColorStop(1, "#e3966e"); }
  else if (st === "dim") { gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, "#c2939a"); gr.addColorStop(1, "#8d5f78"); }
  else if (st === "tv") { gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, "#9cc2ff"); gr.addColorStop(1, "#6a6fd0"); }
  else { gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, "#3c3576"); gr.addColorStop(0.5, "#2a2558"); gr.addColorStop(1, "#342d68"); }
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  if (st === "denis") {
    // a glimpse of his room: lilac wall, poster, shelf, lamp glow
    g.fillStyle = rgba("#c58fc0", 0.35); g.fillRect(x, y, w, h * 0.72);
    radial(g, x + w * 0.75, y + h * 0.55, 90, "#fff2c8", 0.8);
    g.fillStyle = rgba("#8f6fd0", 0.55); g.fillRect(x + w * 0.3, y + h * 0.16, w * 0.24, h * 0.26);
    g.fillStyle = rgba("#ffb3c8", 0.7); g.beginPath(); g.arc(x + w * 0.42, y + h * 0.28, 9, 0, Math.PI * 2); g.fill();
    g.fillStyle = rgba("#7a4f86", 0.6); g.fillRect(x, y + h * 0.5, w * 0.45, 6);
    g.fillStyle = rgba("#9b6aa6", 0.55); g.fillRect(x, y + h * 0.8, w, h * 0.2);
  }
  if (st === "warm" || st === "denis" || st === "dim") {
    const cc = st === "denis" ? "#f7a7bf" : st === "warm" ? "#d98a8a" : "#7e5476";
    const cg = g.createLinearGradient(x, 0, x + w * 0.25, 0); cg.addColorStop(0, rgba(cc, 0.95)); cg.addColorStop(1, rgba(cc, 0.6));
    g.fillStyle = cg;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + w * 0.26, y); g.quadraticCurveTo(x + w * 0.1, y + h * 0.5, x + w * 0.2, y + h); g.lineTo(x, y + h); g.fill();
    const cg2 = g.createLinearGradient(x + w, 0, x + w * 0.75, 0); cg2.addColorStop(0, rgba(cc, 0.95)); cg2.addColorStop(1, rgba(cc, 0.6));
    g.fillStyle = cg2;
    g.beginPath(); g.moveTo(x + w, y); g.lineTo(x + w * 0.74, y); g.quadraticCurveTo(x + w * 0.9, y + h * 0.5, x + w * 0.8, y + h); g.lineTo(x + w, y + h); g.fill();
  }
  if (st === "dark" || st === "tv") { // moon reflection
    g.fillStyle = rgba("#c5b8ff", 0.22);
    g.beginPath(); g.moveTo(x + w * 0.15, y + h); g.lineTo(x + w * 0.55, y); g.lineTo(x + w * 0.75, y); g.lineTo(x + w * 0.35, y + h); g.fill();
  }
  // frame + mullions
  g.strokeStyle = "#f3eafc"; g.lineWidth = 7; g.strokeRect(x, y, w, h);
  g.lineWidth = 6; g.beginPath(); g.moveTo(cx, y); g.lineTo(cx, y + h); g.moveTo(x, y + h * 0.33); g.lineTo(x + w, y + h * 0.33); g.stroke();
  g.strokeStyle = rgba("#6e5596", 0.5); g.lineWidth = 2; g.strokeRect(x - 4, y - 4, w + 8, h + 8);
  if (st === "denis") { // plant on the sill
    g.fillStyle = "#b56d86"; g.fillRect(x + w * 0.64, y + h - 30, 26, 28);
    g.fillStyle = "#5f8a72";
    for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(x + w * 0.64 + 13 + (i - 2) * 9, y + h - 40 - (i % 2) * 10, 7, 15, (i - 2) * 0.4, 0, Math.PI * 2); g.fill(); }
  }
  // sill snow, warmed by the window light
  const lit = st !== "dark";
  g.fillStyle = lit ? "#fff1e2" : "#f2efff";
  g.beginPath(); g.moveTo(x - 20, y + h + 16); g.quadraticCurveTo(cx, y + h - 4, x + w + 20, y + h + 16); g.quadraticCurveTo(x + w + 22, y + h + 24, x + w + 12, y + h + 22); g.lineTo(x - 12, y + h + 22); g.quadraticCurveTo(x - 22, y + h + 24, x - 20, y + h + 16); g.fill();
}

const EAVE = 870, FX0 = 160, FX1 = 920;
const nearL = once(() => bake(X0, 480, OW, Y1 - 480, (g) => {
  // neighbours
  const nb = (x0: number, x1: number, ridge: number, eave: number, seed: number, body: string, body2: string) => {
    g.fillStyle = vGrad(g, eave, Y1, [[0, body], [1, body2]]); g.fillRect(x0, eave, x1 - x0, Y1 - eave);
    stucco(g, x0, eave, x1, Y1, seed + 40);
    g.fillStyle = "#3e3170";
    g.beginPath(); g.moveTo(x0 - 10, eave + 8); g.lineTo(x0 + 40, ridge); g.lineTo(x1 - 40, ridge); g.lineTo(x1 + 10, eave + 8); g.closePath(); g.fill();
    snowBlanket(g, [[x0 - 14, eave + 4], [x0 + 38, ridge - 6], [x1 - 38, ridge - 6], [x1 + 14, eave + 4]], x1 + 14, x0 - 14, eave + 6, seed + 3);
    ao(g, x0, x1, eave + 10, 50, 0.4);
    const r = rng(seed);
    for (let row = 0; row < 4; row++) for (let c = 0; c < 3; c++) {
      const wx = x0 + 50 + c * ((x1 - x0 - 100) / 2.4), wy = eave + 90 + row * 340;
      if (wx + 80 > x1) continue;
      const lit = r() < 0.45;
      if (lit) radial(g, wx + 40, wy + 65, 170, "#ffc988", 0.22);
      g.fillStyle = lit ? vGrad(g, wy, wy + 130, [[0, "#ffd9a0"], [1, "#e79a72"]]) : "#2c2659"; g.fillRect(wx, wy, 80, 130);
      g.strokeStyle = "#b8a2d6"; g.lineWidth = 5; g.strokeRect(wx, wy, 80, 130);
      g.lineWidth = 3; g.beginPath(); g.moveTo(wx + 40, wy); g.lineTo(wx + 40, wy + 130); g.stroke();
      g.fillStyle = "#efeafd"; g.beginPath(); g.ellipse(wx + 40, wy + 132, 50, 7, 0, Math.PI, 0); g.fill();
    }
  };
  nb(X0 - 20, 180, 820, 970, 3, "#6a5aa0", "#3c3168");
  nb(900, X1 + 20, 860, 1000, 4, "#8a5f98", "#4a3466");
  // hero facade
  g.fillStyle = vGrad(g, EAVE, Y1, [[0, "#9a7fc0"], [0.5, "#7b62a2"], [1, "#56437f"]]);
  g.fillRect(FX0, EAVE, FX1 - FX0, Y1 - EAVE);
  const side = g.createLinearGradient(FX0, 0, FX1, 0);
  side.addColorStop(0, rgba("#d6c6ff", 0.25)); side.addColorStop(0.45, rgba("#c8b6ff", 0)); side.addColorStop(1, rgba("#2a2050", 0.3));
  g.fillStyle = side; g.fillRect(FX0, EAVE, FX1 - FX0, Y1 - EAVE);
  stucco(g, FX0, EAVE, FX1, Y1, 31);
  // corner pilasters
  for (const px of [FX0, FX1 - 34]) { g.fillStyle = rgba("#c6b0e2", 0.55); g.fillRect(px, EAVE, 34, Y1 - EAVE); g.fillStyle = rgba("#3a2a60", 0.25); g.fillRect(px + 28, EAVE, 6, Y1 - EAVE); }
  // window light pools (under the windows themselves)
  const cols = [260, 540, 820];
  const states: WinState[][] = [["dim", "denis", "dark"], ["dark", "warm", "tv"], ["warm", "dark", "warm"], ["dark", "dim", "dark"]];
  g.save(); g.globalCompositeOperation = "lighter";
  states.forEach((row, ri) => row.forEach((st, ci) => {
    if (st === "dark") return;
    radial(g, cols[ci], 900 + ri * 370 + 110, st === "denis" ? 300 : 210, st === "tv" ? "#6f8fff" : "#ff9f5a", st === "denis" ? 0.32 : 0.16);
  }));
  g.restore();
  // cornices and floor bands
  for (const by of [EAVE, 1170, 1540, 1910]) {
    g.fillStyle = vGrad(g, by, by + 22, [[0, "#ddd0f2"], [1, "#a68dc8"]]); g.fillRect(FX0 - 16, by, FX1 - FX0 + 32, 22);
    ao(g, FX0 - 16, FX1 + 16, by + 22, 40, 0.38);
    g.fillStyle = "#f6f3ff"; g.beginPath(); g.moveTo(FX0 - 18, by + 3); g.quadraticCurveTo(540, by - 14, FX1 + 18, by + 3); g.lineTo(FX1 + 18, by + 5); g.lineTo(FX0 - 18, by + 5); g.fill();
  }
  // mansard roof: slate under a thick snow blanket
  g.fillStyle = vGrad(g, 680, EAVE, [[0, "#5a4a8a"], [1, "#3a2d66"]]);
  g.beginPath(); g.moveTo(FX0 - 14, EAVE + 4); g.lineTo(FX0 + 50, 690); g.lineTo(FX1 - 50, 690); g.lineTo(FX1 + 14, EAVE + 4); g.closePath(); g.fill();
  // chimneys (behind the snow line)
  for (const [cx, top] of [[230, 560], [850, 590]]) {
    g.fillStyle = vGrad(g, top, 720, [[0, "#9a6a8e"], [1, "#6a4878"]]); g.fillRect(cx - 28, top, 56, 720 - top);
    g.fillStyle = rgba("#3a2450", 0.35); g.fillRect(cx + 10, top, 18, 720 - top);
    g.strokeStyle = rgba("#4a3060", 0.35); g.lineWidth = 2;
    for (let yy = top + 22; yy < 720; yy += 18) { g.beginPath(); g.moveTo(cx - 28, yy); g.lineTo(cx + 28, yy); g.stroke(); }
    g.fillStyle = "#5b3f6a"; g.fillRect(cx - 34, top, 68, 14);
    g.fillStyle = "#f7f4ff"; g.beginPath(); g.ellipse(cx, top - 2, 40, 13, 0, Math.PI, 0); g.quadraticCurveTo(cx + 40, top + 10, cx + 30, top + 8); g.lineTo(cx - 30, top + 8); g.quadraticCurveTo(cx - 40, top + 10, cx - 40, top - 2); g.fill();
  }
  snowBlanket(g, [[FX0 - 18, EAVE], [FX0 + 46, 682], [540, 668], [FX1 - 46, 682], [FX1 + 18, EAVE]], FX1 + 18, FX0 - 18, EAVE + 4, 71);
  g.fillStyle = rgba("#7a6cb8", 0.22);
  g.beginPath(); g.moveTo(FX1 - 46, 684); g.lineTo(FX1 + 18, EAVE); g.lineTo(FX1 - 70, EAVE); g.closePath(); g.fill();
  icicles(g, FX0, FX1, EAVE + 14, 5);
  // dormers
  for (const [dx, lit] of [[300, true], [780, false]] as [number, boolean][]) {
    g.fillStyle = vGrad(g, 720, 840, [[0, "#9580be"], [1, "#6f5a9a"]]); g.fillRect(dx - 50, 722, 100, 120);
    if (lit) radial(g, dx, 790, 160, "#ffc27a", 0.3);
    g.fillStyle = lit ? vGrad(g, 750, 830, [[0, "#ffe3ad"], [1, "#f2a676"]]) : "#2e2860"; g.fillRect(dx - 30, 750, 60, 80);
    g.strokeStyle = "#ece2fa"; g.lineWidth = 5; g.strokeRect(dx - 30, 750, 60, 80);
    g.beginPath(); g.moveTo(dx, 750); g.lineTo(dx, 830); g.stroke();
    snowBlanket(g, [[dx - 68, 728], [dx, 672], [dx + 68, 728]], dx + 68, dx - 68, 730, dx);
    g.fillStyle = "#f4f1ff"; g.beginPath(); g.ellipse(dx, 846, 58, 10, 0, Math.PI, 0); g.fill();
  }
  // garland wire along the top floor (bulbs are animated in draw)
  for (const seg of GARLAND) drawWire(g, seg, rgba("#2e2448", 0.8), 2);
  // drainpipe
  g.fillStyle = vGrad(g, EAVE, Y1, [[0, "#6f5c96"], [1, "#4f3f78"]]); g.fillRect(FX1 - 6, EAVE + 20, 12, Y1);
  // windows
  states.forEach((row, ri) => row.forEach((st, ci) => paintWindow(g, cols[ci], 900 + ri * 370, 150, 200, st, ri === 0)));
  grain(g, X0, 480, OW, Y1 - 480, 0.07);
}));
const GARLAND = [fairyPath(170, EAVE + 36, 400, EAVE + 36, 34, 22), fairyPath(400, EAVE + 36, 680, EAVE + 36, 40, 22), fairyPath(680, EAVE + 36, 910, EAVE + 36, 34, 22)];

// ---- foreground rooftops ----
const fgL = once(() => bake(X0, 1300, OW, Y1 + 400 - 1300, (g) => {
  const roof = (top: [number, number], bot: [number, number], dir: number, chim: [number, number], seed: number) => {
    const [cx, cy] = chim;
    g.fillStyle = vGrad(g, cy, cy + 220, [[0, "#7a5280"], [1, "#4a3360"]]); g.fillRect(cx - 34, cy, 68, 240);
    g.fillStyle = rgba("#2a1c40", 0.35); g.fillRect(cx + (dir > 0 ? 12 : -34), cy, 22, 240);
    g.fillStyle = "#f6f3ff"; g.beginPath(); g.ellipse(cx, cy, 46, 15, 0, Math.PI, 0); g.lineTo(cx + 40, cy + 8); g.lineTo(cx - 40, cy + 8); g.fill();
    const B = Y1 + 400;
    // slate body
    g.fillStyle = vGrad(g, Math.min(top[1], bot[1]), B, [[0, "#3e3270"], [1, "#1f1840"]]);
    g.beginPath(); g.moveTo(top[0], top[1]); g.lineTo(bot[0], bot[1]); g.lineTo(bot[0], B); g.lineTo(top[0], B); g.closePath(); g.fill();
    // slate rows parallel to the edge
    g.save(); g.clip();
    g.strokeStyle = rgba("#7a6cb8", 0.22); g.lineWidth = 3;
    for (let k = 1; k < 14; k++) { g.beginPath(); g.moveTo(top[0], top[1] + k * 46); g.lineTo(bot[0], bot[1] + k * 46); g.stroke(); }
    const r = rng(seed);
    g.fillStyle = rgba("#e8e3fb", 0.8);
    for (let i = 0; i < 18; i++) { const u = r(), k = 2 + r() * 10; const x = lerp(top[0], bot[0], u), y = lerp(top[1], bot[1], u) + k * 46; g.beginPath(); g.ellipse(x, y, 14 + r() * 26, 5, Math.atan2(bot[1] - top[1], bot[0] - top[0]), 0, Math.PI * 2); g.fill(); }
    g.restore();
    // thick snow along the ridge
    const ang = Math.atan2(bot[1] - top[1], bot[0] - top[0]);
    g.save(); g.translate(top[0], top[1]); g.rotate(ang);
    const len = Math.hypot(bot[0] - top[0], bot[1] - top[1]);
    snowBlanket(g, [[-10, -16], [len + 10, -16]], len + 10, -10, 70, seed + 9);
    g.restore();
    // rim light from the sky
    g.strokeStyle = rgba("#ffd9ef", 0.7); g.lineWidth = 3;
    g.beginPath(); g.moveTo(top[0], top[1] - 16); g.lineTo(bot[0], bot[1] - 16); g.stroke();
  };
  roof([X0 - 10, 1520], [300, 1780], -1, [40, 1440], 2);
  // right roof drawn mirrored so its snow faces up
  g.save(); g.translate(1080, 0); g.scale(-1, 1);
  roof([1080 - (X1 + 10), 1640], [300, 1860], -1, [1080 - 1150, 1600], 6);
  g.restore();
  // TV antenna on the right roof
  g.strokeStyle = "#2a2148"; g.lineWidth = 4;
  g.beginPath(); g.moveTo(1010, 1740); g.lineTo(1010, 1560); g.moveTo(960, 1590); g.lineTo(1060, 1590); g.moveTo(975, 1620); g.lineTo(1045, 1620); g.stroke();
  grain(g, X0, 1300, OW, 1340, 0.07);
}));

// ---- fireworks (screen positions at burst time → fixed in the firework layer) ----
const BURSTS = once((): Burst[] => {
  const spec: [number, number, number, number, string, string, Burst["kind"]][] = [
    [-0.5, 300, 640, 230, "#ff8fcf", "#ffc2e4", "peony"],
    [0.15, 780, 400, 260, "#ffd27a", "#ff9f6b", "chrys"],
    [0.75, 520, 860, 200, "#8fe9ff", "#c9a8ff", "ring"],
    [1.3, 220, 420, 240, "#c9a8ff", "#ff8fcf", "peony"],
    [1.85, 860, 760, 210, "#ff7aa8", "#ffd0e0", "peony"],
    [2.35, 430, 300, 280, "#ffd27a", "#ffb070", "willow"],
    [2.85, 720, 470, 220, "#8fe9ff", "#ffffff", "chrys"],
    [3.3, 270, 330, 200, "#ff8fcf", "#c9a8ff", "peony"],
    [3.7, 830, 260, 230, "#ffd27a", "#fff1d6", "ring"],
    [4.05, 600, 420, 210, "#c9a8ff", "#8fe9ff", "peony"],
    [4.4, 180, 240, 180, "#ff7aa8", "#ffd27a", "chrys"],
    [4.7, 900, 330, 200, "#8fe9ff", "#c9a8ff", "peony"],
  ];
  return spec.map(([t, x, ys, r, col, col2, kind], i) => ({ t, x, y: ys - off(F.fw, t), r, col, col2, kind, seed: 900 + i * 17 }));
});

const windowFairy = fairyPath(WIN.x + 8, WIN.y + 14, WIN.x + WIN.w - 8, WIN.y + 14, 34, 16);
const shift = (pts: [number, number][], dy: number) => pts.map(([x, y]) => [x, y + dy] as [number, number]);

export const SKY: Background = {
  groundY: 1700,
  light: { key: "#ffd9a8", keyDir: 1, ambient: "#4f4a9a", rim: "#ff9fd0", strength: 0.3 },
  anchors: { window: { x: WIN.x + WIN.w / 2, y: WIN.y + WIN.h / 2, w: WIN.w, h: WIN.h }, moonStart: { x: 790, y: -440 + F.sky * D } },
  draw(g: G, t: number) {
    g.save();
    blit(g, skyL(), 0, off(F.sky, t));
    g.globalAlpha = 0.9; blit(g, cloudsL(), t * 7 - 40, off(F.sky, t)); g.globalAlpha = 1;
    twinkleStars(g, 33, 70, X0, SKY_Y0, X1, 700, t, off(F.sky, t), (y) => clamp(1 - (y + 100) / 800));
    const bursts = BURSTS(), dyF = off(F.fw, t);
    const fl = flashOf(bursts, t);
    if (fl.a > 0.02) { g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.14 * fl.a; g.fillStyle = fl.col; g.fillRect(X0, Y0, OW, Y1 - Y0); g.globalCompositeOperation = "source-over"; g.globalAlpha = 1; }
    drawFireworks(g, bursts, t, dyF);
    blit(g, farL(), 0, off(F.far, t));
    blit(g, midL(), 0, off(F.mid, t));
    const dn = off(F.near, t);
    blit(g, nearL(), 0, dn);
    // Denis's window: breathing glow + fairy lights; garland along the top floor
    g.globalCompositeOperation = "lighter";
    const br = 0.85 + 0.15 * Math.sin(t * 2.3);
    radial(g, WIN.x + WIN.w / 2, WIN.y + WIN.h / 2 + dn, 300, "#ffc27a", 0.2 * br);
    g.globalCompositeOperation = "source-over";
    drawBulbs(g, shift(windowFairy, dn), t, 5, ["#fff0b8", "#ffb0d0", "#ffd38a"], 4);
    GARLAND.forEach((seg, i) => drawBulbs(g, shift(seg, dn), t, 11 + i, ["#ffd38a", "#ff9fcf", "#fff3c4", "#9fe6ff"], 6));
    // fireworks light the scene a little
    if (fl.a > 0.02) {
      g.globalCompositeOperation = "soft-light"; g.globalAlpha = 0.22 * fl.a; g.fillStyle = fl.col; g.fillRect(X0, Y0, OW, Y1 - Y0);
      g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
    }
    blit(g, fgL(), 0, off(F.fg, t));
    snowfall(g, 8, t, 70, 1.5, 5, 55, 0.55 * clamp(1 - pitch(t) * 0.8));
    g.restore();
  },
};
