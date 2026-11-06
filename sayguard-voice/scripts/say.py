#!/usr/bin/env python3
"""SayGuard -> AssemblyAI TTS-1 for Hermes.

Default (Hermes TTS provider): stock voice, SayGuard-cleaned text.
Clone voice: only with --clone AND --consent "<the user's own words asking for it>".

  say.py --in text.txt --out reply.mp3                      # stock voice
  say.py --text "Hi" --out a.mp3 --clone --consent "say it in my voice"
"""
from __future__ import annotations
import argparse, json, os, pathlib, re, subprocess, sys, tempfile, time, datetime

ECHOPROOF = pathlib.Path(os.environ.get("SAYGUARD_HOME", "~/echoproof")).expanduser()
sys.path.insert(0, str(ECHOPROOF))
TTS_URL = "https://tts.us.assemblyai.com/v1/speech"
STOCK = os.environ.get("SAYGUARD_VOICE", "aai-audrey")
CLONE = os.environ.get("SAYGUARD_CLONE_VOICE", "cipoklean-voice")
LOG = pathlib.Path("~/.hermes/sayguard-voice.log").expanduser()
CHUNK = 1500

ap = argparse.ArgumentParser()
ap.add_argument("--in", dest="inp"); ap.add_argument("--text"); ap.add_argument("--out", required=True)
ap.add_argument("--locale", default=os.environ.get("SAYGUARD_LOCALE", "en-us"))
ap.add_argument("--voice", help="override stock voice (never the clone)")
ap.add_argument("--clone", action="store_true"); ap.add_argument("--consent", default="")
ap.add_argument("--language", default="english"); ap.add_argument("--raw", action="store_true", help="skip SayGuard")
a = ap.parse_args()

text = a.text if a.text is not None else pathlib.Path(a.inp).read_text(encoding="utf-8")
text = text.strip()
if not text:
    sys.exit("empty text")

if a.clone:
    if len(a.consent.strip()) < 6:
        sys.exit("REFUSED: clone voice needs --consent with the user's own request (e.g. 'say it in my voice').")
    voice = CLONE
elif a.voice:
    if a.voice == CLONE:
        sys.exit("REFUSED: use --clone --consent for the clone voice.")
    voice = a.voice
else:
    voice = STOCK

spoken, changes = text, []
if not a.raw:
    try:
        from sayguard.core import sanitize
        r = sanitize(text, a.locale, voice)
        spoken, changes = r.spoken, r.changes
    except Exception as e:  # never go silent because the guard broke; say so in the log
        changes = [{"kind": "sayguard_error", "why": str(e)[:200]}]

key = os.environ.get("ASSEMBLYAI_API_KEY", "")
if not key:
    sys.exit("ASSEMBLYAI_API_KEY missing (add it to ~/.hermes/.env and env_passthrough)")

import urllib.request, urllib.error
def tts(chunk: str, path: pathlib.Path):
    body = json.dumps({"text": chunk, "voice_id": voice, "language": a.language, "container": "wav", "stream": False}).encode()
    for attempt in range(4):
        req = urllib.request.Request(TTS_URL, data=body, method="POST",
                                     headers={"Authorization": key, "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                path.write_bytes(r.read()); return
        except urllib.error.HTTPError as e:
            if e.code in (429, 503):
                time.sleep(int(e.headers.get("Retry-After", 2)) + attempt); continue
            sys.exit(f"TTS {e.code}: {e.read()[:300]!r}")
    sys.exit("TTS retries exhausted")

# split on sentence ends so long replies stay under the request cap
parts, buf = [], ""
for s in re.split(r"(?<=[.!?])\s+", spoken):
    if len(buf) + len(s) > CHUNK and buf:
        parts.append(buf); buf = s
    else:
        buf = (buf + " " + s).strip()
if buf: parts.append(buf)

out = pathlib.Path(a.out).expanduser()
with tempfile.TemporaryDirectory() as td:
    wavs = []
    for i, p in enumerate(parts):
        w = pathlib.Path(td) / f"{i:03d}.wav"; tts(p, w); wavs.append(w)
    lst = pathlib.Path(td) / "list.txt"
    lst.write_text("".join(f"file '{w}'\n" for w in wavs))
    fmt = out.suffix.lstrip(".") or "mp3"
    codec = {"mp3": ["-c:a", "libmp3lame", "-b:a", "128k"], "ogg": ["-c:a", "libopus", "-b:a", "48k"],
             "opus": ["-c:a", "libopus", "-b:a", "48k"], "wav": [], "m4a": ["-c:a", "aac"]}.get(fmt, [])
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(lst), *codec, str(out)], check=True)

LOG.parent.mkdir(parents=True, exist_ok=True)
with LOG.open("a") as f:
    f.write(json.dumps({"at": datetime.datetime.now().isoformat(timespec="seconds"), "voice": voice,
                        "clone": a.clone, "consent": a.consent[:120], "chars": len(text),
                        "sayguard_changes": len(changes), "out": str(out)}) + "\n")
print(json.dumps({"out": str(out), "voice": voice, "sayguard_changes": changes[:10]}))
