// Google fonts with Polish glyphs (latin-ext), awaited before the first canvas draw.
import { loadFont as loadNunito } from "@remotion/google-fonts/Nunito";
import { loadFont as loadDancing } from "@remotion/google-fonts/DancingScript";

const n = loadNunito("normal", { weights: ["600", "700", "800", "900"], subsets: ["latin", "latin-ext"] });
const d = loadDancing("normal", { weights: ["600", "700"], subsets: ["latin", "latin-ext"] });
export const UI_FONT = n.fontFamily;
export const SCRIPT_FONT = d.fontFamily;
// Force every weight + the latin-ext subset to load before the first measureText, otherwise the first frame in a tab measures with a fallback.
const SAMPLE = "Aa ąćęłńóśźż ĄĆĘŁŃÓŚŹŻ „…” 0123456789";
export const fontsReady = Promise.all([n.waitUntilDone(), d.waitUntilDone()])
  .then(() => Promise.all([
    ...["600", "700", "800", "900"].map((w) => document.fonts.load(`${w} 40px ${UI_FONT}`, SAMPLE)),
    ...["600", "700"].map((w) => document.fonts.load(`${w} 40px ${SCRIPT_FONT}`, SAMPLE)),
  ]))
  .then(() => document.fonts.ready);
