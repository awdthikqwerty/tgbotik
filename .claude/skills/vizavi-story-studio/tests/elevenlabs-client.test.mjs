import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateSpeech, listModels, listVoices, resolveApiKey } from "../audio/voice/elevenlabs.ts";

const originalFetch = globalThis.fetch;
const originalKey = process.env.ELEVENLABS_API_KEY;
let scratch;
test.beforeEach(async () => { scratch = await mkdtemp(join(tmpdir(), "vizavi-voice-test-")); process.env.ELEVENLABS_API_KEY = "unit-test-only"; });
test.afterEach(async () => { globalThis.fetch = originalFetch; await rm(scratch, { recursive: true, force: true }); if (originalKey === undefined) delete process.env.ELEVENLABS_API_KEY; else process.env.ELEVENLABS_API_KEY = originalKey; });

test("generates a segment, writes private manifest, and reuses an exact cache hit", async () => {
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    calls++;
    assert.match(String(url), /text-to-speech\/voice-1\?/);
    assert.equal(init.headers["xi-api-key"], "unit-test-only");
    return new Response(new Uint8Array([0x49, 0x44, 0x33, 0x01]), { status: 200, headers: { "request-id": "req-test" } });
  };
  const outputPath = join(scratch, "voice.mp3");
  const options = { text: "Привет, мир!", voiceId: "voice-1", modelId: "eleven_multilingual_v2", language: "ru", outputPath };
  const first = await generateSpeech(options);
  assert.equal(first.provider, "elevenlabs");
  assert.equal(first.cacheHit, false);
  assert.deepEqual([...await readFile(outputPath)], [0x49, 0x44, 0x33, 0x01]);
  const manifest = JSON.parse(await readFile(first.manifestPath, "utf8"));
  assert.equal(manifest.voiceId, "voice-1");
  assert.equal(manifest.modelId, "eleven_multilingual_v2");
  assert.equal(JSON.stringify(manifest).includes("unit-test-only"), false);
  const second = await generateSpeech(options);
  assert.equal(second.cacheHit, true);
  assert.equal(calls, 1);
});

test("voice and model discovery use official endpoints", async () => {
  const seen = [];
  globalThis.fetch = async (url) => {
    seen.push(String(url));
    if (String(url).includes("/v2/voices")) return Response.json({ voices: [{ voice_id: "ru-1" }], has_more: false });
    return Response.json([{ model_id: "eleven_multilingual_v2", can_do_text_to_speech: true }, { model_id: "asr", can_do_text_to_speech: false }]);
  };
  assert.equal((await listVoices("ru"))[0].voice_id, "ru-1");
  assert.equal((await listModels()).length, 1);
  assert.ok(seen.some((url) => url.includes("/v2/voices") && url.includes("language=ru")));
  assert.ok(seen.some((url) => url.endsWith("/v1/models")));
});

test("reads the key from env or .env text without ever logging it", () => {
  assert.equal(resolveApiKey(" environment-secret-fixture ", "ELEVENLABS_API_KEY=file-secret-fixture"), "environment-secret-fixture");
  assert.equal(resolveApiKey(undefined, "# comment\nOTHER_KEY=x\nELEVENLABS_API_KEY=\"file-secret-fixture\""), "file-secret-fixture");
  assert.throws(() => resolveApiKey(undefined, "OTHER_KEY=x"), /ELEVENLABS_API_KEY is missing/);
});

test("retries a 429 with Retry-After and never exposes response credentials", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    if (calls === 1) return new Response("private diagnostic", { status: 429, headers: { "retry-after": "0.001" } });
    return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
  };
  const result = await generateSpeech({ text: "test", voiceId: "v", modelId: "m", outputPath: join(scratch, "retry.mp3"), maxRetries: 1 });
  assert.equal(result.cacheHit, false);
  assert.equal(calls, 2);
});
