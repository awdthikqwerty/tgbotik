// PLACEHOLDER — replaced by the day-backgrounds worker.
import type { Background } from "../lib/types";
const flat = (c: string): Background => ({
  draw: (g) => { g.fillStyle = c; g.fillRect(-200, -320, 1480, 2560); },
  groundY: 1500, light: { key: "#ffd9a8", keyDir: 1, ambient: "#7a6a9a", rim: "#ffc0a0", strength: 0.3 },
});
export const DAY: Record<string, Background> = {
  park: flat("#f2c9b8"), flowers: flat("#f6d6e4"), sea: flat("#f7b98f"), dog: flat("#bfe3b4"), everyday: flat("#f5b48a"), finale: flat("#f0a487"),
};
