// Scene "sky": starry New Year sky that tilts down to snowy rooftops and Denis's lit window.
import type { Background } from "../lib/types";
import { G, easeInOut, rgba, rng, clamp, vGrad } from "../lib/util";
import {
  X0, X1, Y0, Y1, OW, once, bake, blit, grain, wash, radial, bakeStars, twinkleStars, drawFireworks, flashOf, Burst,
  skyline, snowfall, fairyPath, drawBulbs, hash,
} from "./night-kit";

const D = 1650; // vertical camera travel (px) of the nearest layer
const F = { sky: 0.5, fw: 0.62, far: 0.78, mid: 0.9, near: 1, fg: 1.15 };
const pitch = (t: number) => 1 - easeInOut(0.3, 3.9, t);
const off = (f: number, t: number) => f * D * pitch(t);

const WIN = { x: 465, y: 900, w: 150, h: 200 }; // Denis's window (final framing)

// ---- sky layer (sky-space y from -1150 to 1330) ----
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

// ---- far / mid city ----
const farL = once(() => bake(X0, 640, OW, Y1 - 640, (g) => {

  skyline(g, { seed: 5, x0: X0 - 20, x1: X1 + 20, base: 1500, hMin: 520, hMax: 760, wMin: 50, wMax: 120, top: "#8b6fb0", bottom: "#5b4a8a", lit: 0.16, win: [4, 6], snow: "#e3dbf7", rim: "#f7a98b" });

  g.fillStyle = "#5b4a8a"; g.fillRect(X0, 1490, OW, Y1 - 1490);
  // horizon haze over the far city
  g.fillStyle = vGrad(g, 720, 1200, [[0, rgba("#f7a98b", 0)], [0.5, rgba("#f7a98b", 0.18)], [1, rgba("#c86fb0", 0.08)]]);
  g.fillRect(X0, 720, OW, 480);
}, 1, 1.2));
const midL = once(() => bake(X0, 820, OW, Y1 - 820, (g) => {
  skyline(g, { seed: 9, x0: X0 - 30, x1: X1 + 30, base: 1700, hMin: 560, hMax: 760, wMin: 120, wMax: 210, top: "#5f4b8f", bottom: "#3a2f68", lit: 0.26, win: [9, 13], snow: "#ece8fd", rim: "#e48bb6", spires: false });
  g.fillStyle = "#3a2f68"; g.fillRect(X0, 1690, OW, Y1 - 1690);
  grain(g, X0, 820, OW, Y1 - 820, 0.06);
}));

// ---- hero building ----
type WinState = "warm" | "dim" | "dark" | "tv" | "denis";
function paintWindow(g: G, cx: number, y: number, w: number, h: number, st: WinState, top: boolean, seed: number) {
  const x = cx - w / 2;
  // stucco surround + cap
  g.fillStyle = "#c9b3e4"; g.fillRect(x - 14, y - 14, w + 28, h + 28);
  g.fillStyle = "#a88cc8"; g.fillRect(x - 14, y + h + 4, w + 28, 10);
  g.fillStyle = "#d8c6ef";
  g.beginPath();
  if (top) { g.moveTo(x - 24, y - 16); g.lineTo(cx, y - 62); g.lineTo(x + w + 24, y - 16); }
  else { g.moveTo(x - 24, y - 16); g.lineTo(x - 18, y - 34); g.lineTo(x + w + 18, y - 34); g.lineTo(x + w + 24, y - 16); }
  g.closePath(); g.fill();
  // snow on the cap
  g.fillStyle = "#f4f1ff";
  g.beginPath();
  if (top) { g.moveTo(x - 26, y - 14); g.lineTo(cx, y - 66); g.lineTo(x + w + 26, y - 14); g.lineTo(x + w + 12, y - 18); g.lineTo(cx, y - 54); g.lineTo(x - 12, y - 18); }
  else { g.moveTo(x - 22, y - 32); g.quadraticCurveTo(cx, y - 46, x + w + 22, y - 32); g.lineTo(x + w + 20, y - 30); g.lineTo(x - 20, y - 30); }
  g.closePath(); g.fill();
  // glass
  let gr: CanvasGradient;
  if (st === "denis") { gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, "#ffe9b8"); gr.addColorStop(0.6, "#ffcf8a"); gr.addColorStop(1, "#ffb377"); }
  else if (st === "warm") { gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, "#f6d39a"); gr.addColorStop(1, "#e79a6e"); }
  else if (st === "dim") { gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, "#b98a8e"); gr.addColorStop(1, "#8d5f78"); }
  else if (st === "tv") { gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, "#8fb8ff"); gr.addColorStop(1, "#6a6fd0"); }
  else { gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, "#3c3576"); gr.addColorStop(0.5, "#2a2558"); gr.addColorStop(1, "#342d68"); }
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  if (st === "denis") {
    // inside: back wall hint, poster, curtains, plant on the sill
    g.fillStyle = rgba("#e9a7b8", 0.55); g.fillRect(x + w * 0.58, y + h * 0.18, w * 0.22, h * 0.28);
    g.fillStyle = rgba("#9b6aa6", 0.45); g.fillRect(x, y + h * 0.78, w, h * 0.22);
  }
  if (st === "warm" || st === "denis" || st === "dim") {
    const cc = st === "denis" ? "#f59fb6" : st === "warm" ? "#d98a8a" : "#7e5476";
    g.fillStyle = rgba(cc, 0.85);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + w * 0.24, y); g.quadraticCurveTo(x + w * 0.12, y + h * 0.5, x + w * 0.2, y + h); g.lineTo(x, y + h); g.fill();
    g.beginPath(); g.moveTo(x + w, y); g.lineTo(x + w * 0.76, y); g.quadraticCurveTo(x + w * 0.88, y + h * 0.5, x + w * 0.8, y + h); g.lineTo(x + w, y + h); g.fill();
  }
  if (st === "dark") { // moon reflection
    g.fillStyle = rgba("#b5a8f0", 0.25);
    g.beginPath(); g.moveTo(x + w * 0.15, y + h); g.lineTo(x + w * 0.55, y); g.lineTo(x + w * 0.75, y); g.lineTo(x + w * 0.35, y + h); g.fill();
  }
  // frame + mullions
  g.strokeStyle = "#f3eafc"; g.lineWidth = 7; g.strokeRect(x, y, w, h);
  g.lineWidth = 6; g.beginPath(); g.moveTo(cx, y); g.lineTo(cx, y + h); g.moveTo(x, y + h * 0.33); g.lineTo(x + w, y + h * 0.33); g.stroke();
  if (st === "denis") { // little plant silhouette on the sill
    g.fillStyle = "#6a4a6e"; g.fillRect(x + w * 0.66, y + h - 30, 26, 28);
    g.fillStyle = "#4f6a5e";
    for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(x + w * 0.66 + 13 + (i - 2) * 9, y + h - 40 - (i % 2) * 10, 7, 15, (i - 2) * 0.4, 0, Math.PI * 2); g.fill(); }
  }
  // sill snow
  g.fillStyle = "#f6f3ff";
  g.beginPath(); g.moveTo(x - 20, y + h + 16); g.quadraticCurveTo(cx, y + h - 2, x + w + 20, y + h + 16); g.lineTo(x + w + 18, y + h + 22); g.lineTo(x - 18, y + h + 22); g.fill();
  void seed;
}

const nearL = once(() => bake(X0, 480, OW, Y1 - 480, (g) => {
  // neighbours
  const nb = (x0: number, x1: number, ridge: number, eave: number, seed: number) => {
    g.fillStyle = vGrad(g, eave, Y1, [[0, "#5a4888"], [1, "#3c3168"]]); g.fillRect(x0, eave, x1 - x0, Y1 - eave);
    g.fillStyle = vGrad(g, ridge, eave, [[0, "#f2eefe"], [1, "#bdb3e6"]]);
    g.beginPath(); g.moveTo(x0 - 10, eave + 6); g.lineTo(x0 + 40, ridge); g.lineTo(x1 - 40, ridge); g.lineTo(x1 + 10, eave + 6); g.closePath(); g.fill();
    g.fillStyle = "#4a3c78"; g.fillRect(x0 - 10, eave + 4, x1 - x0 + 20, 12);
    const r = rng(seed);
    for (let row = 0; row < 4; row++) for (let c = 0; c < 3; c++) {
      const wx = x0 + 50 + c * ((x1 - x0 - 100) / 2.4), wy = eave + 90 + row * 340;
      if (wx + 80 > x1) continue;
      const lit = r() < 0.4;
      g.fillStyle = lit ? "#f0be86" : "#2c2659"; g.fillRect(wx, wy, 80, 130);
      if (lit) radial(g, wx + 40, wy + 65, 160, "#ffc988", 0.18);
      g.strokeStyle = "#a993c9"; g.lineWidth = 5; g.strokeRect(wx, wy, 80, 130);
      g.fillStyle = "#efeafd"; g.fillRect(wx - 8, wy + 128, 96, 8);
    }
  };
  nb(X0 - 20, 180, 820, 970, 3);
  nb(900, X1 + 20, 860, 1000, 4);
  // hero facade
  const fx0 = 160, fx1 = 920, eave = 870;
  g.fillStyle = vGrad(g, eave, Y1, [[0, "#9277b6"], [0.5, "#7b62a2"], [1, "#5a4888"]]);
  g.fillRect(fx0, eave, fx1 - fx0, Y1 - eave);
  const side = g.createLinearGradient(fx0, 0, fx1, 0);
  side.addColorStop(0, rgba("#c8b6ff", 0.22)); side.addColorStop(0.5, rgba("#c8b6ff", 0)); side.addColorStop(1, rgba("#2a2050", 0.25));
  g.fillStyle = side; g.fillRect(fx0, eave, fx1 - fx0, Y1 - eave);
  wash(g, 31, fx0, eave, fx1 - fx0, Y1 - eave, ["#b494d8", "#6a4f96", "#d59ac4"], 10, 0.25);
  // cornices and floor bands
  for (const by of [eave, 1170, 1540, 1910]) {
    g.fillStyle = "#c6b0e2"; g.fillRect(fx0 - 16, by, fx1 - fx0 + 32, 20);
    g.fillStyle = "#6c568f"; g.fillRect(fx0 - 16, by + 20, fx1 - fx0 + 32, 6);
    g.fillStyle = "#f6f3ff"; g.beginPath(); g.moveTo(fx0 - 18, by + 2); g.quadraticCurveTo(540, by - 14, fx1 + 18, by + 2); g.lineTo(fx1 + 18, by + 4); g.lineTo(fx0 - 18, by + 4); g.fill();
  }
  // mansard roof with snow
  g.fillStyle = vGrad(g, 680, eave, [[0, "#fbf9ff"], [0.6, "#e2dcf8"], [1, "#b9b0e2"]]);
  g.beginPath(); g.moveTo(fx0 - 14, eave + 4); g.lineTo(fx0 + 50, 690); g.quadraticCurveTo(540, 672, fx1 - 50, 690); g.lineTo(fx1 + 14, eave + 4); g.closePath(); g.fill();
  g.fillStyle = rgba("#7a6cb8", 0.25);
  g.beginPath(); g.moveTo(fx1 - 50, 690); g.lineTo(fx1 + 14, eave + 4); g.lineTo(fx1 - 60, eave + 4); g.closePath(); g.fill();
  // icicle-ish drips along the eave
  g.fillStyle = "#f3f0ff";
  for (let x = fx0; x < fx1; x += 26) { const l = 8 + hash(x) * 20; g.beginPath(); g.moveTo(x, eave + 4); g.lineTo(x + 6, eave + 4 + l); g.lineTo(x + 12, eave + 4); g.fill(); }
  // dormers
  for (const [dx, lit] of [[300, true], [780, false]] as [number, boolean][]) {
    g.fillStyle = "#806aa8"; g.fillRect(dx - 50, 720, 100, 120);
    g.fillStyle = lit ? "#ffd59a" : "#2e2860"; g.fillRect(dx - 30, 750, 60, 80);
    if (lit) radial(g, dx, 790, 140, "#ffcf8a", 0.25);
    g.strokeStyle = "#e8def8"; g.lineWidth = 5; g.strokeRect(dx - 30, 750, 60, 80);
    g.fillStyle = "#f8f6ff"; g.beginPath(); g.moveTo(dx - 66, 726); g.lineTo(dx, 672); g.lineTo(dx + 66, 726); g.lineTo(dx + 54, 732); g.lineTo(dx, 690); g.lineTo(dx - 54, 732); g.fill();
  }
  // chimneys
  for (const [cx, top] of [[230, 560], [850, 590]]) {
    g.fillStyle = vGrad(g, top, 700, [[0, "#8a5f8e"], [1, "#6a4878"]]); g.fillRect(cx - 28, top, 56, 700 - top);
    g.fillStyle = "#5b3f6a"; g.fillRect(cx - 34, top, 68, 14);
    g.fillStyle = "#f7f4ff"; g.beginPath(); g.ellipse(cx, top - 2, 38, 11, 0, 0, Math.PI * 2); g.fill();
  }
  // windows
  const cols = [260, 540, 820];
  const states: WinState[][] = [["dim", "denis", "dark"], ["dark", "warm", "tv"], ["warm", "dark", "warm"], ["dark", "dim", "dark"]];
  states.forEach((row, ri) => row.forEach((st, ci) => {
    const y = 900 + ri * 370;
    if (st !== "dark") radial(g, cols[ci], y + 100, st === "denis" ? 260 : 200, st === "tv" ? "#8fb8ff" : "#ffc580", st === "denis" ? 0.35 : 0.2);
    paintWindow(g, cols[ci], y, 150, 200, st, ri === 0, ri * 3 + ci);
  }));
  // drainpipe
  g.fillStyle = "#6a588f"; g.fillRect(fx1 - 6, eave + 20, 12, Y1);
  grain(g, X0, 480, OW, Y1 - 480, 0.07);
}));

// ---- foreground rooftops ----
const fgL = once(() => bake(X0, 1300, OW, Y1 + 400 - 1300, (g) => {
  const roof = (pts: [number, number][], chim: [number, number] | null) => {
    if (chim) {
      const [cx, cy] = chim;
      g.fillStyle = vGrad(g, cy, cy + 200, [[0, "#6c4a76"], [1, "#4a3360"]]); g.fillRect(cx - 34, cy, 68, 220);
      g.fillStyle = "#f6f3ff"; g.beginPath(); g.ellipse(cx, cy, 44, 13, 0, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = "#2d2452";
    g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
    // snow blanket on the slope
    const [a, b] = [pts[0], pts[1]];
    g.fillStyle = vGrad(g, Math.min(a[1], b[1]) - 10, Math.max(a[1], b[1]) + 90, [[0, "#f7f4ff"], [1, "#b6abe0"]]);
    g.beginPath(); g.moveTo(a[0], a[1] - 12); g.lineTo(b[0], b[1] - 12); g.lineTo(b[0], b[1] + 70); g.lineTo(a[0], a[1] + 90); g.closePath(); g.fill();
  };
  roof([[X0 - 10, 1520], [300, 1780], [300, Y1 + 400], [X0 - 10, Y1 + 400]], [40, 1440]);
  roof([[X1 + 10, 1640], [780, 1860], [780, Y1 + 400], [X1 + 10, Y1 + 400]], [1150, 1600]);
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
    if (fl.a > 0.02) { g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.16 * fl.a; g.fillStyle = fl.col; g.fillRect(X0, Y0, OW, Y1 - Y0); g.globalCompositeOperation = "source-over"; g.globalAlpha = 1; }
    drawFireworks(g, bursts, t, dyF);
    blit(g, farL(), 0, off(F.far, t));
    blit(g, midL(), 0, off(F.mid, t));
    const dn = off(F.near, t);
    blit(g, nearL(), 0, dn);
    // Denis's window: breathing glow + fairy lights
    g.globalCompositeOperation = "lighter";
    const br = 0.85 + 0.15 * Math.sin(t * 2.3);
    radial(g, WIN.x + WIN.w / 2, WIN.y + WIN.h / 2 + dn, 300, "#ffc27a", 0.22 * br);
    g.globalCompositeOperation = "source-over";
    drawBulbs(g, windowFairy.map(([x, y]) => [x, y + dn] as [number, number]), t, 5, ["#fff0b8", "#ffb0d0", "#ffd38a"], 4);
    // fireworks light the facade a little
    if (fl.a > 0.02) {
      g.globalCompositeOperation = "soft-light"; g.globalAlpha = 0.25 * fl.a; g.fillStyle = fl.col; g.fillRect(X0, Y0, OW, Y1 - Y0);
      g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
    }
    blit(g, fgL(), 0, off(F.fg, t));
    snowfall(g, 8, t, 70, 1.5, 5, 55, 0.55 * clamp(1 - pitch(t) * 0.8));
    g.restore();
  },
};
