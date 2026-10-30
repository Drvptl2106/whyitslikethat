"""Build the channel's signature sound kit -> public/kit/*.wav (48 kHz stereo).

Mix of original synthesis (modal marimba, bubble pops, woodblock ticks, the
mascot's chirps) and heavily processed library hits (re-pitched, layered,
re-verbed) so nothing sounds like the stock pack it came from. Everything sits
in E major pentatonic so tonal cues agree with each other.
"""
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent
SR = 48000
LIB = ROOT / "public" / "sfx"
OUT = ROOT / "public" / "kit"
rng = np.random.default_rng(42)

NOTE = {"E4": 329.63, "G#4": 415.30, "B4": 493.88, "C#5": 554.37, "E5": 659.26, "G#5": 830.61, "B5": 987.77, "E6": 1318.5}


def t_(dur):
    return np.arange(int(dur * SR)) / SR


def fade(x, ms=4):
    n = min(len(x) // 2, int(ms / 1000 * SR))
    x = x.copy()
    x[:n] *= np.linspace(0, 1, n)
    x[-n:] *= np.linspace(1, 0, n)
    return x


def onepole_lp(x, cutoff):
    a = 1 - np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc += a * (v - acc)
        y[i] = acc
    return y


def bandpass(x, lo, hi):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))


def reverb_ir(dur=1.4, damp=4500):
    """Synthetic stereo room: decaying filtered noise with a little pre-delay."""
    n = int(dur * SR)
    env = np.exp(-np.arange(n) / SR * 5.5)
    ir = np.stack([onepole_lp(rng.standard_normal(n), damp) * env for _ in range(2)], 1)
    ir[: int(0.012 * SR)] = 0
    return ir / np.sqrt((ir ** 2).sum())


IR = reverb_ir()


def verb(x, wet=0.25):
    """x mono or stereo -> stereo with reverb tail."""
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    n = len(x) + len(IR) - 1
    out = np.zeros((n, 2))
    for c in range(2):
        out[:, c] = np.fft.irfft(np.fft.rfft(x[:, c], n) * np.fft.rfft(IR[:, c], n), n)
    dry = np.zeros((n, 2))
    dry[: len(x)] = x
    return dry * (1 - wet) + out * wet * 3


def pan(x, p):
    """p in [-1, 1] constant power; p may be an array (auto-pan)."""
    th = (np.asarray(p) + 1) * np.pi / 4
    return np.stack([x * np.cos(th), x * np.sin(th)], 1)


def load(name, semitones=0.0):
    x, sr = sf.read(LIB / f"{name}.wav", dtype="float64")
    x = x.mean(1) if x.ndim == 2 else x
    if semitones:
        ratio = 2 ** (semitones / 12)
        idx = np.arange(0, len(x) - 1, ratio)
        x = np.interp(idx, np.arange(len(x)), x)
    return x


def mix(*xs):
    xs = [x if x.ndim == 2 else np.stack([x, x], 1) for x in xs]
    out = np.zeros((max(len(x) for x in xs), 2))
    for x in xs:
        out[: len(x)] += x
    return out


def marimba(f, dur=0.9, vel=1.0):
    t = t_(dur)
    partials = [(1, 1.0, 3.2), (3.93, 0.35, 9), (9.54, 0.12, 18)]
    x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d) for r, a, d in partials)
    x += 0.4 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 6)
    click = bandpass(rng.standard_normal(len(t)), 2000, 7000) * np.exp(-t * 400) * 0.15
    return fade((x + click) * vel)


def bubble(f0=950, f1=380, dur=0.09):
    t = t_(dur)
    f = f1 + (f0 - f1) * np.exp(-t * 55)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 38)
    return fade(x)


def woodblock(f=1850, dur=0.08):
    t = t_(dur)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 70) + 0.5 * np.sin(2 * np.pi * f * 1.48 * t) * np.exp(-t * 95)
    x += bandpass(rng.standard_normal(len(t)), 3000, 9000) * np.exp(-t * 600) * 0.3
    return fade(x)


def norm(x, peak=0.9):
    return x / (np.abs(x).max() + 1e-9) * peak


def build():
    OUT.mkdir(parents=True, exist_ok=True)
    kit = {}

    # air swoosh: re-pitched library whoosh + band-swept pink-ish noise, panned left->right
    base = load("whoosh-short", -4)
    n = int(0.55 * SR)
    noise = onepole_lp(rng.standard_normal(n), 2500) * np.sin(np.linspace(0, np.pi, n)) ** 3
    sw = mix(pan(base, np.linspace(-0.6, 0.6, len(base))) * 0.8, pan(noise, np.linspace(-0.8, 0.8, n)) * 0.9)
    kit["swoosh"] = verb(sw, 0.2)
    kit["swoosh-soft"] = verb(pan(noise, np.linspace(0.5, -0.5, n)) * 0.7, 0.3)

    # pops / ticks (original)
    kit["pop"] = verb(mix(pan(bubble(), -0.15), pan(bubble(1300, 600, 0.06) * 0.4, 0.2)), 0.18)
    kit["pop-lo"] = verb(bubble(620, 240, 0.12), 0.18)
    kit["tick"] = verb(woodblock(), 0.15)
    kit["tick-hi"] = verb(woodblock(2600, 0.06) * 0.8, 0.15)

    # tonal cues in E pentatonic
    kit["note-up"] = verb(mix(marimba(NOTE["B4"], 0.6), np.pad(marimba(NOTE["E5"], 0.8), (int(0.07 * SR), 0))), 0.3)
    kit["note-down"] = verb(mix(marimba(NOTE["E5"], 0.6), np.pad(marimba(NOTE["B4"], 0.8), (int(0.08 * SR), 0))), 0.3)
    kit["ding"] = verb(mix(marimba(NOTE["G#5"], 1.2), marimba(NOTE["E6"], 1.0, 0.3)), 0.35)
    kit["wrong"] = verb(mix(marimba(NOTE["E4"] * 0.94, 0.5), np.pad(marimba(NOTE["E4"] * 0.89, 0.7), (int(0.11 * SR), 0))), 0.25)

    # sonic logo: E5 G#5 B5 E6 rising + shimmer
    logo = mix(*[np.pad(marimba(NOTE[n], 1.2, v), (int(i * 0.085 * SR), 0)) for i, (n, v) in enumerate([("E5", 0.8), ("G#5", 0.85), ("B5", 0.9), ("E6", 1.0)])])
    shimmer = load("sparkle", 5)[: int(1.4 * SR)] * 0.25
    kit["logo"] = verb(mix(logo, shimmer), 0.4)

    # impacts: re-pitched library hit + sub + body thump
    t = t_(1.2)
    sub = np.sin(2 * np.pi * np.cumsum(70 * np.exp(-t * 2) + 38) / SR) * np.exp(-t * 3.2)
    kit["impact"] = verb(mix(load("impact-bass-1", -3) * 0.7, sub * 0.9, bubble(220, 90, 0.2) * 0.6), 0.22)
    kit["impact-soft"] = verb(mix(sub * 0.7, marimba(NOTE["E4"] / 2, 1.0, 0.5)), 0.3)

    # glitch: chopped + re-pitched library glitch, stuttered
    g = load("glitch-3", 3)[: int(0.5 * SR)]
    chops = np.concatenate([g[i * 2400: i * 2400 + 1800] * (0.6 + 0.4 * rng.random()) for i in range(6)])
    kit["glitch"] = verb(fade(chops), 0.15)

    # typing burst with randomised key pitch
    key = load("key-press")
    burst = np.zeros(int(1.0 * SR))
    for i in range(9):
        k = load("key-press", rng.uniform(-3, 3)) * rng.uniform(0.5, 1.0)
        s = int(i * 0.1 * SR + rng.uniform(0, 0.02) * SR)
        burst[s: s + len(k)] += k[: len(burst) - s]
    kit["typing"] = verb(burst, 0.12)
    kit["key"] = verb(key, 0.12)

    # mouse click (re-pitched library click + woodblock body)
    kit["click"] = verb(mix(load("click-soft", 2) * 0.8, woodblock(1400, 0.04) * 0.3), 0.12)

    # mascot chirps: little robot "boop-beep" phrases
    def chirp(seq, step=0.075):
        out = np.zeros(int((len(seq) * step + 0.15) * SR))
        for i, (fa, fb) in enumerate(seq):
            tt = t_(step * 1.1)
            f = np.linspace(fa, fb, len(tt))
            v = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.25 * np.sin(4 * np.pi * np.cumsum(f) / SR)
            v *= np.sin(np.linspace(0, np.pi, len(tt))) ** 0.6
            s = int(i * step * SR)
            out[s: s + len(v)] += v
        return out

    kit["bot-hello"] = verb(chirp([(900, 1400), (1400, 1100), (1100, 1800)]) * 0.6, 0.2)
    kit["bot-hmm"] = verb(chirp([(700, 600), (650, 900)], 0.11) * 0.6, 0.2)
    kit["bot-aha"] = verb(chirp([(800, 1600), (1600, 2000)], 0.06) * 0.6, 0.2)

    for name, x in kit.items():
        x = x if x.ndim == 2 else np.stack([x, x], 1)
        sf.write(OUT / f"{name}.wav", norm(x).astype(np.float32), SR)
    print("kit:", ", ".join(sorted(kit)))


if __name__ == "__main__":
    build()
