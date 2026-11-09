// Day/sunset scene backgrounds. Each module paints static layers once into offscreen canvases
// and animates only light elements (clouds, sway, water, particles) per frame. Shared painting kit: day-kit.ts.
import type { Background } from "../lib/types";
import { park } from "./day-park";
import { flowers } from "./day-flowers";
import { sea } from "./day-sea";
import { dog } from "./day-dog";
import { everyday } from "./day-everyday";
import { finale } from "./day-finale";

export const DAY: Record<string, Background> = { park, flowers, sea, dog, everyday, finale };
