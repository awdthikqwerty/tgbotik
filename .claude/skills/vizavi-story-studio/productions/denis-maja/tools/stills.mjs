// Render several stills of the Film in one bundle and tile them into a contact sheet.
// Usage: node tools/stills.mjs <out.jpg> <frame,frame,...> [cols=4] [scale=0.33]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const prod = resolve(here, "..");
const [out, list, cols = "4", scale = "0.33"] = process.argv.slice(2);
const frames = list.split(",").map(Number);
const serveUrl = await bundle({ entryPoint: resolve(prod, "src/index.ts"), publicDir: resolve(prod, "public") });
const inputProps = { noAudio: true };
const composition = await selectComposition({ serveUrl, id: "Film", inputProps, chromiumOptions: { gl: "swangle" } });
const tmp = "/tmp/stills"; mkdirSync(tmp, { recursive: true });
const files = [];
for (const f of frames) {
  const p = `${tmp}/f${f}.jpg`;
  await renderStill({ composition, serveUrl, frame: f, output: p, imageFormat: "jpeg", jpegQuality: 85, scale: Number(scale), inputProps, chromiumOptions: { gl: "swangle" }, timeoutInMilliseconds: 180000 });
  files.push(p);
}
const c = Number(cols), rows = Math.ceil(files.length / c);
const args = ["-v", "error", "-y"];
for (const f of files) args.push("-i", f);
const pads = [];
for (let i = 0; i < c * rows; i++) pads.push(i < files.length ? `[${i}]` : "");
const layout = files.map((_, i) => `${(i % c) === 0 ? "0" : Array.from({ length: i % c }, () => "w0").join("+")}_${Math.floor(i / c) === 0 ? "0" : Array.from({ length: Math.floor(i / c) }, () => "h0").join("+")}`).join("|");
args.push("-filter_complex", `${files.map((_, i) => `[${i}]`).join("")}xstack=inputs=${files.length}:layout=${layout}:fill=black`, out);
if (files.length > 1) execFileSync("ffmpeg", args); else execFileSync("cp", [files[0], out]);
console.log("wrote", out, frames.join(","));
