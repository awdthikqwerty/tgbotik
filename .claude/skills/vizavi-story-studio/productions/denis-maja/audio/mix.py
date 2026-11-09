# Final mix for "Denis i Maja": ElevenLabs voices (narrator time-stretched 1.1x, pitch kept) + original score
# (score.wav, ducked under speech) + SFX (ElevenLabs clips in sfx/, laugh from voice/m4.mp3), all placed from
# ../timeline.json. Master: -14 LUFS integrated, true peak <= -1 dBTP, exactly timeline.duration, 48 kHz stereo 16-bit.
# Writes ../public/audio/mix.wav and stems/{voice,music,sfx}.wav (at mix gain, pre-limiter), prints a loudness report.
import os, sys, json, subprocess
import numpy as np
from scipy import signal, ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
PROD = os.path.dirname(HERE)
SKILL = os.path.dirname(os.path.dirname(PROD))
sys.path.insert(0, os.path.join(SKILL, "templates", "audio"))
from dsp import (SR, ns, st, dbg, lp, hp, peq, shelf, fades, pan, place, make_ir, convolve_st, integrated, momentary,
                 momentary_max, true_peak, read_wav, write_wav, rng)

TL = json.load(open(os.path.join(PROD, "timeline.json")))
DUR = TL["duration"]
N = ns(DUR)
EV = TL["events"]
SHOTS = TL["shots"]

TARGET_LUFS = -14.0
CEIL_DBTP = -1.3          # limiter ceiling; spec is <= -1.0 dBTP
VOICE_LUFS = -17.0        # per-line integrated loudness before the master gain
MUSIC_REL = -4.0          # unducked score, integrated, relative to the voice stem
MUSIC_DUCK = -11.0        # dB under speech
SFX_DUCK = -6.0
LAUGH_REL = -9.0          # laugh max momentary vs. the narrator line it plays under
# per-shot music rides (dB): the score's quiet sections (sky intro, shy park) would otherwise sit ~18 LU under speech
MUSIC_RIDE = {"sky": 4.0, "room": 0.0, "maja": 0.0, "denis_reads": 0.0, "city": -0.5, "park": 4.5, "memories": 2.0, "finale": 0.0}


def ride_curve(xf=0.4):
    t = np.arange(N) / SR
    c = np.zeros(N)
    for s in SHOTS:
        c[(t >= s["start"]) & (t < s["end"])] = MUSIC_RIDE.get(s["id"], 0.0)
    return dbg(ndimage.uniform_filter1d(c, ns(xf), mode="nearest"))


def ev(v):
    return EV[v] if isinstance(v, str) else float(v)


def decode(path, af=None, t0=None, t1=None):
    cmd = ["ffmpeg", "-v", "error"]
    if t0 is not None:
        cmd += ["-ss", f"{t0}"]
    if t1 is not None:
        cmd += ["-t", f"{t1 - (t0 or 0)}"]
    cmd += ["-i", path]
    if af:
        cmd += ["-af", af]
    cmd += ["-ac", "2", "-ar", str(SR), "-f", "f32le", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, "<f4").astype(np.float64).reshape(-1, 2).T.copy()


# ================================================================ voice
def compress(y, ratio=2.5, knee_below_p90=7.0, att=0.005, rel=0.12):
    """gentle feed-forward RMS compressor at 1 kHz control rate"""
    m = y.mean(0)
    hop = SR // 1000
    nb = len(m) // hop + 1
    p = np.pad(m ** 2, (0, nb * hop - len(m))).reshape(nb, hop).mean(1)
    lvl = 10 * np.log10(ndimage.uniform_filter1d(p, 10) + 1e-12)
    active = lvl > lvl.max() - 40
    thr = np.percentile(lvl[active], 90) - knee_below_p90 if active.any() else 0
    want = -np.maximum(lvl - thr, 0) * (1 - 1 / ratio)
    ka, kr = 1 - np.exp(-1 / (att * 1000)), 1 - np.exp(-1 / (rel * 1000))
    g = np.zeros(nb)
    cur = 0.0
    for i in range(nb):
        cur += (want[i] - cur) * (ka if want[i] < cur else kr)
        g[i] = cur
    gs = np.interp(np.arange(len(m)) / hop, np.arange(nb), g)
    return y * dbg(gs)[None, :]


def build_voice():
    out = np.zeros((2, N))
    spans, report = [], []
    room = make_ir(0.35, 21, hf=1.8, pre=0.004)
    for v in TL["voice"]:
        path = os.path.join(PROD, v["file"])
        af = f"rubberband=tempo={v['tempo']}" if abs(v["tempo"] - 1) > 1e-6 else None
        y = decode(path, af)
        y = y.mean(0, keepdims=True).repeat(2, 0)
        y = hp(y, 80, 2)
        y = compress(y)
        if v["speaker"] == "narrator":
            y = shelf(shelf(y, 180, 1.5, "low"), 9000, -1.0)  # warm, dry
            y = peq(y, 3000, 1.0, 1.0)
        else:
            y = peq(peq(y, 260, -1.0, 1.0), 3500, 1.5, 1.0)
        y *= dbg(VOICE_LUFS - integrated(y))
        if v["speaker"] != "narrator":
            y = y + convolve_st(y.mean(0), room) * dbg(-21)  # very subtle room
        y = fades(y, 0.008, 0.03)
        place(out, y, v["start"])
        report.append((v["id"], v["speaker"], v["start"], y.shape[1] / SR, v["duration"], true_peak(y) - VOICE_LUFS))
        for w in v["words"]:
            spans.append((w["s"], w["e"]))
    return out, sorted(spans), report


def merge_spans(sp, gap=0.6):
    out = []
    for s, e in sp:
        if out and s - out[-1][1] < gap:
            out[-1][1] = max(out[-1][1], e)
        else:
            out.append([s, e])
    return out


def duck_curve(spans, depth, pre=0.15, post=0.22, att=0.09, rel=0.5):
    ctrl = 1000
    nc = int(DUR * ctrl) + 2
    va = np.zeros(nc)
    for s, e in spans:
        va[max(0, int((s - pre) * ctrl)): int((e + post) * ctrl)] = 1.0
    ka, kr = 1 - np.exp(-1 / (att * ctrl)), 1 - np.exp(-1 / (rel * ctrl))
    env = np.zeros(nc)
    e = 0.0
    for i in range(nc):
        e += (va[i] - e) * (ka if va[i] > e else kr)
        env[i] = e
    return dbg(np.interp(np.arange(N) / SR, np.arange(nc) / ctrl, depth * env))


# ================================================================ sfx
SFX_DIR = os.path.join(HERE, "sfx")
_cache = {}


def clip(name, t0=None, t1=None):
    key = (name, t0, t1)
    if key not in _cache:
        _cache[key] = decode(os.path.join(SFX_DIR, name + ".mp3"), None, t0, t1)
    return _cache[key].copy()


def level(x, rel, bed=False):
    """scale so max momentary (events) or integrated (beds) = VOICE_LUFS + rel"""
    cur = integrated(x) if bed else momentary_max(x)
    return x * dbg(VOICE_LUFS + rel - cur) if np.isfinite(cur) else x


def loop_to(x, n, xf=0.5):
    """extend by crossfaded repeats (equal power)"""
    if x.shape[1] >= n:
        return x[:, :n]
    k = ns(xf)
    out = x.copy()
    w = np.sin(np.linspace(0, np.pi / 2, k))
    while out.shape[1] < n:
        nxt = x.copy()
        out[:, -k:] = out[:, -k:] * w[::-1] + nxt[:, :k] * w
        out = np.concatenate([out, nxt[:, k:]], axis=1)
    return out[:, :n]


def stereo_pan(x, p):
    """balance a stereo clip toward p (-1..1) keeping both channels"""
    if p == 0:
        return x
    g = np.cos((np.clip(p, -1, 1) + 1) * np.pi / 4), np.sin((np.clip(p, -1, 1) + 1) * np.pi / 4)
    return x * (np.sqrt(2) * np.array(g))[:, None]


# cue -> (level LU rel. voice, pan, trim (t0, t1) in the clip or None, bed?)
SFX = {
    "breath": (-9, 0.0, (0.0, 1.45), False),
    "message_sent": (-10, 0.1, None, False),
    "phone_vibrate": (-8, 0.15, None, False),
    "gasp": (-9, 0.1, (0.0, 0.75), False),
    "message_ding": (-9, -0.1, None, False),
    "fireworks_big": (-3, 0.0, None, False),
    "transition": (-13, 0.0, None, False),
    "birds_winter": (-24, 0.0, None, True),
    "footsteps_snow": (-17, 0.0, None, False),
    "sea_waves": (-13, 0.0, None, False),
    "dog_bark": (-9, 0.3, (0.0, 0.6), False),
    "birds_summer": (-19, 0.0, None, False),
    "footsteps_walk": (-17, 0.0, None, False),
    "whoosh_soft": (-15, 0.0, None, False),
    "flowers_rustle": (-11, 0.1, None, False),
    "kiss": (-11, 0.05, None, False),
    "sparkle": (-12, 0.0, None, False),
}
PER_CUE = {("message_sent", 17.376): -12, ("footsteps_walk", 44.339): -15, ("sparkle", 61.617): -10}


def taps():
    """individual taps sliced from key_tap.mp3 at detected onsets"""
    x = clip("key_tap")
    m = np.abs(x.mean(0))
    env = ndimage.maximum_filter1d(m, ns(0.004))
    thr = env.max() * 0.12
    on = np.flatnonzero((env[1:] > thr) & (env[:-1] <= thr))
    sl, last = [], -1e9
    for o in on:
        if o - last < ns(0.06):
            continue
        last = o
        a = max(0, o - ns(0.003))
        s = fades(x[:, a: a + ns(0.07)], 0.002, 0.03)
        if s.shape[1] == ns(0.07):
            sl.append(s)
    return sl


def fireworks_bed(t_end):
    """0 -> maja_end: looped distant fireworks; muffled through the window in the room, open and louder outside"""
    a = clip("fireworks_bed", 0.0, 6.4)
    b = a[::-1].copy()  # L/R swapped repeat for variety (channel swap, not time reversal)
    seq = loop_to(np.concatenate([a, b[:, ns(0.8):]], axis=1), ns(t_end) + ns(0.1))
    open_ = level(seq, -14, bed=True)
    muff = lp(open_, 900, 2) * dbg(-11)
    room0, room1 = SHOTS[1]["start"], SHOTS[1]["end"]
    t = np.arange(open_.shape[1]) / SR
    w = np.interp(t, [0, room0 - 0.15, room0 + 0.15, room1 - 0.15, room1 + 0.15, 1e9], [0, 0, 1, 1, 0, 0])
    lift = np.interp(t, [0, room1, room1 + 0.4, 1e9], [0, 0, 1, 1])  # outside with Maja: +4 dB
    y = (open_ * (1 - w) + muff * w) * dbg(4 * lift)
    burst = level(lp(clip("fireworks_big", 0.0, 3.2), 3500, 2), -13)  # one burst as we arrive outside
    place(y, fades(burst, 0.005, 0.4), EV["maja_in"] + 0.05)
    return fades(y[:, : ns(t_end)], 0.6, 0.45)


def build_sfx(voice_n4_mm):
    out = np.zeros((2, N))
    nod = np.zeros((2, N))  # not ducked (laugh)
    log = []
    for c in TL["sfx"]:
        name, t = c["name"], float(c["t"])
        if name == "fireworks_bed":
            y = fireworks_bed(ev(c["until"]) - t)
            place(out, y, t)
            log.append((t, name, "ElevenLabs, looped; muffled -11 dB + LP 900 Hz in the room, +4 dB outside"))
            continue
        if name == "key_tap":
            continue  # handled below
        if name == "laugh":
            lg = decode(os.path.join(PROD, "voice", "m4.mp3"), None, 0.0, 1.44)
            lg = fades(hp(lg, 90, 2), 0.01, 0.12)
            lg *= dbg(voice_n4_mm + LAUGH_REL - momentary_max(lg))
            place(nod, lg, t)
            log.append((t, name, f"m4.mp3 0-1.44 s (laugh only), {LAUGH_REL:+.0f} dB vs narrator, not ducked"))
            continue
        rel, p, trim, bed = SFX[name]
        rel = PER_CUE.get((name, t), rel)
        y = clip(name, *(trim or (None, None)))
        if "until" in c:
            L = ev(c["until"]) - t
            y = loop_to(y, ns(L)) if y.shape[1] < ns(L) else y[:, : ns(L)]
            y = level(y, rel, bed)
            y = fades(y, 0.35, min(0.35, L / 3))
        else:
            y = fades(level(y, rel, bed), 0.004, 0.06)
        place(out, stereo_pan(y, p), t)
        log.append((t, name, f"{rel:+d} LU {'(bed, integrated)' if bed else '(max momentary)'}"))
    # typing: two taps per timeline cue, plus soft taps on delete (backspace) and retype that the picture shows
    tp = taps()
    r = rng(5)
    times = []
    for c in TL["sfx"]:
        if c["name"] == "key_tap":
            times += [(c["t"], -15), (c["t"] + 0.16 + r.uniform(-0.03, 0.03), -17)]
    for k in range(3):
        times.append((EV["delete_start"] + 0.08 + k * 0.2, -20))
    for k in range(4):
        times.append((EV["retype_start"] + 0.05 + k * 0.19 + r.uniform(-0.02, 0.02), -17))
    for i, (t, rel) in enumerate(sorted(times)):
        y = level(tp[i % len(tp)], rel)
        place(out, stereo_pan(y, 0.1), t)
    log.append((5.55, "key_tap", f"{len(times)} taps sliced from key_tap.mp3 (12 on cues, 3 delete, 4 retype)"))
    return out, nod, sorted(log)


# ================================================================ limiter
def limiter(x, ceil_db, look_ms=3):
    """1 ms control-rate look-ahead limiter on 4x-oversampled peaks; gain interpolated between blocks"""
    c = dbg(ceil_db)
    up = np.abs(signal.resample_poly(x, 4, 1, axis=-1)).max(0)
    hop = SR // 1000
    nb = int(np.ceil(x.shape[1] / hop))
    pk = np.pad(up, (0, nb * hop * 4 - len(up))).reshape(nb, hop * 4).max(1)
    req = np.minimum(1.0, c / np.maximum(pk, 1e-12))
    req = ndimage.minimum_filter1d(req, 2 * look_ms + 1, mode="nearest")
    kr = 1 - np.exp(-1 / 80.0)  # 80 ms release
    g = np.ones(nb)
    cur = 1.0
    for i in range(nb):
        cur = min(req[i], cur + (1 - cur) * kr)
        g[i] = cur
    gs = np.interp(np.arange(x.shape[1]) / hop, np.arange(nb) + 0.5, g)
    return x * gs[None, :], g


def write16(path, x, seed=1):
    r = rng(seed)
    d = (r.uniform(-0.5, 0.5, x.shape) + r.uniform(-0.5, 0.5, x.shape)) / 32768.0  # TPDF dither
    write_wav(path, x + d, bits=16)


def lufs(x):
    v = integrated(x)
    return v if np.isfinite(v) else -99.0


def main():
    os.makedirs(os.path.join(HERE, "stems"), exist_ok=True)
    os.makedirs(os.path.join(PROD, "public", "audio"), exist_ok=True)
    voice, words, vrep = build_voice()
    spans = merge_spans(words)
    vI = lufs(voice)
    n4 = next(v for v in TL["voice"] if v["id"] == "n4")
    n4mm = momentary_max(voice[:, ns(n4["start"]): ns(n4["end"])])

    sc, sr = read_wav(os.path.join(HERE, "score.wav"))
    assert sr == SR
    music = np.zeros((2, N))
    music[:, : min(N, sc.shape[1])] = st(sc)[:, :N]
    music *= dbg(vI + MUSIC_REL - lufs(music))
    music *= ride_curve()[None, :]
    music *= duck_curve(spans, MUSIC_DUCK)[None, :]

    sfx, laugh, slog = build_sfx(n4mm)
    sfx *= duck_curve(spans, SFX_DUCK)[None, :]
    sfx += laugh

    mix = voice + music + sfx
    g = TARGET_LUFS - lufs(mix)
    for _ in range(3):
        y, gr = limiter(mix * dbg(g), CEIL_DBTP)
        err = TARGET_LUFS - lufs(y)
        if abs(err) < 0.05:
            break
        g += err
    y = fades(y, 0.005, 0.03)
    tp = true_peak(y)
    if tp > -1.0:
        y *= dbg(-1.05 - tp)
    write16(os.path.join(PROD, "public", "audio", "mix.wav"), y)
    G = dbg(g)
    for name, s in (("voice", voice), ("music", music), ("sfx", sfx)):
        write_wav(os.path.join(HERE, "stems", f"{name}.wav"), s * G, bits=24)

    # ---------------------------------------------------------------- report
    print(f"mix.wav: {y.shape[1]} samples = {y.shape[1] / SR:.3f} s (timeline {DUR:.3f} s), master gain {g:+.2f} dB, "
          f"limiter max GR {-20 * np.log10(gr.min()):.2f} dB, active {100 * (gr < 0.989).mean():.1f}% of ms")
    print(f"integrated {lufs(y):.2f} LUFS, true peak {true_peak(y):.2f} dBTP")
    hot = np.flatnonzero(gr < dbg(-1.5))
    if len(hot):
        grp = np.split(hot, np.flatnonzero(np.diff(hot) > 50) + 1)
        print("limiter > 1.5 dB at:", ", ".join(f"{g_[0] / 1000:.2f}s ({-20 * np.log10(gr[g_].min()):.1f} dB)" for g_ in grp))
    print("voice lines (id speaker start placed_len timeline_dur peak-to-loudness):")
    for r_ in vrep:
        print(f"  {r_[0]:3s} {r_[1]:9s} {r_[2]:7.3f} {r_[3]:6.3f} {r_[4]:6.3f} {r_[5]:5.1f}")
    V, Mu, S = voice * G, music * G, sfx * G
    Mv, Mb = momentary(V), momentary(Mu + S)
    tc = np.arange(len(Mv)) * 0.01 + 0.2
    print("section       voice  music   sfx   bed  margin | speech-window margin median / p10 (LU)")
    for s in SHOTS:
        a, b = ns(s["start"]), ns(s["end"])
        lv, lm, ls, lb = lufs(V[:, a:b]), lufs(Mu[:, a:b]), lufs(S[:, a:b]), lufs((Mu + S)[:, a:b])
        sp = np.zeros(len(tc), bool)
        for w0, w1 in words:
            if s["start"] <= w0 < s["end"]:
                sp |= (tc >= w0 + 0.03) & (tc <= w1 - 0.03)
        sp &= Mv > lufs(V) - 10
        mm = Mv[sp] - Mb[sp]
        extra = f"{np.median(mm):5.1f} / {np.percentile(mm, 10):5.1f}" if sp.any() else "   (no speech)"
        print(f"  {s['id']:11s} {lv:6.1f} {lm:6.1f} {ls:6.1f} {lb:6.1f} {lv - lb:6.1f} | {extra}")
    print("sfx placements:")
    for t, n_, d in slog:
        print(f"  {t:7.3f} {n_:15s} {d}")


if __name__ == "__main__":
    main()
