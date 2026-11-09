# Agent notes

## Animated shorts (TikTok / Reels 9:16)

To make cartoons, read and follow `.claude/skills/vizavi-story-studio/SKILL.md`.

- Run commands from `.claude/skills/vizavi-story-studio/`. If `node_modules` is missing, run `./setup.sh`.
- Default format: 1080×1920, 30 fps. Rendering uses software WebGL (`swangle`, set in `remotion.config.ts`); there is no GPU here.
- Voice: ElevenLabs. The key lives in the skill's `.env` (git-ignored). Never print, read aloud, or commit it; the client loads it itself.
