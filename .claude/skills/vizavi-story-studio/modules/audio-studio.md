# Audio Studio

**Purpose:** create language-aware voice, music, SFX, timing, and a balanced mix.

- **Reads:** locked script/storyboard, research pronunciations, character voice roles, language selections.
- **Owns:** `production/audio/timeline.json`, generated audio and stems, plus provider/voice/model manifests.
- **Tools:** ElevenLabs client `audio/voice/elevenlabs.ts`; config `audio/voice/voice-config.json`; preserved score/SFX/DSP/mix tools under `templates/audio/`.
- **Handoff:** per-segment provider, language, voice/model, timings, cues, mix and loudness report → Animation Engine and Quality Control.
- **Contract:** `creative/contracts.ts` (`AudioSegment`). Never log credentials or claim a fallback was ElevenLabs.
