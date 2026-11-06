#!/usr/bin/env bash
# finish.sh: turn raw.webm into a shareable MP4.
# Usage: finish.sh <outDir> [--voice voice.mp3] [--music bg.mp3] [--speed 1.25] [--title "My App"] [--vertical]
set -euo pipefail
DIR="$1"; shift
VOICE=""; MUSIC=""; SPEED="1"; TITLE=""; VERTICAL=0
while [ $# -gt 0 ]; do case "$1" in
  --voice) VOICE="$2"; shift 2;; --music) MUSIC="$2"; shift 2;;
  --speed) SPEED="$2"; shift 2;; --title) TITLE="$2"; shift 2;;
  --vertical) VERTICAL=1; shift;; *) echo "unknown flag $1"; exit 1;; esac; done

RAW="$DIR/raw.webm"; OUT="$DIR/demo.mp4"
[ -f "$RAW" ] || { echo "no $RAW"; exit 1; }

# 1) clean H.264 base, speed change, optional title card (first 2.5s)
VF="setpts=PTS/${SPEED},fps=30"
if [ -n "$TITLE" ]; then
  T=$(printf '%s' "$TITLE" | sed "s/'/\\\\'/g; s/:/\\\\:/g")
  VF="$VF,drawbox=x=0:y=0:w=iw:h=ih:color=black@0.82:t=fill:enable='lt(t,2.5)',drawtext=text='$T':fontcolor=white:fontsize=54:x=(w-tw)/2:y=(h-th)/2:enable='lt(t,2.5)'"
fi
if [ "$VERTICAL" = 1 ]; then
  # 9:16 for Shorts/Reels: blurred fill behind the centered landscape video
  VF="$VF,split[a][b];[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20[bg];[b]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2"
fi
ffmpeg -y -loglevel error -i "$RAW" -vf "$VF" -an -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p "$DIR/base.mp4"

# 2) audio: voiceover and/or music (music ducked to 15%), cut to video length
IN=(-i "$DIR/base.mp4"); MAP=(-map 0:v)
if [ -n "$VOICE" ] && [ -n "$MUSIC" ]; then
  IN+=(-i "$VOICE" -stream_loop -1 -i "$MUSIC")
  ffmpeg -y -loglevel error "${IN[@]}" -filter_complex "[2:a]volume=0.15[m];[1:a][m]amix=inputs=2:duration=first[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 160k -shortest "$OUT"
elif [ -n "$VOICE" ]; then
  ffmpeg -y -loglevel error "${IN[@]}" -i "$VOICE" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 160k -shortest "$OUT"
elif [ -n "$MUSIC" ]; then
  ffmpeg -y -loglevel error "${IN[@]}" -stream_loop -1 -i "$MUSIC" -filter_complex "[1:a]volume=0.25[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 160k -shortest "$OUT"
else
  cp "$DIR/base.mp4" "$OUT"
fi
rm -f "$DIR/base.mp4"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")
echo "{\"video\":\"$OUT\",\"seconds\":$DUR}"
