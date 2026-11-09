// 2D character rig: one definition per character → identical design in every shot.
// Local units: origin at hip centre, y down. Standing feet at y=+FOOT (380), head centre at y≈-412 (≈900 tall).
import { G, clamp, lerp, rgba, shade, ellipse, circle, noise1 } from "../lib/util";

export type Look = {
  id: string;
  skin: string; skinShade: string; blushColor: string;
  hair: string; hairShade: string; hairHi: string;
  iris: string; irisDark: string;
  line: string;                 // outline colour (warm dark, never black)
  hairStyle: "denis" | "maja" | "bob";
  glasses?: boolean;
  girl?: boolean;
  shoulder: number;             // half shoulder width
  height: number;               // overall scale multiplier
};
export type Outfit = {
  top: string; topShade: string; accent?: string;
  kind: "hoodie" | "sweater" | "coat" | "puffer" | "tee" | "dress";
  over?: { color: string; shade: string };     // open coat/jacket over the top
  scarf?: string; beanie?: string;
  pants: string; pantsShade: string; shoes: string;
  shorts?: boolean;
};
export type Hand = "open" | "fist" | "hold" | "wave" | "point";
export type Pose = {
  x: number; y: number; scale: number;  // world position of the hip centre
  flip?: boolean;                       // mirror (face left)
  t: number;                            // seconds (drives breathing, blinking, hair sway)
  sit?: number;                         // 0 stand → 1 seated on a surface at hip level
  walk?: number; walkAmt?: number;      // walk cycle phase (rad) and amount 0..1
  run?: number;                         // 0..1 bigger stride + lean
  hop?: number;                         // px vertical lift
  lean?: number;                        // body tilt (rad)
  headTilt?: number; headTurn?: number; headNod?: number;
  lookX?: number; lookY?: number;
  smile?: number; open?: number; vowel?: "a" | "e" | "o";
  surprise?: number; joy?: number; worry?: number; blush?: number; eyesClosed?: number; sparkle?: number; shy?: number;
  shoulders?: number;                   // shoulder raise (deep breath) 0..1
  handL?: { x: number; y: number; type?: Hand } | null;  // targets in local units (relative to hip), screen-left hand
  handR?: { x: number; y: number; type?: Hand } | null;
  armLBehind?: boolean; armRBehind?: boolean;
  back?: boolean;                       // seen from behind
  tiptoe?: number;
  prop?: (g: G) => void;                // drawn after body, before hands (things held in hands)
  propBehind?: (g: G) => void;          // drawn before the body (e.g. flowers hidden behind the back)
};

const L1 = 132, L2 = 122; // upper arm, forearm
const HEAD_Y = -412;
export const FOOT = 380;

/** 2-bone IK in the screen plane. bendSign chooses elbow side. */
function ik(sx: number, sy: number, tx: number, ty: number, bendSign: number) {
  let dx = tx - sx, dy = ty - sy;
  let d = Math.hypot(dx, dy);
  const max = L1 + L2 - 2;
  if (d > max) { dx *= max / d; dy *= max / d; d = max; }
  d = Math.max(d, 30);
  const a = Math.atan2(dy, dx);
  const cosB = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1);
  const b = Math.acos(cosB) * bendSign;
  const ex = sx + Math.cos(a + b) * L1, ey = sy + Math.sin(a + b) * L1;
  return { ex, ey, hx: sx + dx, hy: sy + dy };
}

function limb(g: G, pts: Array<[number, number]>, w: number, color: string, line: string) {
  g.lineCap = "round"; g.lineJoin = "round";
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
  g.strokeStyle = line; g.lineWidth = w + 7; g.stroke();
  g.strokeStyle = color; g.lineWidth = w; g.stroke();
}

function handShape(g: G, x: number, y: number, ang: number, type: Hand, look: Look, side: number) {
  // mitten hand pointing along the forearm direction (+x after rotation); thumb on the body side
  g.save(); g.translate(x, y); g.rotate(ang);
  g.fillStyle = look.skin; g.strokeStyle = look.line; g.lineWidth = 4; g.lineJoin = "round";
  const th = -side; // thumb towards the body centre
  if (type === "fist" || type === "hold") {
    g.beginPath(); g.roundRect(-6, -21, 40, 42, 17); g.fill(); g.stroke();
    ellipse(g, 6, th * 18, 13, 9, th * 0.5); g.fill(); g.stroke();
  } else {
    g.beginPath(); g.roundRect(-6, -19, 50, 38, 18); g.fill(); g.stroke();
    ellipse(g, 8, th * 20, 16, 9, th * 0.7); g.fill(); g.stroke();
    g.strokeStyle = rgba(look.line, 0.35); g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(30, -6); g.lineTo(42, -6); g.moveTo(30, 5); g.lineTo(42, 5); g.stroke();
  }
  g.restore();
}

function arm(g: G, look: Look, out: Outfit, sx: number, sy: number, target: { x: number; y: number; type?: Hand }, side: -1 | 1) {
  const { ex, ey, hx, hy } = ik(sx, sy, target.x, target.y, side === -1 ? 1 : -1);
  const sleeve = out.over ? out.over.color : out.top;
  const short = out.kind === "tee" || out.kind === "dress";
  if (short) {
    const mx = lerp(sx, ex, 0.55), my = lerp(sy, ey, 0.55);
    limb(g, [[sx, sy], [ex, ey], [hx, hy]], 36, look.skin, look.line);
    limb(g, [[sx, sy], [mx, my]], 56, sleeve, look.line);
  } else {
    limb(g, [[sx, sy], [ex, ey], [hx, hy]], 50, sleeve, look.line);
    // cuff
    const a = Math.atan2(hy - ey, hx - ex);
    g.save(); g.translate(lerp(ex, hx, 0.86), lerp(ey, hy, 0.86)); g.rotate(a);
    g.fillStyle = shade(sleeve.startsWith("#") ? sleeve : "#888888", 0.85); g.strokeStyle = look.line; g.lineWidth = 3.5;
    g.beginPath(); g.roundRect(-10, -27, 20, 54, 8); g.fill(); g.stroke(); g.restore();
  }
  const a = Math.atan2(hy - ey, hx - ex);
  handShape(g, hx - Math.cos(a) * 4, hy - Math.sin(a) * 4, a, target.type ?? "open", look, side);
  return { hx, hy };
}

// ---------- head ----------
const FACE = "M -98 -20 C -100 40 -72 92 -22 108 Q 0 115 22 108 C 72 92 100 40 98 -20 C 96 -92 52 -114 0 -114 C -52 -114 -96 -92 -98 -20 Z";

function eye(g: G, look: Look, p: Pose, cx: number, cy: number, sx: number, side: number) {
  const girl = !!look.girl;
  const rx = (girl ? 23 : 21) * sx, ry0 = girl ? 29 : 26;
  const joy = p.joy ?? 0, surprise = p.surprise ?? 0;
  const blinkPhase = (p.t * 0.31 + (look.id === "maja" ? 0.37 : 0.11)) % 1;
  const blink = blinkPhase > 0.955 ? Math.sin(((blinkPhase - 0.955) / 0.045) * Math.PI) : 0;
  const closed = clamp(Math.max(p.eyesClosed ?? 0, blink, (p.shy ?? 0) * 0.35));
  const ry = ry0 * (1 + surprise * 0.18) * (1 - closed) ;
  if (joy > 0.5) {
    // happy closed eyes ^ ^
    g.strokeStyle = look.line; g.lineWidth = 6; g.lineCap = "round";
    g.beginPath(); g.moveTo(cx - rx, cy + 6); g.quadraticCurveTo(cx, cy - 22, cx + rx, cy + 6); g.stroke();
    if (girl) { g.beginPath(); g.moveTo(cx + side * rx, cy + 4); g.lineTo(cx + side * (rx + 9), cy - 4); g.stroke(); }
    return;
  }
  if (ry < 3) {
    g.strokeStyle = look.line; g.lineWidth = 5.5; g.lineCap = "round";
    g.beginPath(); g.moveTo(cx - rx, cy + 4); g.quadraticCurveTo(cx, cy + 12, cx + rx, cy + 4); g.stroke();
    return;
  }
  g.save();
  ellipse(g, cx, cy, rx, ry); g.fillStyle = "#fffaf6"; g.fill();
  g.clip();
  // iris
  const lx = (p.lookX ?? 0) * rx * 0.35, ly = (p.lookY ?? 0) * ry * 0.3 + 2;
  const ir = rx * (0.78 - surprise * 0.08), iry = ry0 * 0.82;
  const gr = g.createLinearGradient(0, cy + ly - iry, 0, cy + ly + iry);
  gr.addColorStop(0, look.irisDark); gr.addColorStop(0.55, look.iris); gr.addColorStop(1, shade(look.iris, 1.35));
  ellipse(g, cx + lx, cy + ly, ir, iry); g.fillStyle = gr; g.fill();
  g.strokeStyle = rgba(look.irisDark, 0.9); g.lineWidth = 2; g.stroke();
  ellipse(g, cx + lx, cy + ly + 1, ir * 0.48, iry * 0.52); g.fillStyle = shade(look.irisDark, 0.55); g.fill();
  // highlights
  ellipse(g, cx + lx - ir * 0.32, cy + ly - iry * 0.38, ir * 0.36, iry * 0.28); g.fillStyle = "rgba(255,255,255,0.95)"; g.fill();
  circle(g, cx + lx + ir * 0.38, cy + ly + iry * 0.42, ir * 0.14); g.fill();
  if ((p.sparkle ?? 0) > 0) { g.globalAlpha = p.sparkle!; circle(g, cx + lx + ir * 0.15, cy + ly - iry * 0.05, ir * 0.12); g.fill(); g.globalAlpha = 1; }
  // upper lid shadow
  const sh = g.createLinearGradient(0, cy - ry, 0, cy - ry * 0.2);
  sh.addColorStop(0, rgba(look.skinShade, 0.55)); sh.addColorStop(1, rgba(look.skinShade, 0));
  g.fillStyle = sh; g.fillRect(cx - rx, cy - ry, rx * 2, ry);
  g.restore();
  // lash line
  g.strokeStyle = look.line; g.lineCap = "round";
  g.lineWidth = girl ? 7 : 5.5;
  g.beginPath(); g.ellipse(cx, cy, rx + 1, ry + 1, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
  if (girl) { // flick
    const ox = cx + side * (rx * 0.93), oy = cy - ry * 0.38;
    g.beginPath(); g.moveTo(ox, oy); g.quadraticCurveTo(ox + side * 8, oy - 4, ox + side * 13, oy - 12); g.stroke();
  }
  g.lineWidth = 2.5; g.strokeStyle = rgba(look.line, 0.6);
  g.beginPath(); g.ellipse(cx, cy, rx * 0.85, ry, 0, Math.PI * 0.25, Math.PI * 0.75); g.stroke();
}

function mouth(g: G, look: Look, p: Pose, mx: number, my: number) {
  const smile = p.smile ?? 0.3, open = clamp(p.open ?? 0), worry = p.worry ?? 0, surprise = p.surprise ?? 0;
  const v = p.vowel ?? "a";
  g.lineCap = "round"; g.lineJoin = "round";
  const o = Math.max(open, surprise * 0.55);
  if (o < 0.06) {
    const w = 15 + smile * 11;
    const c = smile * 13 - worry * 7;
    g.strokeStyle = look.line; g.lineWidth = 4.5;
    g.beginPath(); g.moveTo(mx - w, my - c * 0.35); g.quadraticCurveTo(mx, my + c, mx + w, my - c * 0.35); g.stroke();
    return;
  }
  const round = v === "o" || surprise > 0.4;
  const w = round ? 11 + o * 6 : 15 + smile * 10 + o * 6;
  const h = 6 + o * 26;
  const top = my - (round ? h * 0.45 : 2 - smile * 2);
  const mp = new Path2D();
  mp.moveTo(mx - w, top);
  mp.quadraticCurveTo(mx, top - (round ? 6 : smile * 4 - 2), mx + w, top);
  mp.quadraticCurveTo(mx + w * (round ? 1.05 : 0.85), top + h, mx, top + h);
  mp.quadraticCurveTo(mx - w * (round ? 1.05 : 0.85), top + h, mx - w, top);
  mp.closePath();
  g.fillStyle = "#7d2f3e"; g.fill(mp);
  g.save(); g.clip(mp);
  ellipse(g, mx, top + h + 2, w * 0.7, h * 0.45); g.fillStyle = "#e7838e"; g.fill();
  if (smile > 0.4 && o > 0.25 && !round) { g.fillStyle = "#fffaf4"; g.fillRect(mx - w, top - 2, w * 2, Math.min(7, h * 0.3)); }
  g.restore();
  g.strokeStyle = look.line; g.lineWidth = 4; g.stroke(mp);
}

function brows(g: G, look: Look, p: Pose, x: number, y: number, turn: number) {
  const worry = p.worry ?? 0, surprise = p.surprise ?? 0, joy = p.joy ?? 0;
  const lift = surprise * 14 + joy * 4;
  g.strokeStyle = look.girl ? shade(look.hairShade, 0.8) : shade(look.hairShade, 0.75);
  g.lineWidth = look.girl ? 5.5 : 8; g.lineCap = "round";
  for (const s of [-1, 1]) {
    const sx = 1 - 0.22 * Math.max(0, s * turn);
    const ix = x + s * 16 * sx, ox = x + s * 60 * sx;
    const iy = y - lift - worry * 10, oy = y - lift + worry * 4 + 2;
    g.beginPath(); g.moveTo(ix, iy); g.quadraticCurveTo((ix + ox) / 2, Math.min(iy, oy) - 8, ox, oy); g.stroke();
  }
}

function glasses(g: G, look: Look, ex: [number, number], ey: number) {
  g.strokeStyle = "#3a2a33"; g.lineWidth = 5;
  for (const cx of ex) {
    g.beginPath(); g.roundRect(cx - 33, ey - 28, 66, 54, 22); g.stroke();
    g.save(); g.globalAlpha = 0.35; g.strokeStyle = "#ffffff"; g.lineWidth = 4;
    g.beginPath(); g.moveTo(cx + 8, ey - 18); g.lineTo(cx + 20, ey - 6); g.stroke(); g.restore();
  }
  g.beginPath(); g.moveTo(ex[0] + 33, ey - 6); g.quadraticCurveTo((ex[0] + ex[1]) / 2, ey - 14, ex[1] - 33, ey - 6); g.stroke();
  g.beginPath(); g.moveTo(ex[0] - 33, ey - 10); g.lineTo(-98, ey - 14); g.moveTo(ex[1] + 33, ey - 10); g.lineTo(98, ey - 14); g.stroke();
}

function hairGrad(g: G, look: Look, y0: number, y1: number) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, shade(look.hair, 1.05)); gr.addColorStop(0.6, look.hair); gr.addColorStop(1, look.hairShade);
  return gr;
}

function hairBack(g: G, look: Look, p: Pose, sway: number) {
  g.strokeStyle = look.line; g.lineWidth = 4.5; g.lineJoin = "round";
  if (look.hairStyle === "maja") {
    const s = sway;
    // back mass: full at the crown, narrowing slightly over the shoulders, soft pointed ends
    const d = `M -112 -20 C -130 -112 -62 -144 0 -142 C 62 -144 130 -112 112 -20 C 118 60 ${124 + s * 0.6} 150 ${122 + s} 230 C ${120 + s * 1.2} 280 ${112 + s * 1.4} 300 ${98 + s * 1.5} 318 L ${70 + s * 1.4} 300 L ${40 + s * 1.3} 322 L ${0 + s * 1.2} 306 L ${-40 + s * 1.3} 322 L ${-70 + s * 1.4} 300 L ${-98 + s * 1.5} 318 C ${-112 + s * 1.4} 300 ${-120 + s * 1.2} 280 ${-122 + s} 230 C ${-124 + s * 0.6} 150 -118 60 -112 -20 Z`;
    const p2 = new Path2D(d); g.fillStyle = hairGrad(g, look, -140, 330); g.fill(p2); g.stroke(p2);
    g.save(); g.clip(p2);
    g.strokeStyle = rgba(look.hairShade, 0.5); g.lineWidth = 3;
    for (const k of [-84, -50, -16, 16, 50, 84]) { g.beginPath(); g.moveTo(k * 0.7, -60); g.quadraticCurveTo(k * 1.05 + s * 0.4, 150, k * 1.05 + s * 1.2, 320); g.stroke(); }
    g.globalAlpha = 0.45; g.fillStyle = look.hairHi;
    g.beginPath(); g.ellipse(0, -96, 92, 18, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  } else if (look.hairStyle === "bob") {
    const d = "M -118 -10 C -132 -110 -60 -140 0 -140 C 60 -140 132 -110 118 -10 C 124 50 120 100 104 126 Q 60 140 0 132 Q -60 140 -104 126 C -120 100 -124 50 -118 -10 Z";
    const p2 = new Path2D(d); g.fillStyle = hairGrad(g, look, -140, 130); g.fill(p2); g.stroke(p2);
  } else {
    const d = "M -106 10 C -118 -70 -82 -134 0 -136 C 84 -136 120 -70 106 10 C 104 -10 96 -24 88 -28 L -88 -28 C -98 -22 -104 -8 -106 10 Z";
    const p2 = new Path2D(d); g.fillStyle = hairGrad(g, look, -136, 10); g.fill(p2); g.stroke(p2);
  }
}

function hairFront(g: G, look: Look, p: Pose, sway: number) {
  g.strokeStyle = look.line; g.lineWidth = 4.5; g.lineJoin = "round"; g.lineCap = "round";
  if (look.hairStyle === "denis") {
    // messy side-swept fringe
    const d = "M -104 4 C -116 -78 -64 -132 6 -132 C 78 -132 120 -84 106 6 C 102 -14 98 -26 92 -34 Q 90 -14 80 -6 Q 82 -30 70 -48 Q 62 -26 46 -18 Q 54 -40 44 -60 Q 30 -36 8 -28 Q 20 -48 12 -66 Q -6 -40 -30 -34 Q -16 -52 -22 -70 Q -40 -46 -62 -42 Q -50 -58 -54 -74 Q -76 -50 -92 -32 Q -98 -16 -104 4 Z";
    const p2 = new Path2D(d); g.fillStyle = hairGrad(g, look, -132, 0); g.fill(p2); g.stroke(p2);
    // cowlick tufts
    const tuft = new Path2D("M 2 -128 Q 14 -156 34 -154 Q 22 -142 24 -126 Z");
    g.fill(tuft); g.stroke(tuft);
    // shine
    g.save(); g.clip(p2); g.globalAlpha = 0.55; g.fillStyle = look.hairHi;
    g.beginPath(); g.ellipse(-10, -98, 70, 14, -0.12, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 0.35; g.strokeStyle = look.hairShade; g.lineWidth = 3;
    for (const k of [-60, -20, 25, 62]) { g.beginPath(); g.moveTo(k * 0.6, -124); g.quadraticCurveTo(k * 0.9, -90, k, -46); g.stroke(); }
    g.restore();
    // sideburns
    for (const s of [-1, 1]) { const sb = new Path2D(`M ${s * 100} -10 Q ${s * 104} 20 ${s * 94} 38 Q ${s * 90} 12 ${s * 88} -14 Z`); g.fillStyle = look.hair; g.fill(sb); g.stroke(sb); }
  } else if (look.hairStyle === "maja") {
    // centre part, no fringe: two curtains framing the face, falling in front of the shoulders
    for (const s of [-1, 1]) {
      const sw = sway * (s === 1 ? 1 : 0.8);
      const d = `M ${s * 2} -132 C ${s * -44} -132 ${s * -94} -106 ${s * -108} -40 C ${s * -118} 10 ${s * -122} 80 ${s * -120 + sw * 0.4} 150 C ${s * -118 + sw} 205 ${s * -108 + sw * 1.3} 250 ${s * -92 + sw * 1.5} 300 L ${s * -84 + sw * 1.4} 268 L ${s * -74 + sw * 1.3} 288 C ${s * -78 + sw} 220 ${s * -84 + sw * 0.6} 150 ${s * -84} 80 C ${s * -86} 20 ${s * -80} -40 ${s * -54} -82 C ${s * -36} -104 ${s * -14} -112 ${s * 2} -112 Z`;
      const p2 = new Path2D(d);
      g.fillStyle = hairGrad(g, look, -132, 290); g.fill(p2); g.stroke(p2);
      g.save(); g.clip(p2);
      g.globalAlpha = 0.5; g.fillStyle = look.hairHi;
      g.beginPath(); g.ellipse(s * -60, -92, 44, 12, s * 0.5, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 0.4; g.strokeStyle = look.hairShade; g.lineWidth = 2.5;
      for (const k of [0.3, 0.6]) { g.beginPath(); g.moveTo(s * -100 * k - s * 20, -60); g.quadraticCurveTo(s * -104, 100, s * -96 + sw, 270); g.stroke(); }
      g.restore();
    }
  } else if (look.hairStyle === "bob") {
    const d = "M -112 40 C -120 -70 -70 -130 0 -130 C 70 -130 120 -70 112 40 C 108 10 100 -20 80 -40 Q 40 -60 0 -62 Q -40 -60 -80 -40 C -100 -20 -108 10 -112 40 Z";
    const p2 = new Path2D(d); g.fillStyle = hairGrad(g, look, -130, 40); g.fill(p2); g.stroke(p2);
    const s1 = new Path2D("M -112 30 C -118 80 -112 110 -100 128 Q -92 100 -94 40 Z M 112 30 C 118 80 112 110 100 128 Q 92 100 94 40 Z");
    g.fill(s1); g.stroke(s1);
  }
}

function beanie(g: G, color: string, line: string) {
  const d = new Path2D("M -112 -40 C -116 -120 -60 -160 0 -160 C 60 -160 116 -120 112 -40 Z");
  g.fillStyle = color; g.fill(d); g.strokeStyle = line; g.lineWidth = 4.5; g.stroke(d);
  g.beginPath(); g.roundRect(-118, -62, 236, 34, 14); g.fillStyle = shade(color, 0.88); g.fill(); g.stroke();
  circle(g, 0, -166, 22); g.fillStyle = shade(color, 1.1); g.fill(); g.stroke();
}

function head(g: G, look: Look, out: Outfit, p: Pose) {
  const turn = clamp(p.headTurn ?? 0, -1, 1);
  const sway = noise1(p.t * 0.9, look.id.length) * 6 + (p.lean ?? 0) * 60 + (p.walkAmt ? Math.sin((p.walk ?? 0) * 2) * 4 : 0);
  // long hair's back mass is drawn behind the body by drawPerson (front view)
  if (look.hairStyle === "denis") hairBack(g, look, p, sway);
  if (p.back) {
    // back view: hair covers the head
    const d = new Path2D(FACE); g.fillStyle = hairGrad(g, look, -120, 110); g.fill(d); g.strokeStyle = look.line; g.lineWidth = 4.5;
    if (look.hairStyle === "denis") g.stroke(d); else hairBack(g, look, p, sway);
    if (!look.girl) for (const s of [-1, 1]) { ellipse(g, s * 100, 6, 14, 22); g.fillStyle = look.skin; g.fill(); g.stroke(); }
    if (look.hairStyle === "denis") { g.save(); g.clip(d); g.globalAlpha = 0.4; g.fillStyle = look.hairHi; g.beginPath(); g.ellipse(0, -70, 60, 16, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
    if (out.beanie) beanie(g, out.beanie, look.line);
    return;
  }
  // ears (short hair only)
  if (look.hairStyle === "denis") for (const s of [-1, 1]) {
    const ex = s * 98 - turn * 10;
    ellipse(g, ex, 12, 15, 24); g.fillStyle = look.skin; g.fill(); g.strokeStyle = look.line; g.lineWidth = 4; g.stroke();
    ellipse(g, ex, 12, 7, 13); g.fillStyle = look.skinShade; g.fill();
  }
  // face
  const fp = new Path2D(FACE);
  g.fillStyle = look.skin; g.fill(fp);
  g.save(); g.clip(fp);
  // soft shadow under the hairline and on the far cheek
  const hs = g.createLinearGradient(0, -100, 0, -20);
  hs.addColorStop(0, rgba(look.skinShade, 0.9)); hs.addColorStop(1, rgba(look.skinShade, 0));
  g.fillStyle = hs; g.fillRect(-110, -120, 220, 110);
  const cs = g.createLinearGradient(turn > 0 ? -100 : 100, 0, 0, 0);
  cs.addColorStop(0, rgba(look.skinShade, 0.35 + Math.abs(turn) * 0.3)); cs.addColorStop(1, rgba(look.skinShade, 0));
  g.fillStyle = cs; g.fillRect(-110, -120, 220, 240);
  // blush
  const bl = 0.35 + (p.blush ?? 0) * 0.65;
  for (const s of [-1, 1]) {
    const bx = s * 54 + turn * 16, by = 58;
    const gr = g.createRadialGradient(bx, by, 0, bx, by, 30);
    gr.addColorStop(0, rgba(look.blushColor, 0.55 * bl)); gr.addColorStop(1, rgba(look.blushColor, 0));
    g.fillStyle = gr; g.fillRect(bx - 32, by - 32, 64, 64);
    if ((p.blush ?? 0) > 0.6) { g.strokeStyle = rgba("#e86a7a", 0.5 * (p.blush! - 0.6) / 0.4); g.lineWidth = 2.5; for (const k of [-10, 0, 10]) { g.beginPath(); g.moveTo(bx + k - 4, by + 4); g.lineTo(bx + k + 4, by - 6); g.stroke(); } }
  }
  g.restore();
  g.strokeStyle = look.line; g.lineWidth = 4.5; g.stroke(fp);
  // features
  const ey = 12 + (p.lookY ?? 0) * 2;
  const exL = -42 + turn * 20, exR = 42 + turn * 20;
  eye(g, look, p, exL, ey, 1 - 0.28 * Math.max(0, -turn), -1);
  eye(g, look, p, exR, ey, 1 - 0.28 * Math.max(0, turn), 1);
  brows(g, look, p, turn * 20, -30, turn);
  // nose
  g.strokeStyle = rgba(look.line, 0.7); g.lineWidth = 3.5; g.lineCap = "round";
  const nx = turn * 30;
  g.beginPath(); g.moveTo(nx + 2, 40); g.quadraticCurveTo(nx + 6 + turn * 4, 50, nx - 2, 54); g.stroke();
  mouth(g, look, p, turn * 24, 76);
  if (look.glasses) glasses(g, look, [exL, exR], ey);
  hairFront(g, look, p, sway);
  if (out.beanie) beanie(g, out.beanie, look.line);
}

// ---------- body ----------
function legs(g: G, look: Look, out: Outfit, p: Pose) {
  const sit = clamp(p.sit ?? 0), wa = (p.walkAmt ?? 0) * (1 - sit), ph = p.walk ?? 0, run = p.run ?? 0;
  const tip = p.tiptoe ?? 0;
  for (const s of [-1, 1]) {
    const hx = s * 46;
    const step = Math.sin(ph + (s > 0 ? Math.PI : 0));
    const lift = Math.max(0, step) * (30 + run * 40) * wa;
    const swing = Math.cos(ph + (s > 0 ? Math.PI : 0)) * (16 + run * 30) * wa;
    // standing
    const kxS = s * 50 + swing * 0.5, kyS = 190 - lift * 0.4;
    const fxS = s * 52 + swing, fyS = FOOT - lift - tip * 14;
    // seated (front view: thighs foreshortened toward the camera)
    const kxT = s * 62, kyT = 58, fxT = s * 60, fyT = 236;
    const kx = lerp(kxS, kxT, sit), ky = lerp(kyS, kyT, sit), fx = lerp(fxS, fxT, sit), fy = lerp(fyS, fyT, sit);
    const bare = out.shorts || out.kind === "dress";
    if (bare) {
      limb(g, [[hx, 0], [kx, ky], [fx, fy - 18]], 40, look.skin, look.line);
      if (out.shorts) limb(g, [[hx, 0], [lerp(hx, kx, 0.55), lerp(0, ky, 0.55)]], 66, out.pants, look.line);
    } else if (sit > 0.5) {
      // foreshortened lap: wide thigh coming toward the camera, a visible knee, shin hanging down
      limb(g, [[kx, ky], [fx, fy - 16]], 60, out.pants, look.line);
      limb(g, [[hx * 0.9, -6], [kx, ky - 4]], 92, out.pants, look.line);
      ellipse(g, kx, ky + 2, 40, 34); g.fillStyle = out.pants; g.fill(); g.strokeStyle = look.line; g.lineWidth = 4; g.stroke();
      ellipse(g, kx - s * 6, ky - 6, 22, 14); g.fillStyle = rgba("#ffffff", 0.16); g.fill();
      g.strokeStyle = rgba(out.pantsShade, 0.9); g.lineWidth = 3.5;
      g.beginPath(); g.moveTo(kx - 26, ky + 30); g.quadraticCurveTo(kx, ky + 42, kx + 26, ky + 30); g.stroke();
    } else {
      limb(g, [[hx, 0], [kx, ky], [fx, fy - 16]], 68, out.pants, look.line);
      g.strokeStyle = rgba(out.pantsShade, 0.8); g.lineWidth = 3;
      g.beginPath(); g.moveTo(kx - s * 8, ky - 30); g.quadraticCurveTo(kx, ky, kx + s * 10, ky + 24); g.stroke();
    }
    // shoe
    g.fillStyle = out.shoes; g.strokeStyle = look.line; g.lineWidth = 4;
    ellipse(g, fx + s * 6, fy, 38, 20); g.fill(); g.stroke();
    g.fillStyle = rgba("#ffffff", 0.25); ellipse(g, fx + s * 6 - 8, fy - 7, 18, 6); g.fill();
  }
}

function torso(g: G, look: Look, out: Outfit, p: Pose) {
  const sw = look.shoulder, sh = (p.shoulders ?? 0) * 12;
  const breathe = Math.sin(p.t * 2.2) * 2.5;
  const top = -262 - sh - breathe;
  const hipW = look.girl ? sw - 14 : sw - 20;
  const waistW = look.girl ? sw - 26 : sw - 16;
  const d = `M ${-sw} ${top + 34} Q ${-sw - 2} ${top} ${-sw + 40} ${top - 6} L ${sw - 40} ${top - 6} Q ${sw + 2} ${top} ${sw} ${top + 34} C ${sw - 4} ${top + 110} ${waistW} -110 ${waistW} -60 Q ${hipW + 6} -10 ${hipW} 22 L ${-hipW} 22 Q ${-hipW - 6} -10 ${-waistW} -60 C ${-waistW} -110 ${-sw + 4} ${top + 110} ${-sw} ${top + 34} Z`;
  const body = new Path2D(d);
  const gr = g.createLinearGradient(-sw, 0, sw, 0);
  gr.addColorStop(0, out.top); gr.addColorStop(0.7, out.top); gr.addColorStop(1, out.topShade);
  g.fillStyle = gr; g.fill(body);
  g.save(); g.clip(body);
  if (out.kind === "dress") {
    // A-line skirt part
  }
  if (out.kind === "hoodie") {
    g.strokeStyle = rgba(out.topShade, 0.9); g.lineWidth = 4;
    g.beginPath(); g.roundRect(-70, -110, 140, 70, 18); g.stroke();
    g.strokeStyle = out.accent ?? "#f4f1ea"; g.lineWidth = 6;
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 22, top + 12); g.lineTo(s * 26 + Math.sin(p.t * 2 + s) * 3, top + 96); g.stroke(); }
  }
  if (out.kind === "sweater") {
    g.strokeStyle = rgba(out.topShade, 0.55); g.lineWidth = 3;
    for (let k = -sw + 22; k < sw; k += 30) { g.beginPath(); g.moveTo(k, top + 40); g.lineTo(k + 4, 12); g.stroke(); }
    g.fillStyle = out.topShade; g.fillRect(-sw, 0, sw * 2, 30);
  }
  if (out.kind === "puffer" || out.kind === "coat") {
    g.strokeStyle = rgba(out.topShade, 0.9); g.lineWidth = 4;
    if (out.kind === "puffer") for (let y = top + 50; y < 10; y += 52) { g.beginPath(); g.moveTo(-sw, y); g.quadraticCurveTo(0, y + 10, sw, y); g.stroke(); }
    g.beginPath(); g.moveTo(0, top + 10); g.lineTo(0, 22); g.stroke();
    if (out.kind === "coat") for (const y of [-180, -110, -40]) { circle(g, 16, y, 7); g.fillStyle = out.topShade; g.fill(); }
  }
  if (out.kind === "tee") {
    g.strokeStyle = rgba(out.accent ?? out.topShade, 0.9); g.lineWidth = 12;
    g.beginPath(); g.moveTo(-sw, -120); g.lineTo(sw, -120); g.stroke();
  }
  // shading under the chest / side
  g.fillStyle = rgba(out.topShade, 0.35); g.fillRect(-sw, -12, sw * 2, 40);
  g.restore();
  g.strokeStyle = look.line; g.lineWidth = 4.5; g.lineJoin = "round"; g.stroke(body);
  if (out.over) {
    for (const s of [-1, 1]) {
      const panel = new Path2D(`M ${s * sw} ${top + 30} Q ${s * sw} ${top} ${s * (sw - 34)} ${top - 4} L ${s * 30} ${top - 4} L ${s * 40} ${-60} L ${s * 52} 60 L ${s * (hipW + 18)} 60 Q ${s * (hipW + 14)} 0 ${s * (hipW + 8)} -30 Z`);
      g.fillStyle = s < 0 ? out.over.color : out.over.shade; g.fill(panel); g.stroke(panel);
      // lapel
      const lap = new Path2D(`M ${s * 30} ${top - 4} L ${s * 64} ${top + 6} L ${s * 44} ${top + 70} Z`);
      g.fillStyle = shade(out.over.color.startsWith("#") ? out.over.color : "#999999", 0.9); g.fill(lap); g.stroke(lap);
    }
  }
  if (out.kind === "dress") {
    const sk = new Path2D(`M ${-hipW - 4} -10 L ${hipW + 4} -10 L ${hipW + 60} 200 Q 0 222 ${-hipW - 60} 200 Z`);
    g.fillStyle = out.top; g.fill(sk); g.stroke(sk);
    g.strokeStyle = rgba(out.topShade, 0.7); g.lineWidth = 3;
    for (const k of [-50, 0, 50]) { g.beginPath(); g.moveTo(k * 0.4, 0); g.lineTo(k, 200); g.stroke(); }
  }
  // neck
  g.fillStyle = look.skin; g.strokeStyle = look.line; g.lineWidth = 4;
  g.beginPath(); g.roundRect(-24, top - 44, 48, 52, 12); g.fill(); g.stroke();
  g.fillStyle = rgba(look.skinShade, 0.9); g.fillRect(-22, top - 40, 44, 16);
  // collar / hood
  if (out.kind === "hoodie") {
    const hood = new Path2D(`M -70 ${top} Q 0 ${top + 46} 70 ${top} Q 60 ${top - 26} 36 ${top - 18} Q 0 ${top + 6} -36 ${top - 18} Q -60 ${top - 26} -70 ${top} Z`);
    g.fillStyle = out.topShade; g.fill(hood); g.stroke(hood);
  } else if (out.kind === "tee" || out.kind === "dress" || out.kind === "sweater") {
    g.beginPath(); g.moveTo(-34, top - 2); g.quadraticCurveTo(0, top + 26, 34, top - 2); g.strokeStyle = look.line; g.lineWidth = 4; g.stroke();
  } else {
    const col = new Path2D(`M -54 ${top - 20} L -10 ${top + 30} L 0 ${top + 8} L 10 ${top + 30} L 54 ${top - 20} Q 30 ${top - 8} 0 ${top - 6} Q -30 ${top - 8} -54 ${top - 20} Z`);
    g.fillStyle = out.topShade; g.fill(col); g.stroke(col);
  }
  if (out.scarf) {
    const sc = new Path2D(`M -66 ${top - 26} Q 0 ${top + 2} 66 ${top - 26} Q 74 ${top + 4} 60 ${top + 22} Q 0 ${top + 44} -60 ${top + 22} Q -74 ${top + 4} -66 ${top - 26} Z`);
    g.fillStyle = out.scarf; g.fill(sc); g.stroke(sc);
    const tail = new Path2D(`M 18 ${top + 20} L 54 ${top + 20} L 50 ${top + 150} L 22 ${top + 146} Z`);
    g.fill(tail); g.stroke(tail);
    g.strokeStyle = rgba("#ffffff", 0.35); g.lineWidth = 3;
    for (const k of [40, 80, 120]) { g.beginPath(); g.moveTo(22, top + k); g.lineTo(52, top + k + 2); g.stroke(); }
  }
  return { top, sw };
}

/** Draw a character in world space. Returns world positions of hands (for props/effects). */
export function drawPerson(g: G, look: Look, out: Outfit, p: Pose) {
  g.save();
  const hop = p.hop ?? 0;
  const bob = p.walkAmt ? Math.abs(Math.cos(p.walk ?? 0)) * 10 * p.walkAmt * (1 + (p.run ?? 0)) : 0;
  g.translate(p.x, p.y - hop - bob);
  g.scale(p.scale * look.height * (p.flip ? -1 : 1), p.scale * look.height);
  g.rotate((p.lean ?? 0) + (p.run ?? 0) * 0.08);
  const sh = (p.shoulders ?? 0) * 12;
  const breathe = Math.sin(p.t * 2.2) * 2.5;
  const shY = -246 - sh - breathe;
  const sw = look.shoulder;
  const defL = { x: -sw - 14, y: 4, type: "open" as Hand };
  const defR = { x: sw + 14, y: 4, type: "open" as Hand };
  // arm swing while walking
  const wa = p.walkAmt ?? 0;
  if (wa > 0) { defL.x -= 4; defL.y += Math.sin(p.walk ?? 0) * 26 * wa - 8; defR.y += -Math.sin(p.walk ?? 0) * 26 * wa - 8; }
  const hL = p.handL === undefined || p.handL === null ? defL : p.handL;
  const hR = p.handR === undefined || p.handR === null ? defR : p.handR;

  if (p.back) {
    // back view: arms behind body are in front visually; draw body then head over
    if ((p.sit ?? 0) < 0.5) legs(g, look, out, p); // seated from behind: legs are hidden in front of the body
    p.propBehind?.(g);
    torso(g, look, out, p);
    arm(g, look, out, -sw + 18, shY + 10, hL, -1);
    arm(g, look, out, sw - 18, shY + 10, hR, 1);
    g.save(); g.translate(0, HEAD_Y + (p.headNod ?? 0)); g.translate(0, 110); g.rotate(p.headTilt ?? 0); g.translate(0, -110);
    head(g, look, out, p); g.restore();
    g.restore();
    return;
  }

  if (look.hairStyle === "maja" || look.hairStyle === "bob") {
    g.save(); g.translate(0, HEAD_Y + (p.headNod ?? 0)); g.translate(0, 110); g.rotate(p.headTilt ?? 0); g.translate(0, -110);
    hairBack(g, look, p, noise1(p.t * 0.9, look.id.length) * 6 + (p.lean ?? 0) * 60); g.restore();
  }
  p.propBehind?.(g);
  if (p.armLBehind) arm(g, look, out, -sw + 18, shY + 10, hL, -1);
  if (p.armRBehind) arm(g, look, out, sw - 18, shY + 10, hR, 1);
  legs(g, look, out, p);
  torso(g, look, out, p);
  g.save(); g.translate(0, HEAD_Y + (p.headNod ?? 0)); g.translate(0, 110); g.rotate(p.headTilt ?? 0); g.translate(0, -110);
  head(g, look, out, p); g.restore();
  p.prop?.(g);
  if (!p.armLBehind) arm(g, look, out, -sw + 18, shY + 10, hL, -1);
  if (!p.armRBehind) arm(g, look, out, sw - 18, shY + 10, hR, 1);
  g.restore();
}
