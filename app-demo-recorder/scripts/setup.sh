#!/usr/bin/env bash
# One-time setup on the Hermes VM (Ubuntu, ARM64 or x86). Safe to re-run.
set -euo pipefail
cd "$(dirname "$0")"
command -v ffmpeg >/dev/null || { sudo apt-get update -y && sudo apt-get install -y ffmpeg fonts-dejavu-core; }
command -v node >/dev/null || { echo "Node.js 18+ is required"; exit 1; }
[ -f package.json ] || npm init -y >/dev/null
npm install --no-audit --no-fund playwright@1.58 >/dev/null
sudo npx playwright install-deps chromium
npx playwright install chromium
node -e "const {chromium}=require('playwright');chromium.launch().then(b=>{console.log('app-demo-recorder ready');return b.close()})"
