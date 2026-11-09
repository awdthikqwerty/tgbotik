// Night / evening scene backgrounds (New Year's night + cozy evening memory interiors).
import type { Background } from "../lib/types";
import { SKY } from "./night-sky";
import { ROOM } from "./night-room";
import { MAJA, CITY } from "./night-outdoor";
import { FILM, DANCE } from "./night-interior";
import { canvas, radial } from "./night-kit";

let big: HTMLCanvasElement | null = null, small: HTMLCanvasElement | null = null;
const mk = (w: number, h: number) => { const c = canvas(w, h), g = c.getContext("2d")!; g.fillStyle = "#556"; g.fillRect(0, 0, w, h); g.fillStyle = "#a55"; g.fillRect(100, 100, 300, 300); return c; };
export const NIGHT: Record<string, Background> = {
  sky: SKY, room: ROOM, maja: MAJA, city: CITY, film: FILM, dance: DANCE,
  flat: { draw: (g) => { g.fillStyle = "#334"; g.fillRect(-200, -320, 1480, 2560); }, groundY: 1, light: SKY.light },
  big5: { draw: (g) => { big ??= mk(1480, 2560); for (let i = 0; i < 5; i++) g.drawImage(big, -200, -320); }, groundY: 1, light: SKY.light },
  small5: { draw: (g) => { small ??= mk(1080, 1920); for (let i = 0; i < 5; i++) g.drawImage(small, 0, 0); }, groundY: 1, light: SKY.light },
  fill5: { draw: (g) => { for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? "#334" : "#433"; g.fillRect(-200, -320, 1480, 2560); } }, groundY: 1, light: SKY.light },
  lighter5: { draw: (g) => { g.fillStyle = "#334"; g.fillRect(-200, -320, 1480, 2560); g.globalCompositeOperation = "lighter"; for (let i = 0; i < 5; i++) { g.globalAlpha = 0.1; g.fillRect(-200, -320, 1480, 2560); } g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; }, groundY: 1, light: SKY.light },
  radial5: { draw: (g) => { g.fillStyle = "#334"; g.fillRect(-200, -320, 1480, 2560); for (let i = 0; i < 5; i++) radial(g, 540, 960, 1100, "#ff8800", 0.1); }, groundY: 1, light: SKY.light },
};
// TEMP timing
for (const [k, b0] of Object.entries(NIGHT)) {
  const d = b0.draw, f = b0.front; let n = 0, tot = 0, first = 0;
  const b = { ...b0 };
  b.draw = (g, t) => { const s = performance.now(); d(g, t); f?.(g, t); g.getImageData(540, 960, 1, 1); const e = performance.now() - s; if (n === 0) first = e; else tot += e; n++; if (n === 30) console.log(`TIMING ${k} first=${first.toFixed(0)}ms avg=${(tot / 29).toFixed(1)}ms`); };
  b.front = undefined;
  NIGHT[k] = b;
}
