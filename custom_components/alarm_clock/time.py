"""Time entities for Alarm Clock schedules."""
from __future__ import annotations

from datetime import time
from homeassistant.components.time import TimeEntity
from .const import CONF_DAY_TIMES, CONF_OVERRIDE_TIME, CONF_SATURDAY_TIME, CONF_SUNDAY_TIME, CONF_WEEKDAY_TIME, DAYS, SCHEDULE_COMPACT, SCHEDULE_PER_DAY
from .entity import MorningAlarmEntity

class AlarmTime(MorningAlarmEntity, TimeEntity):
    def __init__(self, coordinator, key, name, mode=None, day=None):
        super().__init__(coordinator, key, name); self.mode, self.day = mode, day
    @property
    def available(self): return self.mode is None or self.coordinator.options["schedule_mode"] == self.mode
    @property
    def native_value(self):
        raw = self.coordinator.options[CONF_DAY_TIMES][self.day] if self.day else self.coordinator.options[self.key]
        return time.fromisoformat(raw)
    async def async_set_value(self, value):
        if self.day:
            values = dict(self.coordinator.options[CONF_DAY_TIMES]); values[self.day] = value.isoformat()
            await self.coordinator.async_set_option(CONF_DAY_TIMES, values)
        else: await self.coordinator.async_set_option(self.key, value.isoformat())

async def async_setup_entry(hass, entry, async_add_entities):
    c=hass.data["alarm_clock"][entry.entry_id]["coordinator"]
    out=[AlarmTime(c, CONF_WEEKDAY_TIME,"Weekday",SCHEDULE_COMPACT),AlarmTime(c,CONF_SATURDAY_TIME,"Saturday",SCHEDULE_COMPACT),AlarmTime(c,CONF_SUNDAY_TIME,"Sunday",SCHEDULE_COMPACT),AlarmTime(c,CONF_OVERRIDE_TIME,"Override time")]
    # Keep the per-day entities distinct from the compact Saturday/Sunday
    # entities. Their values come from ``day_times`` via ``day``, so this key
    # is only an entity identity and must not overlap a compact option key.
    out += [AlarmTime(c, f"per_day_{day}_time", day.title(), SCHEDULE_PER_DAY, day) for day in DAYS]
    async_add_entities(out)
