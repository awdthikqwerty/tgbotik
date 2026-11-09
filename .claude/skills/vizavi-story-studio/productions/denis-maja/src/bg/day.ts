// Day/sunset scene backgrounds. Each module paints static layers once into offscreen canvases
// and animates only light elements (clouds, sway, water, particles) per frame. Shared painting kit: day-kit.ts.
import type { Background } from "../lib/types";
import { park } from "./day-park";
import { flowers } from "./day-flowers";
import { sea } from "./day-sea";
import { dog } from "./day-dog";
import { everyday } from "./day-everyday";
import { finale } from "./day-finale";
import { PROF, profLines } from "./day-kit";

const bench = (() => {
  const out: string[] = [];
  const mk = (w: number, h: number) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  const st = Array.from({ length: 8 }, (_, i) => { const c = mk(128, 128), x = c.getContext("2d")!; x.fillStyle = `hsl(${i * 40},60%,60%)`; x.beginPath(); x.arc(64, 64, 50, 0, 7); x.fill(); return c; });
  const atlas = mk(1024, 128); const ax = atlas.getContext("2d")!; st.forEach((c, i) => ax.drawImage(c, i * 128, 0));
  const run = (label: string, f: (g: CanvasRenderingContext2D, i: number) => void) => {
    const c = mk(1480, 2560), g = c.getContext("2d")!; const t0 = performance.now();
    for (let i = 0; i < 2000; i++) f(g, i);
    g.getImageData(0, 0, 1, 1); out.push(`${label}: ${(performance.now() - t0).toFixed(0)}ms/2000`);
  };
  run("stampCanvas", (g, i) => g.drawImage(st[i % 8], (i * 37) % 1400, (i * 91) % 2500, 40, 36));
  run("atlas", (g, i) => g.drawImage(atlas, (i % 8) * 128, 0, 128, 128, (i * 37) % 1400, (i * 91) % 2500, 40, 36));
  run("ellipseFill", (g, i) => { g.fillStyle = `hsl(${i % 360},60%,60%)`; g.beginPath(); g.ellipse((i * 37) % 1400, (i * 91) % 2500, 14, 8, i, 0, 7); g.fill(); });
  run("arcFill", (g, i) => { g.fillStyle = "#c86"; g.beginPath(); g.arc((i * 37) % 1400, (i * 91) % 2500, 14, 0, 7); g.fill(); });
  run("newCanvas", (g, i) => { if (i < 200) { const c = mk(200, 200); c.getContext("2d")!.fillRect(0, 0, 10, 10); g.drawImage(c, i, i); } });
  return out;
});
let benchOut: string[] | null = null;
const prof = (b: Background): Background => ({ ...b, front: (g, t) => { b.front?.(g, t); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = "#000"; g.font = "22px monospace"; [...PROF, ...profLines(), ...(benchOut ??= bench())].forEach((s, i) => g.fillText(s, 20, 40 + i * 28)); g.restore(); } });
export const DAY: Record<string, Background> = { park: prof(park), flowers: prof(flowers), sea: prof(sea), dog: prof(dog), everyday: prof(everyday), finale: prof(finale) };
