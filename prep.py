"""Build the audio + timeline for one video spec.

voice (Kokoro, per sentence) -> word timings -> beats ("@word" anchors) -> SFX + music bed
-> public/<id>/audio.wav and public/<id>/props.json (fed to Remotion as input props).
"""
import json
import re
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro
from num2words import num2words

ROOT = Path(__file__).resolve().parent
MODELS = Path(__file__).resolve().parent / "models"
SR = 24000
FPS = 30
rng = np.random.default_rng(7)


def speakable(text):
    def words(n):
        return num2words(n).replace(",", "").replace("-", " ")
    text = re.sub(r"\$([\d,]+)", lambda m: words(int(m.group(1).replace(",", ""))) + " dollars", text)
    text = re.sub(r"(\d+)%", lambda m: words(int(m.group(1))) + " percent", text)
    return re.sub(r"\d[\d,]*", lambda m: words(int(m.group(0).replace(",", ""))), text)


def trim(a, thr=0.01):
    idx = np.where(np.abs(a) > thr)[0]
    return a if len(idx) == 0 else a[max(0, idx[0] - 240): idx[-1] + 480]


# ---------------- SFX (synthesised, no downloads) ----------------

def env(n, attack=0.005, release=0.1):
    t = np.arange(n) / SR
    return np.minimum(1, t / attack) * np.exp(-t / release)


def tone(freq, dur, release=0.15, attack=0.003):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = np.broadcast_to(freq, n) if np.ndim(freq) == 0 else freq
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, attack, release)


def noise(dur):
    return rng.standard_normal(int(dur * SR))


def lowpass(x, cutoff):
    cutoff = np.broadcast_to(cutoff, len(x))
    y, acc = np.empty_like(x), 0.0
    a = 1 - np.exp(-2 * np.pi * cutoff / SR)
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc)
        y[i] = acc
    return y


def add(*xs):
    """Sum clips of different lengths."""
    out = np.zeros(max(len(x) for x in xs))
    for x in xs:
        out[: len(x)] += x
    return out


def sfx_bank():
    n = lambda d: int(d * SR)
    b = {}
    # whoosh: noise through a sweeping lowpass, swelling then fading
    d = 0.55
    sweep = np.concatenate([np.linspace(300, 6000, n(d * 0.6)), np.linspace(6000, 800, n(d) - n(d * 0.6))])
    shape = np.sin(np.linspace(0, np.pi, n(d))) ** 2
    b["whoosh"] = lowpass(noise(d), sweep) * shape * 1.6
    b["tap"] = add(tone(1800, 0.06, 0.015) * 0.5, lowpass(noise(0.03), 4000) * env(n(0.03), 0.001, 0.008) * 0.6)
    b["pop"] = tone(np.linspace(900, 300, n(0.12)), 0.12, 0.05) * 0.7
    b["blip"] = tone(1320, 0.09, 0.04) * 0.35
    b["ding"] = (tone(1568, 0.7, 0.25) + 0.5 * tone(2349, 0.7, 0.18)) * 0.35
    b["success"] = np.concatenate([tone(1047, 0.12, 0.08), tone(1319, 0.12, 0.08), tone(1568, 0.5, 0.2)]) * 0.4
    b["error"] = (tone(220, 0.25, 0.12) + tone(233, 0.25, 0.12)) * 0.35
    b["lock"] = add(tone(np.linspace(180, 60, n(0.18)), 0.18, 0.07) * 0.9, lowpass(noise(0.05), 5000) * env(n(0.05), 0.001, 0.01) * 0.7)
    b["unlock"] = np.concatenate([b["lock"][: n(0.08)], tone(np.linspace(600, 1400, n(0.2)), 0.2, 0.08) * 0.4])
    g = np.concatenate([lowpass(noise(0.03), 7000) * (0.3 + 0.7 * rng.random()) for _ in range(9)])
    b["glitch"] = add(g * 0.6, tone(np.repeat(rng.choice([300, 800, 1500, 2400], 9), n(0.03)), len(g) / SR, 0.2) * 0.15)
    b["ticks"] = np.concatenate([np.concatenate([tone(2500, 0.03, 0.01), np.zeros(n(0.09))]) for _ in range(6)]) * 0.4
    b["powerdown"] = tone(np.linspace(600, 80, n(0.5)), 0.5, 0.3) * 0.45
    b["powerup"] = tone(np.linspace(120, 900, n(0.4)), 0.4, 0.4) * 0.35 * np.linspace(0.2, 1, n(0.4))
    d = 1.1
    b["riser"] = lowpass(noise(d), np.linspace(200, 9000, n(d))) * np.linspace(0, 1, n(d)) ** 2 * 1.2
    b["boom"] = add(tone(np.linspace(110, 35, n(0.9)), 0.9, 0.35) * 1.1, lowpass(noise(0.3), 900) * env(n(0.3), 0.002, 0.08) * 0.8)
    return {k: v.astype(np.float32) for k, v in b.items()}


# ---------------- music bed ----------------

def music(dur, bpm=100):
    n = int(dur * SR)
    t = np.arange(n) / SR
    beat = 60 / bpm
    out = np.zeros(n, np.float32)
    chords = [[220, 261.6, 329.6], [174.6, 220, 261.6], [130.8, 196, 261.6], [196, 246.9, 293.7]]  # Am F C G
    bar = beat * 4
    for i, start in enumerate(np.arange(0, dur, bar)):
        s, e = int(start * SR), min(n, int((start + bar) * SR))
        tt = t[s:e] - start
        pad = sum(np.sin(2 * np.pi * f * tt) + 0.5 * np.sin(2 * np.pi * f * 1.004 * tt) for f in chords[i % 4])
        out[s:e] += pad * np.minimum(1, tt / 0.4) * np.minimum(1, (bar - tt) / 0.3) * 0.05
        # arpeggio
        for k in range(8):
            ps = s + int(k * beat / 2 * SR)
            note = chords[i % 4][k % 3] * 2
            seg = tone(note, beat / 2, 0.12) * 0.07
            out[ps: ps + len(seg)] += seg[: max(0, min(len(seg), n - ps))]
    for start in np.arange(0, dur, beat):
        s = int(start * SR)
        k = tone(np.linspace(120, 45, int(0.25 * SR)), 0.25, 0.09) * 0.35
        out[s: s + len(k)] += k[: max(0, min(len(k), n - s))]
        hs = s + int(beat / 2 * SR)
        h = lowpass(noise(0.04), 8000) * env(int(0.04 * SR), 0.001, 0.01) * 0.05
        out[hs: hs + len(h)] += h[: max(0, min(len(h), n - hs))]
    return out


def main(spec_path):
    spec = json.loads(Path(spec_path).read_text())
    vid = spec["id"]
    out_dir = ROOT / "public" / vid
    out_dir.mkdir(parents=True, exist_ok=True)
    kokoro = Kokoro(str(MODELS / "kokoro-v1.0.onnx"), str(MODELS / "voices-v1.0.bin"))

    lead_in, gap_sent, gap_scene, tail = 0.15, 0.12, 0.28, 1.4
    voice, scenes, cursor = [np.zeros(int(lead_in * SR), np.float32)], [], lead_in
    for sc in spec["scenes"]:
        start = cursor
        words = []
        for sent in re.split(r"(?<=[.!?])\s+", sc["say"].strip()):
            a = trim(kokoro.create(speakable(sent), voice=spec["voice"], speed=spec["speed"], lang="en-us")[0])
            dur = len(a) / SR
            toks = sent.split()
            weights = [len(w) + (3 if w[-1] in ",.?!" else 0) + 1 for w in toks]
            tw, acc = sum(weights), 0
            for w, wt in zip(toks, weights):
                ws = cursor + dur * acc / tw
                acc += wt
                words.append({"w": w, "s": round(ws, 3), "e": round(cursor + dur * acc / tw, 3)})
            voice += [a, np.zeros(int(gap_sent * SR), np.float32)]
            cursor += dur + gap_sent
        voice.append(np.zeros(int(gap_scene * SR), np.float32))
        cursor += gap_scene
        beats = {}
        for name, val in sc.get("beats", {}).items():
            if isinstance(val, str) and val.startswith("@"):
                match = next((w for w in words if w["w"].strip(".,?!") == val[1:].strip(".,?!")), None)
                if match is None:
                    raise SystemExit(f"beat {name}: word {val} not in scene {sc['id']}")
                beats[name] = round(match["s"] - start, 3)
            else:
                beats[name] = val
        kw = {k.strip(".,?!").lower() for k in sc.get("keywords", [])}
        for w in words:
            w["k"] = w["w"].strip(".,?!").lower() in kw
        scenes.append({"id": sc["id"], "start": round(start, 3), "end": round(cursor, 3), "words": words,
                       "beats": beats, "sfx": sc.get("sfx", [])})
    total = cursor + tail
    vo = np.concatenate(voice)
    vo = np.pad(vo, (0, int(total * SR) - len(vo)))

    bank = sfx_bank()
    fx = np.zeros_like(vo)
    for sc in scenes:
        for beat, name in sc["sfx"]:
            s = int((sc["start"] + sc["beats"][beat]) * SR)
            clip = bank[name]
            # whooshes/risers peak at their end, so start them early
            if name in ("riser",):
                s -= len(clip)
            s = max(0, s)
            fx[s: s + len(clip)] += clip[: len(fx) - s]

    bed = music(total)
    # duck music under the voice
    envv = np.convolve(np.abs(vo), np.ones(2400) / 2400, mode="same")
    duck = 1 - 0.6 * np.clip(envv / 0.05, 0, 1)
    mix = vo * 1.0 + fx * 0.45 + bed * duck * 0.55
    mix = mix / max(1.0, np.max(np.abs(mix)) / 0.95)
    sf.write(out_dir / "audio.wav", mix.astype(np.float32), SR)

    props = {"id": vid, "title": spec["title"], "handle": spec.get("handle", "@underthehood.tech"),
             "durationInFrames": int(np.ceil(total * FPS)), "audio": f"{vid}/audio.wav", "scenes": scenes}
    (out_dir / "props.json").write_text(json.dumps(props, indent=1))
    (ROOT / "out").mkdir(exist_ok=True)
    (ROOT / "out" / f"{vid}.caption.txt").write_text(spec["caption"] + "\n")
    print(f"{vid}: {total:.1f}s, {len(scenes)} scenes")
    for sc in scenes:
        print(f"  {sc['id']:8s} {sc['start']:6.2f}-{sc['end']:6.2f}  beats={sc['beats']}")


if __name__ == "__main__":
    main(sys.argv[1])
