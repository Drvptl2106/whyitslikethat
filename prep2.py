"""Voice + timing + SFX mix for a video spec, with word-accurate timestamps.

The whole script is synthesised in one continuous Kokoro pass (natural prosody),
phoneme timings give each caption word its exact start/end, scenes get a short
breath between them, SFX cues anchor to words ("@word"), and the mix is
mastered to Instagram loudness (-14 LUFS).

Writes public/<id>/audio.wav and public/<id>/props.json for Remotion.
"""
import difflib
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro
from num2words import num2words

ROOT = Path(__file__).resolve().parent
MODEL = str(Path(__file__).resolve().parent / "models" / "kokoro-v1.1-en.onnx")
VOICES = str(Path(__file__).resolve().parent / "models" / "voices-v1.0.bin")
SR = 48000
FPS = 30
SEPARATORS = set(" .,!?;:—…\"()")
TOKEN = re.compile(r"\S+?\{[^}]*\}\S*|\S+")
WHOOSHES = {"whoosh", "whoosh-short", "whoosh-cinematic", "swoosh", "swoosh-soft"}


def words(n):
    return num2words(n).replace(",", "").replace("-", " ")


def speakable(text):
    text = re.sub(r"(\d+)%", lambda m: words(int(m.group(1))) + " percent", text)
    return re.sub(r"\d[\d,]*", lambda m: words(int(m.group(0).replace(",", ""))), text)


def parse_token(tok):
    """'1,024{ten twenty four},' -> caption '1,024,' spoken 'ten twenty four,'"""
    m = re.fullmatch(r"(\S+?)\{([^}]*)\}(\S*)", tok)
    if m:
        return m.group(1) + m.group(3), m.group(2) + m.group(3)
    return tok, speakable(tok)


def phoneme_words(timings):
    out, cur = [], None
    for t in timings:
        if t.phoneme in SEPARATORS:
            if cur:
                out.append(cur)
                cur = None
            continue
        cur = [cur[0], t.end] if cur else [t.start, t.end]
    if cur:
        out.append(cur)
    return out


def align(kokoro, spoken_words, pw, ctx_phon):
    """Map each spoken word to a (start, end) span of the synthesised audio.

    espeak sometimes merges neighbouring words ("of the"), so the phoneme-word
    count can differ. Align per-word pronunciations against the in-context ones
    and split merged spans by phoneme length.
    """
    single = ["".join(x for x in kokoro.tokenizer.phonemize(w.strip(".,!?;:"), "en-us") if x not in SEPARATORS) for w in spoken_words]
    spans = [None] * len(spoken_words)
    sm = difflib.SequenceMatcher(a=single, b=ctx_phon, autojunk=False)
    for op, a0, a1, b0, b1 in sm.get_opcodes():
        if op == "equal":
            for k in range(a1 - a0):
                spans[a0 + k] = pw[b0 + k]
        elif a1 > a0:
            if b1 > b0:
                start, end = pw[b0][0], pw[b1 - 1][1]
            else:  # spoken word with no phonemes of its own: give it a sliver
                start = pw[b0 - 1][1] if b0 > 0 else 0.0
                end = start + 0.05
            lens = [max(1, len(single[i])) for i in range(a0, a1)]
            acc = 0
            for i, L in zip(range(a0, a1), lens):
                spans[i] = [start + (end - start) * acc / sum(lens), start + (end - start) * (acc + L) / sum(lens)]
                acc += L
    return spans


def main(spec_path):
    spec = json.loads(Path(spec_path).read_text())
    vid = spec["id"]
    out_dir = ROOT / "public" / vid
    out_dir.mkdir(parents=True, exist_ok=True)

    tokens = []  # (scene_index, caption, n_spoken_words)
    spoken_parts = []
    for si, sc in enumerate(spec["scenes"]):
        for tok in TOKEN.findall(sc["say"]):
            cap, spoken = parse_token(tok)
            n = len([w for w in re.split(r"\s+", spoken) if w.strip(".,!?;:")])
            tokens.append((si, cap, n))
            spoken_parts.append(spoken)
    text = " ".join(spoken_parts)

    kokoro = Kokoro(MODEL, VOICES)
    audio, sr, timings = kokoro.create_timed(text, voice=spec["voice"], speed=spec["speed"], continuous=True)
    pw = phoneme_words(timings)
    ctx_phon, cur = [], ""
    for t in timings:
        if t.phoneme in SEPARATORS:
            if cur:
                ctx_phon.append(cur)
            cur = ""
        else:
            cur += t.phoneme
    if cur:
        ctx_phon.append(cur)
    spoken_words = [w for p in spoken_parts for w in re.split(r"\s+", p) if w.strip(".,!?;:")]
    pw = align(kokoro, spoken_words, pw, ctx_phon)

    # caption words with exact times
    cap_words, i = [], 0
    for si, cap, n in tokens:
        cap_words.append({"scene": si, "w": cap, "s": pw[i][0], "e": pw[i + n - 1][1]})
        i += n

    # insert a breath between scenes; shift everything after it
    lead, breath, tail = 0.12, 0.3, 1.3
    voice = audio.astype(np.float32)
    pieces, shift, cursor = [np.zeros(int(lead * sr), np.float32)], lead, 0
    for si in range(1, len(spec["scenes"])):
        last = max(w["e"] for w in cap_words if w["scene"] == si - 1)
        first = min(w["s"] for w in cap_words if w["scene"] == si)
        cut = int((last + first) / 2 * sr)
        pieces += [voice[cursor:cut], np.zeros(int(breath * sr), np.float32)]
        for w in cap_words:
            if w["scene"] >= si:
                w["s"] += breath
                w["e"] += breath
        cursor = cut
    pieces += [voice[cursor:], np.zeros(int(tail * sr), np.float32)]
    for w in cap_words:
        w["s"] = round(w["s"] + shift, 3)
        w["e"] = round(w["e"] + shift, 3)
    voice = np.concatenate(pieces)
    total = len(voice) / sr

    # scenes span from the midpoint of the gap before them to the midpoint after
    scenes = []
    for si, sc in enumerate(spec["scenes"]):
        ws = [w for w in cap_words if w["scene"] == si]
        kw = {k.strip(".,!?").lower() for k in sc.get("keywords", [])}
        for w in ws:
            w["k"] = w["w"].strip(".,!?").lower() in kw
        scenes.append({"id": sc["id"], "words": [{k: w[k] for k in ("w", "s", "e", "k")} for w in ws]})
    for si, sc in enumerate(scenes):
        sc["start"] = 0.0 if si == 0 else round((scenes[si - 1]["words"][-1]["e"] + sc["words"][0]["s"]) / 2, 3)
    for si, sc in enumerate(scenes):
        sc["end"] = scenes[si + 1]["start"] if si + 1 < len(scenes) else round(total, 3)

    # voice: resample to 48k, clean up low rumble, gentle compression
    raw = ROOT / "build" / f"{vid}-voice24.wav"
    raw.parent.mkdir(exist_ok=True)
    sf.write(raw, voice, sr)
    clean = ROOT / "build" / f"{vid}-voice48.wav"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(raw), "-af",
                    "aresample=48000:resampler=soxr,highpass=f=75,acompressor=threshold=-20dB:ratio=3:attack=5:release=80,"
                    "equalizer=f=3500:t=q:w=1.2:g=1.5",
                    "-ac", "1", str(clean)], check=True)
    vo, _ = sf.read(clean, dtype="float32")

    # per-frame mouth openness for the mascot's lip-sync (smoothed voice envelope)
    hop = SR // FPS
    rms = np.array([np.sqrt(np.mean(vo[i:i + hop] ** 2)) for i in range(0, len(vo), hop)])
    rms = np.convolve(rms, [0.25, 0.5, 0.25], mode="same")
    mouth = np.clip(rms / (np.percentile(rms[rms > 1e-4], 90) + 1e-9), 0, 1)
    mouth[rms < 0.004] = 0

    # SFX, anchored to words
    fx = np.zeros((len(vo), 2), np.float32)
    for si, sc in enumerate(spec["scenes"]):
        for anchor, name, vol in sc.get("sfx", []):
            if isinstance(anchor, str) and anchor.startswith("@"):
                match = next((w for w in scenes[si]["words"] if w["w"].strip(".,!?") == anchor[1:].strip(".,!?")), None)
                if match is None:
                    raise SystemExit(f"sfx anchor {anchor} not found in scene {sc['id']}")
                at = match["s"]
            else:
                at = scenes[si]["start"] + anchor
            if name in WHOOSHES:
                at -= 0.18  # whooshes peak a beat after they start
            src = ROOT / "public" / "kit" / f"{name}.wav"
            if not src.exists():
                src = ROOT / "public" / "sfx" / f"{name}.wav"
            clip, csr = sf.read(src, dtype="float32")
            assert csr == SR
            if clip.ndim == 1:
                clip = np.stack([clip, clip], 1)
            s = max(0, int(at * SR))
            n = min(len(clip), len(fx) - s)
            fx[s:s + n] += clip[:n] * vol * 0.55

    mix = np.stack([vo, vo], 1) + fx
    premaster = ROOT / "build" / f"{vid}-premaster.wav"
    sf.write(premaster, mix, SR)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(premaster), "-af",
                    "loudnorm=I=-14:TP=-1.5:LRA=11,alimiter=limit=0.85", "-ar", "48000",
                    str(out_dir / "audio.wav")], check=True)

    props = {"id": vid, "handle": spec.get("handle", ""), "durationInFrames": int(np.ceil(total * FPS)),
             "audio": f"{vid}/audio.wav", "scenes": scenes, "mouth": [round(float(m), 2) for m in mouth]}
    (out_dir / "props.json").write_text(json.dumps(props, indent=1))
    (ROOT / "out").mkdir(exist_ok=True)
    (ROOT / "out" / f"{vid}.caption.txt").write_text(spec["caption"] + "\n")
    print(f"{vid}: {total:.1f}s")
    for sc in scenes:
        print(f"  {sc['id']:7s} {sc['start']:6.2f}-{sc['end']:6.2f}  " + " ".join(f"{w['w']}@{w['s']:.2f}" for w in sc["words"][:6]))


if __name__ == "__main__":
    main(sys.argv[1])
