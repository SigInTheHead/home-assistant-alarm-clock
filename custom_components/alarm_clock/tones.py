"""Generate five-minute looping original WAV alarm tones."""
from __future__ import annotations

import io
import math
import wave
from functools import lru_cache


TONE_DURATION_SECONDS = 300
TONE_RATE = 8000
TONE_CYCLE_SECONDS = 2


def _sine(frequency: float, elapsed: float) -> float:
    return math.sin(2 * math.pi * frequency * elapsed)


def _square(frequency: float, elapsed: float) -> float:
    """A softened square wave gives the urgent tones some edge."""
    return math.tanh(_sine(frequency, elapsed) * 4)


def _fade(elapsed: float, start: float, end: float) -> float:
    """Return a short attack/release envelope for a tone window."""
    if elapsed < start or elapsed >= end:
        return 0
    return min(1, (elapsed - start) * 30, (end - elapsed) * 18)


def _sample_for(name: str, elapsed: float) -> float:
    """Return one sample from a distinctive two-second alarm pattern."""
    if name == "soft-beep":
        # Kept familiar, but raised from the former very quiet 18% level.
        return _sine(720, elapsed) * _fade(elapsed, 0, 0.40) * 0.68
    if name == "soft-chime":
        envelope = _fade(elapsed, 0, 1.35) * math.exp(-elapsed * 1.35)
        return (_sine(523, elapsed) + _sine(659, elapsed) + _sine(784, elapsed)) / 3 * envelope * 0.82
    if name == "gentle-alarm":
        frequency = 494 if int(elapsed * 2) % 2 == 0 else 622
        return _sine(frequency, elapsed) * _fade(elapsed, 0, 1.0) * 0.72
    if name == "double-beep":
        envelope = _fade(elapsed, 0.08, 0.30) + _fade(elapsed, 0.46, 0.70)
        return _sine(820, elapsed) * envelope * 0.82
    if name == "rising-pulse":
        pulse = elapsed % 0.80
        return _sine(480 + pulse * 1150, elapsed) * _fade(pulse, 0, 0.54) * 0.82
    if name == "digital-alarm":
        pulse = elapsed % 0.50
        envelope = _fade(pulse, 0, 0.32)
        return (_square(880, elapsed) * 0.7 + _sine(1320, elapsed) * 0.3) * envelope * 0.78
    if name == "urgent-tone":
        frequency = 880 if int(elapsed * 2) % 2 == 0 else 1120
        return (_square(frequency, elapsed) * 0.75 + _sine(frequency * 0.5, elapsed) * 0.25) * 0.82
    if name == "high-alert":
        pulse = elapsed % 0.34
        return _square(1450, elapsed) * _fade(pulse, 0, 0.20) * 0.78
    if name == "klaxon":
        frequency = 520 + 260 * _sine(0.5, elapsed)
        return (_sine(frequency, elapsed) * 0.7 + _square(frequency * 0.5, elapsed) * 0.3) * 0.86
    if name == "rapid-beep":
        pulse = elapsed % 0.25
        return _square(1050, elapsed) * _fade(pulse, 0, 0.13) * 0.80
    # The route rejects unknown names. Keep a safe fallback for direct callers.
    return _sine(720, elapsed) * _fade(elapsed, 0, 0.40) * 0.68


@lru_cache(maxsize=None)
def wav_for(name: str) -> bytes:
    """Return a five-minute WAV made by repeating a short original tone."""
    cycle = bytearray()
    for i in range(TONE_RATE * TONE_CYCLE_SECONDS):
        sample = max(-0.98, min(0.98, _sample_for(name, i / TONE_RATE)))
        cycle.extend(int(sample * 32767).to_bytes(2, "little", signed=True))

    frames = cycle * (TONE_DURATION_SECONDS // TONE_CYCLE_SECONDS)
    output = io.BytesIO()
    with wave.open(output, "wb") as wav:
        wav.setparams((1, 2, TONE_RATE, len(frames) // 2, "NONE", "not compressed"))
        wav.writeframes(frames)
    return output.getvalue()
