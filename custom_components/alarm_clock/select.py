"""Schedule mode selector."""
from __future__ import annotations
from homeassistant.components.select import SelectEntity
from .const import CONF_SCHEDULE_MODE, SCHEDULE_COMPACT, SCHEDULE_PER_DAY
from .entity import MorningAlarmEntity

class ScheduleModeSelect(MorningAlarmEntity, SelectEntity):
    _attr_options=[SCHEDULE_COMPACT,SCHEDULE_PER_DAY]
    def __init__(self, c): super().__init__(c,CONF_SCHEDULE_MODE,"Schedule mode")
    @property
    def current_option(self): return self.coordinator.options[CONF_SCHEDULE_MODE]
    async def async_select_option(self, option): await self.coordinator.async_set_option(CONF_SCHEDULE_MODE,option)
async def async_setup_entry(hass,entry,async_add_entities): async_add_entities([ScheduleModeSelect(hass.data["alarm_clock"][entry.entry_id]["coordinator"])])
