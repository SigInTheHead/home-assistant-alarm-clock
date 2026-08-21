"""Shared entity helpers."""
from __future__ import annotations

from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity import Entity

from .const import (
    CONF_DAY_ENABLED,
    CONF_DAY_TIMES,
    CONF_MINUTE_GRANULARITY,
    CONF_PRIMARY_MAIN_MEDIA,
    CONF_FOLLOWUP_MAIN_MEDIA,
    CONF_NAME,
    CONF_OVERRIDE_TIME,
    CONF_SATURDAY_TIME,
    CONF_SCHEDULE_MODE,
    CONF_SUNDAY_TIME,
    CONF_WEEKDAY_TIME,
    DOMAIN,
)

class MorningAlarmEntity(Entity):
    """Entity attached to exactly one alarm device."""
    _attr_has_entity_name = True

    def __init__(self, coordinator, key: str, name: str) -> None:
        self.coordinator = coordinator
        self.key = key
        self._attr_unique_id = f"{coordinator.entry.entry_id}_{key}"
        self._attr_name = name
        self._unsub = None

    @property
    def device_info(self) -> DeviceInfo:
        return DeviceInfo(identifiers={(DOMAIN, self.coordinator.entry.entry_id)}, name=f"Alarm Clock - {self.coordinator.entry.data[CONF_NAME]}", manufacturer="Alarm Clock", model="Alarm Clock")

    @property
    def extra_state_attributes(self):
        """Allow optional cards to discover sibling entities without hard-coded IDs."""
        return {
            "alarm_clock_entry_id": self.coordinator.entry.entry_id,
            "alarm_clock_key": self.key,
            "minute_granularity": self.coordinator.options[CONF_MINUTE_GRANULARITY],
            CONF_SCHEDULE_MODE: self.coordinator.options[CONF_SCHEDULE_MODE],
            CONF_DAY_TIMES: self.coordinator.options[CONF_DAY_TIMES],
            CONF_DAY_ENABLED: self.coordinator.options[CONF_DAY_ENABLED],
            # Let summary cards render the core schedule from their configured
            # root entity even while Home Assistant is loading sibling entities.
            CONF_WEEKDAY_TIME: self.coordinator.options[CONF_WEEKDAY_TIME],
            CONF_SATURDAY_TIME: self.coordinator.options[CONF_SATURDAY_TIME],
            CONF_SUNDAY_TIME: self.coordinator.options[CONF_SUNDAY_TIME],
            CONF_OVERRIDE_TIME: self.coordinator.options[CONF_OVERRIDE_TIME],
            CONF_PRIMARY_MAIN_MEDIA: self.coordinator.options[CONF_PRIMARY_MAIN_MEDIA],
            CONF_FOLLOWUP_MAIN_MEDIA: self.coordinator.options[CONF_FOLLOWUP_MAIN_MEDIA],
        }

    async def async_added_to_hass(self) -> None:
        self._unsub = self.coordinator.add_listener(self.async_write_ha_state)

    async def async_will_remove_from_hass(self) -> None:
        if self._unsub: self._unsub()
