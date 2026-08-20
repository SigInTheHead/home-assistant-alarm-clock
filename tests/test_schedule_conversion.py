"""Regression tests for Morning Alarm's user-visible schedule conversion rules."""
from custom_components.morning_alarm.const import DAYS, DEFAULT_OPTIONS, SCHEDULE_COMPACT, SCHEDULE_PER_DAY, WEEKDAY_DAYS

def test_compact_defaults_cover_every_day():
    """A new compact schedule has values ready to expand to all seven days."""
    assert DEFAULT_OPTIONS["schedule_mode"] == SCHEDULE_COMPACT
    assert set(DEFAULT_OPTIONS["day_times"]) == set(DAYS)
    assert all(DEFAULT_OPTIONS["day_enabled"][day] for day in DAYS)

def test_weekday_selection_is_the_first_five_days():
    """The mode conversion uses Monday through Friday, never Saturday/Sunday."""
    assert WEEKDAY_DAYS == DAYS[:5]
    assert SCHEDULE_PER_DAY != SCHEDULE_COMPACT
