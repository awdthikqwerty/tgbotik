import { Config } from "@remotion/cli/config";

// Sandbox has no GPU: SwiftShader via ANGLE is the only WebGL backend that works here.
Config.setChromiumOpenGlRenderer("swangle");
