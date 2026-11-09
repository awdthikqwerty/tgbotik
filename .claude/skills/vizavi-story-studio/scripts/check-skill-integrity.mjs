import { access, readFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skillPath = resolve(root, "SKILL.md");
const markdown = await readFile(skillPath, "utf8");
const errors = [];
const localLinks = [...markdown.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map((m) => m[1]);
for (const link of localLinks) {
  if (/^(?:https?:|mailto:|#)/i.test(link)) continue;
  const path = decodeURIComponent(link.split("#", 1)[0]);
  if (isAbsolute(path)) { errors.push(`absolute path in skill link: ${link}`); continue; }
  try { await access(resolve(dirname(skillPath), path)); }
  catch { errors.push(`broken relative link: ${link}`); }
}
const required = [
  "creative/contracts.ts", "audio/voice/elevenlabs.ts", "audio/voice/voice-config.json",
  "references/frames", "references/sheets", "references/user/images", "references/user/video", "references/user/notes",
  "templates/bridge/Bridge.tsx", "templates/audio/music.py", "templates/scripts/short_qa.py",
  ...["creative-director", "story-engine", "research-engine", "character-director", "animation-engine", "camera-director", "audio-studio", "quality-control"].map((name) => `modules/${name}.md`),
];
for (const path of required) {
  try { await access(resolve(root, path)); }
  catch { errors.push(`required skill resource missing: ${path}`); }
}
const generatedOutputs = new Set(["audio/timeline.json", "production/reference-index.json"]);
for (const [, codePath] of markdown.matchAll(/`([^`]+)`/g)) {
  const normalized = codePath.replace(/\/$/, "");
  if (generatedOutputs.has(normalized)) continue;
  if (!/^(?:creative|audio|modules|references|templates|tests|scripts|production)\//.test(normalized)) continue;
  try { await access(resolve(root, normalized)); }
  catch { errors.push(`broken relative path in SKILL.md: ${codePath}`); }
}
const moduleCount = (markdown.match(/\[[^\]]+\]\(modules\/[a-z-]+\.md\)/g) ?? []).length;
if (moduleCount !== 8) errors.push(`SKILL.md links ${moduleCount}/8 module briefs`);
try {
  const sourceManifest = JSON.parse(await readFile(resolve(root, "source-integrity.json"), "utf8"));
  for (const record of sourceManifest.sources) {
    const bytes = await readFile(resolve(root, record.destination));
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest !== record.deliverySha256) errors.push(`source integrity mismatch: ${record.destination}`);
  }
} catch (error) { errors.push(`source integrity manifest invalid: ${error.message}`); }
if (errors.length) {
  console.error(`Skill integrity failed (${errors.length} issue${errors.length === 1 ? "" : "s"}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  const sourceCount = JSON.parse(await readFile(resolve(root, "source-integrity.json"), "utf8")).sources.length;
  console.log(`Skill integrity passed: ${localLinks.length} relative links, ${required.length} resources, 8 module links, ${sourceCount} inherited files hashed.`);
}
