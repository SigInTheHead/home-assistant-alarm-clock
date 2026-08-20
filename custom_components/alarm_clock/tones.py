"""Generate tiny original WAV assets without shipping third-party recordings."""
from __future__ import annotations
import io
import math
import wave

def wav_for(name: str) -> bytes:
    rate, seconds = 22050, 2.0
    frequencies = {"soft-beep": (660,), "soft-chime": (523, 659, 784), "gentle-alarm": (440, 554)}.get(name, (660,))
    frames = bytearray()
    for i in range(int(rate * seconds)):
        elapsed = i / rate
        envelope = min(1, elapsed * 12, (seconds - elapsed) * 5) * 0.18
        sample = sum(math.sin(2 * math.pi * f * elapsed) for f in frequencies) / len(frequencies)
        frames.extend(int(sample * envelope * 32767).to_bytes(2, "little", signed=True))
    output = io.BytesIO()
    with wave.open(output, "wb") as wav:
        wav.setparams((1, 2, rate, len(frames) // 2, "NONE", "not compressed")); wav.writeframes(frames)
    return output.getvalue()
