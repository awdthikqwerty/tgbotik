import React from "react";
import { Composition, Still } from "remotion";
import { CharacterSheet } from "./CharacterSheet";
import { Film } from "./Film";
import { TOTAL_FRAMES, FPS, W, H } from "./lib";

export const RemotionRoot: React.FC = () => (
  <>
    <Still id="CharacterSheet" component={CharacterSheet} width={1200} height={2200} />
    <Composition id="Film" component={Film} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} />
  </>
);
