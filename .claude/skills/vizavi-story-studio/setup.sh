#!/usr/bin/env bash
# Installs everything the Vizavi Story Studio skill needs to render 9:16 cartoons.
set -euo pipefail
cd "$(dirname "$0")"

command -v ffmpeg >/dev/null || { apt-get update -y && apt-get install -y ffmpeg; }
npm ci --no-audit --no-fund
python3 -m pip install -q --user --break-system-packages -r requirements-audio.txt
npx remotion browser ensure
