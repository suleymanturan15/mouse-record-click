#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/mouse-scheduler-macos"
npm install
npm run pack
echo "DMG ready under: mouse-scheduler-macos/release/"

