# Russian 10-second test status

The animated scene, camera move, Russian subtitle timeline, voice-generation call, and original music/SFX cue plan are prepared. Before rendering, select an account-accessible Russian voice in `audio/voice/voice-config.json`, generate narration through ElevenLabs, and generate the original test cue stems with `npm run audio:test`. The client refuses to synthesize until a voice ID is explicitly configured.

Expected outputs are under `out/` and are intentionally absent until a real render runs. A render without configured audio is not the requested test. See the top-level README for the execution commands.
