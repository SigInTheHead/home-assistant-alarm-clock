"""Scheduling and playback runtime for one Alarm Clock entry."""
from __future__ import annotations

import asyncio
import logging
from collections.abc import Callable
from copy import deepcopy
from datetime import datetime, time, timedelta
from typing import Any
from uuid import uuid4

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.helpers.event import async_track_point_in_time
from homeassistant.util import dt as dt_util

from .const import *
from .models import Media

_LOGGER = logging.getLogger(__name__)

class MorningAlarmCoordinator:
    """Own all callbacks and playback state for a config entry."""
    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass, self.entry = hass, entry
        self._normal_cancel: CALLBACK_TYPE | None = None
        self._override_cancel: CALLBACK_TYPE | None = None
        self._follow_cancel: CALLBACK_TYPE | None = None
        self._stop_cancel: CALLBACK_TYPE | None = None
        self._stage_task: asyncio.Task | None = None
        self._occurrence: str | None = None
        self._snapshot: dict[str, Any] | None = None
        self._last_requested_id: str | None = None
        self._stop_deadline: datetime | None = None
        self._late_followup = False
        self.status = STATUS_DISABLED
        self.next_alarm: datetime | None = None
        self._listeners: list[Callable[[], None]] = []

    @property
    def options(self) -> dict[str, Any]:
        return {**DEFAULT_OPTIONS, **self.entry.options}

    def add_listener(self, listener: Callable[[], None]) -> CALLBACK_TYPE:
        self._listeners.append(listener)
        return lambda: self._listeners.remove(listener) if listener in self._listeners else None

    @callback
    def _notify(self) -> None:
        for listener in tuple(self._listeners): listener()

    async def async_start(self) -> None:
        """Restore the next schedule, catching up a recent missed trigger once."""
        options, now = self.options, dt_util.now()
        if options[CONF_ENABLED]:
            if options[CONF_OVERRIDE]:
                candidate = dt_util.as_local(datetime.combine(now.date(), self._time(options[CONF_OVERRIDE_TIME])))
                if candidate <= now and now - candidate <= timedelta(hours=1):
                    await self._async_update_option(CONF_OVERRIDE, False)
                    await self.async_trigger(manual=False)
                    return
                if candidate <= now:
                    await self._async_update_option(CONF_OVERRIDE, False)
            else:
                scheduled_time = self._normal_time_for(now.date())
                if scheduled_time is not None:
                    candidate = dt_util.as_local(datetime.combine(now.date(), scheduled_time))
                    if candidate <= now and now - candidate <= timedelta(hours=1):
                        await self.async_trigger(manual=False)
                        return
        await self.async_reschedule()

    async def async_options_updated(self) -> None:
        await self.async_reschedule()

    async def async_reschedule(self) -> None:
        self._cancel_schedule()
        options = self.options
        if not options[CONF_ENABLED]:
            self.status = STATUS_DISABLED
            self.next_alarm = None
            self._notify()
            return
        now = dt_util.now()
        normal = self._next_normal(now)
        override = self._next_override(now) if options[CONF_OVERRIDE] else None
        target = override or normal
        self.next_alarm = target
        self.status = STATUS_SCHEDULED if target else STATUS_DISABLED
        if normal and not override:
            self._normal_cancel = async_track_point_in_time(self.hass, self._schedule_normal_callback, normal)
        if override:
            self._override_cancel = async_track_point_in_time(self.hass, self._schedule_override_callback, override)
        self._notify()

    def _cancel_schedule(self) -> None:
        for attr in ("_normal_cancel", "_override_cancel"):
            cancel = getattr(self, attr)
            if cancel: cancel()
            setattr(self, attr, None)

    def _time(self, value: str):
        try:
            return time.fromisoformat(value)
        except (TypeError, ValueError):
            return DEFAULT_TIME

    def _normal_time_for(self, date) -> Any | None:
        options, weekday = self.options, date.weekday()
        if options[CONF_SCHEDULE_MODE] == SCHEDULE_PER_DAY and weekday < 5:
            day = DAYS[weekday]
            if not options[CONF_DAY_ENABLED].get(day, True): return None
            return self._time(options[CONF_DAY_TIMES].get(day, "07:00:00"))
        if weekday < 5: return self._time(options[CONF_WEEKDAY_TIME])
        return self._time(options[CONF_SATURDAY_TIME] if weekday == 5 else options[CONF_SUNDAY_TIME])

    def _next_normal(self, now: datetime) -> datetime | None:
        for offset in range(8):
            date = (now + timedelta(days=offset)).date()
            alarm_time = self._normal_time_for(date)
            if alarm_time is None: continue
            candidate = dt_util.as_local(datetime.combine(date, alarm_time))
            if candidate > now: return candidate
        return None

    def _next_override(self, now: datetime) -> datetime:
        alarm_time = self._time(self.options[CONF_OVERRIDE_TIME])
        candidate = dt_util.as_local(datetime.combine(now.date(), alarm_time))
        return candidate if candidate > now else candidate + timedelta(days=1)

    @callback
    def _schedule_normal_callback(self, now: datetime) -> None:
        self.hass.async_create_task(self._normal_callback(now))

    async def _normal_callback(self, now: datetime) -> None:
        await self.async_trigger(manual=False)

    @callback
    def _schedule_override_callback(self, now: datetime) -> None:
        self.hass.async_create_task(self._override_callback(now))

    async def _override_callback(self, now: datetime) -> None:
        await self._async_update_option(CONF_OVERRIDE, False)
        await self.async_trigger(manual=False)

    async def _async_update_option(self, key: str, value: Any) -> None:
        self.hass.config_entries.async_update_entry(self.entry, options={**self.options, key: value})

    async def async_set_option(self, key: str, value: Any) -> None:
        """Called by writable entities; also apply schedule conversions."""
        options = self.options
        if key == CONF_SCHEDULE_MODE and value != options[CONF_SCHEDULE_MODE]:
            if value == SCHEDULE_PER_DAY:
                times = dict(options[CONF_DAY_TIMES])
                for day in WEEKDAY_DAYS: times[day] = options[CONF_WEEKDAY_TIME]
                options[CONF_DAY_TIMES] = times
                options[CONF_DAY_ENABLED] = {day: True for day in WEEKDAY_DAYS}
            else:
                enabled = [options[CONF_DAY_TIMES][day] for day in WEEKDAY_DAYS if options[CONF_DAY_ENABLED].get(day, True)]
                if enabled: options[CONF_WEEKDAY_TIME] = min(enabled)
        options[key] = value
        self.hass.config_entries.async_update_entry(self.entry, options=options)
        if key == CONF_ENABLED and not value and self._occurrence:
            await self._cancel_active_stages_keep_stop()

    async def _cancel_active_stages_keep_stop(self) -> None:
        if self._stage_task: self._stage_task.cancel()
        if self._follow_cancel: self._follow_cancel(); self._follow_cancel = None

    async def async_trigger(self, manual: bool) -> None:
        if not manual and not self.options[CONF_ENABLED]:
            await self.async_reschedule(); return
        await self._cancel_active_stages_keep_stop()
        if self._stop_cancel: self._stop_cancel()
        token = self._occurrence = uuid4().hex
        self._snapshot = deepcopy(self.options)
        started = dt_util.now()
        self._schedule_stop(token, started + timedelta(minutes=self._snapshot[CONF_STOP_AFTER]))
        if self._snapshot[CONF_FOLLOWUP_ENABLED]:
            self._late_followup = self._snapshot[CONF_FOLLOWUP_DELAY] >= self._snapshot[CONF_STOP_AFTER]
            self._follow_cancel = async_track_point_in_time(self.hass, lambda now: self._schedule_follow_up(token, now), started + timedelta(minutes=self._snapshot[CONF_FOLLOWUP_DELAY]))
        else:
            self._late_followup = False
        self._stage_task = self.hass.async_create_task(self._play_stage(token, False))
        await self.async_reschedule()

    @callback
    def _schedule_follow_up(self, token: str, now: datetime) -> None:
        late = self._late_followup or bool(self._stop_deadline and now >= self._stop_deadline)
        self.hass.async_create_task(self.async_trigger_follow_up(token=token, late=late))

    async def async_trigger_follow_up(self, standalone: bool = False, token: str | None = None, late: bool = False) -> None:
        if not standalone and token != self._occurrence: return
        if standalone:
            token = uuid4().hex
            self._occurrence, self._snapshot = token, deepcopy(self.options)
        if self._stage_task: self._stage_task.cancel()
        self._stage_task = self.hass.async_create_task(self._play_stage(token, True, late=late))

    def _schedule_stop(self, token: str, deadline: datetime) -> None:
        self._stop_deadline = deadline
        self._stop_cancel = async_track_point_in_time(self.hass, lambda now: self._schedule_stop_callback(token), deadline)

    @callback
    def _schedule_stop_callback(self, token: str) -> None:
        if self._late_followup and token == self._occurrence:
            self.hass.async_create_task(self._stop_playback_only(token))
        else:
            self.hass.async_create_task(self.async_stop(token=token))

    async def _stop_playback_only(self, token: str) -> None:
        """Silence the main stage while retaining a late follow-up beep callback."""
        if token != self._occurrence:
            return
        state = self.hass.states.get(self.entry.data[CONF_MEDIA_PLAYER])
        if self._last_requested_id and state and state.attributes.get("media_content_id") == self._last_requested_id:
            try:
                await self.hass.services.async_call("media_player", "media_stop", {"entity_id": self.entry.data[CONF_MEDIA_PLAYER]}, blocking=True)
            except Exception as err:
                _LOGGER.debug("media_stop failed for %s: %s", self.entry.title, err)
        self.status = STATUS_STOPPED
        self._notify()

    async def _play_stage(self, token: str, follow_up: bool, late: bool = False) -> None:
        if token != self._occurrence or not self._snapshot: return
        opt, prefix = self._snapshot, "followup" if follow_up else "primary"
        pre_enabled, pre_media = opt[f"{prefix}_pre_enabled"], Media.from_value(opt[f"{prefix}_pre_media"])
        if pre_enabled and pre_media:
            self.status = STATUS_FOLLOWUP_PRE_ALARM if follow_up else STATUS_PRE_ALARM; self._notify()
            await self._play_pre_alarm(token, pre_media, opt[f"{prefix}_pre_volume"], opt[f"{prefix}_pre_duration"])
        if token != self._occurrence or late: 
            if late: await self.async_stop(token=token)
            return
        media = Media.from_value(opt[CONF_PRIMARY_MAIN_MEDIA] if not follow_up or opt[CONF_FOLLOWUP_REUSE_PRIMARY] else opt[CONF_FOLLOWUP_MAIN_MEDIA])
        volume = opt[CONF_FOLLOWUP_MAIN_VOLUME] if follow_up else opt[CONF_PRIMARY_MAIN_VOLUME]
        if media:
            self.status = STATUS_FOLLOWUP_PLAYING if follow_up else STATUS_PLAYING; self._notify()
            await self._play_media(media, volume)
        elif pre_enabled and pre_media:
            # A five-minute built-in tone can outlast the chosen pre-alarm
            # duration when there is no main media to replace it.
            await self._stop_playback_only(token)

    async def _play_pre_alarm(self, token: str, media: Media, volume: int, duration: int) -> None:
        """Play one looping pre-alarm track for its chosen duration."""
        await self._play_media(media, volume)
        if token == self._occurrence:
            await asyncio.sleep(duration)

    async def _play_media(self, media: Media, volume: int) -> None:
        entity = self.entry.data[CONF_MEDIA_PLAYER]
        try:
            await self.hass.services.async_call("media_player", "volume_set", {"entity_id": entity, "volume_level": volume / 100}, blocking=True)
            await self.hass.services.async_call("media_player", "play_media", {"entity_id": entity, "media_content_id": media.content_id, "media_content_type": media.content_type, **({"metadata": media.metadata} if media.metadata else {})}, blocking=True)
            self._last_requested_id = media.content_id
        except Exception as err:  # players are inherently unreliable
            _LOGGER.warning("Playback failed for %s; retrying once: %s", self.entry.title, err)
            await asyncio.sleep(5)
            try:
                await self.hass.services.async_call("media_player", "play_media", {"entity_id": entity, **media.as_service_data()}, blocking=True)
                self._last_requested_id = media.content_id
            except Exception as retry_err:
                _LOGGER.warning("Playback retry failed for %s: %s", self.entry.title, retry_err)

    async def async_stop(self, manual: bool = False, token: str | None = None) -> None:
        if token and token != self._occurrence: return
        if self._stage_task: self._stage_task.cancel(); self._stage_task = None
        if self._follow_cancel: self._follow_cancel(); self._follow_cancel = None
        if self._stop_cancel: self._stop_cancel(); self._stop_cancel = None
        state = self.hass.states.get(self.entry.data[CONF_MEDIA_PLAYER])
        if manual or (self._last_requested_id and state and state.attributes.get("media_content_id") == self._last_requested_id):
            try:
                await self.hass.services.async_call("media_player", "media_stop", {"entity_id": self.entry.data[CONF_MEDIA_PLAYER]}, blocking=True)
            except Exception as err:
                _LOGGER.debug("media_stop failed for %s: %s", self.entry.title, err)
        self.status, self._occurrence, self._stop_deadline, self._late_followup = STATUS_STOPPED, None, None, False
        self._snapshot = None; self._notify()
        await self.async_reschedule()

    async def async_stop_runtime(self) -> None:
        """Cancel every callback during entry unload without recreating schedules."""
        self._cancel_schedule()
        if self._stage_task: self._stage_task.cancel(); self._stage_task = None
        if self._follow_cancel: self._follow_cancel(); self._follow_cancel = None
        if self._stop_cancel: self._stop_cancel(); self._stop_cancel = None
        self._occurrence = None
        self._snapshot = None
        self._stop_deadline = None
        self._late_followup = False
