# Animation Engine

**Purpose:** implement the timed scene and render pipeline.

- **Reads:** locked storyboard, character bible, selected visual profile, asset/reference index.
- **Owns:** project-local Remotion composition and Three.js scene. Use `templates/bridge/` as the preserved Cartoon 3D source foundation; use `templates/scripts/bridge-stills.mjs` and `short_qa.py` for their documented roles.
- **Handoff:** deterministic frame timeline, render entry, dimensions/fps, and render manifest → Camera Director, Audio Studio, Quality Control.
- **Rule:** don't replace inherited rendering systems without a concrete technical/style reason. Copy/adapt into a production project; the retained bridge template is not itself a registered app.
- **Contract:** `creative/contracts.ts` (`ProductionBrief`, `Beat`, `ShotPlan`).
