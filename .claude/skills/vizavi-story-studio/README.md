# Vizavi Story Studio

Unified creative planning and animated short production skill. The integration lives at `project1/vizavi-story-studio/` inside the supplied writable workspace; this environment's filesystem grants writes to `/opt/projects/Telegram` and `/tmp`, while the source archives are in the read-only `/opt/projects/Movie` directory.

## What's integrated

- `source-integrity.json`: SHA-256 manifest for the 48 inherited template/reference files. Only `bridge_merge.py` was intentionally adjusted to use `REMOTION_PROJECT_ROOT`.
- `SKILL.md`: eight-module architecture, creative planning, modes, language policy, visual styles, production and QA workflow; each module links to its own input/ownership/handoff brief under `modules/`.
- `templates/bridge/`: retained Three.js/Remotion toon characters, scene builder, painted textures, ink, lighting, world, story/camera timeline, depth blur, grading, and composition implementation.
- `templates/audio/`: retained Python sound timeline, score/instruments, SFX, DSP, mix/ducking, and Kokoro helper.
- `templates/scripts/`: inherited still capture, shot merge, and video QA scripts.
- `references/vizavi/`: Vizavi Motion reference guides.
- `references/animated-shorts/`: original STYLE_BIBLE and analysis reports. The source archive had no frame sheets; current `references/frames/` and `references/sheets/` are user-supplied additions indexed separately.
- `audio/voice/elevenlabs.ts`: credential-safe ElevenLabs REST integration, voice/model discovery, MP3 caching, retries, optional alignment output, and provider manifest.
- `tests/russian-10s/`: Russian short test specification, Remotion entry, subtitle fixture, and output folder.
- `references/current-reference-review.md`: a concise read of the currently supplied visual families; `templates/user-prompt.md` shows how to submit a draft while keeping its core intact.

The Animated Shorts source README describes its code/docs as MIT, but the archive did not contain a separate LICENSE file. Preserve that stated attribution and verify license terms from the upstream author before redistribution. No reference video/frame assets were present in either archive.

## Requirements

- Node.js 22.18+ and npm. The ElevenLabs integration uses Node native TypeScript type stripping; run `npx tsc --noEmit` for type checking.
- For actual animation rendering: install this package's `package.json` dependencies, Chrome/Chromium supported by Remotion, and sufficient temporary disk space. `REMOTION_TMP` can point Remotion's temp work to a spacious disk.
- For the inherited Python audio synthesis and QA tools: Python 3.10+, ffmpeg/ffprobe, and `pip install -r requirements-audio.txt`. The Kokoro helper additionally needs its model files and faster-whisper; it is English-only and is not configured as RU/PL fallback.
- ElevenLabs generation needs an account/API key and valid voice/model access. The project can be inspected, edited, and dependency-installed without credentials.

## ElevenLabs setup

1. From the skill root, run `if [ ! -f .env ]; then cp .env.example .env; fi`, then open `.env` in a text editor and replace the placeholder with your key. This guard leaves any existing `.env` untouched. The client reads the file silently; `ELEVENLABS_API_KEY` in the process environment takes precedence. Never put the key in a command, terminal output, screenshot, commit, or chat. `.gitignore` excludes `.env`.
2. Run `npm run voices` to query the authenticated account's available voices and TTS models for Russian, English, and Polish. The CLI prints IDs and language metadata, not the key.
3. Listen to candidate previews. Prefer the target-language entry in `verified_languages`; metadata is a filter, not a proof of natural pronunciation. Set the chosen `voiceId` and supported model in `audio/voice/voice-config.json`.
4. Generate segment audio with `generateSpeech()` from `audio/voice/elevenlabs.ts`. Use separate calls by scene/speaker when synchronization or character identity needs it. Set `alignment: true` to request timestamps where supported. The returned manifest records provider, voice, model, language, output format, and request ID.
5. If a request fails, use its specific status message to diagnose access, quota, unsupported settings, or rate limit. Offer a fallback only after checking available language voices; always record the actual provider.

The REST client checks the process environment first, then parses only `ELEVENLABS_API_KEY` from the skill root `.env`; neither path logs the value. `.env.example` is a placeholder only, and the client never creates or changes `.env`. The REST client uses the official [voice listing](https://elevenlabs.io/docs/api-reference/voices/search), [model listing](https://elevenlabs.io/docs/api-reference/models/list), and [text-to-speech](https://elevenlabs.io/docs/api-reference/text-to-speech/convert) endpoints. Request/voice settings include stability, similarity boost, style, and speed. Recheck those API docs when changing endpoints or model support.

## Visual references

Put individual style frames in `references/frames/`, contact sheets in `references/sheets/`, extra still images in `references/user/images/`, video in `references/user/video/`, and attribution/context in `references/user/notes/`. Before each visual-style analysis run `npm run references`; the scanner recursively writes `production/reference-index.json` and includes every supported frame, sheet, and user still. Creative Director then inspects every indexed image/video. See `templates/user-prompt.md` for a ready-to-send request. Keep the story premise and intended ending when refining a script: polish rhythm, clarity, dialogue, and visual beats without replacing its point. Regenerate the reference index after adding files.

## Production flow

1. Fill the brief and script, then create a shot list and visual alternatives for every pivotal beat.
2. For historical/factual stories, add source links and mark dramatization in `SCRIPT.md`.
3. For the Russian fixture, run `npm run voice:test` after configuring an auditioned RU voice, then `npm run audio:test` to generate original score/effects stems. The composition mixes them and lowers the score under narration. `npm run render:test` renders the composition with that mix.
4. Extend the original files in `templates/bridge/`; register new Remotion compositions in `src/Root.tsx` for a working render project.
5. Generate speech/music/SFX, build timeline cues, and lock timing. Audio timing must be redone after picture timing changes.
6. Render stills and video, run QA, inspect every shot and listen to the final audio. Deliver source and final MP4.

The included `templates/bridge` is the inherited bridge story implementation, not an automatically registered application. A production composition must be copied/adapted into its own project and registered. `tests/russian-10s` is a compact integration fixture, not a completed render until the required packages, voice audio, and render tools are present.

## Test fixture

Russian narration text, subtitles, and sound cues are in `tests/russian-10s/`. Configure a Russian narrator voice, generate `narration.mp3`, then generate original score/effects with `npm run audio:test`; the composition mixes the tracks and lowers score gain during narration. The test-only cue generator is original procedural audio; full productions should use the inherited synthesizer modules or properly licensed assets.

```sh
npm install
npm run voice:test
npm run audio:test
npm run render:test
npm run qa:test
```

No narration is bundled and no voice/model has been auditioned in this environment. Do not report ElevenLabs as tested until the API actually generated the file.
