// Character turnaround / expression sheet for design review: npx remotion still ... CharSheet
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, getInputProps } from "remotion";
import { W, H } from "../lib/util";
import { drawPerson, Pose } from "./rig";
import { DENIS, MAJA, FRIEND, OUTFITS } from "./cast";

export const CharSheet: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  const { sheet = "main" } = getInputProps() as { sheet?: string };
  useLayoutEffect(() => {
    const g = ref.current!.getContext("2d")!;
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#fde7e0"); gr.addColorStop(1, "#d9d3f2");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const base: Pose = { x: 0, y: 0, scale: 0.55, t: 1.2, smile: 0.5 };
    if (sheet === "main") {
      drawPerson(g, DENIS, OUTFITS.denis.casual, { ...base, x: 200, y: 520 });
      drawPerson(g, MAJA, OUTFITS.maja.casual, { ...base, x: 540, y: 520, headTurn: -0.3 });
      drawPerson(g, FRIEND, OUTFITS.friend.winter, { ...base, x: 880, y: 520, headTurn: 0.2 });
      drawPerson(g, DENIS, OUTFITS.denis.winter, { ...base, x: 200, y: 1250, sit: 1, handL: { x: -30, y: -110, type: "hold" }, handR: { x: 30, y: -110, type: "hold" }, worry: 0.7, lookY: 0.8, blush: 0.6 });
      drawPerson(g, MAJA, OUTFITS.maja.winter, { ...base, x: 540, y: 1250, surprise: 1, handR: { x: 20, y: -250, type: "open" } });
      drawPerson(g, MAJA, OUTFITS.maja.summer, { ...base, x: 880, y: 1250, joy: 1, open: 0.6, smile: 1, walk: 1, walkAmt: 1 });
      drawPerson(g, DENIS, OUTFITS.denis.autumn, { ...base, x: 300, y: 1800, back: true });
      drawPerson(g, MAJA, OUTFITS.maja.autumn, { ...base, x: 520, y: 1800, back: true });
      drawPerson(g, DENIS, OUTFITS.denis.summer, { ...base, x: 820, y: 1800, joy: 1, open: 0.7, smile: 1, handR: { x: 150, y: -420, type: "fist" }, hop: 20 });
    } else {
      // close-up faces
      drawPerson(g, DENIS, OUTFITS.denis.home, { ...base, scale: 1.5, x: 300, y: 1300, smile: 0.4, headTurn: 0.25, blush: 0.4 });
      drawPerson(g, MAJA, OUTFITS.maja.casual, { ...base, scale: 1.5, x: 790, y: 1300, smile: 0.7, headTurn: -0.25, open: 0.4 });
    }
  }, [sheet]);
  return <AbsoluteFill><canvas ref={ref} width={W} height={H} /></AbsoluteFill>;
};
