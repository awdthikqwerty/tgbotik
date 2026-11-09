// Hand-held props and set dressing drawn in character-local or world space.
import { G, circle, ellipse, rng, rgba, shade } from "./lib/util";

const LINE = "#3e2a33";

/** Bouquet: kraft/pink wrapping cone with roses. (x,y) = where the hands hold the stems. */
export function bouquet(g: G, x: number, y: number, s = 1, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  g.lineJoin = "round"; g.strokeStyle = LINE; g.lineWidth = 4;
  // back paper
  g.beginPath(); g.moveTo(0, 40); g.lineTo(-96, -120); g.quadraticCurveTo(0, -170, 96, -120); g.closePath();
  g.fillStyle = "#f7cfd9"; g.fill(); g.stroke();
  // leaves
  g.fillStyle = "#7fbf7a";
  for (const [lx, ly, a] of [[-70, -120, -0.8], [72, -118, 0.8], [-30, -150, -0.3], [40, -152, 0.4]] as const) {
    g.save(); g.translate(lx, ly); g.rotate(a); ellipse(g, 0, -16, 13, 30); g.fill(); g.stroke(); g.restore();
  }
  // flowers
  const r = rng(11);
  const cols = ["#ff8fab", "#ffb3c6", "#fff1e6", "#ffcf9f", "#ff6f91", "#f7a8d8"];
  const pts: Array<[number, number, number]> = [[-50, -118, 28], [0, -132, 32], [50, -118, 28], [-24, -96, 26], [26, -96, 26], [-62, -90, 22], [62, -90, 22], [0, -160, 24]];
  for (const [fx, fy, fr] of pts) {
    const c = cols[Math.floor(r() * cols.length)];
    circle(g, fx, fy, fr); g.fillStyle = c; g.fill(); g.stroke();
    g.strokeStyle = rgba(LINE, 0.5); g.lineWidth = 2.5;
    g.beginPath(); g.arc(fx, fy, fr * 0.55, 0.3, 4.6); g.stroke();
    g.beginPath(); g.arc(fx + 2, fy + 1, fr * 0.25, 2, 6); g.stroke();
    g.strokeStyle = LINE; g.lineWidth = 4;
    circle(g, fx - fr * 0.3, fy - fr * 0.35, fr * 0.18); g.fillStyle = "rgba(255,255,255,0.6)"; g.fill();
  }
  // baby's breath dots
  g.fillStyle = "#ffffff";
  for (let i = 0; i < 18; i++) { circle(g, -80 + r() * 160, -170 + r() * 90, 4 + r() * 3); g.fill(); }
  // front wrap
  g.beginPath(); g.moveTo(0, 60); g.lineTo(-74, -86); g.quadraticCurveTo(-20, -60, 0, -40); g.quadraticCurveTo(20, -60, 74, -86); g.closePath();
  g.fillStyle = "#e9c39b"; g.fill(); g.stroke();
  // ribbon
  g.fillStyle = "#ff7aa0";
  g.beginPath(); g.ellipse(-16, 6, 18, 10, -0.4, 0, Math.PI * 2); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(16, 6, 18, 10, 0.4, 0, Math.PI * 2); g.fill(); g.stroke();
  circle(g, 0, 6, 8); g.fill(); g.stroke();
  g.restore();
}

export function tablet(g: G, x: number, y: number, s = 1, glowA = 1) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.beginPath(); g.roundRect(-110, -78, 220, 156, 16); g.fillStyle = "#2b2836"; g.fill(); g.strokeStyle = LINE; g.lineWidth = 4; g.stroke();
  const gr = g.createLinearGradient(0, -66, 0, 66); gr.addColorStop(0, "#9fd0ff"); gr.addColorStop(1, "#ffd1e8");
  g.globalAlpha = 0.7 + 0.3 * glowA; g.beginPath(); g.roundRect(-98, -66, 196, 132, 8); g.fillStyle = gr; g.fill();
  g.restore();
}

export function popcorn(g: G, x: number, y: number, s = 1) {
  g.save(); g.translate(x, y); g.scale(s, s); g.strokeStyle = LINE; g.lineWidth = 4;
  const r = rng(5);
  for (let i = 0; i < 14; i++) { circle(g, -46 + r() * 92, -26 - r() * 26, 13 + r() * 6); g.fillStyle = i % 4 ? "#fff6dc" : "#ffe39a"; g.fill(); g.stroke(); }
  g.beginPath(); g.moveTo(-64, -22); g.lineTo(64, -22); g.lineTo(46, 44); g.lineTo(-46, 44); g.closePath();
  g.fillStyle = "#ff8fa8"; g.fill(); g.stroke();
  g.fillStyle = "#ffffff"; for (const k of [-34, 0, 34]) { g.beginPath(); g.moveTo(k - 9, -22); g.lineTo(k + 9, -22); g.lineTo(k + 6, 44); g.lineTo(k - 6, 44); g.closePath(); g.fill(); }
  g.beginPath(); g.moveTo(-64, -22); g.lineTo(64, -22); g.lineTo(46, 44); g.lineTo(-46, 44); g.closePath(); g.stroke();
  g.restore();
}

/** Knitted blanket draped over two seated laps (world space); (x,y) = centre of the top edge at waist height. */
export function blanket(g: G, x: number, y: number, w: number, t: number) {
  g.save(); g.translate(x, y); g.strokeStyle = LINE; g.lineWidth = 5; g.lineJoin = "round";
  const wv = Math.sin(t * 1.5) * 4;
  const d = new Path2D(`M ${-w / 2} 10 Q ${-w / 4} ${-26 + wv} 0 -8 Q ${w / 4} ${-30 - wv} ${w / 2} 10 Q ${w / 2 + 26} 110 ${w / 2 + 6} 200 Q ${w / 4} 186 0 204 Q ${-w / 4} 186 ${-w / 2 - 6} 200 Q ${-w / 2 - 26} 110 ${-w / 2} 10 Z`);
  const gr = g.createLinearGradient(0, -30, 0, 330); gr.addColorStop(0, "#f6c7a8"); gr.addColorStop(1, "#e7a58c");
  g.fillStyle = gr; g.fill(d); g.stroke(d);
  g.save(); g.clip(d); g.strokeStyle = rgba("#ffffff", 0.35); g.lineWidth = 10;
  for (let k = -w; k < w; k += 70) { g.beginPath(); g.moveTo(k, -40); g.lineTo(k + 60, 340); g.stroke(); }
  g.strokeStyle = rgba(shade("#e7a58c", 0.7), 0.4); g.lineWidth = 4;
  for (let yy = 40; yy < 330; yy += 60) { g.beginPath(); g.moveTo(-w, yy); g.lineTo(w, yy + 10); g.stroke(); }
  g.restore();
  g.restore();
}

export function musicNotes(g: G, t: number, cx: number, cy: number, n = 6, seed = 9) {
  const r = rng(seed);
  g.save(); g.lineWidth = 5; g.strokeStyle = "#ffffff"; g.fillStyle = "#ffffff";
  for (let i = 0; i < n; i++) {
    const ph = r(), sp = 0.5 + r() * 0.5;
    const k = (t * sp + ph) % 1;
    const x = cx + (r() - 0.5) * 520 + Math.sin(t * 2 + i) * 30, y = cy - k * 420;
    g.globalAlpha = Math.sin(k * Math.PI) * 0.9;
    g.save(); g.translate(x, y); g.rotate(Math.sin(t * 3 + i) * 0.3);
    ellipse(g, 0, 0, 14, 10, -0.4); g.fill(); g.beginPath(); g.moveTo(12, -2); g.lineTo(12, -48); g.lineTo(32, -40); g.stroke();
    g.restore();
  }
  g.restore();
}

export function splash(g: G, t: number, x: number, y: number, seed: number, a = 1) {
  const r = rng(seed);
  g.save(); g.fillStyle = "rgba(255,255,255,0.9)";
  for (let i = 0; i < 12; i++) {
    const ph = r(), k = (t * 2.2 + ph) % 1;
    const vx = (r() - 0.5) * 220, vy = -160 - r() * 160;
    const px = x + vx * k, py = y + vy * k + 380 * k * k;
    g.globalAlpha = a * (1 - k);
    circle(g, px, py, 5 + r() * 6); g.fill();
  }
  g.restore();
}
