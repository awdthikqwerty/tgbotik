import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, Composition, getInputProps, useCurrentFrame } from "remotion";
import { W, H, FPS } from "./lib/util";
import { BACKGROUNDS } from "./bg";
import { Film, TOTAL_FRAMES } from "./Film";

/** Preview a single background: --props='{"bg":"park","t":2}' (t = scene seconds, advances with frame). */
const BgPreview: React.FC = () => {
  const frame = useCurrentFrame();
  const { bg = "sky", t = 0, zoom = 1 } = getInputProps() as { bg?: string; t?: number; zoom?: number };
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const g = ref.current!.getContext("2d")!;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    // zoom<1 shows the overscan margin so coverage can be checked
    g.translate(W / 2, H / 2); g.scale(zoom, zoom); g.translate(-W / 2, -H / 2);
    const b = BACKGROUNDS[bg];
    b.draw(g, t + frame / FPS);
    b.front?.(g, t + frame / FPS);
  }, [frame, bg, t, zoom]);
  return <AbsoluteFill style={{ background: "#f0f" }}><canvas ref={ref} width={W} height={H} /></AbsoluteFill>;
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Film" component={Film} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="BgPreview" component={BgPreview} durationInFrames={300} fps={FPS} width={W} height={H} />
  </>
);
