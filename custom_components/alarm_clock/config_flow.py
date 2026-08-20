"""Configuration and options flow for Alarm Clock."""
from __future__ import annotations

from collections.abc import Mapping
from typing import Any

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.const import CONF_NAME
from homeassistant.helpers.selector import EntitySelector, EntitySelectorConfig, MediaSelector, NumberSelector, NumberSelectorConfig, NumberSelectorMode

from .const import (
    CONF_DAY_ENABLED, CONF_DAY_TIMES, CONF_FOLLOWUP_MAIN_MEDIA, CONF_FOLLOWUP_PRE_MEDIA,
    CONF_MEDIA_PLAYER, CONF_NAME as ALARM_NAME, CONF_PRIMARY_MAIN_MEDIA, CONF_PRIMARY_PRE_MEDIA,
    DAYS, DEFAULT_OPTIONS, DOMAIN,
)

def _media_default(value: Any) -> Any:
    return value or None

class MorningAlarmConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Create independent alarm config entries."""
    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None):
        errors: dict[str, str] = {}
        if user_input:
            name = user_input[ALARM_NAME].strip()
            if any(entry.title.casefold() == name.casefold() for entry in self._async_current_entries()):
                errors[ALARM_NAME] = "duplicate_name"
            else:
                return self.async_create_entry(title=name, data={ALARM_NAME: name, CONF_MEDIA_PLAYER: user_input[CONF_MEDIA_PLAYER]}, options=DEFAULT_OPTIONS.copy())
        return self.async_show_form(step_id="user", data_schema=vol.Schema({
            vol.Required(ALARM_NAME): str,
            vol.Required(CONF_MEDIA_PLAYER): EntitySelector(EntitySelectorConfig(domain="media_player")),
        }), errors=errors)

    @staticmethod
    def async_get_options_flow(config_entry: config_entries.ConfigEntry):
        """Return a handler; Home Assistant assigns its config_entry lifecycle field."""
        return MorningAlarmOptionsFlow()

class MorningAlarmOptionsFlow(config_entries.OptionsFlow):
    """Edit values that need Home Assistant's native media selector."""
    async def async_step_init(self, user_input: dict[str, Any] | None = None):
        options = {**DEFAULT_OPTIONS, **self.config_entry.options}
        if user_input is not None:
            data = {**self.config_entry.data, ALARM_NAME: user_input[ALARM_NAME].strip(), CONF_MEDIA_PLAYER: user_input[CONF_MEDIA_PLAYER]}
            if not data[ALARM_NAME]:
                return self.async_show_form(step_id="init", data_schema=self._schema(options), errors={ALARM_NAME: "invalid_name"})
            duplicate = any(e.entry_id != self.config_entry.entry_id and e.title.casefold() == data[ALARM_NAME].casefold() for e in self._async_current_entries())
            if duplicate:
                return self.async_show_form(step_id="init", data_schema=self._schema(options), errors={ALARM_NAME: "duplicate_name"})
            new_options = {**options, **{key: user_input.get(key) for key in (CONF_PRIMARY_PRE_MEDIA, CONF_PRIMARY_MAIN_MEDIA, CONF_FOLLOWUP_PRE_MEDIA, CONF_FOLLOWUP_MAIN_MEDIA)}}
            self.hass.config_entries.async_update_entry(self.config_entry, title=data[ALARM_NAME], data=data, options=new_options)
            return self.async_create_entry(title="", data={})
        return self.async_show_form(step_id="init", data_schema=self._schema(options))

    def _schema(self, options: Mapping[str, Any]) -> vol.Schema:
        return vol.Schema({
            vol.Required(ALARM_NAME, default=self.config_entry.data[ALARM_NAME]): str,
            vol.Required(CONF_MEDIA_PLAYER, default=self.config_entry.data[CONF_MEDIA_PLAYER]): EntitySelector(EntitySelectorConfig(domain="media_player")),
            vol.Optional(CONF_PRIMARY_PRE_MEDIA, default=_media_default(options[CONF_PRIMARY_PRE_MEDIA])): MediaSelector(),
            vol.Optional(CONF_PRIMARY_MAIN_MEDIA, default=_media_default(options[CONF_PRIMARY_MAIN_MEDIA])): MediaSelector(),
            vol.Optional(CONF_FOLLOWUP_PRE_MEDIA, default=_media_default(options[CONF_FOLLOWUP_PRE_MEDIA])): MediaSelector(),
            vol.Optional(CONF_FOLLOWUP_MAIN_MEDIA, default=_media_default(options[CONF_FOLLOWUP_MAIN_MEDIA])): MediaSelector(),
        })
