// Frame compositor: segment cross-fades, post effects, subtitles, final audio mix.
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, getInputProps, staticFile, useCurrentFrame } from "remotion";
import tl from "./timeline.json";
import { W, H, FPS, easeInOut } from "./lib/util";
import { fontsReady } from "./lib/fonts";
import { SEGMENTS } from "./shots";
import { bloom, vignette, grain, lightLeak } from "./fx";
import { drawSubtitles } from "./ui/text";

export const TOTAL_FRAMES: number = (tl as any).frames;
let bufA: HTMLCanvasElement | null = null, bufB: HTMLCanvasElement | null = null;
const mk = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; };

function renderSegment(c: HTMLCanvasElement, i: number, T: number) {
  const g = c.getContext("2d")!;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
  g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
  const s = SEGMENTS[i];
  g.save(); s.draw(g, T - s.start, T); g.restore();
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (s.memory) lightLeak(g, T, 0.22);
}

export function drawFrame(g: CanvasRenderingContext2D, frame: number, opts: { subs?: boolean } = {}) {
  bufA ??= mk(); bufB ??= mk();
  const T = frame / FPS;
  let i = SEGMENTS.findIndex((s) => T >= s.start && T < s.end);
  if (i < 0) i = SEGMENTS.length - 1;
  renderSegment(bufA, i, T);
  g.setTransform(1, 0, 0, 1, 0, 0);
  const s = SEGMENTS[i];
  const k = s.xfade > 0 ? easeInOut(0, s.xfade, T - s.start) : 1;
  if (i > 0 && k < 1) {
    renderSegment(bufB, i - 1, T);
    g.globalAlpha = 1; g.drawImage(bufB, 0, 0);
    g.globalAlpha = k; g.drawImage(bufA, 0, 0); g.globalAlpha = 1;
  } else g.drawImage(bufA, 0, 0);
  bloom(g, g.canvas as HTMLCanvasElement, 0.26);
  vignette(g, 0.38);
  grain(g, frame, 0.045);
  if (opts.subs !== false) drawSubtitles(g, T);
  // fade in from black / out to black
  const fin = 1 - Math.min(1, T / 0.5), fout = Math.max(0, (T - ((tl as any).duration - 0.8)) / 0.8);
  if (fin > 0 || fout > 0) { g.fillStyle = `rgba(0,0,0,${Math.max(fin, fout)})`; g.fillRect(0, 0, W, H); }
}

export const Film: React.FC = () => {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender("fonts"));
  const { noAudio } = getInputProps() as { noAudio?: boolean };
  useEffect(() => { fontsReady.then(() => { setReady(true); continueRender(handle); }); }, [handle]);
  useLayoutEffect(() => {
    if (!ready) return;
    drawFrame(ref.current!.getContext("2d")!, frame);
  }, [frame, ready]);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <canvas ref={ref} width={W} height={H} />
      {!noAudio && <Audio src={staticFile("audio/mix.wav")} />}
    </AbsoluteFill>
  );
};
