# Objective audition of voice previews: pitch (F0), pitch variation (expressiveness), language detection.
# Usage: python3 analyze_previews.py <file-list.txt> <out.tsv>
import sys, numpy as np, librosa
from faster_whisper import WhisperModel

files = [l.strip() for l in open(sys.argv[1]) if l.strip()]
model = WhisperModel("small", device="cpu", compute_type="int8")
rows = []
for f in files:
    y, sr = librosa.load(f, sr=16000, mono=True, duration=20)
    f0, vflag, _ = librosa.pyin(y, fmin=70, fmax=450, sr=sr, frame_length=1024)
    f0 = f0[vflag & ~np.isnan(f0)]
    med = float(np.median(f0)) if f0.size else 0
    # expressiveness: spread of pitch in semitones
    st = 12 * np.log2(f0 / med) if f0.size else np.array([0])
    spread = float(np.percentile(st, 90) - np.percentile(st, 10))
    segs, info = model.transcribe(y.astype(np.float32), beam_size=1, language=None, vad_filter=True)
    text = " ".join(s.text.strip() for s in segs)[:110]
    rows.append((f.split("/")[-1], round(med), round(spread, 1), info.language, round(info.language_probability, 2), text))
    print(*rows[-1], sep="\t", flush=True)
with open(sys.argv[2], "w") as o:
    for r in rows: o.write("\t".join(map(str, r)) + "\n")
