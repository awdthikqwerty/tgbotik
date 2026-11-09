// Registry of scene backgrounds. Night scenes live in bg/night.ts, day scenes in bg/day.ts.
import type { Background } from "../lib/types";
import { NIGHT } from "./night";
import { DAY } from "./day";

export const BACKGROUNDS: Record<string, Background> = { ...NIGHT, ...DAY };
