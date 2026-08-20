"""Shared entity helpers."""
from __future__ import annotations

from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity import Entity

from .const import CONF_NAME, DOMAIN

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
        return {"alarm_clock_entry_id": self.coordinator.entry.entry_id, "alarm_clock_key": self.key}

    async def async_added_to_hass(self) -> None:
        self._unsub = self.coordinator.add_listener(self.async_write_ha_state)

    async def async_will_remove_from_hass(self) -> None:
        if self._unsub: self._unsub()
