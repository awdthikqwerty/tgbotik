# Original score for "Denis i Maja" (D major / B minor), synthesized in numpy: additive felt piano, string ensemble,
# warm pad, celesta/glock sparkles, soft montage percussion, hall reverb. All timing is read from ../timeline.json.
# Output: audio/score.wav (48 kHz stereo, unducked music, ~-18 LUFS) + audio/score_cues.json (music map).
import os, sys, json
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
PROD = os.path.dirname(HERE)
SKILL = os.path.join(os.path.dirname(PROD), ".claude", "skills", "vizavi-story-studio")  # skill DSP library
sys.path.insert(0, os.path.join(SKILL, "templates", "audio"))
from dsp import (SR, TAU, ns, tt, rng, lp, hp, bp, peq, shelf, smooth_noise, ramp, fades, phase, modal, pan, place,
                 make_ir, convolve_st, integrated, true_peak, write_wav, dbg, curve, colored)
from instruments import m2f, glock, triangle, pluck, pad as warm_pad, timpani

TL = json.load(open(os.path.join(PROD, "timeline.json")))
DUR = TL["duration"]
N = ns(DUR)
EV = TL["events"]
SH = {s["id"]: (s["start"], s["end"]) for s in TL["shots"]}
VG = [(v["id"], v["start"], v["end"]) for v in TL["vignettes"]]

NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def M(name):
    """'F#5' -> midi"""
    p, i = NOTE[name[0]], 1
    while name[i] in "#b":
        p += 1 if name[i] == "#" else -1
        i += 1
    return p + 12 * (int(name[i:]) + 1)


def Ms(s):
    return [M(x) for x in s.split()]


# ================================================================ instruments
def piano(m, hold, vel=0.5, seed=0, felt=0.55):
    """additive felt piano: inharmonic partials, hammer-position comb, velocity brightness, two-stage decay,
    two detuned strings per partial (beating), hammer thump, damper on release (no dampers above G6)."""
    r = rng(seed)
    f = m2f(m)
    damped = m < 91
    tau1 = float(np.clip(3.4 * (220.0 / f) ** 0.62, 0.45, 11.0))
    ring = hold + 0.45 if damped else min(hold + 2.5, 3.2 * tau1)
    ring = min(ring, 3.0 * tau1 + 0.1, 9.0)
    n = ns(ring)
    t = np.arange(n) / SR
    B = float(np.clip(2.6e-4 * 2 ** ((m - 60) / 16.0), 4e-5, 1.5e-3))
    K = int(max(3, min(26, 7500.0 / f)))
    k = np.arange(1, K + 1)[:, None]
    fk = k * f * np.sqrt(1 + B * k * k)
    kc = (1.3 + 7.5 * vel ** 1.3 * (1 - 0.45 * felt)) * (523.0 / f) ** 0.35
    xpos = 0.118 + r.uniform(-0.006, 0.006)
    ak = (np.abs(np.sin(np.pi * k * xpos)) + 0.12) / k ** 0.85 / (1 + (k / kc) ** 2.4)
    tauk = tau1 / (1 + 0.33 * (k - 1) ** 1.15 * (f / 262.0) ** 0.25)
    env = 0.62 * np.exp(-t / (tauk * 0.2)) + 0.38 * np.exp(-t / tauk)
    dc = r.uniform(0.35, 1.1) * 1e-3 * 0.5776  # cents -> fractional detune (~0.35-1.1 cents)
    ph = r.uniform(0, TAU, (K, 1))
    beat = np.cos(TAU * fk * dc * t[None, :] + r.uniform(0, TAU, (K, 1)))
    y = (ak * env * np.sin(TAU * fk * t[None, :] + ph) * (0.55 + 0.45 * beat)).sum(0)
    y /= np.sqrt((ak ** 2).sum())
    y *= 1 - np.exp(-t / (0.0012 + 0.004 * felt))
    thump = lp(r.standard_normal(n), 500 + 1400 * vel) * np.exp(-t / 0.006) * 0.05 * vel
    y = y + thump
    if damped and hold < ring:
        d = ns(hold)
        y[d:] *= np.exp(-np.arange(n - d) / SR / (0.07 + 0.08 * (60.0 / max(m, 30))))
    return fades(y * vel ** 1.35 * (262.0 / f) ** 0.08, 0.0005, 0.03)


def celesta(m, vel=0.5, seed=0, dur=None):
    r = rng(seed)
    f = m2f(m)
    tau = float(np.clip(1.5 * (523.0 / f) ** 0.5, 0.4, 2.2))
    dur = dur or min(3.0 * tau, 4.5)
    t = tt(dur)
    y = modal(dur, [(f, 1.0, tau), (f * 2.0, 0.05, tau * 0.35), (f * 4.0, 0.16 * vel, tau * 0.1), (f * 9.8, 0.04 * vel, 0.03)], r)
    y += hp(r.standard_normal(len(t)), 2500) * np.exp(-t / 0.0012) * 0.04 * vel
    y *= 1 - np.exp(-t / 0.0008)
    return fades(y * vel, 0.0003, 0.08)


def strings(ms, dur, vel=0.5, seed=0, att=0.6, rel=1.0, bright=0.45, voices=4, vib=7.0, spread=0.7):
    """string ensemble: per note `voices` detuned bowed voices (additive saw with body formants), delayed vibrato"""
    r = rng(seed)
    n = ns(dur + rel)
    t = np.arange(n) / SR
    env = np.ones(n)
    a = ns(att)
    env[:a] = ramp(a)
    d = ns(dur)
    env[d:] *= ramp(n - d)[::-1]
    out = np.zeros((2, n))
    fc = 1300 + 2600 * bright
    for m in ms:
        f = m2f(m)
        K = int(max(2, min(18, 6500.0 / f)))
        kk = np.arange(1, K + 1)
        fk = kk * f
        ak = (1.0 / kk) / (1 + (fk / fc) ** 2) * (1 + 0.5 * np.exp(-((fk - 1100) / 700) ** 2) + 0.35 * np.exp(-((fk - 2800) / 900) ** 2))
        for v in range(voices):
            vin = np.clip((t - 0.25 - r.uniform(0, 0.3)) / 0.6, 0, 1)
            cents = (r.uniform(-6, 6) + vib * vin * np.sin(TAU * r.uniform(4.6, 5.6) * t + r.uniform(0, TAU))
                     + 2.5 * smooth_noise(n, r, 0.7))
            ph = phase(f * 2 ** (cents / 1200))
            y = np.zeros(n)
            for i, k in enumerate(kk):
                y += ak[i] * np.sin(k * ph + r.uniform(0, TAU))
            p = spread * (2 * v / max(1, voices - 1) - 1) * (1 if r.uniform() > 0.5 else -1)
            out += pan(y, p) * (0.85 + 0.3 * r.uniform())
    bow = bp(r.standard_normal(n), 1500, 6000, 1) * 0.004
    out += np.stack([bow, np.roll(bow, 97)])
    return out * env[None, :] * vel / np.sqrt(len(ms) * voices) * 0.6


def soft_kick(vel=0.5, seed=0):
    r = rng(seed)
    t = tt(0.45)
    f = 47 + 45 * np.exp(-t / 0.028)
    y = np.sin(phase(f)) * np.exp(-t / 0.17) * (1 - np.exp(-t / 0.002))
    y += lp(r.standard_normal(len(t)), 1800) * np.exp(-t / 0.003) * 0.12
    return fades(y * vel, 0.0005, 0.05)


def shaker(vel=0.3, seed=0):
    r = rng(seed)
    t = tt(0.12)
    e = (1 - np.exp(-t / 0.008)) * np.exp(-t / 0.035)
    return bp(r.standard_normal(len(t)), 4500, 13000, 2) * e * vel


def snap(vel=0.3, seed=0):
    """soft finger snap / light clap"""
    r = rng(seed)
    t = tt(0.18)
    y = np.zeros(len(t))
    for j, dt in enumerate((0.0, 0.007, 0.015)):
        k = ns(dt)
        e = np.exp(-np.maximum(t - dt, 0) / (0.010 if j < 2 else 0.035)) * (t >= dt)
        y += bp(r.standard_normal(len(t)), 1200, 5000, 2) * e * (0.7 if j < 2 else 1.0)
    return fades(y * vel, 0.0003, 0.03)


def swell(dur, vel=0.3, seed=0, lo=2500):
    """reverse-cymbal-like airy swell that ends at the end of `dur`"""
    r = rng(seed)
    n = ns(dur)
    u = np.linspace(0, 1, n)
    x = hp(colored(n, r, 0.6), lo, 2)
    x2 = hp(colored(n, r, 0.6), lo, 2)
    e = u ** 2.6
    return fades(np.stack([x, x2]) * e * vel * 0.25, 0.01, 0.02)


def cymbal(vel=0.3, seed=0, dur=3.5):
    r = rng(seed)
    n = ns(dur)
    t = np.arange(n) / SR
    e = np.exp(-t / 1.1) * (1 - np.exp(-t / 0.004))
    x = np.stack([hp(colored(n, r, 0.4), 3500, 2), hp(colored(n, r, 0.4), 3500, 2)])
    x = lp(x, 11000, 1)
    return fades(x * e * vel * 0.2, 0.001, 0.2)


# ================================================================ score buffer
class Score:
    def __init__(self):
        self.bus = {k: np.zeros((2, N)) for k in ("piano", "strings", "pad", "bells", "perc", "bass")}
        self.cues = []
        self.seed = 100

    def s(self):
        self.seed += 1
        return self.seed

    def cue(self, t, d):
        self.cues.append((round(float(t), 3), d))

    def pno(self, m, t, hold, vel, p=None):
        y = piano(m, hold, vel, self.s())
        place(self.bus["piano"], pan(y, np.clip((m - 64) / 40.0, -0.5, 0.5) if p is None else p) * 0.7071, t)

    def chord_pno(self, ms, t, hold, vel, roll=0.0):
        for i, m in enumerate(ms):
            self.pno(m, t + i * roll, hold - i * roll, vel * (0.85 if i == 0 else 1.0))

    def cel(self, m, t, vel, p=0.25):
        place(self.bus["bells"], pan(celesta(m, vel, self.s()), p) * 0.7071, t)

    def glk(self, m, t, vel, p=-0.2):
        place(self.bus["bells"], pan(glock(m2f(m), vel, rng(self.s()), dur=2.2), p) * 0.7071, t)

    def str_(self, ms, t, dur, vel, **kw):
        place(self.bus["strings"], strings(ms, dur, vel, self.s(), **kw), t)

    def pad_(self, ms, t, dur, vel, att=0.8, rel=1.2, warm=750):
        place(self.bus["pad"], warm_pad([m2f(m) for m in ms], dur, vel, rng(self.s()), att=att, rel=rel, warm=warm), t)

    def perc(self, x, t, p=0.0, g=1.0):
        place(self.bus["perc"], (pan(x, p) * 0.7071 if np.ndim(x) == 1 else x) * g, t)


def melody(sc, notes, t0, beat, vel, octave_double=False, cel_double=0.0, legato=1.05):
    """notes = [(midi, beats)] played as piano melody from t0"""
    t = t0
    for m, b in notes:
        d = b * beat
        if m is not None:
            sc.pno(m, t, d * legato, vel, p=0.15)
            if octave_double:
                sc.pno(m - 12, t + 0.004, d * legato, vel * 0.55, p=0.05)
            if cel_double:
                sc.cel(m + 12, t, cel_double, p=0.3)
        t += d
    return t


# chord voicings: (bass, [upper])
CH = {
    "D": ("D2", "A2 D3 F#3 A3 E4"),
    "Dadd9": ("D2", "A2 E3 F#3 A3 D4"),
    "A/C#": ("C#2", "A2 E3 A3 C#4"),
    "Bm7": ("B1", "F#2 D3 F#3 A3 D4"),
    "Gmaj7": ("G1", "D2 B2 F#3 A3 D4"),
    "Em7": ("E2", "B2 D3 G3 B3"),
    "D/F#": ("F#2", "A2 D3 F#3 A3"),
    "G": ("G1", "D2 G2 B2 D3 A3"),
    "Asus4": ("A1", "E2 A2 D3 E3 A3"),
    "A": ("A1", "E2 A2 C#3 E3 A3"),
    "Bmadd9": ("B1", "F#2 B2 C#3 D3 F#3"),
    "Gadd9": ("G1", "D2 G2 A2 B2 D3"),
    "Bmadd11": ("B1", "F#2 B2 D3 E3 F#3"),
    "Csus2": ("C2", "G2 C3 D3 G3"),
}


def bass(c):
    return M(CH[c][0])


def upper(c):
    return Ms(CH[c][1])


# Theme: | D  A/C# | Bm7  Gmaj7 | Em7  D/F# | G  Asus4-A |  melody (midi, beats), 2 beats per chord
THEME = [
    [("F#5", 1.5), ("E5", 0.5)],
    [("D5", 0.5), ("C#5", 1.5)],
    [("D5", 1.0), ("F#5", 1.0)],
    [("A5", 1.5), ("F#5", 0.5)],
    [("G5", 1.5), ("F#5", 0.5)],
    [("E5", 0.5), ("D5", 1.5)],
    [("B4", 1.0), ("D5", 1.0)],
    [("E5", 2.0)],
]
THEME_CH = ["D", "A/C#", "Bm7", "Gmaj7", "Em7", "D/F#", "G", "Asus4"]


def th(i):
    return [(M(n), b) for n, b in THEME[i]]


def compose():
    sc = Score()

    # ---------------------------------------------------------------- sky: delicate, mysterious
    s0, s1 = SH["sky"]
    sc.cue(0, "sky: Bm(add9) pad fades in, deep piano B, celesta motif F#-E-D-A (the 'message' motif)")
    sc.pad_(Ms("B2 F#3 C#4 D4"), 0.0, 2.6, 0.26, att=1.6, rel=1.4)
    sc.pad_(Ms("G2 D3 F#3 A3"), 2.4, 2.4, 0.24, att=1.0, rel=1.0)
    sc.str_(Ms("B2 F#3"), 0.2, 2.4, 0.18, att=1.5, rel=1.0, bright=0.25)
    sc.str_(Ms("G2 D3"), 2.4, 2.3, 0.18, att=0.8, rel=0.9, bright=0.25)
    sc.pno(M("B1"), 0.12, 2.3, 0.32)
    sc.pno(M("B2"), 0.12, 2.3, 0.22)
    sc.pno(M("G1"), 2.45, 2.2, 0.30)
    for tm, n_, v in ((0.62, "F#6", 0.34), (1.32, "E6", 0.3), (2.02, "D6", 0.3), (2.72, "A5", 0.3), (3.62, "B5", 0.26), (4.22, "C#6", 0.28)):
        sc.cel(M(n_), tm, v)
    sc.pno(M("F#5"), 0.62, 0.6, 0.2)
    sc.pno(M("A4"), 2.72, 1.0, 0.18)

    # ---------------------------------------------------------------- room: light tension, rising suspended chords
    r0 = SH["room"][0]
    send = EV["send"]
    e8 = (send - r0) / 20.0  # 20 eighths so the send lands on a downbeat
    sc.cue(r0, f"room: soft piano heartbeat pulse in eighths ({60 / (2 * e8):.1f} bpm), Gadd9 -> Asus4 -> Bm(add11) -> Csus2, crescendo")
    plan = [(0, 8, "Gadd9", "D5"), (8, 14, "Asus4", "E5"), (14, 18, "Bmadd11", "F#5"), (18, 20, "Csus2", "G5")]
    for a, b, c, pn in plan:
        ta, tb = r0 + a * e8, r0 + b * e8
        prog = a / 20.0
        sc.pad_(upper(c)[1:], ta, tb - ta, 0.16 + 0.12 * prog, att=0.35, rel=0.4)
        sc.str_([bass(c) + 12] + upper(c)[2:], ta, tb - ta, 0.20 + 0.28 * prog, att=0.4 if a else 0.8, rel=0.35,
                bright=0.3 + 0.3 * prog, vib=5)
        sc.pno(bass(c) + 12, ta, tb - ta, 0.26 + 0.1 * prog)
        for e in range(a, b):
            te = r0 + e * e8
            if EV["delete_start"] - 0.05 <= te < EV["delete_end"]:
                continue  # the pulse falters while he deletes the message
            v = 0.15 + 0.22 * (e / 19.0) ** 1.5 + (0.03 if e % 2 == 0 else 0)
            sc.pno(M(pn), te, e8 * 0.9, v, p=0.2)
            if e >= 14:
                sc.pno(M(pn) - 5, te + 0.01, e8 * 0.9, v * 0.6, p=0.1)
    sc.cue(EV["delete_start"], "pulse falters (2 eighths dropped) while he deletes the message")
    place(sc.bus["perc"], swell(1.58, 0.5, sc.s(), lo=3000), send - 1.6)
    sc.cue(send, "SEND: the tension releases - soft D(add9) chord, celesta A5-D6, long hall tail")
    sc.chord_pno([M("D3"), M("A3"), M("E4"), M("F#4")], send, 1.4, 0.3, roll=0.035)
    sc.pad_(Ms("D3 A3 E4 F#4"), send, 0.6, 0.16, att=0.05, rel=1.0)
    sc.cel(M("A5"), send + 0.02, 0.32)
    sc.cel(M("D6"), send + 0.16, 0.30)

    # ---------------------------------------------------------------- maja + denis reads: warming, "Tak!" lift
    m0 = SH["maja"][0]
    sc.cue(m0, "maja: warm D/F# pad, harp-like pluck arpeggio; thins on the buzz")
    sc.pad_(Ms("F#2 A3 D4"), m0, EV["maja_smile"] - m0, 0.2, att=0.4, rel=0.8)
    sc.str_(Ms("F#2 A3"), m0, EV["maja_smile"] - m0, 0.18, att=0.6, rel=0.8, bright=0.3)
    arp = Ms("F#3 A3 D4 F#4 A4 D5")
    for i, n_ in enumerate(arp):
        tm = m0 + 0.04 + i * 0.09
        if tm < EV["buzz"] - 0.05:
            place(sc.bus["bells"], pan(pluck(m2f(n_), 0.32, rng(sc.s()), dur=1.6, bright=0.35), 0.1 * i - 0.25) * 0.7071, tm)
    sc.cue(EV["maja_surprise"], "surprise: celesta glint A5-B5-D6")
    for i, n_ in enumerate(("A5", "B5", "D6")):
        sc.cel(M(n_), EV["maja_surprise"] + 0.02 + i * 0.085, 0.24 + 0.04 * i)
    sc.cue(EV["maja_smile"], "smile: Gmaj7 swells in")
    tak = TL["voice"][[v["id"] for v in TL["voice"]].index("m2")]["words"][0]["s"]
    sc.pad_(upper("Gmaj7")[1:], EV["maja_smile"], tak - EV["maja_smile"], 0.24, att=0.5, rel=0.4)
    sc.str_([M("G2"), M("D3"), M("B3"), M("F#4")], EV["maja_smile"], tak - EV["maja_smile"] - 0.1, 0.32, att=0.7, rel=0.3, bright=0.4)
    sc.pno(M("G2"), EV["maja_smile"], tak - EV["maja_smile"], 0.3)
    sc.pno(M("F#5"), EV["maja_smile"] + 0.3, 0.6, 0.22)
    place(sc.bus["perc"], swell(0.8, 0.35, sc.s()), tak - 0.8)

    # Tak! -> city: 8 beats so the city cut is a downbeat
    c0 = SH["city"][0]
    bt = (c0 - tak) / 8.0
    sc.cue(tak, f"'Tak!': bright lift - D major bloom, glock D6/F#6, rising piano arpeggio, pulse at {60 / bt:.0f} bpm")
    prog = [("D", 0), ("A/C#", 2), ("Bm7", 4), ("G", 6), ("A", 7)]
    for c, b in prog:
        ta = tak + b * bt
        d = (1 if c in ("G", "A") else 2) * bt
        sc.pno(bass(c), ta, d, 0.34)
        sc.pno(bass(c) + 12, ta + 0.005, d, 0.22)
        # gentle eighth-note broken chord in the right hand
        up = upper(c)[-4:]
        for e in range(int(round(d / bt * 2))):
            sc.pno(up[[1, 2, 3, 2][e % 4]] + 12, ta + e * bt / 2, bt * 0.6, 0.2 + 0.02 * (e % 2 == 0), p=0.25)
        crescendo = 0.3 + 0.35 * (b / 7.0)
        sc.str_([bass(c) + 12] + upper(c)[-3:], ta, d, crescendo, att=0.25 if b else 0.15, rel=0.35, bright=0.45 + 0.2 * b / 7)
    sc.chord_pno([M("D4"), M("F#4"), M("A4"), M("D5")], tak, 1.0, 0.3, roll=0.06)
    sc.glk(M("D6"), tak + 0.01, 0.4)
    sc.glk(M("F#6"), tak + 0.2, 0.32)
    sc.cel(M("A6"), tak + 0.38, 0.22)
    d4 = TL["voice"][[v["id"] for v in TL["voice"]].index("d4")]
    sc.cue(d4["start"], "Denis reads: strings swell under 'Zgodziła się! Tak!', glock run up into the city downbeat")
    run = Ms("A5 B5 C#6 D6 E6 F#6")
    t_run0 = max(d4["end"] + 0.03, c0 - 0.6)
    for i, n_ in enumerate(run):
        sc.glk(n_, t_run0 + i * (c0 - t_run0) / len(run), 0.22 + 0.04 * i, p=-0.3 + 0.12 * i)
    place(sc.bus["perc"], swell(1.2, 0.45, sc.s()), c0 - 1.2)

    # ---------------------------------------------------------------- city: main theme statement
    p0 = SH["park"][0]
    bc = (p0 - c0) / 6.0
    heart = c0 + 1.6
    sc.cue(c0, f"city: MAIN THEME (piano melody + octave + celesta), D - A/C# - Bm7, {60 / bc:.1f} bpm, wide strings")
    for i in range(3):
        c = THEME_CH[i]
        ta = c0 + 2 * i * bc
        sc.pno(bass(c), ta, 2 * bc, 0.38)
        sc.pno(bass(c) + 12, ta + 0.005, 2 * bc, 0.24)
        up = upper(c)[-4:]
        for e in range(4):
            sc.pno(up[[0, 1, 2, 1][e]], ta + e * bc / 2, bc * 0.9, 0.18, p=-0.15)
        sc.str_([bass(c) + 12] + upper(c)[-3:] + [upper(c)[-1] + 12], ta, 2 * bc, 0.5, att=0.3, rel=0.5, bright=0.5)
        sc.pad_(upper(c)[-3:], ta, 2 * bc, 0.14, att=0.3, rel=0.5)
    t = c0
    for i in range(3):
        t = melody(sc, th(i), t, bc, 0.42, octave_double=True, cel_double=0.12)
    sc.cue(heart, "heart firework: glock/celesta sparkle F#6-A6-D7 + triangle")
    for i, n_ in enumerate(("F#6", "A6", "D7")):
        sc.glk(M(n_), heart + i * 0.07, 0.24, p=0.35 - 0.2 * i)
    place(sc.bus["perc"], pan(triangle(0.35, rng(sc.s()), dur=1.8), 0.4) * 0.7071, heart + 0.02)

    # ---------------------------------------------------------------- park: gentle, shy, tender
    v0 = SH["memories"][0]
    bp_ = (v0 - p0) / 8.0
    sc.cue(p0, f"park: tender solo piano broken chords Gmaj7 - D/F# - Em7 - Asus4/A ({60 / bp_:.1f} bpm), light strings from 2nd chord")
    pchords = ["Gmaj7", "D/F#", "Em7", "Asus4"]
    for i, c in enumerate(pchords):
        ta = p0 + 2 * i * bp_
        sc.pno(bass(c), ta, 2 * bp_, 0.3)
        up = upper(c)
        pat = [up[1], up[2], up[3], up[-1]] if len(up) > 3 else up + up[:1]
        for e in range(4):
            sc.pno(pat[e] + 12, ta + e * bp_ / 2, bp_ * 1.2, 0.17 + 0.02 * (e == 0), p=0.2)
        if i:
            sc.str_([bass(c) + 12, upper(c)[-2], upper(c)[-1]], ta, 2 * bp_, 0.22 + 0.04 * i, att=0.7, rel=0.6, bright=0.3, vib=5)
    sc.pno(M("A3") + 12, p0 + 7 * bp_, bp_, 0.17)  # sus resolves
    sc.pno(M("C#4") + 12, p0 + 7 * bp_ + 0.01, bp_, 0.15)
    for tm, n_, v in ((p0 + 0.05, "B5", 0.24), (p0 + 4 * bp_, "A5", 0.2), (p0 + 6.5 * bp_, "E5", 0.2), (p0 + 7.0 * bp_, "F#5", 0.2), (p0 + 7.5 * bp_, "A5", 0.22)):
        sc.pno(M(n_), tm, bp_ * 0.9, v, p=0.2)

    # ---------------------------------------------------------------- memories: joyful montage with a gentle beat
    beats_per = [3, 3, 3.5, 3, 3, 3.5]
    mchords = ["D", "A/C#", "Bm7", "Gmaj7", "Em7", "Asus4"]
    figs = [Ms("F#5 A5 D6"), Ms("E5 A5 C#6"), Ms("F#5 B5 D6"), Ms("G5 B5 D6"), Ms("G5 B5 E6"), Ms("A5 D6 E6")]
    tempos = [60 * b / (e - s) for b, (_, s, e) in zip(beats_per, VG)]
    sc.cue(v0, "memories: montage groove (soft kick, snaps, shaker, pizzicato bass, offbeat piano), one chord per vignette, "
               f"tempo {min(tempos):.0f}-{max(tempos):.0f} bpm locked so each vignette starts on a beat")
    for vi, ((vid, vs, ve), nb, c) in enumerate(zip(VG, beats_per, mchords)):
        b = (ve - vs) / nb
        last = vi == len(VG) - 1
        sc.cue(vs, f"vignette '{vid}': accent (glock + triangle), chord {c}, celesta arpeggio")
        sc.glk(figs[vi][-1] + 12 if vi % 2 else figs[vi][-1], vs + 0.005, 0.3, p=0.3 if vi % 2 else -0.3)
        place(sc.bus["perc"], pan(triangle(0.22, rng(sc.s()), dur=1.2), 0.45) * 0.7071, vs)
        if vi:
            place(sc.bus["perc"], swell(0.45, 0.22, sc.s()), vs - 0.45)
        sc.str_([bass(c) + 12] + upper(c)[-3:], vs, ve - vs, 0.26, att=0.2, rel=0.4, bright=0.45, vib=6)
        n8 = int(round(nb * 2))
        for e in range(n8):
            te = vs + e * b / 2
            if last and e >= 4:
                break  # groove steps back before the finale
            if e % 2 == 0:
                beatno = e // 2
                if beatno in (0, 2):
                    sc.perc(soft_kick(0.55 if beatno == 0 else 0.42, sc.s()), te)
                    place(sc.bus["bass"], pan(pluck(m2f(bass(c) + 12), 0.55, rng(sc.s()), dur=0.9, bright=0.3), 0) * 0.7071, te)
                if beatno == 1:
                    sc.perc(snap(0.32, sc.s()), te, p=0.15)
            else:
                ch_ = upper(c)[-3:]
                for j, m in enumerate(ch_):
                    sc.pno(m + 12, te + 0.003 * j, b * 0.35, 0.16, p=0.1)
            sc.perc(shaker(0.16 if e % 2 else 0.1, sc.s()), te + 0.004, p=0.35)
        # celesta arpeggio on beat 1
        for j, m in enumerate(figs[vi]):
            sc.cel(m, vs + b + j * b / 4, 0.2 + 0.03 * j, p=0.3)
        if c == "Asus4":
            sc.pno(M("C#5"), vs + 2 * b, b * 1.4, 0.2)
            sc.str_([M("C#4"), M("E4")], vs + 2 * b, ve - vs - 2 * b, 0.22, att=0.3, rel=0.4)

    # ---------------------------------------------------------------- finale: theme returns, strings swell, climax, resolve
    f0 = SH["finale"][0]
    ec1, ec2 = EV["end_card_1"], EV["end_card_2"]
    bf = (ec1 - f0) / 16.0  # four bars so the climax lands on end_card_1
    sc.cue(f0, f"finale: theme returns on solo piano ({60 / bf:.1f} bpm), strings enter and grow bar by bar")
    for i in range(8):
        c = THEME_CH[i]
        ta = f0 + 2 * i * bf
        prog = i / 7.0
        sc.pno(bass(c), ta, 2 * bf, 0.32 + 0.08 * prog)
        sc.pno(bass(c) + 12, ta + 0.006, 2 * bf, 0.2 + 0.08 * prog)
        up = upper(c)[-4:]
        sub = 4 if i < 6 else 8  # arpeggio density grows into the climax
        for e in range(sub):
            m = up[[0, 1, 2, 3, 2, 1, 2, 3][e % 8]]
            sc.pno(m + 12, ta + e * 2 * bf / sub, 2 * bf / sub * 1.3, 0.15 + 0.06 * prog, p=-0.2)
        if i >= 1:
            sc.str_([bass(c), bass(c) + 12] + upper(c)[-3:], ta, 2 * bf, 0.26 + 0.42 * prog, att=0.5 if i < 6 else 0.25,
                    rel=0.6, bright=0.35 + 0.3 * prog, vib=6 + 2 * prog)
        if i >= 4:  # violins double the melody an octave below
            tm = ta
            for m, bb in th(i):
                sc.str_([m - 12], tm, bb * bf, 0.18 + 0.12 * prog, att=0.12, rel=0.3, voices=3, bright=0.5)
                tm += bb * bf
        if c == "Asus4":
            sc.str_([M("C#4"), M("E4")], ta + bf, bf, 0.5, att=0.2, rel=0.3)
            sc.pno(M("C#4"), ta + bf, bf, 0.26)
    t = f0
    for i in range(8):
        t = melody(sc, th(i), t, bf, 0.42 + 0.06 * (i / 7), octave_double=i >= 2, cel_double=0.1 if i >= 4 else 0.0)
    place(sc.bus["perc"], swell(2.2, 0.6, sc.s(), lo=2000), ec1 - 2.2)
    sc.cue(ec1, "CLIMAX on end card 1: G(add9) -> A -> D, melody peaks on D6 (octaves + violins), soft cymbal + timpani")
    # climax bar: | G(add9)  A | then final D
    cl = [("G", [("D6", 1.5), ("B5", 0.5)]), ("A", [("A5", 1.0), ("C#6", 1.0)])]
    for j, (c, mel) in enumerate(cl):
        ta = ec1 + 2 * j * bf
        sc.pno(bass(c), ta, 2 * bf, 0.46)
        sc.pno(bass(c) + 12, ta + 0.006, 2 * bf, 0.32)
        sc.chord_pno([m + 12 for m in upper(c)[-3:]], ta, 2 * bf, 0.3, roll=0.02)
        sc.str_([bass(c), bass(c) + 12] + upper(c)[-3:] + [upper(c)[-1] + 12], ta, 2 * bf, 0.72, att=0.15, rel=0.5, bright=0.65, vib=8)
        tm = ta
        for n_, bb in mel:
            sc.pno(M(n_), tm, bb * bf * 1.05, 0.52, p=0.15)
            sc.pno(M(n_) - 12, tm + 0.004, bb * bf * 1.05, 0.34, p=0.05)
            sc.str_([M(n_) - 12, M(n_)], tm, bb * bf, 0.34, att=0.1, rel=0.3, voices=3, bright=0.55)
            sc.cel(M(n_) + 12 if M(n_) < 85 else M(n_), tm, 0.12)
            tm += bb * bf
    place(sc.bus["perc"], cymbal(0.55, sc.s(), dur=4.0), ec1)
    place(sc.bus["perc"], pan(timpani(m2f(M("G2")), 0.4, rng(sc.s()), dur=2.5), 0) * 0.7071, ec1)
    tD = ec1 + 4 * bf
    end = DUR
    sc.cue(tD, "resolution: rolled D(add9) chord, strings sustain and fade")
    ring = end - tD
    sc.pno(M("D1"), tD, ring, 0.36)
    sc.chord_pno(Ms("D2 A2 D3 F#3 A3 E4 F#4 D5"), tD, ring, 0.3, roll=0.045)
    sc.pno(M("F#5"), tD + 0.38, ring - 0.4, 0.34, p=0.15)
    sc.str_(Ms("D2 D3 A3 F#4 A4"), tD, ring - 1.6, 0.5, att=0.2, rel=1.5, bright=0.45, vib=7)
    sc.pad_(Ms("D3 A3 E4 F#4"), tD, ring - 1.8, 0.16, att=0.5, rel=1.6)
    sc.cue(ec2, "end card 2: celesta echoes the opening motif F#-E-D-A (the story continues)")
    for i, n_ in enumerate(("F#6", "E6", "D6", "A5")):
        sc.cel(M(n_), ec2 + 0.05 + i * 0.36, 0.3 - 0.03 * i)
    sc.glk(M("D7"), ec2 + 0.05 + 4 * 0.36, 0.14)
    return sc


# ================================================================ render
def render(sc):
    ir_hall = make_ir(2.6, 7, hf=1.3, early=[(0.011, 0.5, -0.6), (0.019, 0.4, 0.6), (0.031, 0.3, -0.3)])
    ir_room = make_ir(1.2, 11, hf=1.6)
    wet = {"piano": 0.30, "strings": 0.42, "pad": 0.35, "bells": 0.5, "perc": 0.18, "bass": 0.12}
    gain = {"piano": 1.0, "strings": 0.62, "pad": 0.3, "bells": 0.42, "perc": 0.55, "bass": 0.5}
    b = sc.bus
    # bus EQ: warm felt piano body, roll off string fizz, keep lows tidy
    b["piano"] = shelf(peq(lp(b["piano"], 7000, 1), 220, 1.5, 0.8), 3500, -2.0)
    b["strings"] = hp(peq(lp(b["strings"], 7500, 2), 2600, -2.0, 1.0), 70, 2)
    b["pad"] = hp(lp(b["pad"], 3500, 2), 90, 2)
    b["bells"] = hp(b["bells"], 300, 2)
    dry = np.zeros((2, N))
    send = np.zeros((2, N))
    for k, x in b.items():
        dry += gain[k] * x
        send += gain[k] * wet[k] * x
    rev = convolve_st(hp(send, 180, 2), ir_hall) * 0.55 + convolve_st(hp(send, 180, 2), ir_room) * 0.12
    mix = hp(dry + rev, 30, 2)
    # fade to silence by the end, tiny fade-in
    mix *= curve(N, [(0, 0.0), (0.02, 1.0), (DUR - 1.7, 1.0), (DUR - 0.05, 0.0), (DUR, 0.0)])[None, :]
    return mix


def main():
    sc = compose()
    mix = render(sc)
    L = integrated(mix)
    mix *= dbg(-18.0 - L)
    tp = true_peak(mix)
    if tp > -1.0:
        mix *= dbg(-1.0 - tp)
    write_wav(os.path.join(HERE, "score.wav"), mix, bits=24)
    json.dump({"key": "D major / B minor", "cues": sorted(sc.cues)}, open(os.path.join(HERE, "score_cues.json"), "w"),
              ensure_ascii=False, indent=1)
    print(f"score.wav: {DUR:.3f}s, integrated {integrated(mix):.1f} LUFS, true peak {true_peak(mix):.1f} dBTP")
    for t, d in sorted(sc.cues):
        print(f"  {t:7.3f}  {d}")


if __name__ == "__main__":
    main()
