// Screen-space post effects and world-space particles.
import { G, W, H, rng, clamp, rgba, circle, glow, noise1 } from "./lib/util";
import { heartPath } from "./ui/phone";

let small: HTMLCanvasElement | null = null, grainC: HTMLCanvasElement | null = null, vig: HTMLCanvasElement | null = null;

/** Soft bloom: blurred downscaled copy added back with screen blending. */
export function bloom(g: G, src: HTMLCanvasElement, amount = 0.28) {
  if (!small) { small = document.createElement("canvas"); small.width = W / 4; small.height = H / 4; }
  const s = small.getContext("2d")!;
  s.globalCompositeOperation = "copy"; s.filter = "blur(7px) brightness(1.05)";
  s.drawImage(src, 0, 0, W / 4, H / 4); s.filter = "none"; s.globalCompositeOperation = "source-over";
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "screen"; g.globalAlpha = amount;
  g.drawImage(small, 0, 0, W, H); g.restore();
}

export function vignette(g: G, strength = 0.42, tint = "#2a1438") {
  if (!vig) {
    vig = document.createElement("canvas"); vig.width = W; vig.height = H;
    const v = vig.getContext("2d")!;
    const gr = v.createRadialGradient(W / 2, H * 0.46, H * 0.28, W / 2, H * 0.5, H * 0.75);
    gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,1)");
    v.fillStyle = gr; v.fillRect(0, 0, W, H);
    v.globalCompositeOperation = "source-in"; v.fillStyle = tint; v.fillRect(0, 0, W, H);
  }
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = strength; g.drawImage(vig, 0, 0); g.restore();
}

export function grain(g: G, frame: number, a = 0.05) {
  if (!grainC) {
    grainC = document.createElement("canvas"); grainC.width = 256; grainC.height = 256;
    const c = grainC.getContext("2d")!; const img = c.createImageData(256, 256); const r = rng(7);
    for (let i = 0; i < img.data.length; i += 4) { const v = 110 + r() * 40; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    c.putImageData(img, 0, 0);
  }
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "overlay"; g.globalAlpha = a;
  const ox = (frame * 73) % 256, oy = (frame * 151) % 256;
  g.translate(-ox, -oy);
  const pat = g.createPattern(grainC, "repeat")!; g.fillStyle = pat; g.fillRect(0, 0, W + 256, H + 256);
  g.restore();
}

/** Floating bokeh / dust motes (screen space, parallax-free). */
export function motes(g: G, t: number, seed: number, count: number, color: string, alpha = 0.5, rise = 18) {
  const r = rng(seed);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < count; i++) {
    const x0 = r() * W, y0 = r() * H, sp = 0.4 + r(), sz = 3 + r() * 9, ph = r() * 10;
    const x = (x0 + noise1(t * 0.3 * sp + ph, i) * 60 + W) % W;
    const y = (((y0 - t * rise * sp) % H) + H) % H;
    const tw = 0.5 + 0.5 * Math.sin(t * 2 * sp + ph);
    glow(g, x, y, sz * 3, color, alpha * tw);
  }
  g.restore();
}

/** Hearts popping out from (x,y) starting at t0 (world space). */
export function heartBurst(g: G, t: number, t0: number, x: number, y: number, n = 7, scale = 1, seed = 3) {
  const lt = t - t0; if (lt < 0 || lt > 1.8) return;
  const r = rng(seed);
  g.save();
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI / 2 + (r() - 0.5) * 2.2, sp = 160 + r() * 200, s = (26 + r() * 30) * scale;
    const d = Math.min(1, lt * 1.6);
    const px = x + Math.cos(ang) * sp * d * scale, py = y + Math.sin(ang) * sp * d * scale - lt * 40;
    const a = clamp(1 - (lt - 0.9) / 0.9) * clamp(lt * 6);
    g.globalAlpha = a;
    heartPath(g, px, py, s * (0.6 + 0.4 * Math.min(1, lt * 4)));
    g.fillStyle = i % 3 === 0 ? "#ff8fb1" : i % 3 === 1 ? "#ff5c86" : "#ffc2d6"; g.fill();
    g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = 3; g.stroke();
  }
  g.restore();
}

export function sparkle(g: G, x: number, y: number, s: number, a: number, color = "#fff6d8") {
  if (a <= 0) return;
  g.save(); g.globalAlpha = a; g.translate(x, y); g.fillStyle = color;
  g.beginPath();
  for (let i = 0; i < 8; i++) { const r = i % 2 === 0 ? s : s * 0.22; const an = (i / 8) * Math.PI * 2; g.lineTo(Math.cos(an) * r, Math.sin(an) * r); }
  g.closePath(); g.fill();
  glow(g, 0, 0, s * 1.6, color, 0.5);
  g.restore();
}

export function sparkleField(g: G, t: number, seed: number, n: number, box: { x: number; y: number; w: number; h: number }, a = 1) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = box.x + r() * box.w, y = box.y + r() * box.h, ph = r() * 6.28, sp = 1.5 + r() * 2.5;
    const tw = Math.max(0, Math.sin(t * sp + ph));
    sparkle(g, x, y, 10 + r() * 14, tw * a);
  }
}

/** Soft additive light leak for memory vignettes. */
export function lightLeak(g: G, t: number, a = 0.35) {
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "screen";
  const x = W * (0.85 + 0.1 * Math.sin(t * 0.8)), y = H * 0.18;
  const gr = g.createRadialGradient(x, y, 0, x, y, H * 0.5);
  gr.addColorStop(0, rgba("#ffb37a", a)); gr.addColorStop(0.5, rgba("#ff7aa8", a * 0.4)); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.restore();
}

export function flash(g: G, a: number, color = "#fff4e6") {
  if (a <= 0) return;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = clamp(a); g.fillStyle = color; g.fillRect(0, 0, W, H); g.restore();
}

export function vibrationLines(g: G, x: number, y: number, a: number, t: number) {
  if (a <= 0) return;
  g.save(); g.globalAlpha = a; g.strokeStyle = "#ffffff"; g.lineWidth = 6; g.lineCap = "round";
  const j = Math.sin(t * 60) * 4;
  for (const s of [-1, 1]) for (const k of [0, 1]) {
    g.beginPath(); g.arc(x, y, 70 + k * 26 + j, s < 0 ? Math.PI * 0.75 : -Math.PI * 0.25, s < 0 ? Math.PI * 1.25 : Math.PI * 0.25); g.stroke();
  }
  g.restore();
}

export { circle };
