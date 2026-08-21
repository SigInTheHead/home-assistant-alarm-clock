"""Configuration and options flow for Alarm Clock."""
from __future__ import annotations

from collections.abc import Mapping
from typing import Any

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.const import CONF_NAME
from homeassistant.helpers.selector import (
    BooleanSelector,
    BooleanSelectorConfig,
    EntitySelector,
    EntitySelectorConfig,
    MediaSelector,
    MediaSelectorConfig,
    NumberSelector,
    NumberSelectorConfig,
    NumberSelectorMode,
    SelectSelector,
    SelectSelectorConfig,
    SelectSelectorMode,
)

from .const import (
    CONF_DAY_ENABLED, CONF_DAY_TIMES, CONF_FOLLOWUP_DELAY, CONF_FOLLOWUP_ENABLED,
    CONF_FOLLOWUP_MAIN_MEDIA, CONF_FOLLOWUP_MAIN_VOLUME, CONF_FOLLOWUP_PRE_ENABLED,
    CONF_FOLLOWUP_PRE_MEDIA, CONF_FOLLOWUP_PRE_DURATION, CONF_FOLLOWUP_PRE_VOLUME,
    CONF_FOLLOWUP_REUSE_PRIMARY, CONF_MEDIA_PLAYER, CONF_MINUTE_GRANULARITY,
    CONF_NAME as ALARM_NAME, CONF_PRIMARY_MAIN_MEDIA, CONF_PRIMARY_MAIN_VOLUME,
    CONF_PRIMARY_PRE_ENABLED, CONF_PRIMARY_PRE_MEDIA, CONF_PRIMARY_PRE_DURATION,
    CONF_PRIMARY_PRE_VOLUME,
    CONF_SCHEDULE_MODE, DEFAULT_OPTIONS, DOMAIN, SCHEDULE_COMPACT,
    PRE_ALARM_TONES, SCHEDULE_PER_DAY, WEEKDAY_DAYS, CONF_STOP_AFTER,
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


def _tone_default(value: Any) -> str:
    """Return a supported built-in tone URI for the options dropdown."""
    media_id = value.get("media_content_id") if isinstance(value, Mapping) else value
    return media_id if media_id in PRE_ALARM_TONES.values() else next(iter(PRE_ALARM_TONES.values()))


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
    """Edit alarm settings in conditional, uncluttered configuration steps."""

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
            self._data = data
            self._options = _with_schedule_mode(options, user_input[CONF_SCHEDULE_MODE])
            self._options.update({
                CONF_MINUTE_GRANULARITY: user_input[CONF_MINUTE_GRANULARITY],
                CONF_PRIMARY_PRE_ENABLED: user_input[CONF_PRIMARY_PRE_ENABLED],
                CONF_PRIMARY_MAIN_VOLUME: user_input[CONF_PRIMARY_MAIN_VOLUME],
                CONF_FOLLOWUP_ENABLED: user_input[CONF_FOLLOWUP_ENABLED],
                CONF_STOP_AFTER: user_input[CONF_STOP_AFTER],
            })
            self._store_media(user_input, CONF_PRIMARY_MAIN_MEDIA)
            return await self.async_step_primary_pre() if self._options[CONF_PRIMARY_PRE_ENABLED] else await self.async_step_followup()
        return self.async_show_form(step_id="init", data_schema=self._schema(options))

    def _store_media(self, user_input: Mapping[str, Any], key: str) -> None:
        """Keep an optional media picker value when it is not changed."""
        if isinstance(media := user_input.get(key), Mapping) and media.get("media_content_id"):
            self._options[key] = media

    async def async_step_primary_pre(self, user_input: dict[str, Any] | None = None):
        if user_input is not None:
            self._options.update({
                CONF_PRIMARY_PRE_MEDIA: user_input[CONF_PRIMARY_PRE_MEDIA],
                CONF_PRIMARY_PRE_DURATION: user_input[CONF_PRIMARY_PRE_DURATION],
                CONF_PRIMARY_PRE_VOLUME: user_input[CONF_PRIMARY_PRE_VOLUME],
            })
            return await self.async_step_followup()
        return self.async_show_form(step_id="primary_pre", data_schema=vol.Schema({
            vol.Required(CONF_PRIMARY_PRE_MEDIA, default=_tone_default(self._options[CONF_PRIMARY_PRE_MEDIA])): self._tone_selector(),
            vol.Required(CONF_PRIMARY_PRE_DURATION, default=self._options[CONF_PRIMARY_PRE_DURATION]): self._number(1, 300, "s"),
            vol.Required(CONF_PRIMARY_PRE_VOLUME, default=self._options[CONF_PRIMARY_PRE_VOLUME]): self._number(0, 100, "%"),
        }))

    async def async_step_followup(self, user_input: dict[str, Any] | None = None):
        if not self._options[CONF_FOLLOWUP_ENABLED]:
            return await self._finish()
        if user_input is not None:
            self._options.update({
                CONF_FOLLOWUP_DELAY: user_input[CONF_FOLLOWUP_DELAY],
                CONF_FOLLOWUP_PRE_ENABLED: user_input[CONF_FOLLOWUP_PRE_ENABLED],
                CONF_FOLLOWUP_REUSE_PRIMARY: user_input[CONF_FOLLOWUP_REUSE_PRIMARY],
                CONF_FOLLOWUP_MAIN_VOLUME: user_input[CONF_FOLLOWUP_MAIN_VOLUME],
            })
            return await self.async_step_followup_pre() if self._options[CONF_FOLLOWUP_PRE_ENABLED] else await self.async_step_followup_main()
        return self.async_show_form(step_id="followup", data_schema=vol.Schema({
            vol.Required(CONF_FOLLOWUP_DELAY, default=self._options[CONF_FOLLOWUP_DELAY]): self._number(1, 180, "min"),
            vol.Required(CONF_FOLLOWUP_PRE_ENABLED, default=self._options[CONF_FOLLOWUP_PRE_ENABLED]): BooleanSelector(BooleanSelectorConfig()),
            vol.Required(CONF_FOLLOWUP_REUSE_PRIMARY, default=self._options[CONF_FOLLOWUP_REUSE_PRIMARY]): BooleanSelector(BooleanSelectorConfig()),
            vol.Required(CONF_FOLLOWUP_MAIN_VOLUME, default=self._options[CONF_FOLLOWUP_MAIN_VOLUME]): self._number(0, 100, "%"),
        }))

    async def async_step_followup_pre(self, user_input: dict[str, Any] | None = None):
        if user_input is not None:
            self._options.update({
                CONF_FOLLOWUP_PRE_MEDIA: user_input[CONF_FOLLOWUP_PRE_MEDIA],
                CONF_FOLLOWUP_PRE_DURATION: user_input[CONF_FOLLOWUP_PRE_DURATION],
                CONF_FOLLOWUP_PRE_VOLUME: user_input[CONF_FOLLOWUP_PRE_VOLUME],
            })
            return await self.async_step_followup_main()
        return self.async_show_form(step_id="followup_pre", data_schema=vol.Schema({
            vol.Required(CONF_FOLLOWUP_PRE_MEDIA, default=_tone_default(self._options[CONF_FOLLOWUP_PRE_MEDIA])): self._tone_selector(),
            vol.Required(CONF_FOLLOWUP_PRE_DURATION, default=self._options[CONF_FOLLOWUP_PRE_DURATION]): self._number(1, 300, "s"),
            vol.Required(CONF_FOLLOWUP_PRE_VOLUME, default=self._options[CONF_FOLLOWUP_PRE_VOLUME]): self._number(0, 100, "%"),
        }))

    async def async_step_followup_main(self, user_input: dict[str, Any] | None = None):
        if self._options[CONF_FOLLOWUP_REUSE_PRIMARY]:
            return await self._finish()
        if user_input is not None:
            self._store_media(user_input, CONF_FOLLOWUP_MAIN_MEDIA)
            return await self._finish()
        return self.async_show_form(step_id="followup_main", data_schema=vol.Schema({
            vol.Optional(CONF_FOLLOWUP_MAIN_MEDIA, default=_media_default(self._options[CONF_FOLLOWUP_MAIN_MEDIA])): MEDIA_SELECTOR,
        }))

    async def _finish(self):
        self.hass.config_entries.async_update_entry(self.config_entry, title=self._data[ALARM_NAME], data=self._data)
        return self.async_create_entry(title="", data=self._options)

    @staticmethod
    def _tone_selector() -> SelectSelector:
        return SelectSelector(SelectSelectorConfig(
            options=[{"value": media_id, "label": label} for label, media_id in PRE_ALARM_TONES.items()],
            mode=SelectSelectorMode.DROPDOWN,
        ))

    @staticmethod
    def _number(minimum: int, maximum: int, unit: str) -> NumberSelector:
        return NumberSelector(NumberSelectorConfig(min=minimum, max=maximum, step=1, unit_of_measurement=unit, mode=NumberSelectorMode.BOX))

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
            vol.Required(CONF_PRIMARY_PRE_ENABLED, default=options[CONF_PRIMARY_PRE_ENABLED]): BooleanSelector(BooleanSelectorConfig()),
            vol.Optional(CONF_PRIMARY_MAIN_MEDIA, default=_media_default(options[CONF_PRIMARY_MAIN_MEDIA])): MEDIA_SELECTOR,
            vol.Required(CONF_PRIMARY_MAIN_VOLUME, default=options[CONF_PRIMARY_MAIN_VOLUME]): self._number(0, 100, "%"),
            vol.Required(CONF_FOLLOWUP_ENABLED, default=options[CONF_FOLLOWUP_ENABLED]): BooleanSelector(BooleanSelectorConfig()),
            vol.Required(CONF_STOP_AFTER, default=options[CONF_STOP_AFTER]): self._number(1, 180, "min"),
        })
