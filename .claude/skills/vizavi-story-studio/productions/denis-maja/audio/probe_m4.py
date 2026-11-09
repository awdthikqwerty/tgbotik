# Finds where Maja's laugh ends in voice/m4.mp3 (word timestamps + 10 ms energy) so only the laugh is used.
import os, numpy as np, librosa
from faster_whisper import WhisperModel

f = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "voice", "m4.mp3")
y, sr = librosa.load(f, sr=16000, mono=True)
segs, _ = WhisperModel("small", device="cpu", compute_type="int8").transcribe(y, language="pl", word_timestamps=True)
for s in segs:
    for w in s.words:
        print(f"{w.start:5.2f}-{w.end:5.2f} {w.word}")
r = librosa.feature.rms(y=y, frame_length=160, hop_length=160, center=False)[0]
db = 20 * np.log10(r + 1e-9)
for i in range(100, 200, 2):
    print(f"{i/100:.2f} {db[i]:6.1f}", end=" | " if i % 10 else "\n")
