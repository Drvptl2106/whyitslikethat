# Why It's Like That: Reel studio

Generates faceless, animated Instagram Reels (1080×1920) explaining why everyday tech is the way it is.

The pipeline:
- **Script:** a JSON file with one entry per scene.
- **Voice:** Kokoro TTS with word-level timestamps.
- **Sound:** a signature sound kit, mixed and mastered to -14 LUFS.
- **Animation:** Remotion, with every animation timed to the word being spoken.

## Setup

```bash
./setup.sh
```

This creates the Python venv, installs the npm packages, downloads the Kokoro models into `models/` and builds the sound kit into `public/kit/`.

## Make a video

```bash
.venv/bin/python prep2.py videos/02-931gb.json
```

`prep2.py` generates `public/<id>/audio.wav` and `props.json`, which hold the voice, word timings, SFX mix and lip-sync envelope.

```bash
npx remotion render src/index.ts Why931 out/02-931gb.mp4 --props=public/02-931gb/props.json --concurrency=4 --crf=16
```

On machines without a system Chrome, add `--browser-executable=/path/to/chrome-headless-shell` to the render command. Preview in the browser with `npx remotion studio src/index.ts`.

## Layout

| Path | What |
|---|---|
| `videos/*.json` | Scripts. Per scene: `say` (narration; `1,024{ten twenty four}` sets a custom pronunciation while captions keep the digits), `keywords` (highlighted in captions) and `sfx` (`["@word", "sound", volume]`, timed to the word). |
| `prep2.py` | Voice, word alignment, scene timing, SFX mix, mastering and lip-sync data |
| `soundkit.py` | Builds the channel's signature sounds (`public/kit/`) |
| `src/why/kit.tsx` | Design system: colors, eased reveals, scene transitions, captions, panels, stamps |
| `src/why/Why931.tsx` | The "1TB shows 931GB" video |
| `src/why/Mascot.tsx` | v2 robot mascot (to be replaced by Dr. Actually, see `docs/plan-v3.md`) |
| `src/Reel.tsx`, `prep.py`, `videos/01-whatsapp.json` | v1 "Under the Hood" WhatsApp explainer (older pipeline) |
| `public/sfx/` | Pixabay-licensed SFX (see `CREDITS.md`), used as raw material for the kit |
| `docs/research-report.md` | Research on GitHub tooling for Instagram content agents |
| `docs/plan-v3.md` | Next version: Dr. Actually character, script v3, background image plan |
| `legacy/money-visualized/` | First prototype (finance data-viz reels, Pillow + ffmpeg) |

## Next steps (v3)

1. **ElevenLabs voice for Dr. Actually:** needs `ELEVENLABS_API_KEY` and `api.elevenlabs.io` allowed in the environment's network settings.
2. **Background images via Weave:** needs your Figma account linked at app.weavy.ai.
