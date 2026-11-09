# Quality Control

**Purpose:** validate inputs, animation, audio, and the final encoded video.

- **Reads:** source project, reference index, render, audio/provider manifests, and user requirements.
- **Owns:** `production/qa-report.md`, defect/fix list, final pass/fail status.
- **Checks:** reference index coverage, imports/dependencies, composition timing, scene/character continuity, readable subtitles, frame defects, MP4 streams/duration/fps, audible mix/clipping/loudness, and decoded final playback.
- **Handoff:** verified delivery and exact limitations → user.
- **Contract:** `creative/contracts.ts` (`QualityReport`). A command exiting zero is not a visual/audio review.
