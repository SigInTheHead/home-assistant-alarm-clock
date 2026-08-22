"""Constants for Alarm Clock."""
from __future__ import annotations

from datetime import time
from homeassistant.const import Platform

DOMAIN = "alarm_clock"
PLATFORMS = [Platform.SWITCH, Platform.TIME, Platform.NUMBER, Platform.SELECT, Platform.SENSOR]
DATA_COORDINATOR = "coordinator"

CONF_NAME = "name"
CONF_MEDIA_PLAYER = "media_player"
CONF_MINUTE_GRANULARITY = "minute_granularity"
CONF_SCHEDULE_MODE = "schedule_mode"
CONF_ENABLED = "enabled"
CONF_OVERRIDE = "override"
CONF_OVERRIDE_TIME = "override_time"
CONF_WEEKDAY_TIME = "weekday_time"
CONF_SATURDAY_TIME = "saturday_time"
CONF_SUNDAY_TIME = "sunday_time"
CONF_WEEKDAY_ENABLED = "weekday_enabled"
CONF_SATURDAY_ENABLED = "saturday_enabled"
CONF_SUNDAY_ENABLED = "sunday_enabled"
CONF_DAY_TIMES = "day_times"
CONF_DAY_ENABLED = "day_enabled"
CONF_PRIMARY_PRE_ENABLED = "primary_pre_enabled"
CONF_PRIMARY_PRE_MEDIA = "primary_pre_media"
CONF_PRIMARY_PRE_VOLUME = "primary_pre_volume"
CONF_PRIMARY_PRE_DURATION = "primary_pre_duration"
CONF_PRIMARY_MAIN_MEDIA = "primary_main_media"
CONF_PRIMARY_MAIN_VOLUME = "primary_main_volume"
CONF_FOLLOWUP_ENABLED = "followup_enabled"
CONF_FOLLOWUP_DELAY = "followup_delay"
CONF_FOLLOWUP_PRE_ENABLED = "followup_pre_enabled"
CONF_FOLLOWUP_PRE_MEDIA = "followup_pre_media"
CONF_FOLLOWUP_PRE_VOLUME = "followup_pre_volume"
CONF_FOLLOWUP_PRE_DURATION = "followup_pre_duration"
CONF_FOLLOWUP_REUSE_PRIMARY = "followup_reuse_primary"
CONF_FOLLOWUP_MAIN_MEDIA = "followup_main_media"
CONF_FOLLOWUP_MAIN_VOLUME = "followup_main_volume"
CONF_STOP_AFTER = "stop_after"
CONF_SNOOZE_DURATION = "snooze_duration"

SCHEDULE_COMPACT = "compact"
SCHEDULE_PER_DAY = "per_day"
DAYS = ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")
WEEKDAY_DAYS = DAYS[:5]
PRE_ALARM_TONES = {
    "Soft Beep": "media-source://alarm_clock/soft-beep",
    "Soft Chime": "media-source://alarm_clock/soft-chime",
    "Gentle Alarm": "media-source://alarm_clock/gentle-alarm",
    "Double Beep": "media-source://alarm_clock/double-beep",
    "Rising Pulse": "media-source://alarm_clock/rising-pulse",
    "Digital Alarm": "media-source://alarm_clock/digital-alarm",
    "Urgent Tone": "media-source://alarm_clock/urgent-tone",
    "High Alert": "media-source://alarm_clock/high-alert",
    "Klaxon": "media-source://alarm_clock/klaxon",
    "Rapid Beep": "media-source://alarm_clock/rapid-beep",
}
NUMERIC_LIMITS = {
    CONF_PRIMARY_PRE_DURATION: (1, 30),
    CONF_FOLLOWUP_PRE_DURATION: (1, 30),
    CONF_FOLLOWUP_DELAY: (1, 30),
    CONF_STOP_AFTER: (1, 60),
    CONF_SNOOZE_DURATION: (1, 30),
}

STATUS_DISABLED = "disabled"
STATUS_SCHEDULED = "scheduled"
STATUS_PRE_ALARM = "pre_alarm"
STATUS_PLAYING = "playing"
STATUS_FOLLOWUP_PRE_ALARM = "follow_up_pre_alarm"
STATUS_FOLLOWUP_PLAYING = "follow_up_playing"
STATUS_SNOOZED = "snoozed"
STATUS_STOPPED = "stopped"

DEFAULT_TIME = time(7, 0)
DEFAULT_OPTIONS = {
    CONF_ENABLED: False, CONF_OVERRIDE: False, CONF_OVERRIDE_TIME: "07:00:00",
    CONF_MINUTE_GRANULARITY: "5",
    CONF_SCHEDULE_MODE: SCHEDULE_COMPACT,
    CONF_WEEKDAY_TIME: "07:00:00", CONF_SATURDAY_TIME: "07:00:00", CONF_SUNDAY_TIME: "07:00:00",
    CONF_WEEKDAY_ENABLED: True, CONF_SATURDAY_ENABLED: True, CONF_SUNDAY_ENABLED: True,
    CONF_DAY_TIMES: {day: "07:00:00" for day in WEEKDAY_DAYS},
    CONF_DAY_ENABLED: {day: True for day in WEEKDAY_DAYS},
    CONF_PRIMARY_PRE_ENABLED: False, CONF_PRIMARY_PRE_MEDIA: PRE_ALARM_TONES["Soft Beep"], CONF_PRIMARY_PRE_VOLUME: 30,
    CONF_PRIMARY_PRE_DURATION: 30,
    CONF_PRIMARY_MAIN_MEDIA: None, CONF_PRIMARY_MAIN_VOLUME: 30,
    CONF_FOLLOWUP_ENABLED: False, CONF_FOLLOWUP_DELAY: 10,
    CONF_FOLLOWUP_PRE_ENABLED: False, CONF_FOLLOWUP_PRE_MEDIA: PRE_ALARM_TONES["Soft Beep"], CONF_FOLLOWUP_PRE_VOLUME: 30,
    CONF_FOLLOWUP_PRE_DURATION: 30,
    CONF_FOLLOWUP_REUSE_PRIMARY: True, CONF_FOLLOWUP_MAIN_MEDIA: None,
    CONF_FOLLOWUP_MAIN_VOLUME: 30, CONF_STOP_AFTER: 60,
    CONF_SNOOZE_DURATION: 5,
}

SERVICE_TRIGGER = "trigger"
SERVICE_TRIGGER_FOLLOW_UP = "trigger_follow_up"
SERVICE_STOP = "stop"
SERVICE_STOP_PLAYBACK = "stop_playback"
SERVICE_SNOOZE = "snooze"
SERVICE_SET_MEDIA = "set_media"
MEDIA_OPTION_KEYS = {
    "primary_main": CONF_PRIMARY_MAIN_MEDIA,
    "followup_main": CONF_FOLLOWUP_MAIN_MEDIA,
}
