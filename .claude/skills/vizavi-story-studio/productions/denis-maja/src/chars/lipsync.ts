// Lip-sync from ElevenLabs character alignment (absolute timeline seconds).
import tl from "../timeline.json";

type Ch = { c: string; s: number; e: number };
type Voice = { id: string; speaker: string; start: number; end: number; duration: number; chars: Ch[]; words: Array<{ w: string; s: number; e: number }>; text: string };
export const VOICES: Voice[] = (tl as any).voice;

const OPEN: Record<string, [number, "a" | "e" | "o"]> = {
  a: [0.9, "a"], "ą": [0.75, "o"], e: [0.65, "e"], "ę": [0.6, "e"], i: [0.42, "e"], y: [0.5, "e"],
  o: [0.7, "o"], "ó": [0.62, "o"], u: [0.58, "o"],
};
function charOpen(c: string): [number, "a" | "e" | "o"] {
  const l = c.toLowerCase();
  if (OPEN[l]) return OPEN[l];
  if ("mbp".includes(l)) return [0, "e"];
  if (/[a-ząćęłńóśźż]/.test(l)) return [0.22, "e"];
  return [0, "e"];
}
function openAt(v: Voice, t: number): [number, "a" | "e" | "o"] {
  // binary search would be nicer; lines are short
  for (const ch of v.chars) if (t >= ch.s && t < ch.e) return charOpen(ch.c);
  return [0, "e"];
}
/** Mouth openness for a speaker at timeline time t (smoothed over ±45 ms). */
export function mouthFor(speaker: string, t: number): { open: number; vowel: "a" | "e" | "o"; speaking: boolean } {
  const v = VOICES.find((x) => x.speaker === speaker && t >= x.start - 0.05 && t <= x.end + 0.12);
  if (!v) return { open: 0, vowel: "e", speaking: false };
  const a = openAt(v, t - 0.045), b = openAt(v, t), c = openAt(v, t + 0.045);
  const open = a[0] * 0.25 + b[0] * 0.5 + c[0] * 0.25;
  return { open, vowel: b[0] > 0 ? b[1] : a[1], speaking: true };
}
export const voiceById = (id: string) => VOICES.find((v) => v.id === id)!;
