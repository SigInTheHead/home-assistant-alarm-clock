"""Diagnostic sensors."""
from __future__ import annotations
from homeassistant.components.sensor import SensorDeviceClass, SensorEntity
from .entity import MorningAlarmEntity

class NextAlarmSensor(MorningAlarmEntity, SensorEntity):
    _attr_device_class=SensorDeviceClass.TIMESTAMP
    def __init__(self,c): super().__init__(c,"next_alarm","Next alarm")
    @property
    def native_value(self): return self.coordinator.next_alarm
class StatusSensor(MorningAlarmEntity, SensorEntity):
    def __init__(self,c): super().__init__(c,"status","Status")
    @property
    def native_value(self): return self.coordinator.status
async def async_setup_entry(hass,entry,async_add_entities):
    c=hass.data["morning_alarm"][entry.entry_id]["coordinator"]; async_add_entities([NextAlarmSensor(c),StatusSensor(c)])
