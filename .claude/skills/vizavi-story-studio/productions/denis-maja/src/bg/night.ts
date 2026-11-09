// Night / evening scene backgrounds (New Year's night + cozy evening memory interiors).
import type { Background } from "../lib/types";
import { SKY } from "./night-sky";
import { ROOM } from "./night-room";
import { MAJA, CITY } from "./night-outdoor";
import { FILM, DANCE } from "./night-interior";

export const NIGHT: Record<string, Background> = {
  sky: SKY, room: ROOM, maja: MAJA, city: CITY, film: FILM, dance: DANCE,
};
// TEMP timing
for (const [k, b0] of Object.entries(NIGHT)) {
  const d = b0.draw, f = b0.front; let n = 0, tot = 0, first = 0;
  const b = { ...b0 };
  b.draw = (g, t) => { const s = performance.now(); d(g, t); f?.(g, t); const e = performance.now() - s; if (n === 0) first = e; else tot += e; n++; if (n === 30) console.log(`TIMING ${k} first=${first.toFixed(0)}ms avg=${(tot / 29).toFixed(1)}ms`); };
  b.front = undefined;
  NIGHT[k] = b;
}
