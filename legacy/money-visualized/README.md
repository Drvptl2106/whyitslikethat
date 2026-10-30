# Money, Visualized — Reel generator

Faceless Instagram Reels that turn money math into animated charts.

- `content/batch1.py` — video scripts. All numbers are computed in code, so the narration, charts and captions always agree.
- `engine/render.py` — renders each script to a 1080×1920, 30fps MP4. Voice is Kokoro TTS ([thewh1teagle/kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx)), running offline. Visuals are drawn with Pillow and encoded with ffmpeg.
- `output/` — finished `.mp4` files, plus a ready-to-paste `.caption.txt` for each.

## Render

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install kokoro-onnx soundfile pillow numpy num2words
cd models
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
cd ..
python engine/render.py content/batch1.py              # all videos
python engine/render.py content/batch1.py 02-start-at-25-vs-35   # one video
```

Scene types: `hook`, `counter`, `line`, `bars`, `text`. Each scene's `say` text is spoken; digits like `$152,000` and `8%` are converted to words for the voice, and the captions keep the digits.

Change the on-screen handle with `HANDLE` in the content file.
