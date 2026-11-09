// Small Yorkshire terrier, side view, drawn in world space. Faces right unless flip.
import { G, ellipse, circle } from "../lib/util";

const LINE = "#3e2a33", TAN = "#d9a066", TAN_D = "#b07a44", STEEL = "#5d6b82", STEEL_D = "#45506a";

export function drawYorkie(g: G, x: number, y: number, s: number, t: number, o: { run?: number; flip?: boolean; jump?: number; wag?: number } = {}) {
  const run = o.run ?? 1, ph = t * 14;
  g.save();
  g.translate(x, y - (o.jump ?? 0) - Math.abs(Math.sin(ph)) * 10 * run);
  g.scale(s * (o.flip ? -1 : 1), s);
  g.lineWidth = 4; g.strokeStyle = LINE; g.lineJoin = "round"; g.lineCap = "round";
  // legs
  for (const [lx, off] of [[-40, 0], [-24, Math.PI], [36, Math.PI * 0.5], [52, Math.PI * 1.5]] as const) {
    const sw = Math.sin(ph + off) * 14 * run;
    g.beginPath(); g.moveTo(lx, -28); g.lineTo(lx + sw, 0); g.strokeStyle = LINE; g.lineWidth = 15; g.stroke();
    g.strokeStyle = TAN; g.lineWidth = 9; g.stroke();
  }
  // tail
  const wag = Math.sin(t * 22) * 0.5 * (o.wag ?? 1);
  g.save(); g.translate(-56, -52); g.rotate(-0.9 + wag);
  g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-6, -22, 4, -34); g.strokeStyle = LINE; g.lineWidth = 12; g.stroke(); g.strokeStyle = STEEL; g.lineWidth = 6; g.stroke();
  g.restore();
  // body (steel-blue saddle, tan underside)
  ellipse(g, 0, -42, 64, 28); g.fillStyle = TAN; g.fill(); g.strokeStyle = LINE; g.lineWidth = 4; g.stroke();
  g.save(); ellipse(g, 0, -42, 64, 28); g.clip(); ellipse(g, -6, -58, 62, 24); g.fillStyle = STEEL; g.fill();
  g.strokeStyle = STEEL_D; g.lineWidth = 2; for (let k = -40; k < 50; k += 14) { g.beginPath(); g.moveTo(k, -64); g.lineTo(k + 6, -40); g.stroke(); }
  g.restore();
  // head
  g.save(); g.translate(62, -70); g.rotate(Math.sin(t * 6) * 0.08);
  ellipse(g, 0, 0, 34, 30); g.fillStyle = TAN; g.fill(); g.strokeStyle = LINE; g.lineWidth = 4; g.stroke();
  // ears
  for (const ex of [-16, 8]) { g.beginPath(); g.moveTo(ex - 8, -20); g.lineTo(ex, -50); g.lineTo(ex + 12, -18); g.closePath(); g.fillStyle = TAN_D; g.fill(); g.stroke(); }
  // muzzle with fluffy beard
  ellipse(g, 26, 10, 20, 15); g.fillStyle = "#e8bb85"; g.fill(); g.stroke();
  circle(g, 42, 4, 6); g.fillStyle = "#2a1c20"; g.fill();
  circle(g, 6, -6, 6); g.fillStyle = "#2a1c20"; g.fill(); circle(g, 8, -8, 2); g.fillStyle = "#fff"; g.fill();
  g.beginPath(); g.moveTo(30, 20); g.quadraticCurveTo(36, 30, 42, 20); g.strokeStyle = LINE; g.lineWidth = 3; g.stroke();
  ellipse(g, 36, 26, 6, 8); g.fillStyle = "#f08a9a"; g.fill();
  // little bow
  g.fillStyle = "#f28aa8"; g.beginPath(); g.moveTo(-4, -28); g.lineTo(-18, -38); g.lineTo(-18, -18); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-4, -28); g.lineTo(10, -38); g.lineTo(10, -18); g.closePath(); g.fill(); g.stroke();
  g.restore();
  g.restore();
}
