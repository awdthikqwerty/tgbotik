# Score generated Polish auditions: P(pl) from language ID (accent proxy), CER vs reference, F0 median, pitch spread.
# Usage: python3 score.py "<reference text>" file1.mp3 [file2.mp3 ...]
import sys, re, unicodedata, numpy as np, librosa
from faster_whisper import WhisperModel

ref = sys.argv[1]
model = WhisperModel("small", device="cpu", compute_type="int8")

def norm(s):
    s = unicodedata.normalize("NFC", s.lower())
    return re.sub(r"[^a-ząćęłńóśźż ]", "", re.sub(r"\[[^\]]*\]", "", s)).split()

def cer(a, b):
    a, b = " ".join(a), " ".join(b)
    d = np.arange(len(b) + 1)
    for i, ca in enumerate(a, 1):
        prev, d[0] = d[0], i
        for j, cb in enumerate(b, 1):
            prev, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, prev + (ca != cb))
    return d[-1] / max(1, len(a))

for f in sys.argv[2:]:
    y, sr = librosa.load(f, sr=16000, mono=True)
    y32 = y.astype(np.float32)
    _, info = model.transcribe(y32, beam_size=1, language=None)
    segs, _ = model.transcribe(y32, beam_size=5, language="pl")
    hyp = " ".join(s.text.strip() for s in segs)
    f0, vf, _ = librosa.pyin(y, fmin=70, fmax=450, sr=sr, frame_length=1024)
    f0 = f0[vf & ~np.isnan(f0)]
    med = float(np.median(f0)) if f0.size else 0
    st = 12 * np.log2(f0 / med) if f0.size else np.zeros(1)
    pl = info.language_probability if info.language == "pl" else 0.0
    print(f"{f.split('/')[-1]:58s} P(pl)={pl:.2f} ({info.language}) CER={cer(norm(ref), norm(hyp)):.3f} F0={med:5.0f}Hz spread={np.percentile(st,90)-np.percentile(st,10):4.1f}st dur={len(y)/sr:4.1f}s | {hyp[:70]}", flush=True)
