# Quick look at the generated SFX: 50 ms RMS envelope (dBFS), onset of first sound, spectral centroid.
import sys, glob, os
import numpy as np, librosa

HERE = os.path.dirname(os.path.abspath(__file__))
files = sys.argv[1:] or sorted(glob.glob(os.path.join(HERE, "sfx", "*.mp3")))
for f in files:
    y, sr = librosa.load(f, sr=48000, mono=True)
    hop = 2400
    r = librosa.feature.rms(y=y, frame_length=hop, hop_length=hop, center=False)[0]
    db = 20 * np.log10(r + 1e-9)
    cen = librosa.feature.spectral_centroid(y=y, sr=sr).mean()
    pk = db.max()
    on = np.flatnonzero(db > pk - 20)
    line = "".join(" .:-=+*#%@"[int(np.clip((d - pk + 40) / 4, 0, 9))] for d in db)
    print(f"{os.path.basename(f):20s} {len(y)/sr:5.2f}s peakRMS {pk:6.1f} on {on[0]*0.05 if len(on) else -1:4.2f}-{(on[-1]+1)*0.05 if len(on) else -1:4.2f}s cen {cen:5.0f}Hz |{line}|")
