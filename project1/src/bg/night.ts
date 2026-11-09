// Night / evening scene backgrounds (New Year's night + cozy evening memory interiors).
import type { Background } from "../lib/types";
import { SKY } from "./night-sky";
import { ROOM } from "./night-room";
import { MAJA, CITY } from "./night-outdoor";
import { FILM, DANCE } from "./night-interior";

export const NIGHT: Record<string, Background> = { sky: SKY, room: ROOM, maja: MAJA, city: CITY, film: FILM, dance: DANCE };
