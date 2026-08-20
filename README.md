# Alarm Clock

Alarm Clock is a HACS custom integration for independent, configurable wake-up alarms. Each config entry creates one device, so household members can keep their schedules and playback settings separate.

## Install and set up

1. Add this repository as a HACS **Integration** and download it.
2. Restart Home Assistant.
3. Go to **Settings → Devices & services → Add Integration → Alarm Clock**.
4. Enter the alarm name and target media player. Use **Configure** on the integration entry to choose alarm media. Each alarm has one output speaker; every selected alarm sound is played on that speaker.

All normal controls are exposed as Home Assistant entities. No helper, timer, script, or automation YAML is required.

## Schedule modes

`Compact` provides Weekday, Saturday, and Sunday times. `Per-day` provides Monday–Sunday times plus a switch for each day. Changing from Compact copies Weekday to Monday–Friday and retains Saturday/Sunday. Changing back uses the earliest enabled weekday time.

## Optional Lovelace cards

The integration works without custom frontend resources. To use the optional summary and editor cards, register the JavaScript module after installing the integration and restarting Home Assistant:

1. Go to **Settings → Dashboards**.
2. Open the three-dot menu in the top-right and select **Resources**.
3. Click **Add resource**.
4. Enter the following URL and select **JavaScript module** as its type:

```text
/alarm_clock/alarm-clock.js
```

5. Save, then hard-refresh the browser.

The module is served by the installed Alarm Clock integration; do not copy it into `/config/www`.

Example summary card:

```yaml
type: custom:alarm-clock-card
entity: switch.tim_alarm_clock
navigation_path: /kitchen-control/alarm
```

Example editor card on that view:

```yaml
type: custom:alarm-clock-editor-card
entity: switch.tim_alarm_clock
```

The root switch is the alarm's canonical entity (for example, `switch.tim_alarm_clock`). Select the device's **Alarm Clock** entity in the card editor; it controls the whole alarm and lets the cards locate all sibling entities.

## Playback behaviour

Primary and follow-up sequences each support independent pre-alarm media, volume, duration, repeat interval, and main-media volume. Pre-alarm media repeats until the configured duration. Follow-up and automatic stop are measured from the primary start time. Built-in Soft Beep, Soft Chime, and Gentle Alarm tones are available in the Media browser under **Alarm Clock**.
