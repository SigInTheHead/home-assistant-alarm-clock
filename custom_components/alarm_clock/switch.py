"""Switch entities for Alarm Clock."""
from __future__ import annotations

from homeassistant.components.switch import SwitchEntity
from homeassistant.util import slugify

from .const import CONF_DAY_ENABLED, CONF_ENABLED, CONF_FOLLOWUP_ENABLED, CONF_FOLLOWUP_PRE_ENABLED, CONF_FOLLOWUP_REUSE_PRIMARY, CONF_OVERRIDE, CONF_PRIMARY_PRE_ENABLED, SCHEDULE_PER_DAY, WEEKDAY_DAYS
from .entity import MorningAlarmEntity

class AlarmSwitch(MorningAlarmEntity, SwitchEntity):
    def __init__(self, coordinator, key, name, day: str | None = None) -> None:
        super().__init__(coordinator, key, name); self.day = day
        if key == CONF_ENABLED:
            # This is the alarm's canonical entity, used by dashboards/cards to
            # locate the device's sibling schedule and playback controls.
            self._attr_suggested_object_id = f"{slugify(coordinator.entry.data['name'])}_alarm_clock"
    @property
    def available(self):
        return not self.day or self.coordinator.options["schedule_mode"] == SCHEDULE_PER_DAY
    @property
    def is_on(self):
        return self.coordinator.options[CONF_DAY_ENABLED].get(self.day, True) if self.day else bool(self.coordinator.options[self.key])
    async def async_turn_on(self, **kwargs):
        if self.day:
            values = dict(self.coordinator.options[CONF_DAY_ENABLED]); values[self.day] = True
            await self.coordinator.async_set_option(CONF_DAY_ENABLED, values)
        else: await self.coordinator.async_set_option(self.key, True)
    async def async_turn_off(self, **kwargs):
        if self.day:
            values = dict(self.coordinator.options[CONF_DAY_ENABLED]); values[self.day] = False
            await self.coordinator.async_set_option(CONF_DAY_ENABLED, values)
        else: await self.coordinator.async_set_option(self.key, False)

async def async_setup_entry(hass, entry, async_add_entities):
    c = hass.data["alarm_clock"][entry.entry_id]["coordinator"]
    entities = [
        AlarmSwitch(c, CONF_ENABLED, "Alarm Clock"), AlarmSwitch(c, CONF_OVERRIDE, "Override"),
        AlarmSwitch(c, CONF_PRIMARY_PRE_ENABLED, "Primary pre-alarm"), AlarmSwitch(c, CONF_FOLLOWUP_ENABLED, "Follow-up"),
        AlarmSwitch(c, CONF_FOLLOWUP_PRE_ENABLED, "Follow-up pre-alarm"), AlarmSwitch(c, CONF_FOLLOWUP_REUSE_PRIMARY, "Reuse primary media"),
    ]
    entities.extend(AlarmSwitch(c, f"{day}_enabled", day.title(), day) for day in WEEKDAY_DAYS)
    async_add_entities(entities)
