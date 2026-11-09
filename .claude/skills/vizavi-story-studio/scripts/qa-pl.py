import json, shutil, subprocess, pathlib
import cv2, numpy as np

root = pathlib.Path(__file__).resolve().parent.parent
ff = shutil.which("ffprobe") or root / "node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe"
p = root / "output/denis-maja-pl.mp4"

r = subprocess.run([str(ff), "-v", "error", "-show_streams", "-show_format", "-of", "json", str(p)],
                   capture_output=True, text=True, check=True)
info = json.loads(r.stdout)
v = next(x for x in info["streams"] if x["codec_type"] == "video")
a = next(x for x in info["streams"] if x["codec_type"] == "audio")

assert v["codec_name"] == "h264", v["codec_name"]
assert (v["width"], v["height"]) == (1080, 1920), (v["width"], v["height"])
assert v["avg_frame_rate"] == "30/1", v["avg_frame_rate"]
assert abs(float(info["format"]["duration"]) - 38.0) < 0.2, info["format"]["duration"]

cap = cv2.VideoCapture(str(p))
prev = None
diffs, means = [], []
count = 0
black = white = frozen = 0
while True:
    ok, frame = cap.read()
    if not ok:
        break
    small = cv2.resize(frame, (108, 192), interpolation=cv2.INTER_AREA).astype(np.int16)
    m = float(small.mean())
    means.append(m)
    if m < 8:
        black += 1
    if m > 247:
        white += 1
    if prev is not None:
        d = float(np.abs(small - prev).mean())
        diffs.append(d)
        if d < 0.05:
            frozen += 1
    prev = small
    count += 1
cap.release()

report = {
    "file": str(p),
    "duration": float(info["format"]["duration"]),
    "video_codec": v["codec_name"],
    "resolution": [v["width"], v["height"]],
    "fps": v["avg_frame_rate"],
    "frames_decoded": count,
    "audio_codec": a["codec_name"],
    "audio_channels": a["channels"],
    "audio_sample_rate": a["sample_rate"],
    "black_frames": black,
    "white_frames": white,
    "frozen_frames": frozen,
    "min_luma": round(min(means), 2),
    "max_luma": round(max(means), 2),
    "min_frame_diff": round(min(diffs), 4),
    "avg_frame_diff": round(float(np.mean(diffs)), 4),
    "file_size_mb": round(p.stat().st_size / 1e6, 2),
}
(root / "output/qa-pl.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf8")
print(json.dumps(report, ensure_ascii=False, indent=2))
assert count == 1140, f"expected 1140 frames, decoded {count}"
print("QA PASSED")
