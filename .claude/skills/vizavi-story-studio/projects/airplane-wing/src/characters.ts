import * as THREE from "three";

export type PersonSpec = {
  id: string; skin: string; hair: string; hairStyle: "short" | "long" | "bun" | "curly" | "bald" | "cap" | "hardhat" | "pilot";
  top: string; topShade: string; glasses?: boolean; scarf?: string; vest?: boolean; headset?: boolean; hood?: boolean; beard?: boolean; cheek?: string;
};
export type Expr = {
  eyes?: number; gaze?: [number, number]; brow?: number; tilt?: number;
  mouth?: "smile" | "neutral" | "open" | "oh" | "gasp" | "worry" | "grin" | "smirk"; sweat?: boolean; blush?: number; blink?: boolean;
};
export type Pose = "rest" | "grip" | "window" | "face";

export const MAX: PersonSpec = { id: "max", skin: "#f2c4a0", hair: "#6a4127", hairStyle: "short", top: "#3f8df5", topShade: "#2b6bd1", hood: true, cheek: "#f59a8a" };
export const CAST: Record<string, PersonSpec> = {
  max: MAX,
  anna: { id: "anna", skin: "#e9b48f", hair: "#2a1d1a", hairStyle: "long", top: "#e8625a", topShade: "#c24841", cheek: "#f08a80" },
  ivan: { id: "ivan", skin: "#d9a07a", hair: "#9a9a9a", hairStyle: "bald", top: "#7b9a5c", topShade: "#5f7a45", glasses: true, beard: true },
  lena: { id: "lena", skin: "#f6d2b4", hair: "#d89a3c", hairStyle: "bun", top: "#9a6bd6", topShade: "#774fb0", scarf: "#ffd04a", cheek: "#f4a198" },
  tim: { id: "tim", skin: "#a8744f", hair: "#1b1410", hairStyle: "curly", top: "#f2b440", topShade: "#cf9227", cheek: "#c98a62" },
  pilotA: { id: "pilotA", skin: "#e8b895", hair: "#3a2a20", hairStyle: "pilot", top: "#f4f6fa", topShade: "#b9c2d4", headset: true, beard: false },
  pilotB: { id: "pilotB", skin: "#c99371", hair: "#241a14", hairStyle: "pilot", top: "#f4f6fa", topShade: "#b9c2d4", headset: true, glasses: true },
  engA: { id: "engA", skin: "#e6b08c", hair: "#5a3a22", hairStyle: "hardhat", top: "#2f5f9e", topShade: "#244a7c", vest: true, glasses: true },
  engB: { id: "engB", skin: "#c98f6b", hair: "#2a1d1a", hairStyle: "hardhat", top: "#4c4c58", topShade: "#38383f", vest: true, cheek: "#d98f72" },
};

export const CARD_W = 560, CARD_H = 820, CARD_ASPECT = CARD_W / CARD_H;
const INK = "#17122b";

function blob(c: CanvasRenderingContext2D, fill: string, lw = 9) { c.fillStyle = fill; c.fill(); c.lineWidth = lw; c.strokeStyle = INK; c.stroke(); }

export function drawPerson(c: CanvasRenderingContext2D, sp: PersonSpec, ex: Expr, pose: Pose, yaw: number) {
  c.clearRect(0, 0, CARD_W, CARD_H);
  c.lineJoin = "round"; c.lineCap = "round";
  const cx = 280;
  const hx = cx - yaw * 20; // head centre x shifts toward the look direction
  const hy = 240, rx = 132, ry = 146;

  // --- torso / hoodie ---
  if (sp.hood) { c.beginPath(); c.ellipse(cx, 392, 150, 70, 0, 0, Math.PI * 2); blob(c, sp.topShade); }
  c.beginPath();
  c.moveTo(cx - 190, CARD_H); c.lineTo(cx - 205, 520); c.quadraticCurveTo(cx - 190, 390, cx - 80, 372);
  c.lineTo(cx + 80, 372); c.quadraticCurveTo(cx + 190, 390, cx + 205, 520); c.lineTo(cx + 190, CARD_H); c.closePath(); blob(c, sp.top);
  if (sp.vest) {
    c.beginPath(); c.moveTo(cx - 175, CARD_H); c.lineTo(cx - 185, 540); c.quadraticCurveTo(cx - 170, 420, cx - 70, 395); c.lineTo(cx - 40, CARD_H); c.closePath(); blob(c, "#ffb21e", 8);
    c.beginPath(); c.moveTo(cx + 175, CARD_H); c.lineTo(cx + 185, 540); c.quadraticCurveTo(cx + 170, 420, cx + 70, 395); c.lineTo(cx + 40, CARD_H); c.closePath(); blob(c, "#ffb21e", 8);
    c.fillStyle = "#e9eef5"; c.fillRect(cx - 168, 640, 120, 22); c.fillRect(cx + 48, 640, 120, 22);
  }
  if (sp.hood) {
    c.beginPath(); c.moveTo(cx - 70, 372); c.quadraticCurveTo(cx, 440, cx + 70, 372); c.lineTo(cx + 62, 360); c.quadraticCurveTo(cx, 410, cx - 62, 360); c.closePath(); blob(c, sp.topShade, 7);
    c.strokeStyle = "#f3f6fb"; c.lineWidth = 7;
    c.beginPath(); c.moveTo(cx - 28, 420); c.lineTo(cx - 34, 500); c.moveTo(cx + 28, 420); c.lineTo(cx + 34, 490); c.stroke();
    c.beginPath(); c.roundRect(cx - 95, 640, 190, 110, 26); blob(c, sp.topShade, 7);
  }
  if (sp.scarf) { c.beginPath(); c.ellipse(cx, 392, 112, 40, 0, 0, Math.PI * 2); blob(c, sp.scarf); }
  if (sp.id.startsWith("pilot")) {
    c.fillStyle = "#1d2b52"; c.fillRect(cx - 190, 480, 36, 14); c.fillRect(cx + 154, 480, 36, 14);
    c.fillStyle = "#ffcf40"; c.fillRect(cx - 190, 496, 36, 8); c.fillRect(cx + 154, 496, 36, 8);
    c.beginPath(); c.moveTo(cx - 40, 380); c.lineTo(cx, 470); c.lineTo(cx + 40, 380); c.closePath(); blob(c, "#16234a", 7);
  }

  // --- neck ---
  c.beginPath(); c.roundRect(hx - 34, 340, 68, 70, 16); blob(c, sp.skin, 8);

  // --- arms ---
  const armCol = sp.top;
  const arm = (side: 1 | -1) => {
    const sx = cx + side * 180;
    let ex1: [number, number], hand: [number, number];
    if (pose === "grip") { ex1 = [cx + side * 250, 610]; hand = [cx + side * 210, 700]; }
    else if (pose === "face") { ex1 = [cx + side * 235, 530]; hand = [cx + side * 140, 330]; }
    else if (pose === "window" && side === -1) { ex1 = [cx - 255, 520]; hand = [cx - 245, 380]; }
    else { ex1 = [cx + side * 215, 640]; hand = [cx + side * 130, 770]; }
    c.lineWidth = 78; c.strokeStyle = INK; c.beginPath(); c.moveTo(sx, 430); c.lineTo(ex1[0], ex1[1]); c.lineTo(hand[0], hand[1]); c.stroke();
    c.lineWidth = 62; c.strokeStyle = armCol; c.beginPath(); c.moveTo(sx, 430); c.lineTo(ex1[0], ex1[1]); c.lineTo(hand[0], hand[1]); c.stroke();
    c.beginPath(); c.arc(hand[0], hand[1], 36, 0, Math.PI * 2); blob(c, sp.skin, 8);
  };
  arm(-1); arm(1);

  // --- head ---
  const yawk = yaw * 0.5;
  c.beginPath(); c.ellipse(hx, hy, rx, ry, 0, 0, Math.PI * 2); blob(c, sp.skin);
  if (yaw > 0.5) { // nose bump on the looking-side outline
    c.beginPath(); c.moveTo(hx - rx + 6, hy + 8); c.quadraticCurveTo(hx - rx - 34, hy + 36, hx - rx + 8, hy + 62); c.closePath(); blob(c, sp.skin, 8);
  }
  // ear on the far side
  const earSide = yaw > 0.2 ? 1 : 0;
  const ear = (x: number) => { c.beginPath(); c.ellipse(x, hy + 24, 20, 30, 0, 0, Math.PI * 2); blob(c, sp.skin, 8); };
  if (earSide) ear(hx + rx - 6); else { ear(hx - rx + 4); ear(hx + rx - 4); }
  // face
  const eyeY = hy + 8, eo = 56 * (1 - yawk * 0.5), shift = -yaw * 46;
  const open = ex.blink ? 0.08 : ex.eyes ?? 1;
  const gx = (ex.gaze?.[0] ?? 0) * 10 - yaw * 8, gy = (ex.gaze?.[1] ?? 0) * 10;
  const eye = (x: number, sc: number) => {
    c.save(); c.beginPath(); c.ellipse(x, eyeY, 32 * sc, 38 * Math.max(0.08, open), 0, 0, Math.PI * 2); c.fillStyle = "#fff"; c.fill(); c.lineWidth = 7; c.strokeStyle = INK; c.stroke(); c.clip();
    if (open > 0.2) {
      c.beginPath(); c.ellipse(x + gx * sc, eyeY + gy, 17 * sc, 21 * Math.min(1, open + 0.2), 0, 0, Math.PI * 2); c.fillStyle = sp.id === "max" ? "#3a2a1c" : "#2a2230"; c.fill();
      c.beginPath(); c.arc(x + gx * sc + 6, eyeY + gy - 8, 6 * sc, 0, Math.PI * 2); c.fillStyle = "#fff"; c.fill();
    }
    c.restore();
  };
  eye(hx + shift - eo, yaw > 0.4 ? 1.05 : 1); eye(hx + shift + eo, yaw > 0.4 ? 0.8 : 1);
  if (sp.glasses) {
    c.lineWidth = 7; c.strokeStyle = INK;
    for (const [x, sc] of [[hx + shift - eo, yaw > 0.4 ? 1.05 : 1], [hx + shift + eo, yaw > 0.4 ? 0.8 : 1]] as [number, number][]) { c.beginPath(); c.ellipse(x, eyeY, 44 * sc, 48, 0, 0, Math.PI * 2); c.stroke(); }
    c.beginPath(); c.moveTo(hx + shift - eo + 44, eyeY); c.lineTo(hx + shift + eo - 36, eyeY); c.stroke();
  }
  // brows
  const br = ex.brow ?? 0, tilt = ex.tilt ?? 0;
  c.lineWidth = 11; c.strokeStyle = sp.hairStyle === "bald" ? "#7a7a7a" : sp.hair; c.beginPath();
  const by = eyeY - 56 - br * 16;
  c.moveTo(hx + shift - eo - 32, by + tilt * 14); c.lineTo(hx + shift - eo + 30, by - tilt * 14);
  c.moveTo(hx + shift + eo - 30, by - tilt * 14); c.lineTo(hx + shift + eo + 32, by + tilt * 14); c.stroke();
  // blush + nose
  if ((ex.blush ?? 0) > 0 || sp.cheek) { c.fillStyle = sp.cheek ?? "#f59a8a"; c.globalAlpha = 0.45 + (ex.blush ?? 0) * 0.3; c.beginPath(); c.ellipse(hx + shift - eo - 6, eyeY + 62, 20, 11, 0, 0, Math.PI * 2); c.ellipse(hx + shift + eo + 6, eyeY + 62, 20, 11, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; }
  c.strokeStyle = INK; c.lineWidth = 7; c.beginPath(); c.moveTo(hx + shift - 6, eyeY + 44); c.quadraticCurveTo(hx + shift + 8, eyeY + 62, hx + shift - 8, eyeY + 66); c.stroke();
  // mouth
  const mx = hx + shift, my = eyeY + 104;
  c.lineWidth = 8; c.strokeStyle = INK; c.fillStyle = "#6b2530";
  switch (ex.mouth ?? "neutral") {
    case "smile": c.beginPath(); c.arc(mx, my - 22, 36, 0.25, Math.PI - 0.25); c.stroke(); break;
    case "grin": c.beginPath(); c.moveTo(mx - 42, my - 8); c.quadraticCurveTo(mx, my + 52, mx + 42, my - 8); c.closePath(); c.fillStyle = "#6b2530"; c.fill(); c.stroke(); c.fillStyle = "#fff"; c.fillRect(mx - 30, my - 6, 60, 12); break;
    case "smirk": c.beginPath(); c.moveTo(mx - 28, my); c.quadraticCurveTo(mx + 6, my + 14, mx + 34, my - 14); c.stroke(); break;
    case "open": c.beginPath(); c.ellipse(mx, my + 6, 30, 26, 0, 0, Math.PI * 2); c.fill(); c.stroke(); break;
    case "oh": c.beginPath(); c.ellipse(mx, my + 8, 17, 23, 0, 0, Math.PI * 2); c.fill(); c.stroke(); break;
    case "gasp": c.beginPath(); c.ellipse(mx, my + 16, 36, 40, 0, 0, Math.PI * 2); c.fill(); c.stroke(); break;
    case "worry": c.beginPath(); c.moveTo(mx - 36, my + 14); c.quadraticCurveTo(mx - 18, my - 12, mx, my + 6); c.quadraticCurveTo(mx + 18, my + 22, mx + 36, my - 4); c.stroke(); break;
    default: c.beginPath(); c.moveTo(mx - 28, my + 4); c.lineTo(mx + 28, my + 4); c.stroke();
  }
  if (sp.beard) { c.fillStyle = sp.hairStyle === "bald" ? "#8a8a8a" : sp.hair; c.globalAlpha = 0.85; c.beginPath(); c.moveTo(hx - 96, hy + 70); c.quadraticCurveTo(hx, hy + 210, hx + 96, hy + 70); c.quadraticCurveTo(hx, hy + 120, hx - 96, hy + 70); c.fill(); c.globalAlpha = 1; }
  if (ex.sweat) { c.beginPath(); c.moveTo(hx + 108, hy - 78); c.quadraticCurveTo(hx + 142, hy - 26, hx + 108, hy - 20); c.quadraticCurveTo(hx + 78, hy - 26, hx + 108, hy - 78); blob(c, "#8fd3ff", 6); }

  // --- hair & headwear ---
  const top = hy - ry;
  const hairFill = sp.hair;
  switch (sp.hairStyle) {
    case "short": {
      c.beginPath(); c.moveTo(hx - rx - 4, hy - 10);
      c.quadraticCurveTo(hx - rx - 12, top - 28, hx - 40, top - 22); c.quadraticCurveTo(hx + 10, top - 62, hx + 70, top - 22); c.quadraticCurveTo(hx + rx + 14, top - 10, hx + rx + 4, hy - 4);
      c.quadraticCurveTo(hx + rx - 30, hy - 78, hx + 60, hy - 88); c.lineTo(hx + 30, hy - 56); c.lineTo(hx + 2, hy - 98); c.lineTo(hx - 34, hy - 62); c.lineTo(hx - 62, hy - 100);
      c.quadraticCurveTo(hx - rx + 28, hy - 82, hx - rx - 4, hy - 10); c.closePath(); blob(c, hairFill);
      c.beginPath(); c.moveTo(hx - 10, top - 28); c.quadraticCurveTo(hx + 6, top - 78, hx + 34, top - 52); c.quadraticCurveTo(hx + 8, top - 40, hx - 10, top - 28); blob(c, hairFill, 7);
      break; }
    case "long": {
      c.beginPath(); c.moveTo(hx - rx - 16, hy + 150); c.quadraticCurveTo(hx - rx - 36, top - 20, hx, top - 26); c.quadraticCurveTo(hx + rx + 36, top - 20, hx + rx + 16, hy + 150);
      c.lineTo(hx + rx - 20, hy + 60); c.quadraticCurveTo(hx + 20, hy - 120, hx - rx + 30, hy + 30); c.closePath(); blob(c, hairFill); break; }
    case "bun": {
      c.beginPath(); c.arc(hx, top - 40, 40, 0, Math.PI * 2); blob(c, hairFill);
      c.beginPath(); c.moveTo(hx - rx - 4, hy - 10); c.quadraticCurveTo(hx - rx, top - 14, hx, top - 18); c.quadraticCurveTo(hx + rx, top - 14, hx + rx + 4, hy - 10); c.quadraticCurveTo(hx + 60, hy - 100, hx - 20, hy - 84); c.quadraticCurveTo(hx - rx + 20, hy - 70, hx - rx - 4, hy - 10); c.closePath(); blob(c, hairFill); break; }
    case "curly": {
      for (let i = 0; i < 9; i++) { const a = Math.PI + (i / 8) * Math.PI; c.beginPath(); c.arc(hx + Math.cos(a) * (rx + 6), hy + Math.sin(a) * (ry + 6) * 0.95, 38, 0, Math.PI * 2); blob(c, hairFill, 8); }
      c.beginPath(); c.ellipse(hx, hy - 6, rx - 4, ry - 12, 0, Math.PI, Math.PI * 2); c.fillStyle = hairFill; c.fill(); break; }
    case "hardhat": {
      c.beginPath(); c.moveTo(hx - rx - 26, hy - 78); c.quadraticCurveTo(hx - rx - 4, top - 60, hx, top - 56); c.quadraticCurveTo(hx + rx + 4, top - 60, hx + rx + 26, hy - 78); c.lineTo(hx + rx + 26, hy - 60); c.lineTo(hx - rx - 26, hy - 60); c.closePath(); blob(c, "#ffd21f");
      c.beginPath(); c.roundRect(hx - 16, top - 62, 32, 84, 8); blob(c, "#f2b800", 7); break; }
    case "pilot": {
      c.beginPath(); c.moveTo(hx - rx - 8, hy - 70); c.quadraticCurveTo(hx - rx, top - 48, hx, top - 44); c.quadraticCurveTo(hx + rx, top - 48, hx + rx + 8, hy - 70); c.lineTo(hx + rx + 8, hy - 58); c.lineTo(hx - rx - 8, hy - 58); c.closePath(); blob(c, "#16234a");
      c.beginPath(); c.roundRect(hx - rx - 20, hy - 66, rx * 2 + 40, 18, 9); blob(c, "#0f1a38", 7);
      c.beginPath(); c.arc(hx, top - 4, 17, 0, Math.PI * 2); blob(c, "#ffcf40", 6); break; }
    default: break;
  }
  if (sp.headset) { c.strokeStyle = INK; c.lineWidth = 11; c.beginPath(); c.arc(hx, hy - 6, rx + 14, Math.PI * 1.02, Math.PI * 1.98); c.stroke(); c.beginPath(); c.roundRect(hx + rx - 4, hy - 4, 30, 62, 12); blob(c, "#2b2b36", 7); c.beginPath(); c.roundRect(hx - rx - 26, hy - 4, 30, 62, 12); blob(c, "#2b2b36", 7); }
}

const texCache = new Map<string, THREE.CanvasTexture>();
export function personTexture(sp: PersonSpec, ex: Expr = {}, pose: Pose = "rest", yaw = 0) {
  const key = JSON.stringify([sp.id, ex, pose, yaw]);
  let t = texCache.get(key);
  if (t) return t;
  const cv = document.createElement("canvas"); cv.width = CARD_W; cv.height = CARD_H;
  drawPerson(cv.getContext("2d")!, sp, ex, pose, yaw);
  t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = true;
  texCache.set(key, t); return t;
}

/** Named Max expressions used throughout the film. */
export const MAX_EXPR: Record<string, { ex: Expr; pose: Pose }> = {
  calm: { ex: { eyes: 1, mouth: "smile", brow: 0.1, blush: 0.2 }, pose: "rest" },
  curious: { ex: { eyes: 1.1, mouth: "neutral", brow: 0.5, gaze: [-1, 0.2] }, pose: "rest" },
  startled: { ex: { eyes: 1.25, mouth: "oh", brow: 1, tilt: 0.7 }, pose: "grip" },
  scared: { ex: { eyes: 1.3, mouth: "gasp", brow: 1, tilt: 0.9, sweat: true, gaze: [-0.8, 0] }, pose: "grip" },
  worried: { ex: { eyes: 1.15, mouth: "worry", brow: 0.7, tilt: 0.8, sweat: true }, pose: "face" },
  relieved: { ex: { eyes: 0.8, mouth: "smile", brow: 0.2, blush: 0.5 }, pose: "rest" },
  happy: { ex: { eyes: 0.7, mouth: "grin", brow: 0.3, blush: 0.6 }, pose: "rest" },
};
