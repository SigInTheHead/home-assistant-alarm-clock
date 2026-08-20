"""Configuration and options flow for Alarm Clock."""
from __future__ import annotations

from collections.abc import Mapping
from typing import Any

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.const import CONF_NAME
from homeassistant.helpers.selector import (
    EntitySelector,
    EntitySelectorConfig,
    MediaSelector,
    MediaSelectorConfig,
    NumberSelector,
    NumberSelectorConfig,
    NumberSelectorMode,
    SelectSelector,
    SelectSelectorConfig,
)

from .const import (
    CONF_DAY_ENABLED, CONF_DAY_TIMES, CONF_FOLLOWUP_MAIN_MEDIA, CONF_FOLLOWUP_PRE_MEDIA,
    CONF_MEDIA_PLAYER, CONF_MINUTE_GRANULARITY, CONF_NAME as ALARM_NAME, CONF_PRIMARY_MAIN_MEDIA, CONF_PRIMARY_PRE_MEDIA,
    CONF_SCHEDULE_MODE, DEFAULT_OPTIONS, DOMAIN, SCHEDULE_COMPACT,
    SCHEDULE_PER_DAY, WEEKDAY_DAYS,
)

def _media_default(value: Any) -> Any:
    """Return a media default suitable for the single-output picker.

    Older entries can contain ``entity_id`` because MediaSelector used to ask
    for a player beside every media item. That value is no longer meaningful
    (and is invalid for an ``accept``-filtered selector), so retain only the
    selected media details.
    """
    if isinstance(value, Mapping):
        return {key: item for key, item in value.items() if key != "entity_id"}
    return value or None


# A media selector normally asks for the player used to browse each item.  The
# alarm has one deliberate output target, configured above, so constrain each
# picker to audio and let the coordinator always play it on that target.
MEDIA_SELECTOR = MediaSelector(MediaSelectorConfig(accept=["audio/*"]))


def _with_schedule_mode(options: dict[str, Any], mode: str) -> dict[str, Any]:
    """Set the schedule mode, carrying its schedule values across safely."""
    if mode == options[CONF_SCHEDULE_MODE]:
        return options

    updated = dict(options)
    if mode == SCHEDULE_PER_DAY:
        times = dict(updated[CONF_DAY_TIMES])
        for day in WEEKDAY_DAYS:
            times[day] = updated["weekday_time"]
        updated[CONF_DAY_TIMES] = times
        updated[CONF_DAY_ENABLED] = {day: True for day in WEEKDAY_DAYS}
    else:
        enabled_weekdays = [
            updated[CONF_DAY_TIMES][day]
            for day in WEEKDAY_DAYS
            if updated[CONF_DAY_ENABLED].get(day, True)
        ]
        if enabled_weekdays:
            updated["weekday_time"] = min(enabled_weekdays)
    updated[CONF_SCHEDULE_MODE] = mode
    return updated

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
            duplicate = any(
                entry.entry_id != self.config_entry.entry_id
                and entry.title.casefold() == data[ALARM_NAME].casefold()
                for entry in self.hass.config_entries.async_entries(DOMAIN)
            )
            if duplicate:
                return self.async_show_form(step_id="init", data_schema=self._schema(options), errors={ALARM_NAME: "duplicate_name"})
            media_keys = (
                CONF_PRIMARY_PRE_MEDIA,
                CONF_PRIMARY_MAIN_MEDIA,
                CONF_FOLLOWUP_PRE_MEDIA,
                CONF_FOLLOWUP_MAIN_MEDIA,
            )
            # Optional selector fields are absent when left untouched. Keep
            # their existing values rather than interpreting an absent picker
            # as a request to erase it when saving another setting.
            updated_media = {
                key: media
                for key in media_keys
                if isinstance(media := user_input.get(key), Mapping)
                and media.get("media_content_id")
            }
            new_options = {
                **options,
                **updated_media,
                CONF_MINUTE_GRANULARITY: user_input[CONF_MINUTE_GRANULARITY],
            }
            new_options = _with_schedule_mode(
                new_options, user_input[CONF_SCHEDULE_MODE]
            )
            # OptionsFlow persists the ``data`` returned here as the entry's
            # options. Updating it manually and then returning an empty dict
            # causes Home Assistant to immediately overwrite those values.
            self.hass.config_entries.async_update_entry(
                self.config_entry, title=data[ALARM_NAME], data=data
            )
            return self.async_create_entry(title="", data=new_options)
        return self.async_show_form(step_id="init", data_schema=self._schema(options))

    def _schema(self, options: Mapping[str, Any]) -> vol.Schema:
        return vol.Schema({
            vol.Required(ALARM_NAME, default=self.config_entry.data[ALARM_NAME]): str,
            vol.Required(CONF_MEDIA_PLAYER, default=self.config_entry.data[CONF_MEDIA_PLAYER]): EntitySelector(EntitySelectorConfig(domain="media_player")),
            vol.Required(CONF_SCHEDULE_MODE, default=options[CONF_SCHEDULE_MODE]): SelectSelector(
                SelectSelectorConfig(options=[
                    {"value": SCHEDULE_COMPACT, "label": "Weekday / Saturday / Sunday"},
                    {"value": SCHEDULE_PER_DAY, "label": "Individual days"},
                ])
            ),
            vol.Required(CONF_MINUTE_GRANULARITY, default=options[CONF_MINUTE_GRANULARITY]): SelectSelector(
                SelectSelectorConfig(options=[
                    {"value": str(step), "label": f"{step} minute{'s' if step != 1 else ''}"}
                    for step in (1, 2, 5, 10, 15, 30)
                ])
            ),
            vol.Optional(CONF_PRIMARY_PRE_MEDIA, default=_media_default(options[CONF_PRIMARY_PRE_MEDIA])): MEDIA_SELECTOR,
            vol.Optional(CONF_PRIMARY_MAIN_MEDIA, default=_media_default(options[CONF_PRIMARY_MAIN_MEDIA])): MEDIA_SELECTOR,
            vol.Optional(CONF_FOLLOWUP_PRE_MEDIA, default=_media_default(options[CONF_FOLLOWUP_PRE_MEDIA])): MEDIA_SELECTOR,
            vol.Optional(CONF_FOLLOWUP_MAIN_MEDIA, default=_media_default(options[CONF_FOLLOWUP_MAIN_MEDIA])): MEDIA_SELECTOR,
        })
