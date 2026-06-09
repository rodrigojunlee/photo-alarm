"""Generate bundled alarm and keep-alive WAV files (stdlib only)."""
import math
import struct
import wave
from pathlib import Path

SAMPLE_RATE = 44100
OUT = Path(__file__).resolve().parent.parent / "assets" / "sounds"


def write_wav(path: Path, samples):
    with wave.open(str(path), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        frames = b"".join(struct.pack("<h", max(-32767, min(32767, int(s)))) for s in samples)
        wf.writeframes(frames)


def sine_tone(freq, duration, volume=0.5):
    total = int(SAMPLE_RATE * duration)
    return [volume * 32767 * math.sin(2 * math.pi * freq * i / SAMPLE_RATE) for i in range(total)]


def silence(duration):
  total = int(SAMPLE_RATE * duration)
  return [0.0] * total


def envelope(samples, attack=0.01, release=0.02):
    n = len(samples)
    a = int(SAMPLE_RATE * attack)
    r = int(SAMPLE_RATE * release)
    out = list(samples)
    for i in range(min(a, n)):
        out[i] *= i / max(a, 1)
    for i in range(min(r, n)):
        out[n - 1 - i] *= i / max(r, 1)
    return out


def classic_alarm():
    samples = []
    for _ in range(8):
        samples.extend(envelope(sine_tone(880, 0.18, 0.55)))
        samples.extend(silence(0.12))
        samples.extend(envelope(sine_tone(660, 0.18, 0.55)))
        samples.extend(silence(0.12))
    return samples


def radar_alarm():
    samples = []
    steps = 24
    for i in range(steps):
        freq = 440 + (i / steps) * 880
        samples.extend(envelope(sine_tone(freq, 0.09, 0.5)))
        samples.extend(silence(0.03))
    samples.extend(silence(0.2))
    return samples * 3


def bells_alarm():
    samples = []
    pattern = [(523, 0.25), (659, 0.25), (784, 0.35), (0, 0.15)]
    for _ in range(4):
        for freq, dur in pattern:
            if freq:
                samples.extend(envelope(sine_tone(freq, dur, 0.45)))
            else:
                samples.extend(silence(dur))
    return samples


def silence_loop():
    # Near-silent carrier keeps iOS audio route active better than pure zeros.
    samples = []
    for _ in range(30):
        samples.extend(envelope(sine_tone(190, 0.08, 0.008)))
        samples.extend(silence(0.92))
    return samples


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    write_wav(OUT / "alarm-classic.wav", classic_alarm())
    write_wav(OUT / "alarm-radar.wav", radar_alarm())
    write_wav(OUT / "alarm-bells.wav", bells_alarm())
    write_wav(OUT / "silence-loop.wav", silence_loop())
    print("Wrote sounds to", OUT)


if __name__ == "__main__":
    main()
