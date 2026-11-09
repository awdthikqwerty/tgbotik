// Renders characters with scene lighting: key-side tint, ambient tint, rim light and a soft contact shadow.
import { G, rgba, OVERSCAN } from "../lib/util";
import type { SceneLight } from "../lib/types";

const OW = OVERSCAN.x1 - OVERSCAN.x0, OH = OVERSCAN.y1 - OVERSCAN.y0;
let A: HTMLCanvasElement | null = null, B: HTMLCanvasElement | null = null;
function cv() { const c = document.createElement("canvas"); c.width = OW; c.height = OH; return c; }

/**
 * Draw `paint` (world-space drawing of one or more characters) lit by `light` onto g (which already has the camera transform).
 * bbox limits the lighting work to the region the characters occupy (world coords).
 */
export function litLayer(g: G, light: SceneLight, bbox: { x0: number; y0: number; x1: number; y1: number }, paint: (c: G) => void, rimAlpha = 0.55) {
  A ??= cv(); B ??= cv();
  const a = A.getContext("2d")!, b = B.getContext("2d")!;
  const x0 = Math.max(OVERSCAN.x0, bbox.x0) - OVERSCAN.x0, y0 = Math.max(OVERSCAN.y0, bbox.y0) - OVERSCAN.y0;
  const x1 = Math.min(OVERSCAN.x1, bbox.x1) - OVERSCAN.x0, y1 = Math.min(OVERSCAN.y1, bbox.y1) - OVERSCAN.y0;
  const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0);
  a.setTransform(1, 0, 0, 1, 0, 0); a.clearRect(x0, y0, w, h);
  a.setTransform(1, 0, 0, 1, -OVERSCAN.x0, -OVERSCAN.y0);
  paint(a);
  a.setTransform(1, 0, 0, 1, 0, 0);
  const s = light.strength;
  // directional tint: key colour on the lit side, ambient on the shadow side
  a.globalCompositeOperation = "source-atop";
  const gx0 = light.keyDir > 0 ? x1 : x0, gx1 = light.keyDir > 0 ? x0 : x1;
  const gr = a.createLinearGradient(gx0, 0, gx1, 0);
  gr.addColorStop(0, rgba(light.key, 0.26 * s)); gr.addColorStop(0.5, rgba(light.key, 0.05 * s)); gr.addColorStop(1, rgba(light.ambient, 0.32 * s));
  a.fillStyle = gr; a.fillRect(x0, y0, w, h);
  a.globalCompositeOperation = "source-over";
  // rim light on the key side edges
  b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(x0, y0, w, h);
  b.drawImage(A, x0, y0, w, h, x0, y0, w, h);
  b.globalCompositeOperation = "destination-out";
  b.drawImage(A, x0, y0, w, h, x0 - light.keyDir * 9, y0 + 3, w, h);
  b.globalCompositeOperation = "source-in";
  b.fillStyle = light.rim; b.fillRect(x0, y0, w, h);
  b.globalCompositeOperation = "source-over";
  g.drawImage(A, x0, y0, w, h, x0 + OVERSCAN.x0, y0 + OVERSCAN.y0, w, h);
  g.save(); g.globalCompositeOperation = "lighter"; g.globalAlpha = rimAlpha * s;
  g.drawImage(B, x0, y0, w, h, x0 + OVERSCAN.x0, y0 + OVERSCAN.y0, w, h);
  g.restore();
}

export function contactShadow(g: G, x: number, y: number, w: number, a = 0.28) {
  const gr = g.createRadialGradient(x, y, 0, x, y, w);
  gr.addColorStop(0, `rgba(40,20,50,${a})`); gr.addColorStop(1, "rgba(40,20,50,0)");
  g.save(); g.translate(x, y); g.scale(1, 0.18); g.translate(-x, -y);
  g.fillStyle = gr; g.fillRect(x - w, y - w, w * 2, w * 2); g.restore();
}
