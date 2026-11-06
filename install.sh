#!/usr/bin/env bash
# Copies the three skills into ~/.hermes/skills and runs their setup.
set -euo pipefail
D="$(cd "$(dirname "$0")" && pwd)"
mkdir -p ~/.hermes/skills/{creative,software-development,media}
cp -r "$D/app-demo-recorder" ~/.hermes/skills/creative/
cp -r "$D/deep-build-plan" ~/.hermes/skills/software-development/
cp -r "$D/sayguard-voice" ~/.hermes/skills/media/
chmod +x ~/.hermes/skills/*/*/scripts/* 2>/dev/null || true
bash ~/.hermes/skills/creative/app-demo-recorder/scripts/setup.sh
bash ~/.hermes/skills/media/sayguard-voice/scripts/setup.sh
echo "Done. Restart Hermes: hermes gateway restart"
