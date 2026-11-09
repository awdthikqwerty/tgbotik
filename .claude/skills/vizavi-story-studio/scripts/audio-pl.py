import json, pathlib, shutil, subprocess, wave
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "output"
VOICE = OUT / "voice"
PUB = ROOT / "public"
PUB.mkdir(exist_ok=True)
FF = shutil.which("ffmpeg") or ROOT / "node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe"
SR = 48000
TOTAL = 38.0
N = int(SR * TOTAL)
rng = np.random.default_rng(7)

timeline = json.loads((VOICE / "timeline.json").read_text(encoding="utf8"))

def load_mp3(path):
    wav = OUT / (pathlib.Path(path).stem + "_conv.wav")
    subprocess.run([str(FF), "-y", "-i", str(path), "-ar", str(SR), "-ac", "1", str(wav)],
                   capture_output=True, check=True)
    with wave.open(str(wav), "rb") as w:
        a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32768.0
    wav.unlink(missing_ok=True)
    return a

def put(dst, a, start, gain=1.0):
    i = int(start * SR)
    l = min(len(a), len(dst) - i)
    if l > 0:
        dst[i:i+l] += a[:l] * gain

voice = np.zeros(N)
voice_events = []
for cue in timeline:
    a = load_mp3(VOICE / f"{cue['id']}.mp3")
    # normalize each line a bit for consistency
    peak = np.max(np.abs(a)) + 1e-9
    a = a / peak * 0.9
    put(voice, a, cue["start"], 1.05)
    voice_events.append((cue["start"], cue["start"] + len(a) / SR, cue["speaker"], cue["text"]))
    print(f"{cue['id']} @ {cue['start']:.2f}s len {len(a)/SR:.2f}s")

# --- Music: soft winter piano + strings pad, original melody, D major-ish ---
music = np.zeros(N)

def tone(freq, dur, kind="piano"):
    t = np.arange(int(dur * SR)) / SR
    if kind == "piano":
        env = np.exp(-t * 2.6)
        a = (np.sin(2*np.pi*freq*t) + 0.32*np.sin(2*np.pi*freq*2*t) + 0.12*np.sin(2*np.pi*freq*3*t)) * env
    elif kind == "pad":
        env = np.minimum(t / 1.2, 1) * np.minimum((dur - t) / 1.5, 1).clip(0)
        a = (np.sin(2*np.pi*freq*t) + 0.4*np.sin(2*np.pi*freq*1.005*t) + 0.25*np.sin(2*np.pi*freq*0.5*t)) * env
    else:
        env = np.exp(-t * 3)
        a = np.sin(2*np.pi*freq*t) * env
    return a

def midi(n): return 440.0 * 2 ** ((n - 69) / 12)

# Simple chord progression, 4 bars looping: D - A/C# - Bm - G
chords = [
    [50, 54, 57, 62],   # D
    [49, 52, 57, 61],   # A/C#
    [47, 50, 54, 59],   # Bm
    [43, 47, 50, 55],   # G
]
beat = 2.15  # slower, emotional
for bar_i in range(int(TOTAL / (beat * 4)) + 1):
    chord = chords[bar_i % 4]
    bar_start = bar_i * beat * 4
    # pad sustained per bar
    for n in chord:
        put(music, tone(midi(n + 12), beat * 4.2, "pad"), bar_start, 0.035)
    # piano arpeggio
    arp = [chord[0]+12, chord[2]+12, chord[1]+12, chord[3]+12, chord[2]+12, chord[1]+12, chord[0]+12, chord[2]+12]
    for k, n in enumerate(arp):
        at = bar_start + k * beat / 2
        put(music, tone(midi(n), 1.4, "piano"), at, 0.09)

# --- SFX ---
sfx = np.zeros(N)

def noise(dur, lo, hi, gain, at, decay=12):
    t = np.arange(int(dur * SR)) / SR
    sos = butter(2, [lo, hi], fs=SR, btype="bandpass", output="sos")
    a = sosfilt(sos, rng.normal(0, 1, len(t))) * np.exp(-t * decay) * gain
    put(sfx, a, at)

def boom(at, gain=0.55, f0=58):
    t = np.arange(int(0.9 * SR)) / SR
    a = np.sin(2*np.pi*(f0*t - 16*t*t)) * np.exp(-t*6) * gain
    put(sfx, a, at)
    noise(0.5, 150, 3000, gain*0.5, at, 10)

def firework(at, gain=0.5):
    boom(at, gain)
    for k in range(7):
        noise(0.06, 3000, 9000, 0.12*gain, at + 0.25 + rng.random()*0.5, 30)

# scene 1: room ambience + phone scroll clicks
noise(3.5, 200, 1400, 0.03, 0.2, 0.05)
for at in [1.2, 1.9, 2.6, 3.3]:
    t = np.arange(int(0.05*SR))/SR
    put(sfx, np.sin(2*np.pi*2400*t)*np.exp(-t*90)*0.07, at)
# typing on phone
for at in np.arange(11.7, 13.9, 0.11):
    t = np.arange(int(0.03*SR))/SR
    put(sfx, np.sin(2*np.pi*3200*t)*np.exp(-t*120)*0.05, float(at))
# sent swoosh
t = np.arange(int(0.4*SR))/SR
put(sfx, sosfilt(butter(2, [500, 4000], fs=SR, btype="bandpass", output="sos"),
                 rng.normal(0,1,len(t))) * np.sin(np.pi*t/0.4)**2 * 0.16, 14.1)
# notification ping on Maja's phone
t = np.arange(int(0.5*SR))/SR
put(sfx, (np.sin(2*np.pi*1568*t) + 0.5*np.sin(2*np.pi*2093*t))*np.exp(-t*7)*0.12, 14.9)

# fireworks: scene 4 (Maja on the square) and finale
for at in np.arange(15.2, 20.0, 0.55):
    firework(float(at), 0.28)
# three days later: soft wind
noise(7.0, 300, 1800, 0.028, 20.0, 0.02)
# park ambience + footsteps
for at in [22.4, 22.85, 23.25, 23.7]:
    t = np.arange(int(0.13*SR))/SR
    sos = butter(2, 900, fs=SR, output="sos")
    a = sosfilt(sos, rng.normal(0,1,len(t))) * np.exp(-t*38) * 0.16
    put(sfx, a, at)
# snow sparkle / reveal sting at the final card
for i, n in enumerate([86, 90, 93, 98]):
    t = np.arange(int(1.2*SR))/SR
    put(sfx, np.sin(2*np.pi*midi(n)*t)*np.exp(-t*4)*0.07, 34.4 + i*0.09)
# final heartbeat pulse under the title
for at in [35.4, 35.95]:
    t = np.arange(int(0.25*SR))/SR
    put(sfx, np.sin(2*np.pi*70*t)*np.exp(-t*14)*0.22, at)

# --- duck music under speech ---
duck = np.ones(N)
for s, e, who, _ in voice_events:
    lo = max(0, int((s - 0.08) * SR))
    hi = min(N, int((e + 0.12) * SR))
    duck[lo:hi] = 0.42
music *= duck

# gentle fade in/out
fade = np.minimum(np.arange(N) / SR / 0.35, 1) * np.minimum((N - np.arange(N)) / SR / 0.5, 1)
mono = (voice * 1.15 + music + sfx) * fade

# stereo: slight width via delayed copies
mix = np.stack([mono + np.roll(music, 260) * 0.10, mono + np.roll(music, 480) * 0.10], axis=1)
peak = np.max(np.abs(mix))
mix *= min(1.0, 0.89 / peak)

with wave.open(str(PUB / "mix.wav"), "wb") as w:
    w.setparams((2, 2, SR, len(mix), "NONE", "not compressed"))
    w.writeframes((np.clip(mix, -1, 1) * 32767).astype("<i2").tobytes())

# stems
for name, a in [("voice", voice), ("music", music), ("sfx", sfx)]:
    st = np.stack([a, a], axis=1)
    with wave.open(str(OUT / f"{name}-pl.wav"), "wb") as w:
        w.setparams((2, 2, SR, len(st), "NONE", "not compressed"))
        w.writeframes((np.clip(st, -1, 1) * 32767).astype("<i2").tobytes())

print(f"Mix ready: {len(mix)/SR:.2f}s, peak {np.max(np.abs(mix)):.3f}")
