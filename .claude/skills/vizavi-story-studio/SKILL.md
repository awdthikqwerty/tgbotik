---
name: vizavi-story-studio
description: Plan, produce, animate, score, and quality-check original cinematic animated short stories with a creative-director-led workflow, Three.js/Remotion foundation, multilingual voice, and configurable visual styles.
metadata:
  version: "1.0.0"
  display_name: "Vizavi Story Studio"
---

# Vizavi Story Studio

A production skill for original animated stories. The directing system combines Vizavi Motion's exploratory visual planning with the proven Three.js/Remotion cartoon pipeline and audio tools retained in `templates/`.

## Authority and conflict order

1. The user's current brief controls subject, audience, language, duration, format, style, sound, and asset permissions. A user-provided story premise and its essential meaning are canon.
2. Safety, factual accuracy, privacy, licensing, and technical constraints apply throughout.
3. Story-specific approved script and locked timing control shots, subtitles, dialogue, and audio cues.
4. The selected visual-style profile controls rendering choices. The original Cartoon 3D profile is the default.
5. This skill's workflow and templates supply defaults only. Do not let an example short, style reference, or template override the brief.

Keep the original Vizavi and Animated Shorts source directories untouched. This skill is their integrated successor, not a destructive migration. Original implementation code under `templates/bridge`, `templates/audio`, and `templates/scripts` is retained with its relative structure and verified by `source-integrity.json`; `templates/scripts/bridge_merge.py` has one documented root-path adaptation. The inherited Animated Shorts README states MIT licensing for its code and docs; retain its attribution and license terms when redistributing. Do not redistribute any third-party reference imagery. Vizavi reference text is retained as documentation.

## Production modes

| Mode | Runtime | Typical shape | Scope |
|---|---:|---|---|
| Mini Shorts | 10–20 s | brief-defined; 9:16 or 16:9 | One clear turn, few shots, a small cast, economical world, compact score and effects |
| Full Stories | 55–70 s | default 9:16, 30 fps | Full setup/escalation/payoff, richer environments and cast, designed score, dialogue and sound mix |

Duration and aspect ratio in the user's brief override defaults. Build only the detail the story needs. Do not stretch a Mini Short with empty holds.

## Language and localization

Narration, dialogue, and subtitles have independent language selections (`ru`, `en`, `pl`). Visual direction is language-neutral. Each spoken segment records its language, speaker, text, provider, voice, model, timing, and subtitle policy. Check names, dates, word stress, punctuation, and natural phrasing with a fluent speaker when possible. Never claim a voice is native or a pronunciation is verified solely from a language label.

ElevenLabs is the default generated-voice provider. For each requested language, inspect available account voices and supported model languages before synthesis; prefer a voice with matching verified language/accent metadata and audition a sample. Russian spelling and stress should be reviewed; use a pronunciation dictionary or respell only where needed. Kokoro's inherited script is English-only and is not a Russian/Polish fallback. If ElevenLabs cannot run, state the exact issue and offer a language-appropriate Kokoro or Edge TTS path only after checking actual voice support. Record the provider that really produced each file.

## Coordinating modules

The modules communicate through typed briefs in `creative/contracts.ts` and editable production documents. Their instructions and handoffs are linked directly here: [Creative Director](modules/creative-director.md), [Story Engine](modules/story-engine.md), [Research Engine](modules/research-engine.md), [Character Director](modules/character-director.md), [Animation Engine](modules/animation-engine.md), [Camera Director](modules/camera-director.md), [Audio Studio](modules/audio-studio.md), [Quality Control](modules/quality-control.md). Each has one owner and a concrete handoff:

1. **Creative Director** owns the premise, emotional promise, visual approach exploration, and final visual treatment. For each pivotal beat, develop 3–5 distinct approaches (shot scale, camera grammar, staging/metaphor, transition); compare story clarity, novelty, continuity, feasibility, then select one. Keep concise alternatives and selection rationale in the shot plan; do not expose private chain-of-thought.
2. **Story Engine** turns the premise into a script, beat map, timing, and storyboard. Every beat changes the situation. Deliver `SCRIPT.md` and `storyboard.json`, including a fact/source list for factual stories. Timing is locked before detailed animation/audio.
3. **Research Engine** activates for real historical/scientific/current claims. Browse authoritative primary sources, separate documented facts from dramatization, and attach source URLs and confidence to claims. It does not invent dates, quotes, or certainty. Fictional stories can skip it.
4. **Character Director** owns the cast bible: silhouette, proportions, palette, costume, age cues, expression range, voice identity, and continuity constraints. Character designs remain consistent while poses/emotions change. The inherited toon/card system remains the default for Cartoon 3D.
5. **Animation Engine** owns Remotion composition, Three.js scene/world, character posing, post-processing, and deterministic frame timing. Preserve and extend the original working template; rewrite a renderer only to fix a demonstrated incompatibility or meet a stated style requirement.
6. **Camera Director** owns shot grammar, composition, movement curves, focus, transitions, and shot-to-story timing. It coordinates with Animation through `story.ts`; avoid repeating camera paths, shot sizes, or transitions without a story reason.
7. **Audio Studio** owns voice selection/generation, score, SFX, cues, word/segment timing, mix, loudness, and stems. It hands off a locked `audio/timeline.json` plus generated assets. Picture timing changes after audio lock require a remap and re-mix.
8. **Quality Control** owns technical and perceptual checks, defect list, fixes, final playback, and truthful delivery status. A successful build or one still is not a video review.

Contracts live in `creative/contracts.ts`; production files are the source of truth for each handoff. A module must not silently edit another module's owned output. Resolve changes through the shared contracts and rerun dependent steps.

## Creative development

Treat the user's scenario as the story source. Improve wording, clarity, pacing, dialogue, emotional beats, and visual storytelling while preserving the premise, central characters/relationships, key facts, intended meaning, and ending. Do not silently replace the idea, add a twist that changes its point, or change the outcome. If a larger story change looks useful, keep it as an optional note and proceed with the faithful version. Start from a single emotional question or surprising image. Choose Mini Shorts or Full Stories. Establish a visual motif only if it evolves with the story. Explore several genuinely different visual treatments for pivotal moments rather than generating minor camera variations. Use visual metaphor when it clarifies or deepens meaning; do not force portal/circle/wipe motifs or repeat one transition throughout.

For each scene, record: narrative purpose, visual options considered, selected composition and layers, subject action, camera position/move/lens, lighting/focus, transition in/out, palette, text/subtitle placement, sound cue, duration, and continuity notes. Maintain foreground/midground/background depth. Give camera motion a motivated path and ease; deliberate static moments are allowed for emphasis. Keep movement readable and avoid repetitive shot rhythms.

Reference images/video are analyzed for composition, palette, motion, material, depth, lighting, and continuity. Before every visual-style analysis, run `npm run references`; it scans `references/frames/`, `references/sheets/`, `references/user/images/`, and `references/user/video/` recursively and refreshes `production/reference-index.json`. The Creative Director must open and visually inspect every indexed image and inspect videos as motion references; a file listing alone is not analysis. Empty directories are normal and report zero assets without failing. Never omit unreadable assets silently or claim an empty source was inspected. Extract design principles; do not copy protected characters, scripts, shots, or complete frames.

## Visual profiles

- **Cartoon 3D (default):** original Animated Shorts look: flat outlined 2D character cards inside detailed colourful 3D environments; Three.js world, painted materials, ink outlines, stylized light, depth-aware lens blur, colour grade, moving camera. Keep the inherited toon renderer and post chain.
- **Dark Cinematic:** use the same pipeline only where it supports the intended contrast and legibility; simplify palette, lighting, fog and grade. Do not force saturated storybook lighting.
- **Storybook:** painted surfaces, softer palette, illustrative staging, controlled depth and selective outlines.
- **Historical Animation:** period-specific research drives props, dress, architecture, and palette. Preserve readable stylization and label dramatized details in production notes.

A style can use a separate implementation where the default scene pipeline is a poor fit. Preserve the bridge implementation as the baseline for Cartoon 3D.

## Audio production

Generate original score/SFX or use assets whose licenses permit the intended distribution. The inherited `templates/audio/` modules provide timeline creation, music, instruments, SFX synthesis, DSP, mixing, and ducking. Build dialogue and SFX cues against the locked frame timeline. Duck music automatically around speech, leave headroom, prevent clipping, balance stereo, and report measured integrated loudness/true peak where tooling permits. Export high-quality stereo audio and useful stems. Dialogue must remain intelligible.

Voice provider contract: ElevenLabs first; never silently switch. Missing key, invalid voice/model, unsupported language, quota exhaustion, network issue, and rate limit are distinct reported causes. Offer fallback without pretending it was ElevenLabs. Cache identity includes normalized text, speaker, language, voice ID, model ID, endpoint options, voice settings, and provider version. Keep API keys out of command lines, source control, logs, and manifests. Generated audio metadata may record voice/model/provider/request ID, but not credentials.

## Build, iteration, delivery

1. Run `npm run references`, inspect every image/video listed in `production/reference-index.json`, identify separate visual families, then read relevant `references/vizavi/` and `references/animated-shorts/` guides. When no user reference exists, proceed without error.
2. Write premise, mode, language plan, research if needed, script, character bible, visual option shortlist, and complete storyboard.
3. Review a short style/technical proof if a major risk exists. Keep Mini Shorts efficient; reuse original world/character/post code.
4. Implement the shot plan in a project-local Remotion composition. Lock frame counts and transitions.
5. Generate narration segments with `audio/voice/elevenlabs.ts`; inspect voice/model availability and language support. Generate/arrange score and effects. Save cues and source metadata.
6. Render representative frames and inspect composition, character identity, motion, texture, focus, and transitions. Revise identified defects.
7. Mix, mux, render MP4, run `templates/scripts/short_qa.py`, inspect contact sheets and watch the decoded final video with sound. Fix defects and repeat relevant checks.
8. Deliver MP4 and editable project, factual sources, voice/provider manifest, and QA report. State which steps were run, which were not, and why.

For final export, use the brief's technical specs; otherwise deliver a high-quality H.264 MP4 with AAC audio, retain editable sources, and verify dimensions, frame rate, frame count, duration, audio stream, and decode. Never report a render, voice generation, inspection, or provider as successful unless it happened.

## Repository map

- `creative/`: typed handoff contracts (`ProductionBrief`, beats, shot plans, audio, research, characters, QA).
- `modules/`: the eight linked module briefs, ownership rules, inputs, outputs, and handoffs.
- `templates/user-prompt.md`: concise intake prompt for the user's folder + story workflow.
- `references/current-reference-review.md`: current visual-family summary; refresh it if the reference set changes materially.
- `production/`: generated reference index and working production documents.
- `audio/voice/`: ElevenLabs API client, language/role config, voice discovery.
- `templates/bridge/`: original Three.js + Remotion toon world, characters, ink, camera/story timeline and grading implementation.
- `templates/audio/`: original Python voice helper, score, SFX, timeline, DSP and mix implementation.
- `templates/scripts/`: inherited render/merge/QA helpers.
- `references/vizavi/`: Vizavi planning references.
- `references/animated-shorts/`: STYLE_BIBLE and measured reports (no reference frames were present in source archive).
- `references/user/images/`, `references/user/video/`, `references/user/notes/`: user-supplied references and attribution notes.
- `references/frames/` and `references/sheets/`: supplied frame stills and contact sheets, automatically included in the visual reference index.
- `tests/russian-10s/`: integration test composition, subtitle/cue/script fixtures, and output location.

Start from `README.md`. Put the ElevenLabs key in the root `.env` or environment; the client reads it silently and never prints it. Install only project requirements from `package.json` and `requirements-audio.txt` when actually needed. Remotion dependencies are not needed to inspect the skill or use the ElevenLabs client.
