// Contract between background modules and the film compositor.
import type { G } from "./util";

/** Light that characters standing in this scene should receive. */
export type SceneLight = {
  key: string;        // main light colour (e.g. warm lamp / sunset)
  keyDir: -1 | 1;     // key light comes from the left (-1) or right (1)
  ambient: string;    // shadow-side tint
  rim: string;        // rim/back light colour
  strength: number;   // 0..1 how strongly characters get tinted
};

export type Background = {
  /** Draw the full background at scene-local time t (seconds). World is 1080x1920 but must cover OVERSCAN. */
  draw: (g: G, t: number) => void;
  /** Optional layer drawn ABOVE characters (foreground leaves, railing, snowfall, bokeh...). */
  front?: (g: G, t: number) => void;
  /** Y of the floor/ground line where standing characters' feet go (world coords). */
  groundY: number;
  light: SceneLight;
  /** Named anchor points for staging (bench seat, couch seat, window, railing...). */
  anchors?: Record<string, { x: number; y: number; w?: number; h?: number }>;
};
