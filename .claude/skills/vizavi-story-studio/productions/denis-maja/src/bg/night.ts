// Night / evening scene backgrounds (New Year's night + cozy evening memory interiors).
import type { Background } from "../lib/types";
import { SKY } from "./night-sky";
import { ROOM } from "./night-room";
import { MAJA, CITY } from "./night-outdoor";
import { FILM, DANCE } from "./night-interior";

const flat = (c: string): Background => ({
  draw: (g) => { g.fillStyle = c; g.fillRect(-200, -320, 1480, 2560); },
  groundY: 1500, light: { key: "#ffd9a8", keyDir: 1, ambient: "#5a5a9a", rim: "#ffb0d0", strength: 0.3 },
});
export const NIGHT: Record<string, Background> = {
  sky: SKY, room: ROOM, maja: MAJA, city: CITY, film: FILM, dance: DANCE,
};
