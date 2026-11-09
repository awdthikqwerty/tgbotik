#!/usr/bin/env python3
"""Original music + SFX + final mix for the airplane-wing short. Voice is ElevenLabs only (public/audio/voice.wav)."""
import json, sys, subprocess
from pathlib import Path
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve

root = Path(__file__).resolve().parents[1]
SR = 48000
tm = json.loads((root / "src/timing.json").read_text())
EV = tm["events"]; DUR = tm["total"]; N = int(DUR * SR) + SR
rng = np.random.default_rng(7)
t = np.arange(N) / SR

def lp(x, f, o=2): return sosfilt(butter(o, f, "low", fs=SR, output="sos"), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, "high", fs=SR, output="sos"), x)
def bp(x, a, b, o=2): return sosfilt(butter(o, [a, b], "band", fs=SR, output="sos"), x)
def noise(n=N): return rng.standard_normal(n)
def env_between(a, b, fi=0.5, fo=0.5):
    e = np.zeros(N); i0, i1 = int(a * SR), min(N, int(b * SR))
    seg = np.ones(i1 - i0); fi_n, fo_n = int(fi * SR), int(fo * SR)
    if fi_n: seg[:fi_n] = np.linspace(0, 1, min(fi_n, len(seg)))[: len(seg[:fi_n])]
    if fo_n: seg[-fo_n:] = np.minimum(seg[-fo_n:], np.linspace(1, 0, min(fo_n, len(seg))))[: len(seg[-fo_n:])]
    e[i0:i1] = seg; return e
def place(buf, sig, at, gain=1.0):
    i = int(at * SR); n = min(len(sig), len(buf) - i)
    if n > 0 and i >= 0: buf[i:i + n] += sig[:n] * gain
def decay(n, tau): return np.exp(-np.arange(n) / SR / tau)

# ---------------- music ----------------
def pad(freqs, e, detune=0.003):
    s = np.zeros(N)
    for f in freqs:
        for d in (-detune, 0, detune):
            s += np.sin(2 * np.pi * f * (1 + d) * t + rng.random() * 6)
    return lp(s, 1400) * e / (len(freqs) * 3)
music = np.zeros(N)
# tense (0 - 48.4): D minor drone with pulse; calm (65.7 - end): warm major
tense = env_between(0, EV["rigStart"], 2, 1.5) * (0.5 + 0.5 * np.clip((t - EV["hypoStart"]) / 6, 0, 1))
music += pad([73.4, 110, 146.8, 174.6], tense) * 1.0
music += pad([77.8, 116.5, 155.6], env_between(EV["lossOfLift"], EV["rigStart"] + 1, 3, 1.5)) * 0.8
beat = 60 / 92
pulse = np.zeros(N)
for k in range(int(EV["rigStart"] / beat)):
    at = k * beat
    if at < 6: continue
    tt = np.arange(int(0.5 * SR)) / SR
    place(pulse, np.sin(2 * np.pi * 55 * tt) * np.exp(-tt / 0.12), at, 0.55 if k % 2 == 0 else 0.3)
music += lp(pulse, 120) * env_between(6, EV["rigStart"], 2, 1) * (0.5 + 0.5 * np.clip((t - EV["lossOfLift"]) / 10, 0, 1))
# riser into the break and the catastrophe
for a, b in ((EV["hypoStart"], EV["wingBreak"]), (EV["pilots"], EV["catastrophe"])):
    r = hp(noise(), 300) * (np.clip((t - a) / (b - a), 0, 1) ** 2) * env_between(a, b + 0.05, 0, 0.05)
    music += r * 0.05
# engineering section: clean steady pulse, hopeful arpeggio
arp = np.zeros(N); notes = [220, 261.6, 329.6, 392, 329.6, 261.6]
k = 0; at = EV["rigStart"]
while at < EV["calmReturn"]:
    f = notes[k % 6]; tt = np.arange(int(0.6 * SR)) / SR
    place(arp, (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt)) * np.exp(-tt / 0.25), at, 0.12)
    at += 0.375; k += 1
music += arp
music += pad([130.8, 196, 261.6, 329.6], env_between(EV["calmReturn"] - 0.5, DUR, 2, 3)) * 1.1
for k, f in enumerate([523.3, 659.3, 784, 1046.5]):
    tt = np.arange(int(1.6 * SR)) / SR
    place(music, np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.6), EV["calmReturn"] + 0.3 + k * 0.45, 0.06)
# title hit
tt = np.arange(int(2.5 * SR)) / SR
place(music, (np.sin(2 * np.pi * 65.4 * tt) + 0.5 * np.sin(2 * np.pi * 130.8 * tt)) * np.exp(-tt / 0.9), EV["titleCard"], 0.5)
music = np.tanh(music * 1.2) * 0.9

# ---------------- sfx ----------------
sfx = np.zeros(N)
# cruise wind / engine hum
cruise = lp(noise(), 600) * 0.02 + lp(noise(), 160, 3) * 0.05 * (0.8 + 0.2 * np.sin(2 * np.pi * 0.2 * t))
sfx += cruise * (0.5 + 0.5 * env_between(0, DUR, 1, 2))
# crack
tt = np.arange(int(0.9 * SR)) / SR
cr = (bp(noise(len(tt)), 900, 5000) * decay(len(tt), 0.05) * 1.2 + np.sin(2 * np.pi * 180 * tt) * decay(len(tt), 0.18) * 0.8)
place(sfx, cr, EV["crack"], 0.7); place(sfx, cr * 0.6, EV["crack"] + 0.55, 0.5)
# turbulence rumble + creaks
rum = lp(noise(), 90, 3) * 6 * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 1.3 * t + 2 * np.sin(t * 3.1))))
sfx += rum * env_between(EV["turbStart"], EV["hypoStart"] + 0.5, 0.5, 1.2) * 0.5
for a in (8.2, 9.6, 11.4, 12.9, 13.5):
    tt = np.arange(int(0.7 * SR)) / SR
    f = 320 + 160 * np.sin(2 * np.pi * 3 * tt)
    place(sfx, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.7) * 0.08, a, 1)
# glitch / flash whooshes at hypothesis
def whoosh(at, dur=0.7, g=0.5, f0=400, f1=4000):
    n = int(dur * SR); x = noise(n); fc = np.linspace(f0, f1, n)
    out = np.zeros(n); y = bp(x, f0, f1 * 0.9, 2) * np.sin(np.pi * np.arange(n) / n) ** 2
    place(sfx, y * g, at, 1)
for e in (EV["hypoStart"] - 0.3, EV["physicsStart"] - 0.2, EV["rigStart"] - 0.35, EV["calmReturn"] - 0.3, EV["finale"] - 0.3, 10.0, 11.3):
    whoosh(e, 0.6, 0.35)
# wing break: bang + metal tear + debris
n = int(3.5 * SR); tt = np.arange(n) / SR
boom = (np.sin(2 * np.pi * (70 - 25 * np.minimum(tt, 1)) * tt) * decay(n, 0.7) * 1.4 + lp(noise(n), 250) * decay(n, 0.5) * 2.5
        + bp(noise(n), 800, 7000) * decay(n, 0.12) * 1.0)
place(sfx, boom, EV["wingBreak"] - 0.02, 0.9)
for k in range(14):
    d = int(rng.uniform(0.05, 0.3) * SR); tt2 = np.arange(d) / SR
    place(sfx, bp(noise(d), 1200, 6000) * decay(d, 0.04), EV["wingBreak"] + 0.2 + k * 0.12 + rng.random() * 0.1, 0.25)
# alarm (loss of lift -> catastrophe)
for k in range(int((EV["catastrophe"] - EV["pilots"]) / 0.5)):
    tt = np.arange(int(0.22 * SR)) / SR
    place(sfx, np.sin(2 * np.pi * (880 if k % 2 else 660) * tt) * np.sin(np.pi * tt / 0.22) * 0.06, EV["pilots"] + k * 0.5, 1)
# loss-of-lift swoosh and roll
whoosh(EV["lossOfLift"], 1.2, 0.3, 200, 1500); whoosh(EV["rollStart"] - 0.1, 2.2, 0.35, 200, 2500)
# catastrophe: low rumble, falling whistle
cat = lp(noise(), 120, 3) * 7 * env_between(EV["catastrophe"], EV["catastrophe"] + 7.5, 0.3, 2)
sfx += cat * 0.55
n = int(6 * SR); tt = np.arange(n) / SR
place(sfx, np.sin(2 * np.pi * np.cumsum(1800 - 1300 * tt / 6) / SR) * np.minimum(1, tt) * (1 - tt / 6) * 0.05, EV["catastrophe"] + 0.5, 1)
place(sfx, boom * 0.6, EV["catastrophe"], 0.7)
# rig: hydraulic servo, creaks, clicks, soft impacts
servo = bp(noise(), 150, 900) * env_between(EV["bendTest"], EV["bendTest"] + 5, 0.4, 0.4) * 0.05
sfx += servo * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * t))
for a in (EV["rigStart"] + 0.1, EV["loads"] + 1.2, EV["loads"] + 3.3, EV["loads"] + 5.4):
    place(sfx, (lp(noise(int(SR * 0.6)), 400) * decay(int(SR * 0.6), 0.15)) * 3, a, 0.35)
for a in np.arange(EV["bendTest"], EV["calmReturn"] - 1, 1.1):
    d = int(0.04 * SR); place(sfx, np.sin(2 * np.pi * 2200 * np.arange(d) / SR) * decay(d, 0.012), a, 0.04)
for a in (EV["bendTest"] + 2.0, EV["bendTest"] + 4.4):
    tt = np.arange(int(0.9 * SR)) / SR; f = 140 + 90 * np.sin(2 * np.pi * 2 * tt) * tt
    place(sfx, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.9) * 0.06, a, 1)
# calm: soft chime + gentle wind; smile sparkle
for k, f in enumerate([1318.5, 1760, 2093]):
    tt = np.arange(int(1.4 * SR)) / SR
    place(sfx, np.sin(2 * np.pi * f * tt) * decay(len(tt), 0.35) * 0.05, EV["calmReturn"] + 0.1 + 0.12 * k, 1)
place(sfx, np.sin(2 * np.pi * 1568 * np.arange(int(1.0 * SR)) / SR) * decay(int(1.0 * SR), 0.3) * 0.06, 70.2, 1)
whoosh(EV["finale"], 3.5, 0.18, 300, 2000)
# title impact
n = int(1.8 * SR); tt = np.arange(n) / SR
place(sfx, (np.sin(2 * np.pi * (55 - 10 * tt) * tt) * decay(n, 0.6) * 1.2 + lp(noise(n), 300) * decay(n, 0.3)) , EV["titleCard"], 0.6)

# ---------------- mix ----------------
voice, vsr = sf.read(root / "public/audio/voice.wav", always_2d=True)
assert vsr == SR, f"voice sr {vsr}"
vm = voice.mean(axis=1)
vv = np.zeros(N); vv[: min(N, len(vm))] = vm[:N]
venv = lp(np.abs(vv), 8, 2); venv = np.clip(venv / (np.percentile(venv, 95) + 1e-9), 0, 1)
duck = 1 - 0.55 * venv
mus_g, sfx_g = 0.30, 0.62
L = vv * 1.0 + music * mus_g * duck + sfx * sfx_g * (1 - 0.35 * venv)
# gentle stereo width for music/sfx
R = vv * 1.0 + np.roll(music, 220) * mus_g * duck + np.roll(sfx, 120) * sfx_g * (1 - 0.35 * venv)
out = np.stack([L, R], 1)[: int(DUR * SR)]
fade = np.ones(len(out)); fo = int(1.2 * SR); fade[-fo:] = np.linspace(1, 0, fo)
out *= fade[:, None]
out /= max(1, np.abs(out).max() / 0.95)
(root / "out").mkdir(exist_ok=True); (root / "public/audio").mkdir(exist_ok=True)
sf.write(root / "out/mix-raw.wav", out, SR)
sf.write(root / "public/audio/music.wav", np.stack([music, music], 1)[: int(DUR * SR)] / max(1, np.abs(music).max()), SR)
sf.write(root / "public/audio/sfx.wav", np.stack([sfx, sfx], 1)[: int(DUR * SR)] / max(1, np.abs(sfx).max()), SR)
print("mix written", len(out) / SR, "s")
