"""Built-in, five-minute looping alarm tones exposed through Media Source."""
from __future__ import annotations

from homeassistant.components.media_player import MediaClass, MediaType
from homeassistant.components.media_source import BrowseMediaSource, MediaSource, MediaSourceItem, PlayMedia, Unresolvable
from homeassistant.core import HomeAssistant

from .const import DOMAIN

TONES = {
    "soft-beep": ("Soft Beep", "soft-beep.wav"),
    "soft-chime": ("Soft Chime", "soft-chime.wav"),
    "gentle-alarm": ("Gentle Alarm", "gentle-alarm.wav"),
}

class MorningAlarmMediaSource(MediaSource):
    name = "Alarm Clock"
    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(DOMAIN); self.hass = hass
    async def async_resolve_media(self, item: MediaSourceItem) -> PlayMedia:
        tone = item.identifier
        if tone not in TONES: raise Unresolvable("Unknown Alarm Clock sound")
        # Version the resolved URL so players do not retain the former short
        # tone from the endpoint's cache.
        return PlayMedia(f"/api/alarm_clock/media/{tone}.wav?v=2", "audio/wav")
    async def async_browse_media(self, item: MediaSourceItem) -> BrowseMediaSource:
        if item.identifier: raise Unresolvable("Alarm Clock sounds have no subfolders")
        return BrowseMediaSource(domain=DOMAIN, identifier="", media_class=MediaClass.DIRECTORY, media_content_type=MediaType.MUSIC, title="Alarm Clock", can_play=False, can_expand=True, children=[
            BrowseMediaSource(domain=DOMAIN, identifier=key, media_class=MediaClass.MUSIC, media_content_type="audio/wav", title=title, can_play=True, can_expand=False) for key,(title, _) in TONES.items()
        ])

async def async_get_media_source(hass: HomeAssistant) -> MorningAlarmMediaSource:
    return MorningAlarmMediaSource(hass)
