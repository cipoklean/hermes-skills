#!/usr/bin/env bash
# One-time: SayGuard on the Hermes VM + make it Hermes's TTS voice. Safe to re-run.
set -euo pipefail
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
command -v ffmpeg >/dev/null || { sudo apt-get update -y && sudo apt-get install -y ffmpeg; }
[ -d ~/echoproof/.git ] || git clone --depth 1 https://github.com/cipoklean/echoproof ~/echoproof
git -C ~/echoproof pull --ff-only || true
python3 -m venv ~/echoproof/.venv
~/echoproof/.venv/bin/pip install -q requests

grep -q '^ASSEMBLYAI_API_KEY=' ~/.hermes/.env 2>/dev/null || {
  read -rsp "Paste your AssemblyAI API key (hidden): " K; echo
  echo "ASSEMBLYAI_API_KEY=$K" >> ~/.hermes/.env; chmod 600 ~/.hermes/.env; }

cp ~/.hermes/config.yaml ~/.hermes/config.yaml.bak-sayguard
python3 - "$SKILL" <<'PY'
import sys, pathlib, re
skill = sys.argv[1]
p = pathlib.Path("~/.hermes/config.yaml").expanduser()
cfg = p.read_text()
block = f'''tts:
  provider: sayguard
  providers:
    sayguard:
      type: command
      command: "$HOME/echoproof/.venv/bin/python {skill}/scripts/say.py --in {{input_path}} --out {{output_path}}"
      output_format: mp3
      voice_compatible: true
      timeout: 120
      max_text_length: 4000
      env_passthrough: [ASSEMBLYAI_API_KEY, SAYGUARD_LOCALE]
'''
if re.search(r"^tts:", cfg, re.M):
    # replace the existing top-level tts: section
    cfg = re.sub(r"^tts:\n(?:[ \t]+.*\n|\n)*", block, cfg, count=1, flags=re.M)
else:
    cfg = cfg.rstrip("\n") + "\n\n" + block
p.write_text(cfg)
print("config.yaml: tts.provider = sayguard (backup: config.yaml.bak-sayguard)")
PY

set -a; . ~/.hermes/.env; set +a
~/echoproof/.venv/bin/python "$SKILL/scripts/say.py" --text "SayGuard voice is connected to Hermes." --out /tmp/sayguard-test.mp3
echo "Test audio: /tmp/sayguard-test.mp3. Restart Hermes (or: hermes gateway restart) to load the new voice."
