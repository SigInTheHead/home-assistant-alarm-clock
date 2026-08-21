"""Generate five-minute looping original WAV alarm tones."""
from __future__ import annotations
import io
import math
import wave
from functools import lru_cache


TONE_DURATION_SECONDS = 300


@lru_cache(maxsize=None)
def wav_for(name: str) -> bytes:
    """Return a five-minute WAV made by repeating a short original tone."""
    # 8 kHz keeps the generated responses small enough to serve directly while
    # remaining more than adequate for simple alarm tones.
    rate, cycle_seconds = 8000, 2.0
    frequencies = {"soft-beep": (660,), "soft-chime": (523, 659, 784), "gentle-alarm": (440, 554)}.get(name, (660,))
    cycle = bytearray()
    for i in range(int(rate * cycle_seconds)):
        elapsed = i / rate
        envelope = min(1, elapsed * 12, (cycle_seconds - elapsed) * 5) * 0.18
        sample = sum(math.sin(2 * math.pi * f * elapsed) for f in frequencies) / len(frequencies)
        cycle.extend(int(sample * envelope * 32767).to_bytes(2, "little", signed=True))
    frames = cycle * (TONE_DURATION_SECONDS // int(cycle_seconds))
    output = io.BytesIO()
    with wave.open(output, "wb") as wav:
        wav.setparams((1, 2, rate, len(frames) // 2, "NONE", "not compressed")); wav.writeframes(frames)
    return output.getvalue()
