import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

// No GPU here: GPU-raster 2D canvases run on SwiftShader and are much slower than Skia's CPU raster.
// willReadFrequently forces every 2D canvas onto the CPU path.
const getContext = HTMLCanvasElement.prototype.getContext as any;
(HTMLCanvasElement.prototype as any).getContext = function (type: string, opts?: any) {
  return getContext.call(this, type, type === "2d" ? { willReadFrequently: true, ...opts } : opts);
};

registerRoot(RemotionRoot);
