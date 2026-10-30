"""Render a video spec (list of scenes) into a 1080x1920 Instagram Reel.

Each scene has narration (spoken by Kokoro TTS) and a visual type. Scene length
follows its narration, and the visual animates across that window.
"""
import math
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
W, H, FPS = 1080, 1920, 30
SR = 24000

BG = (11, 15, 20)
FG = (240, 244, 248)
MUTED = (130, 142, 158)
GRID = (36, 44, 56)
GREEN = (61, 220, 151)
RED = (255, 92, 92)
AMBER = (255, 200, 87)
BLUE = (92, 168, 255)
COLORS = {"green": GREEN, "red": RED, "amber": AMBER, "blue": BLUE, "muted": MUTED, "fg": FG}

FONT_DIR = "/usr/share/fonts/opentype/inter"
_font_cache = {}


def font(size, weight="Bold"):
    key = (size, weight)
    if key not in _font_cache:
        name = {"Black": "InterDisplay-Black", "Bold": "InterDisplay-Bold",
                "Semi": "InterDisplay-SemiBold", "Medium": "InterDisplay-Medium"}[weight]
        _font_cache[key] = ImageFont.truetype(f"{FONT_DIR}/{name}.otf", size)
    return _font_cache[key]


# ---------- easing / helpers ----------

def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def ease_out(t):
    return 1 - (1 - clamp(t)) ** 3


def ease_in_out(t):
    t = clamp(t)
    return 4 * t ** 3 if t < 0.5 else 1 - (-2 * t + 2) ** 3 / 2


def pop(t):
    """Scale-in with slight overshoot."""
    t = clamp(t)
    c = 1.70158
    return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2


def money(v, decimals=0):
    if decimals:
        return f"${v:,.{decimals}f}"
    return f"${round(v):,}"


def short_money(v):
    if abs(v) >= 1_000_000:
        return f"${v / 1_000_000:.2f}".rstrip("0").rstrip(".") + "M"
    if abs(v) >= 1_000:
        return f"${v / 1_000:.1f}".rstrip("0").rstrip(".") + "K"
    return f"${v:.0f}"


def nice_max(v, steps=4):
    """Round the axis max up so each of `steps` gridlines lands on a clean number."""
    raw = v / steps
    mag = 10 ** math.floor(math.log10(raw))
    for m in (1, 1.5, 2, 2.5, 3, 4, 5, 10):
        if raw <= m * mag:
            return m * mag * steps
    return 10 * mag * steps


def color(c):
    return COLORS.get(c, c) if isinstance(c, str) else tuple(c)


def with_alpha(c, a):
    return (*c[:3], int(255 * clamp(a)))


def text_center(d, cx, y, s, f, fill):
    w = d.textlength(s, font=f)
    d.text((cx - w / 2, y), s, font=f, fill=fill)


def wrap(d, s, f, max_w):
    words, lines, cur = s.split(), [], ""
    for wd in words:
        trial = f"{cur} {wd}".strip()
        if d.textlength(trial, font=f) <= max_w:
            cur = trial
        else:
            lines.append(cur)
            cur = wd
    if cur:
        lines.append(cur)
    return lines


# ---------- background ----------

def make_background():
    y, x = np.mgrid[0:H, 0:W]
    glow = np.exp(-(((x - W * 0.5) / 700) ** 2 + ((y - H * 0.38) / 800) ** 2))
    img = np.zeros((H, W, 3), np.float32)
    img[:] = BG
    img += glow[..., None] * np.array([10, 26, 22], np.float32)
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).convert("RGBA")


# ---------- scene renderers: draw(layer, t_local, dur, scene) ----------
# Content lives between y=230 and y=1380; captions sit at y≈1430; IG UI covers the bottom.

def draw_hook(im, t, dur, sc):
    d = ImageDraw.Draw(im)
    lines = sc["lines"]
    y = sc.get("y", 560)
    for i, ln in enumerate(lines):
        lt = (t - i * 0.35) / 0.4
        if lt <= 0:
            continue
        txt, c, size = (ln, FG, 104) if isinstance(ln, str) else (ln[0], color(ln[1]), ln[2] if len(ln) > 2 else 104)
        s = pop(lt)
        f = font(int(size * (0.6 + 0.4 * s)), "Black")
        for sub in wrap(d, txt, f, W - 140):
            text_center(d, W / 2, y + (1 - ease_out(lt)) * 40, sub, f, with_alpha(c, ease_out(lt)))
            y += int(size * 1.18)
        y += 24


def draw_counter(im, t, dur, sc):
    d = ImageDraw.Draw(im)
    k = ease_out(t / (dur * 0.7))
    a = ease_out(t / 0.3)
    text_center(d, W / 2, 520, sc["label"], font(54, "Semi"), with_alpha(MUTED, a))
    v = sc.get("from", 0) + (sc["to"] - sc.get("from", 0)) * k
    s = sc.get("prefix", "") + (money(v, sc.get("decimals", 0)) if sc.get("money", True) else f"{v:,.0f}") + sc.get("suffix", "")
    c = color(sc.get("color", "green"))
    f = font(190, "Black")
    while d.textlength(s, font=f) > W - 100:
        f = font(f.size - 8, "Black")
    text_center(d, W / 2, 640, s, f, with_alpha(c, a))
    if sc.get("sub"):
        st = ease_out((t - dur * 0.55) / 0.4)
        f2 = font(56, "Semi")
        y = 900
        for ln in wrap(d, sc["sub"], f2, W - 160):
            text_center(d, W / 2, y, ln, f2, with_alpha(FG, st))
            y += 72


def draw_line(im, t, dur, sc):
    d = ImageDraw.Draw(im)
    x0, x1, y0, y1 = 130, 940, 1250, 470
    series = sc["series"]
    n = len(series[0]["values"])
    vmax = nice_max(max(max(s["values"]) for s in series))
    a = ease_out(t / 0.3)
    text_center(d, W / 2, 270, sc["title"], font(62, "Black"), with_alpha(FG, a))
    if sc.get("subtitle"):
        text_center(d, W / 2, 350, sc["subtitle"], font(42, "Medium"), with_alpha(MUTED, a))
    for i in range(5):
        gy = y0 - (y0 - y1) * i / 4
        d.line([(x0, gy), (x1, gy)], fill=with_alpha(GRID, a), width=2)
        d.text((x0 - 18 - d.textlength(short_money(vmax * i / 4), font=font(30, "Medium")), gy - 18),
               short_money(vmax * i / 4), font=font(30, "Medium"), fill=with_alpha(MUTED, a))
    xl = sc.get("xlabels", (sc.get("x_start", 0), sc.get("x_end", n - 1)))
    d.text((x0, y0 + 20), str(xl[0]), font=font(34, "Semi"), fill=with_alpha(MUTED, a))
    d.text((x1 - d.textlength(str(xl[1]), font=font(34, "Semi")), y0 + 20), str(xl[1]), font=font(34, "Semi"), fill=with_alpha(MUTED, a))
    prog = ease_in_out((t - 0.3) / (dur * 0.75 - 0.3))
    pos = prog * (n - 1)
    label_slots = []
    for s in series:
        c = color(s["color"])
        vals = s["values"]
        pts = []
        for i in range(int(pos) + 1):
            pts.append((x0 + (x1 - x0) * i / (n - 1), y0 - (y0 - y1) * vals[i] / vmax))
        if pos < n - 1:
            i = int(pos)
            fr = pos - i
            v = vals[i] + (vals[i + 1] - vals[i]) * fr
            pts.append((x0 + (x1 - x0) * pos / (n - 1), y0 - (y0 - y1) * v / vmax))
        else:
            v = vals[-1]
        if len(pts) >= 2:
            d.polygon(pts + [(pts[-1][0], y0), (pts[0][0], y0)], fill=(*c, 28))
            d.line(pts, fill=c, width=9, joint="curve")
        if pts:
            px, py = pts[-1]
            d.ellipse([px - 14, py - 14, px + 14, py + 14], fill=c)
            label_slots.append([py, s, c, v, px])
    # keep end-labels from overlapping
    label_slots.sort(key=lambda r: r[0])
    for i in range(1, len(label_slots)):
        if label_slots[i][0] - label_slots[i - 1][0] < 70:
            label_slots[i][0] = label_slots[i - 1][0] + 70
    for py, s, c, v, px in label_slots:
        lab = money(v)
        f = font(46, "Black")
        lx = min(px + 24, W - 30 - d.textlength(lab, font=f))
        ly = py - 80 if px + 24 > W - 30 - d.textlength(lab, font=f) else py - 30
        d.text((lx, ly), lab, font=f, fill=c)
    # legend
    lx, ly = x0, 1340
    for s in series:
        c = color(s["color"])
        d.rounded_rectangle([lx, ly + 10, lx + 34, ly + 44], 8, fill=with_alpha(c, a))
        d.text((lx + 48, ly + 4), s["label"], font=font(38, "Semi"), fill=with_alpha(FG, a))
        lx += 48 + d.textlength(s["label"], font=font(38, "Semi")) + 60


def draw_bars(im, t, dur, sc):
    d = ImageDraw.Draw(im)
    a = ease_out(t / 0.3)
    text_center(d, W / 2, 270, sc["title"], font(62, "Black"), with_alpha(FG, a))
    if sc.get("subtitle"):
        text_center(d, W / 2, 350, sc["subtitle"], font(42, "Medium"), with_alpha(MUTED, a))
    bars = sc["bars"]
    vmax = max(sum(seg["value"] for seg in b["segments"]) for b in bars)
    nb = len(bars)
    base_y, top_y = 1230, 560
    bw = min(300, (W - 200) // nb - 60)
    gap = (W - nb * bw) / (nb + 1)
    for i, b in enumerate(bars):
        bt = ease_out((t - 0.3 - i * 0.5) / (dur * 0.45))
        bx = gap + i * (bw + gap)
        y = base_y
        total = 0
        for seg in b["segments"]:
            h = (base_y - top_y) * seg["value"] / vmax * bt
            c = color(seg["color"])
            if h > 1:
                d.rounded_rectangle([bx, y - h, bx + bw, y], 14, fill=c)
                if seg.get("label") and h > 70 and bt > 0.95:
                    f = font(32, "Bold")
                    for k, ln in enumerate([seg["label"], money(seg["value"])]):
                        text_center(d, bx + bw / 2, y - h / 2 - 38 + k * 40, ln, f, BG)
            y -= h
            total += seg["value"] * bt
        if bt > 0:
            f = font(54, "Black")
            s = money(total)
            while d.textlength(s, font=f) > bw + gap - 20:
                f = font(f.size - 4, "Black")
            text_center(d, bx + bw / 2, y - 76, s, f, color(b.get("color", "fg")))
        f = font(38, "Semi")
        for k, ln in enumerate(b["label"].split("\n")):
            text_center(d, bx + bw / 2, base_y + 22 + k * 46, ln, f, with_alpha(FG, a))


def draw_text(im, t, dur, sc):
    d = ImageDraw.Draw(im)
    y = sc.get("y", 600)
    for i, ln in enumerate(sc["lines"]):
        lt = (t - i * 0.45) / 0.45
        if lt <= 0:
            continue
        txt, c, size = (ln, FG, 84) if isinstance(ln, str) else (ln[0], color(ln[1]), ln[2] if len(ln) > 2 else 84)
        f = font(size, "Black")
        for sub in wrap(d, txt, f, W - 160):
            text_center(d, W / 2, y + (1 - ease_out(lt)) * 30, sub, f, with_alpha(c, ease_out(lt)))
            y += int(size * 1.2)
        y += 30


RENDERERS = {"hook": draw_hook, "counter": draw_counter, "line": draw_line, "bars": draw_bars, "text": draw_text}


# ---------- captions & chrome ----------

def caption_chunks(text, max_words=4):
    words = text.split()
    chunks, cur = [], []
    for w in words:
        cur.append(w)
        if len(cur) >= max_words or w[-1] in ".,?!:;":
            chunks.append(" ".join(cur))
            cur = []
    if cur:
        chunks.append(" ".join(cur))
    return chunks


def draw_caption(im, s):
    d = ImageDraw.Draw(im)
    f = font(58, "Black")
    tw = d.textlength(s, font=f)
    if tw > W - 120:
        f = font(48, "Black")
        tw = d.textlength(s, font=f)
    cx, cy = W / 2, 1450
    d.rounded_rectangle([cx - tw / 2 - 28, cy - 14, cx + tw / 2 + 28, cy + f.size + 22], 18, fill=(0, 0, 0, 170))
    d.text((cx - tw / 2, cy), s, font=f, fill=AMBER)


def draw_chrome(im, handle, frame_idx, total):
    d = ImageDraw.Draw(im)
    text_center(d, W / 2, 140, handle, font(36, "Semi"), with_alpha(MUTED, 0.9))
    # progress bar
    d.rectangle([0, 0, int(W * frame_idx / max(1, total - 1)), 8], fill=GREEN)


# ---------- TTS ----------

_kokoro = None


def speakable(text):
    """Turn "$152,000", "8%", "19 years" into words for the voice; captions keep the digits."""
    import re
    from num2words import num2words

    def words(n):
        return num2words(n).replace(",", "").replace("-", " ")

    text = re.sub(r"\$([\d,]+)", lambda m: words(int(m.group(1).replace(",", ""))) + " dollars", text)
    text = re.sub(r"(\d+)%", lambda m: words(int(m.group(1))) + " percent", text)
    return re.sub(r"\d[\d,]*", lambda m: words(int(m.group(0).replace(",", ""))), text)


def tts(text, voice, speed):
    global _kokoro
    text = speakable(text)
    if _kokoro is None:
        from kokoro_onnx import Kokoro
        _kokoro = Kokoro(str(ROOT / "models/kokoro-v1.0.onnx"), str(ROOT / "models/voices-v1.0.bin"))
    samples, sr = _kokoro.create(text, voice=voice, speed=speed, lang="en-us")
    assert sr == SR
    return samples.astype(np.float32)


# ---------- main render ----------

def render(spec, out_path):
    voice, speed = spec.get("voice", "am_michael"), spec.get("speed", 1.08)
    pad = 0.35
    audio_parts, timeline, t_cursor = [], [], 0.0
    for sc in spec["scenes"]:
        a = tts(sc["say"], voice, speed)
        # charts need time to draw even when the line of narration is short
        min_dur = sc.get("min_dur", 6.5 if sc["type"] == "line" else 0)
        dur = max(len(a) / SR + pad, min_dur)
        audio_parts.append(np.concatenate([a, np.zeros(int(dur * SR) - len(a), np.float32)]))
        # captions timed by character share within the spoken part
        chunks = caption_chunks(sc["say"])
        total_chars = sum(len(c) for c in chunks)
        spoken, ct, caps = len(a) / SR, t_cursor, []
        for c in chunks:
            cd = spoken * len(c) / total_chars
            caps.append((ct, ct + cd, c))
            ct += cd
        timeline.append((t_cursor, dur, sc, caps))
        t_cursor += dur
    tail = 0.6
    audio = np.concatenate(audio_parts + [np.zeros(int(tail * SR), np.float32)])
    total_t = t_cursor + tail
    build = ROOT / "build"
    build.mkdir(exist_ok=True)
    wav = build / (Path(out_path).stem + ".wav")
    sf.write(wav, audio, SR)

    nframes = int(total_t * FPS)
    bg = make_background()
    ff = subprocess.Popen(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
         "-i", "-", "-i", str(wav), "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(out_path)],
        stdin=subprocess.PIPE)
    for fi in range(nframes):
        t = fi / FPS
        im = bg.copy()
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        cur = None
        for start, dur, sc, caps in timeline:
            if start <= t < start + dur:
                cur = (start, dur, sc, caps)
        if cur is None:  # tail: hold last scene's final state
            start, dur, sc, caps = timeline[-1]
            lt = dur
        else:
            start, dur, sc, caps = cur
            lt = t - start
        RENDERERS[sc["type"]](layer, lt, dur, sc)
        # quick fade-in at each scene start
        if lt < 0.12 and cur is not None:
            layer.putalpha(layer.getchannel("A").point(lambda p: int(p * lt / 0.12)))
        im.alpha_composite(layer)
        for cs, ce, ctext in caps:
            if cs <= t < ce:
                draw_caption(im, ctext)
        draw_chrome(im, spec.get("handle", "@money.visualized"), fi, nframes)
        ff.stdin.write(im.convert("RGB").tobytes())
    ff.stdin.close()
    ff.wait()
    print(f"rendered {out_path} ({total_t:.1f}s)")
    return total_t


if __name__ == "__main__":
    import importlib.util
    spec_file = Path(sys.argv[1])
    m = importlib.util.spec_from_file_location("specs", spec_file)
    mod = importlib.util.module_from_spec(m)
    m.loader.exec_module(mod)
    only = sys.argv[2:]
    out = ROOT / "output"
    out.mkdir(exist_ok=True)
    for v in mod.VIDEOS:
        if only and v["slug"] not in only:
            continue
        render(v, out / f"{v['slug']}.mp4")
        if v.get("caption"):
            (out / f"{v['slug']}.caption.txt").write_text(v["caption"] + "\n")
