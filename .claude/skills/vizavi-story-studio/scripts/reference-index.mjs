import { readdir, stat, mkdir, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_ROOTS = [
  { id: "frames", path: "references/frames", media: "image" },
  { id: "sheets", path: "references/sheets", media: "image" },
  { id: "user-images", path: "references/user/images", media: "image" },
  { id: "user-video", path: "references/user/video", media: "video" },
];
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm", ".m4v"]);

async function walk(directory, projectRoot, source) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) return walk(fullPath, projectRoot, source);
    const extension = extname(entry.name).toLowerCase();
    const isImage = IMAGE_EXTENSIONS.has(extension);
    const isVideo = VIDEO_EXTENSIONS.has(extension);
    if (source.media === "image" && !isImage) return [];
    if (source.media === "video" && !isVideo) return [];
    if (!isImage && !isVideo) return [];
    const info = await stat(fullPath);
    return [{ path: relative(projectRoot, fullPath).split("\\").join("/"), source: source.id,
      kind: isImage ? "image" : "video", bytes: info.size }];
  }));
  return nested.flat();
}

/** Index frame-sheet and user image/video sources. Missing source directories are valid empty inputs. */
export async function loadReferenceIndex(projectRoot = SKILL_ROOT, roots = DEFAULT_ROOTS) {
  const base = resolve(projectRoot);
  const lists = await Promise.all(roots.map((source) => walk(resolve(base, source.path), base, source)));
  return lists.flat().sort((a, b) => a.path.localeCompare(b.path));
}

export async function writeReferenceIndex(projectRoot = SKILL_ROOT) {
  const root = resolve(projectRoot);
  const references = await loadReferenceIndex(root);
  const manifest = {
    generatedAt: new Date().toISOString(),
    imageCount: references.filter((item) => item.kind === "image").length,
    videoCount: references.filter((item) => item.kind === "video").length,
    visualStyleAnalysisRequired: true,
    references,
  };
  const output = resolve(root, "production/reference-index.json");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  return { output, manifest };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { output, manifest } = await writeReferenceIndex();
  console.log(`Reference index written: ${relative(SKILL_ROOT, output)} (${manifest.imageCount} images, ${manifest.videoCount} videos)`);
  for (const item of manifest.references) console.log(`${item.kind}\t${item.path}`);
  if (!manifest.references.length) console.log("No user media references found; empty inputs are valid.");
}
