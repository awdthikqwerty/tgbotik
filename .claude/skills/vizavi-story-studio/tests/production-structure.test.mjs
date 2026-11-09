import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp } from "node:fs/promises";
import { loadReferenceIndex } from "../scripts/reference-index.mjs";

const project = resolve(import.meta.dirname, "..");
test("all user reference folders exist and empty folders are safe", async () => {
  for (const path of ["references/user/images", "references/user/video", "references/user/notes", "references/frames", "references/sheets"]) {
    assert.ok((await stat(resolve(project, path))).isDirectory(), `${path} must exist`);
  }
  const emptyRoot = resolve(project, "references/not-provided");
  assert.deepEqual(await loadReferenceIndex(emptyRoot), []);
});
test("frames and user media are automatically indexed recursively", async () => {
  const root = await mkdtemp(join(tmpdir(), "vizavi-ref-test-"));
  try {
    const frame = join(root, "references/frames/sheets/scene.png");
    const still = join(root, "references/user/images/character.webp");
    const sheet = join(root, "references/sheets/short.jpg");
    const video = join(root, "references/user/video/move.mp4");
    await Promise.all([frame, still, sheet, video].map((p) => mkdir(dirname(p), { recursive: true })));
    await Promise.all([writeFile(frame, "fixture"), writeFile(still, "fixture"), writeFile(sheet, "fixture"), writeFile(video, "fixture")]);
    const index = await loadReferenceIndex(root);
    assert.deepEqual(index.map((x) => [x.path, x.kind, x.source]), [
      ["references/frames/sheets/scene.png", "image", "frames"],
      ["references/sheets/short.jpg", "image", "sheets"],
      ["references/user/images/character.webp", "image", "user-images"],
      ["references/user/video/move.mp4", "video", "user-video"],
    ]);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("all eight modules are linked to the skill and share real handoff contracts", async () => {
  const skill = await readFile(resolve(project, "SKILL.md"), "utf8");
  const names = ["creative-director", "story-engine", "research-engine", "character-director", "animation-engine", "camera-director", "audio-studio", "quality-control"];
  for (const name of names) {
    assert.match(skill, new RegExp(`\\]\\(modules/${name}\\.md\\)`));
    const module = await readFile(resolve(project, `modules/${name}.md`), "utf8");
    assert.match(module, /Purpose:/);
    assert.match(module, /Owns:/);
    assert.match(module, /Handoff:/);
    assert.ok(module.includes("creative/contracts.ts"));
  }
  const contract = await readFile(resolve(project, "creative/contracts.ts"), "utf8");
  for (const type of ["ProductionBrief", "Beat", "ShotPlan", "AudioSegment", "ResearchFinding", "CharacterBrief", "QualityReport"]) assert.ok(contract.includes(`interface ${type}`));
  const composition = await readFile(resolve(project, "tests/russian-10s/index.tsx"), "utf8");
  assert.match(composition, /ThreeCanvas/);
  assert.match(composition, /CameraMove/);
  assert.match(composition, /Когда звезда/);
});
