// PLACEHOLDER — replaced by the night-backgrounds worker.
import type { Background } from "../lib/types";
const flat = (c: string): Background => ({
  draw: (g) => { g.fillStyle = c; g.fillRect(-200, -320, 1480, 2560); },
  groundY: 1500, light: { key: "#ffd9a8", keyDir: 1, ambient: "#5a5a9a", rim: "#ffb0d0", strength: 0.3 },
});
export const NIGHT: Record<string, Background> = {
  sky: flat("#1a1840"), room: flat("#3a2f55"), maja: flat("#24264f"), city: flat("#151436"), film: flat("#5b4466"), dance: flat("#4a3a66"),
};
