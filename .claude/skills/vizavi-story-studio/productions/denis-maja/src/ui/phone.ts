// Telegram-style chat screen inside a phone, drawn as a floating card.
import { G, rgba, circle, clamp } from "../lib/util";
import { UI_FONT } from "../lib/fonts";

export type Msg = { text: string; out: boolean; time: string; heart?: boolean; appear?: number };
export type PhoneState = {
  name: string; initial: string; avatar: [string, string]; status: string; clock: string;
  messages: Msg[]; input: string; caret: boolean; sendPress?: number; buzz?: number; glow?: number;
};

export function heartPath(g: G, x: number, y: number, s: number) {
  g.beginPath();
  g.moveTo(x, y + s * 0.3);
  g.bezierCurveTo(x - s * 0.05, y + s * 0.1, x - s * 0.5, y + s * 0.05, x - s * 0.5, y - s * 0.25);
  g.bezierCurveTo(x - s * 0.5, y - s * 0.55, x - s * 0.1, y - s * 0.6, x, y - s * 0.3);
  g.bezierCurveTo(x + s * 0.1, y - s * 0.6, x + s * 0.5, y - s * 0.55, x + s * 0.5, y - s * 0.25);
  g.bezierCurveTo(x + s * 0.5, y + s * 0.05, x + s * 0.05, y + s * 0.1, x, y + s * 0.3);
  g.closePath();
}

function wrap(g: G, text: string, maxW: number) {
  const words = text.split(" "); const lines: string[] = []; let cur = "";
  for (const w of words) { const t = cur ? cur + " " + w : w; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  return lines;
}

const PW = 500, PH = 960;
/** Draws the phone centred at (cx, cy) with scale s and opacity a. */
export function drawPhone(g: G, cx: number, cy: number, s: number, a: number, st: PhoneState, rot = 0) {
  if (a <= 0.001) return;
  const buzz = st.buzz ?? 0;
  g.save();
  g.globalAlpha = a;
  g.translate(cx + Math.sin(buzz * 90) * 7 * clamp(buzz), cy);
  g.rotate(rot + Math.sin(buzz * 70) * 0.03 * clamp(buzz));
  g.scale(s, s);
  g.translate(-PW / 2, -PH / 2);
  // glow + shadow
  g.save(); g.shadowColor = "rgba(30,10,40,0.45)"; g.shadowBlur = 50; g.shadowOffsetY = 20;
  g.beginPath(); g.roundRect(0, 0, PW, PH, 64); g.fillStyle = "#1d1b26"; g.fill(); g.restore();
  if (st.glow) { g.save(); g.shadowColor = rgba("#bfe3ff", 0.8 * st.glow); g.shadowBlur = 80; g.beginPath(); g.roundRect(0, 0, PW, PH, 64); g.strokeStyle = rgba("#ffffff", 0.0); g.stroke(); g.restore(); }
  g.beginPath(); g.roundRect(4, 4, PW - 8, PH - 8, 60); g.strokeStyle = "#4a4658"; g.lineWidth = 3; g.stroke();
  // screen
  const sx = 18, sy = 18, sw = PW - 36, sh = PH - 36;
  g.save(); g.beginPath(); g.roundRect(sx, sy, sw, sh, 48); g.clip();
  const bg = g.createLinearGradient(0, sy, 0, sy + sh);
  bg.addColorStop(0, "#cfe6c4"); bg.addColorStop(0.5, "#e2edc2"); bg.addColorStop(1, "#bfdcc8");
  g.fillStyle = bg; g.fillRect(sx, sy, sw, sh);
  // doodle pattern
  g.strokeStyle = "rgba(90,130,90,0.13)"; g.lineWidth = 3;
  for (let i = 0; i < 26; i++) { const x = sx + ((i * 97) % sw), y = sy + 120 + ((i * 151) % (sh - 200)); circle(g, x, y, 10 + (i % 3) * 6); g.stroke(); }
  // status bar
  g.fillStyle = "#ffffff"; g.fillRect(sx, sy, sw, 150);
  g.fillStyle = "#222"; g.font = `800 22px ${UI_FONT}`; g.textBaseline = "middle"; g.fillText(st.clock, sx + 44, sy + 34);
  g.beginPath(); g.roundRect(sx + sw - 80, sy + 25, 40, 18, 5); g.strokeStyle = "#222"; g.lineWidth = 2.5; g.stroke(); g.fillStyle = "#222"; g.fillRect(sx + sw - 76, sy + 29, 28, 10);
  // notch
  g.beginPath(); g.roundRect(sx + sw / 2 - 60, sy + 14, 120, 34, 17); g.fillStyle = "#1d1b26"; g.fill();
  // chat header
  g.strokeStyle = "#3d8fd6"; g.lineWidth = 5; g.lineCap = "round";
  g.beginPath(); g.moveTo(sx + 40, sy + 100); g.lineTo(sx + 26, sy + 86 + 14); g.moveTo(sx + 26, sy + 100); g.lineTo(sx + 40, sy + 114); g.stroke();
  const av = g.createLinearGradient(0, sy + 72, 0, sy + 128); av.addColorStop(0, st.avatar[0]); av.addColorStop(1, st.avatar[1]);
  circle(g, sx + 92, sy + 100, 30); g.fillStyle = av; g.fill();
  g.fillStyle = "#fff"; g.font = `900 28px ${UI_FONT}`; g.textAlign = "center"; g.fillText(st.initial, sx + 92, sy + 101); g.textAlign = "left";
  g.fillStyle = "#1a1a1a"; g.font = `800 28px ${UI_FONT}`; g.fillText(st.name, sx + 136, sy + 88);
  g.fillStyle = "#3d8fd6"; g.font = `700 20px ${UI_FONT}`; g.fillText(st.status, sx + 136, sy + 118);
  g.fillStyle = "rgba(0,0,0,0.08)"; g.fillRect(sx, sy + 149, sw, 2);
  // messages (bottom-up)
  g.font = `700 27px ${UI_FONT}`;
  let y = sy + sh - 120;
  for (let i = st.messages.length - 1; i >= 0; i--) {
    const m = st.messages[i];
    const ap = m.appear ?? 1; if (ap <= 0) continue;
    const lines = wrap(g, m.text, 300);
    const lw = Math.max(...lines.map((l) => g.measureText(l).width)) + (m.heart ? 36 : 0);
    const bw = Math.max(lw + 120, 170), bh = lines.length * 36 + 30;
    const bx = m.out ? sx + sw - 20 - bw : sx + 20;
    const by = y - bh;
    g.save();
    g.globalAlpha *= clamp(ap * 1.5);
    const k = 0.6 + 0.4 * Math.min(1, ap * 1.2) + Math.sin(clamp(ap) * Math.PI) * 0.05;
    g.translate(bx + (m.out ? bw : 0), by + bh); g.scale(k, k); g.translate(-(bx + (m.out ? bw : 0)), -(by + bh));
    g.beginPath(); g.roundRect(bx, by, bw, bh, 22);
    g.fillStyle = m.out ? "#e9fbd4" : "#ffffff"; g.shadowColor = "rgba(0,0,0,0.12)"; g.shadowBlur = 6; g.shadowOffsetY = 2; g.fill();
    g.shadowColor = "transparent";
    g.fillStyle = "#1c1c1c";
    lines.forEach((l, j) => g.fillText(l, bx + 20, by + 32 + j * 36));
    if (m.heart) { const last = lines[lines.length - 1]; const hx = bx + 20 + g.measureText(last).width + 22; heartPath(g, hx, by + 30 + (lines.length - 1) * 36, 26); g.fillStyle = "#ff3b5c"; g.fill(); }
    g.fillStyle = m.out ? "#5fae5a" : "#9aa3ab"; g.font = `700 17px ${UI_FONT}`;
    g.fillText(m.time, bx + bw - (m.out ? 92 : 62), by + bh - 14);
    if (m.out) { g.strokeStyle = "#5fae5a"; g.lineWidth = 2.5; for (const o of [0, 9]) { g.beginPath(); g.moveTo(bx + bw - 40 + o, by + bh - 16); g.lineTo(bx + bw - 34 + o, by + bh - 10); g.lineTo(bx + bw - 24 + o, by + bh - 22); g.stroke(); } }
    g.font = `700 27px ${UI_FONT}`;
    g.restore();
    y = by - 14;
  }
  // input bar
  const iy = sy + sh - 96;
  g.fillStyle = "#ffffff"; g.fillRect(sx, iy, sw, 96);
  g.beginPath(); g.roundRect(sx + 20, iy + 18, sw - 120, 60, 30); g.fillStyle = "#f2f3f5"; g.fill();
  g.save(); g.beginPath(); g.rect(sx + 30, iy + 18, sw - 140, 60); g.clip();
  g.font = `700 26px ${UI_FONT}`; g.textBaseline = "middle";
  const tw = g.measureText(st.input).width;
  const off = Math.max(0, tw - (sw - 170));
  if (st.input) { g.fillStyle = "#1c1c1c"; g.fillText(st.input, sx + 40 - off, iy + 49); }
  else { g.fillStyle = "#9aa0a6"; g.fillText("Wiadomość", sx + 40, iy + 49); }
  if (st.caret) { g.fillStyle = "#3d8fd6"; g.fillRect(sx + 42 + tw - off, iy + 32, 3, 34); }
  g.restore();
  const bxc = sx + sw - 54, byc = iy + 48;
  const press = st.sendPress ?? 0;
  if (st.input) {
    circle(g, bxc, byc, 30 * (1 - press * 0.15)); g.fillStyle = "#3d8fd6"; g.fill();
    g.save(); g.translate(bxc, byc); g.rotate(-0.4); g.fillStyle = "#fff";
    g.beginPath(); g.moveTo(-14, -12); g.lineTo(16, 0); g.lineTo(-14, 12); g.lineTo(-8, 0); g.closePath(); g.fill(); g.restore();
    if (press > 0) { circle(g, bxc, byc, 30 + press * 40); g.strokeStyle = rgba("#3d8fd6", 0.6 * (1 - press)); g.lineWidth = 6; g.stroke(); }
  } else {
    g.strokeStyle = "#8a9099"; g.lineWidth = 4; g.beginPath(); g.roundRect(bxc - 9, byc - 20, 18, 28, 9); g.stroke();
    g.beginPath(); g.arc(bxc, byc + 2, 16, 0, Math.PI); g.stroke(); g.beginPath(); g.moveTo(bxc, byc + 18); g.lineTo(bxc, byc + 26); g.stroke();
  }
  g.restore(); // screen clip
  g.restore();
}

/** Small phone held in a character's hands (world space, local units of the rig). */
export function handPhone(g: G, x: number, y: number, s: number, glow = 0.6, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  g.beginPath(); g.roundRect(-34, -60, 68, 120, 12); g.fillStyle = "#24212e"; g.fill(); g.strokeStyle = "#3e2a33"; g.lineWidth = 4; g.stroke();
  g.beginPath(); g.roundRect(-28, -54, 56, 108, 8); g.fillStyle = `rgba(190,230,255,${0.6 + glow * 0.4})`; g.fill();
  g.restore();
}
