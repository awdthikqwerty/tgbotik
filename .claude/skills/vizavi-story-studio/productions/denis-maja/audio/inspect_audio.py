# Objective checks for a rendered WAV: short-term loudness contour, per-shot spectral centroid / loudness,
# click detector (isolated sample jumps far above local level), DC offset.
import os, sys, json
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "templates", "audio"))
from dsp import SR, integrated, short_term, true_peak

TL = json.load(open(os.path.join(HERE, "..", "timeline.json")))
path = sys.argv[1]
x, sr = sf.read(path, always_2d=True)
x = x.T.astype(np.float64)
assert sr == SR, sr
print(f"{os.path.basename(path)}: {x.shape[1] / SR:.3f}s  I {integrated(x):.1f} LUFS  TP {true_peak(x):.1f} dBTP  DC {x.mean():.1e}")
S = short_term(x, hop=0.5)
print("short-term (3 s) every 0.5 s from 1.5 s:", " ".join(f"{v:.0f}" for v in S))
mono = x.mean(0)
for s in TL["shots"]:
    seg = mono[int(s["start"] * SR): int(s["end"] * SR)]
    sp = np.abs(np.fft.rfft(seg * np.hanning(len(seg))))
    f = np.fft.rfftfreq(len(seg), 1 / SR)
    cen = (sp * f).sum() / sp.sum()
    hi = 10 * np.log10((sp[f > 4000] ** 2).sum() / (sp ** 2).sum() + 1e-12)
    print(f"  {s['id']:12s} {s['start']:6.2f}-{s['end']:6.2f}  I {integrated(x[:, int(s['start'] * SR): int(s['end'] * SR)]):6.1f}  centroid {cen:5.0f} Hz  >4k {hi:5.1f} dB")
d = np.abs(np.diff(mono))
win = 480
loc = np.convolve(d, np.ones(win) / win, mode="same") + 1e-6
z = d / loc
idx = np.flatnonzero((z > 25) & (d > 0.02))
print(f"click candidates: {len(idx)}", (idx[:15] / SR).round(3).tolist())
