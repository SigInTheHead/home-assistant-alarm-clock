"""Number entities for timing and volume settings."""
from __future__ import annotations
from homeassistant.components.number import NumberEntity, NumberMode
from .const import *
from .entity import MorningAlarmEntity

class AlarmNumber(MorningAlarmEntity, NumberEntity):
    _attr_mode = NumberMode.BOX
    def __init__(self, coordinator, key, name, minimum, maximum, step, unit=None):
        super().__init__(coordinator,key,name); self._attr_native_min_value=minimum; self._attr_native_max_value=maximum; self._attr_native_step=step; self._attr_native_unit_of_measurement=unit
    @property
    def native_value(self): return self.coordinator.options[self.key]
    async def async_set_native_value(self, value): await self.coordinator.async_set_option(self.key, int(value))

async def async_setup_entry(hass, entry, async_add_entities):
    c=hass.data[DOMAIN][entry.entry_id][DATA_COORDINATOR]
    specs=[
      (CONF_PRIMARY_PRE_VOLUME,"Primary pre-alarm volume",0,100,5,"%"),(CONF_PRIMARY_MAIN_VOLUME,"Primary main volume",0,100,5,"%"),
      (CONF_PRIMARY_PRE_DURATION,"Primary pre-alarm duration",1,300,1,"s"),
      (CONF_FOLLOWUP_DELAY,"Follow-up delay",1,180,1,"min"),(CONF_FOLLOWUP_PRE_VOLUME,"Follow-up pre-alarm volume",0,100,5,"%"),
      (CONF_FOLLOWUP_PRE_DURATION,"Follow-up pre-alarm duration",1,300,1,"s"),
      (CONF_FOLLOWUP_MAIN_VOLUME,"Follow-up main volume",0,100,5,"%"),(CONF_STOP_AFTER,"Stop after",1,180,1,"min")]
    async_add_entities(AlarmNumber(c,*spec) for spec in specs)
