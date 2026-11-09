import React from "react";
import { Composition } from "remotion";
import { RussianTenSecondShort } from "./index";
export const RemotionRoot: React.FC = () => <Composition id="RussianTenSecondShort" component={RussianTenSecondShort} durationInFrames={300} fps={30} width={1080} height={1920} defaultProps={{ includeAudio: true }} />;
