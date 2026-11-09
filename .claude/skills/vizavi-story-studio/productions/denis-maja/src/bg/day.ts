// Day/sunset scene backgrounds. Each module paints static layers once into offscreen canvases
// and animates only light elements (clouds, sway, water, particles) per frame. Shared painting kit: day-kit.ts.
import type { Background } from "../lib/types";
import { park } from "./day-park";
import { flowers } from "./day-flowers";
import { sea } from "./day-sea";
import { dog } from "./day-dog";
import { everyday } from "./day-everyday";
import { finale } from "./day-finale";
import { PROF } from "./day-kit";

const prof = (b: Background): Background => ({ ...b, front: (g, t) => { b.front?.(g, t); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = "#000"; g.font = "22px monospace"; PROF.forEach((s, i) => g.fillText(s, 20, 40 + i * 28)); g.restore(); } });
export const DAY: Record<string, Background> = { park: prof(park), flowers: prof(flowers), sea: prof(sea), dog: prof(dog), everyday: prof(everyday), finale: prof(finale) };
