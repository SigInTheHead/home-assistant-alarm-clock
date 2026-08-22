"""Regression tests for configuration.yaml compatibility."""

from custom_components.alarm_clock import CONFIG_SCHEMA


def test_config_schema_does_not_reject_home_assistant_configuration():
    """Alarm Clock must not interpret unrelated root configuration as its own."""
    config = {
        "default_config": {},
        "frontend": {},
        "automation": [],
        "template": [],
    }

    assert CONFIG_SCHEMA(config) == config
