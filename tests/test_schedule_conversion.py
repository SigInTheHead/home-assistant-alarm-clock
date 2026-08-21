"""Regression tests for Alarm Clock's user-visible schedule conversion rules."""
from custom_components.alarm_clock.const import DAYS, DEFAULT_OPTIONS, NUMERIC_LIMITS, SCHEDULE_COMPACT, SCHEDULE_PER_DAY, WEEKDAY_DAYS

def test_compact_defaults_hold_individual_values_for_weekdays_only():
    """Weekend times are shared; only weekdays need individual settings."""
    assert DEFAULT_OPTIONS["schedule_mode"] == SCHEDULE_COMPACT
    assert set(DEFAULT_OPTIONS["day_times"]) == set(WEEKDAY_DAYS)
    assert all(DEFAULT_OPTIONS["day_enabled"][day] for day in WEEKDAY_DAYS)

def test_weekday_selection_is_the_first_five_days():
    """The mode conversion uses Monday through Friday, never Saturday/Sunday."""
    assert WEEKDAY_DAYS == DAYS[:5]
    assert SCHEDULE_PER_DAY != SCHEDULE_COMPACT

def test_snooze_duration_has_a_safe_slider_range_and_default():
    assert DEFAULT_OPTIONS["snooze_duration"] == 5
    assert NUMERIC_LIMITS["snooze_duration"] == (1, 30)
