"""Authenticated endpoint serving generated alarm tones."""
from __future__ import annotations
from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from .media_source import TONES
from .tones import wav_for

class MorningAlarmToneView(HomeAssistantView):
    url = "/api/morning_alarm/media/{tone}.wav"
    name = "api:morning_alarm:media"
    requires_auth = False
    async def get(self, request, tone: str):
        if tone not in TONES: raise web.HTTPNotFound()
        return web.Response(body=wav_for(tone), content_type="audio/wav", headers={"Cache-Control": "public, max-age=86400"})
