// The cast. Character identity (face, hair, eyes, glasses, proportions) is fixed here; outfits change only with the season.
import type { Look, Outfit } from "./rig";

export const DENIS: Look = {
  id: "denis", skin: "#ffe1cf", skinShade: "#f0b9a2", blushColor: "#ff9a9a",
  hair: "#6b4430", hairShade: "#46291c", hairHi: "#a87454",
  iris: "#8a5530", irisDark: "#4a2a17", line: "#3e2a33",
  hairStyle: "denis", glasses: true, shoulder: 112, height: 1.04,
};
export const MAJA: Look = {
  id: "maja", skin: "#ffe6d8", skinShade: "#f3bfaa", blushColor: "#ff9fb0",
  hair: "#b98d5e", hairShade: "#8a6440", hairHi: "#e2bd8a",
  iris: "#4f9a6a", irisDark: "#1f5a3a", line: "#4a3038",
  hairStyle: "maja", girl: true, shoulder: 98, height: 0.97,
};
/** Maja's friend: deliberately different silhouette (dark bob, beanie, purple coat) so she is never mistaken for Maja. */
export const FRIEND: Look = {
  id: "friend", skin: "#f6d2bd", skinShade: "#e2a98f", blushColor: "#ff9a9a",
  hair: "#3a2a2e", hairShade: "#21171a", hairHi: "#6a5058",
  iris: "#5a3a2a", irisDark: "#2a1a12", line: "#3a262c",
  hairStyle: "bob", girl: true, shoulder: 96, height: 0.95,
};

export const OUTFITS = {
  denis: {
    home: { kind: "hoodie", top: "#3d4f86", topShade: "#2b3863", accent: "#f4efe6", pants: "#6c7286", pantsShade: "#4b4f60", shoes: "#f3efe8" },
    winter: { kind: "puffer", top: "#3a4a7e", topShade: "#2a355d", scarf: "#e9b44c", pants: "#4c5c86", pantsShade: "#36426a", shoes: "#6b4a36" },
    casual: { kind: "hoodie", top: "#3d4f86", topShade: "#2b3863", accent: "#f4efe6", pants: "#4c5c86", pantsShade: "#36426a", shoes: "#f3efe8" },
    summer: { kind: "tee", top: "#f6f2ea", topShade: "#d9d2c6", accent: "#3d4f86", pants: "#3d4f86", pantsShade: "#2b3863", shoes: "#f3efe8", shorts: true },
    autumn: { kind: "hoodie", top: "#3d4f86", topShade: "#2b3863", accent: "#f4efe6", over: { color: "#c99a68", shade: "#ad7f52" }, pants: "#4c5c86", pantsShade: "#36426a", shoes: "#6b4a36" },
  } satisfies Record<string, Outfit>,
  maja: {
    winter: { kind: "coat", top: "#f4e7d7", topShade: "#dccab4", scarf: "#f2a2b6", pants: "#a9bedf", pantsShade: "#8199c0", shoes: "#f6f1ea" },
    casual: { kind: "sweater", top: "#f6b9c9", topShade: "#e293aa", pants: "#a9bedf", pantsShade: "#8199c0", shoes: "#f6f1ea" },
    summer: { kind: "dress", top: "#fbe6a0", topShade: "#e9cb72", pants: "#fbe6a0", pantsShade: "#e9cb72", shoes: "#f6f1ea" },
    autumn: { kind: "sweater", top: "#f6e9da", topShade: "#e0cdb6", over: { color: "#cbb6ea", shade: "#ae97d4" }, pants: "#a9bedf", pantsShade: "#8199c0", shoes: "#f6f1ea" },
  } satisfies Record<string, Outfit>,
  friend: {
    winter: { kind: "coat", top: "#7d5fae", topShade: "#5e4590", beanie: "#e8b94e", pants: "#3e4256", pantsShade: "#2b2e3d", shoes: "#3a2c2c" },
  } satisfies Record<string, Outfit>,
};
