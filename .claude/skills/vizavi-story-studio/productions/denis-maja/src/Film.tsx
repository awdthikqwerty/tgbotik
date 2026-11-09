// PLACEHOLDER film compositor (replaced by the main implementation).
import React from "react";
import { AbsoluteFill } from "remotion";
import tl from "./timeline.json";
export const TOTAL_FRAMES: number = (tl as any).frames;
export const Film: React.FC = () => <AbsoluteFill style={{ background: "#000" }} />;
