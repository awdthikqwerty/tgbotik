# Debug: where does the ~600 Hz notch in score.wav come from? Prints 1/6-octave spectra of the mix, the IRs, and a piano note.
import os, sys
import numpy as np
import soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import score as S
from dsp import make_ir, SR


def bands(x, label):
    x = np.atleast_2d(x)
    sp = (np.abs(np.fft.rfft(x, axis=-1)) ** 2).sum(0)
    f = np.fft.rfftfreq(x.shape[-1], 1 / SR)
    cs = [250 * 2 ** (i / 6) for i in range(0, 16)]
    out = []
    for c in cs:
        m = (f > c * 2 ** -0.0833) & (f < c * 2 ** 0.0833)
        out.append(10 * np.log10(sp[m].mean() + 1e-20))
    out = np.array(out)
    out -= out.max()
    print(f"{label:10s}", " ".join(f"{c:4.0f}:{v:5.1f}" for c, v in zip(cs, out)))


x, _ = sf.read(os.path.join(HERE, "score.wav"), always_2d=True)
bands(x.T, "score")
bands(x.T[0] - x.T[1], "score S")
bands(make_ir(2.6, 7, hf=1.3, early=[(0.011, 0.5, -0.6), (0.019, 0.4, 0.6), (0.031, 0.3, -0.3)]), "hall IR")
bands(make_ir(1.2, 11, hf=1.6), "room IR")
bands(S.piano(S.M("D4"), 1.0, 0.4, 1), "pianoD4")
bands(S.strings(S.Ms("D3 A3 F#4"), 1.5, 0.5, 1), "strings")
bands(S.pan(np.random.default_rng(0).standard_normal(48000), 0.3), "pan")
