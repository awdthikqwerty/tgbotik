/** Minimal official ElevenLabs REST client. Node 22.18+; no SDK required for inspection/build. */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { dirname, basename, join } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export type VoiceSettings = {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  speed?: number;
  use_speaker_boost?: boolean;
};
export type GenerateOptions = {
  text: string;
  voiceId: string;
  modelId: string;
  language?: "ru" | "en" | "pl";
  settings?: VoiceSettings;
  outputFormat?: string;
  previousText?: string;
  nextText?: string;
  outputPath: string;
  alignment?: boolean;
  maxRetries?: number;
};
export type GeneratedVoice = {
  provider: "elevenlabs";
  voiceId: string;
  modelId: string;
  language?: string;
  outputPath: string;
  cacheHit: boolean;
  requestId?: string;
  alignmentPath?: string;
  manifestPath: string;
};
const API = "https://api.elevenlabs.io";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const bounded = (n: number | undefined, label: string) => {
  if (n === undefined) return;
  if (!Number.isFinite(n) || n < 0 || n > 1) throw new Error(`${label} must be between 0 and 1`);
};
export function resolveApiKey(environmentValue?: string, envFileText = ""): string {
  const fromEnvironment = environmentValue?.trim();
  if (fromEnvironment) return fromEnvironment;
  for (const line of envFileText.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const entry = line.trim();
    if (!entry || entry.startsWith("#")) continue;
    const separator = entry.indexOf("=");
    if (separator < 0 || entry.slice(0, separator).trim() !== "ELEVENLABS_API_KEY") continue;
    const raw = entry.slice(separator + 1).trim();
    const value = raw.length >= 2 && ((raw.startsWith("\"") && raw.endsWith("\"")) || (raw.startsWith("'") && raw.endsWith("'")))
      ? raw.slice(1, -1).trim() : raw;
    if (value) return value;
  }
  throw new Error("ELEVENLABS_API_KEY is missing. Set it in the environment or root .env; no request was sent.");
}
function key(): string {
  let envText = "";
  try { envText = readFileSync(fileURLToPath(new URL("../../.env", import.meta.url)), "utf8"); }
  catch (error) { if (error?.code !== "ENOENT") throw new Error("Could not read the skill root .env file."); }
  return resolveApiKey(process.env.ELEVENLABS_API_KEY, envText);
}
function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
function headers(): Record<string, string> {
  return { "xi-api-key": key(), accept: "application/json" };
}
async function jsonRequest(path: string): Promise<any> {
  const response = await fetch(`${API}${path}`, { headers: headers() });
  if (!response.ok) throw new Error(`ElevenLabs ${path} failed: HTTP ${response.status}`);
  return response.json();
}

/** List account/library voices via current v2 API, following pagination. */
export async function listVoices(language?: "ru" | "en" | "pl") {
  const all: any[] = [];
  let token: string | undefined;
  do {
    const url = new URL(`${API}/v2/voices`);
    url.searchParams.set("page_size", "100");
    if (language) url.searchParams.append("language", language);
    if (token) url.searchParams.set("next_page_token", token);
    const response = await fetch(url, { headers: headers() });
    if (!response.ok) throw new Error(`ElevenLabs voice discovery failed: HTTP ${response.status}`);
    const body = await response.json() as { voices?: unknown[]; has_more?: boolean; next_page_token?: string };
    all.push(...(body.voices ?? []));
    token = body.has_more ? body.next_page_token : undefined;
    if (body.has_more && !token) throw new Error("ElevenLabs voice discovery returned has_more without a pagination token");
  } while (token);
  return all;
}
export async function listModels() {
  const body = await jsonRequest("/v1/models");
  return (body as unknown[]).filter((m: any) => m.can_do_text_to_speech);
}

/** Generate a separate speech segment. Stable request identity enables exact local cache reuse. */
export async function generateSpeech(options: GenerateOptions): Promise<GeneratedVoice> {
  const { text, voiceId, modelId, outputPath } = options;
  if (!text.trim() || !voiceId.trim() || !modelId.trim()) throw new Error("text, voiceId and modelId are required");
  for (const [name, value] of Object.entries(options.settings ?? {})) {
    if (name !== "speed") bounded(value, name);
  }
  if (options.settings?.speed !== undefined && (options.settings.speed < 0.7 || options.settings.speed > 1.2)) {
    throw new Error("speed must be between 0.7 and 1.2");
  }
  const request = {
    text, voiceId, modelId, language: options.language,
    settings: options.settings ?? {}, outputFormat: options.outputFormat ?? "mp3_44100_128",
    previousText: options.previousText, nextText: options.nextText, alignment: !!options.alignment,
  };
  const cacheKey = hash(request);
  const manifestPath = `${outputPath}.json`;
  const alignmentPath = options.alignment ? `${outputPath}.alignment.json` : undefined;
  try {
    const previous = JSON.parse(await readFile(manifestPath, "utf8"));
    if (previous.cacheKey === cacheKey) {
      await readFile(outputPath);
      if (alignmentPath) await readFile(alignmentPath);
      return { provider: "elevenlabs", voiceId, modelId, language: options.language, outputPath, cacheHit: true,
        requestId: previous.requestId, alignmentPath, manifestPath };
    }
  } catch { /* Missing or incomplete cache is a cache miss. */ }

  const path = `/v1/text-to-speech/${encodeURIComponent(voiceId)}${options.alignment ? "/with-timestamps" : ""}`;
  const url = new URL(`${API}${path}`);
  url.searchParams.set("output_format", request.outputFormat);
  const body: Record<string, unknown> = { text, model_id: modelId };
  if (options.settings) body.voice_settings = options.settings;
  if (options.language && modelId !== "eleven_multilingual_v2") body.language_code = options.language;
  if (options.previousText) body.previous_text = options.previousText;
  if (options.nextText) body.next_text = options.nextText;
  let response: Response | undefined;
  const retries = options.maxRetries ?? 3;
  for (let attempt = 0; attempt <= retries; attempt++) {
    response = await fetch(url, { method: "POST", headers: { ...headers(), "content-type": "application/json" }, body: JSON.stringify(body) });
    if (response.ok) break;
    const status = response.status;
    if ((status === 429 || status >= 500) && attempt < retries) {
      const retryAfter = Number(response.headers.get("retry-after"));
      await response.body?.cancel();
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 30000) : Math.min(1000 * 2 ** attempt, 10000));
      continue;
    }
    const message = status === 401 || status === 403 ? "authentication/voice access failed"
      : status === 402 ? "credits or plan quota exhausted"
      : status === 422 ? "voice, model, language, or request settings rejected"
      : status === 429 ? "rate limit remains after retries"
      : `HTTP ${status}`;
    throw new Error(`ElevenLabs generation failed: ${message}. Check account, voice/model support, and quota; response details omitted.`);
  }
  if (!response?.ok) throw new Error("ElevenLabs generation failed after retries");
  const requestId = response.headers.get("request-id") ?? undefined;
  const payload = options.alignment ? await response.json() as any : undefined;
  const audioBase64: string | undefined = payload?.audio_base64;
  const bytes = options.alignment ? Buffer.from(audioBase64 ?? "", "base64") : Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new Error("ElevenLabs returned an empty audio payload");
  await mkdir(dirname(outputPath), { recursive: true });
  const tmpPath = join(dirname(outputPath), `.${basename(outputPath)}.${process.pid}.tmp`);
  await writeFile(tmpPath, bytes, { mode: 0o600 });
  await rename(tmpPath, outputPath);
  if (alignmentPath && payload) {
    await writeFile(alignmentPath, JSON.stringify({ alignment: payload.alignment, normalized_alignment: payload.normalized_alignment }, null, 2), { mode: 0o600 });
  }
  const manifest = { provider: "elevenlabs", cacheKey, voiceId, modelId, language: options.language,
    outputFormat: request.outputFormat, requestId, generatedAt: new Date().toISOString(), alignmentPath: alignmentPath ? basename(alignmentPath) : undefined };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), { mode: 0o600 });
  return { provider: "elevenlabs", voiceId, modelId, language: options.language, outputPath, cacheHit: false,
    requestId, alignmentPath, manifestPath };
}
