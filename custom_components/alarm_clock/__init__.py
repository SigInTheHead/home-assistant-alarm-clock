"""Alarm Clock integration setup."""
from __future__ import annotations

import voluptuous as vol
from pathlib import Path
from homeassistant.config_entries import ConfigEntry
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import config_validation as cv

from .const import DATA_COORDINATOR, DOMAIN, MEDIA_OPTION_KEYS, PLATFORMS, SERVICE_SET_MEDIA, SERVICE_SKIP, SERVICE_SNOOZE, SERVICE_STOP, SERVICE_STOP_PLAYBACK, SERVICE_TRIGGER, SERVICE_TRIGGER_FOLLOW_UP
from .coordinator import MorningAlarmCoordinator
from .http import MorningAlarmToneView

type MorningAlarmConfigEntry = ConfigEntry

# Alarm Clock is configured through its config flow, not YAML.  Defining the
# empty schema lets Home Assistant validate that explicitly.
CONFIG_SCHEMA = vol.Schema({})

async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up domain-level actions."""
    await hass.http.async_register_static_paths([
        StaticPathConfig("/alarm_clock", str(Path(__file__).parent / "frontend"), cache_headers=False),
    ])
    hass.http.register_view(MorningAlarmToneView())
    async def _service(call: ServiceCall) -> None:
        for entry_id in call.data.get("entry_id", []):
            coordinator = hass.data.get(DOMAIN, {}).get(entry_id, {}).get(DATA_COORDINATOR)
            if coordinator is None:
                continue
            if call.service == SERVICE_TRIGGER:
                await coordinator.async_trigger(manual=True)
            elif call.service == SERVICE_TRIGGER_FOLLOW_UP:
                await coordinator.async_trigger_follow_up(standalone=True)
            elif call.service == SERVICE_SET_MEDIA:
                await coordinator.async_set_media(call.data["stage"], call.data.get("media"))
            elif call.service == SERVICE_STOP_PLAYBACK:
                await coordinator.async_stop_playback()
            elif call.service == SERVICE_SNOOZE:
                await coordinator.async_snooze()
            elif call.service == SERVICE_SKIP:
                await coordinator.async_skip()
            else:
                await coordinator.async_stop(manual=True)

    schema = vol.Schema({vol.Required("entry_id"): vol.All(cv.ensure_list, [cv.string])})
    for service in (SERVICE_TRIGGER, SERVICE_TRIGGER_FOLLOW_UP, SERVICE_STOP, SERVICE_STOP_PLAYBACK, SERVICE_SNOOZE, SERVICE_SKIP):
        hass.services.async_register(DOMAIN, service, _service, schema=schema)
    media_schema = vol.Schema({
        vol.Required("entry_id"): vol.All(cv.ensure_list, [cv.string]),
        vol.Required("stage"): vol.In(MEDIA_OPTION_KEYS),
        vol.Optional("media"): vol.Any(None, dict),
    })
    hass.services.async_register(DOMAIN, SERVICE_SET_MEDIA, _service, schema=media_schema)
    return True

async def async_setup_entry(hass: HomeAssistant, entry: MorningAlarmConfigEntry) -> bool:
    """Set up an alarm entry."""
    coordinator = MorningAlarmCoordinator(hass, entry)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {DATA_COORDINATOR: coordinator}
    await coordinator.async_start()
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_async_entry_updated))
    return True

async def _async_entry_updated(hass: HomeAssistant, entry: MorningAlarmConfigEntry) -> None:
    coordinator: MorningAlarmCoordinator = hass.data[DOMAIN][entry.entry_id][DATA_COORDINATOR]
    await coordinator.async_options_updated()

async def async_unload_entry(hass: HomeAssistant, entry: MorningAlarmConfigEntry) -> bool:
    """Unload an alarm without affecting other entries."""
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        coordinator: MorningAlarmCoordinator = hass.data[DOMAIN].pop(entry.entry_id)[DATA_COORDINATOR]
        await coordinator.async_stop_runtime()
    return unloaded
