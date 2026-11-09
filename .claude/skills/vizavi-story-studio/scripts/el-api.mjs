// Authenticated ElevenLabs fetch helper. Reads the key silently (env first, then skill .env); never logs it.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolveApiKey } from "../audio/voice/elevenlabs.ts";

let envText = "";
try { envText = readFileSync(fileURLToPath(new URL("../.env", import.meta.url)), "utf8"); } catch {}
const KEY = resolveApiKey(process.env.ELEVENLABS_API_KEY, envText);

export async function el(path, { method = "GET", body, query, raw = false } = {}) {
  const url = new URL(`https://api.elevenlabs.io${path}`);
  for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, String(v));
  const res = await fetch(url, {
    method,
    headers: { "xi-api-key": KEY, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ElevenLabs ${method} ${path} -> HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  return raw ? res : res.json();
}
