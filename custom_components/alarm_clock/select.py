"""Dropdown entities for the built-in pre-alarm tones."""
from __future__ import annotations

from typing import Any

from homeassistant.components.select import SelectEntity

from .const import (
    CONF_FOLLOWUP_PRE_MEDIA,
    CONF_PRIMARY_PRE_MEDIA,
    DATA_COORDINATOR,
    DOMAIN,
    PRE_ALARM_TONES,
)
from .entity import MorningAlarmEntity


class AlarmToneSelect(MorningAlarmEntity, SelectEntity):
    """Choose one of the integration's bundled looping pre-alarm tones."""

    _attr_options = list(PRE_ALARM_TONES)

    @property
    def current_option(self) -> str:
        value: Any = self.coordinator.options[self.key]
        if isinstance(value, dict):
            value = value.get("media_content_id")
        return next(
            (label for label, media_id in PRE_ALARM_TONES.items() if media_id == value),
            next(iter(PRE_ALARM_TONES)),
        )

    async def async_select_option(self, option: str) -> None:
        await self.coordinator.async_set_option(self.key, PRE_ALARM_TONES[option])


async def async_setup_entry(hass, entry, async_add_entities):
    coordinator = hass.data[DOMAIN][entry.entry_id][DATA_COORDINATOR]
    async_add_entities([
        AlarmToneSelect(coordinator, CONF_PRIMARY_PRE_MEDIA, "Primary pre-alarm tone"),
        AlarmToneSelect(coordinator, CONF_FOLLOWUP_PRE_MEDIA, "Follow-up pre-alarm tone"),
    ])
