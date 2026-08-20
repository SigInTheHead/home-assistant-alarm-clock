# Morning Alarm

Morning Alarm is a HACS custom integration for independent, configurable wake-up alarms. Each config entry creates one device, so household members can keep their schedules and playback settings separate.

## Install and set up

1. Add this repository as a HACS **Integration** and download it.
2. Restart Home Assistant.
3. Go to **Settings → Devices & services → Add Integration → Morning Alarm**.
4. Enter the alarm name and target media player. Use **Configure** on the integration entry to choose alarm media.

All normal controls are exposed as Home Assistant entities. No helper, timer, script, or automation YAML is required.

## Schedule modes

`Compact` provides Weekday, Saturday, and Sunday times. `Per-day` provides Monday–Sunday times plus a switch for each day. Changing from Compact copies Weekday to Monday–Friday and retains Saturday/Sunday. Changing back uses the earliest enabled weekday time.

## Optional Lovelace cards

The integration works without custom frontend resources. To use the optional summary and editor cards, add this JavaScript module as a Lovelace **module** resource:

```text
/morning_alarm/morning-alarm.js
```

Example summary card:

```yaml
type: custom:morning-alarm-card
entity: switch.tim_morning_alarm_enabled
navigation_path: /kitchen-control/alarm
```

Example editor card on that view:

```yaml
type: custom:morning-alarm-editor-card
entity: switch.tim_morning_alarm_enabled
```

The exact generated entity ID is determined by Home Assistant's entity registry; select the device's **Enabled** entity in the card editor rather than relying on the example ID.

## Playback behaviour

Primary and follow-up sequences each support independent pre-alarm media, volume, duration, repeat interval, and main-media volume. Pre-alarm media repeats until the configured duration. Follow-up and automatic stop are measured from the primary start time. Built-in Soft Beep, Soft Chime, and Gentle Alarm tones are available in the Media browser under **Morning Alarm**.
