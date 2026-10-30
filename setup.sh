#!/usr/bin/env bash
# One-time setup: Python venv, Node packages, Kokoro voice models, sound kit.
set -euo pipefail
cd "$(dirname "$0")"
python3 -m venv .venv
.venv/bin/pip install -q -r requirements.txt
npm install --silent
mkdir -p models
base=https://github.com/thewh1teagle/kokoro-onnx/releases/download
[ -f models/kokoro-v1.1-en.onnx ] || curl -sSL -o models/kokoro-v1.1-en.onnx $base/model-files-v1.1/kokoro-v1.0.onnx
[ -f models/voices-v1.0.bin ] || curl -sSL -o models/voices-v1.0.bin $base/model-files-v1.1/voices-v1.0.bin
# prep.py (v1 WhatsApp video) uses the older model without timings
[ -f models/kokoro-v1.0.onnx ] || curl -sSL -o models/kokoro-v1.0.onnx $base/model-files-v1.0/kokoro-v1.0.onnx
.venv/bin/python soundkit.py
echo "setup done"
