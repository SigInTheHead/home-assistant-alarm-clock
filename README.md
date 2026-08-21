# Alarm Clock

Alarm Clock is a HACS custom integration for independent, configurable wake-up alarms. Each config entry creates one device, so household members can keep their schedules and playback settings separate.

## Install and set up

1. Add this repository as a HACS **Integration** and download it.
2. Restart Home Assistant.
3. Go to **Settings → Devices & services → Add Integration → Alarm Clock**.
4. Enter the alarm name and target media player. Use **Configure** on the integration entry to choose alarm media. Each alarm has one output speaker; every selected alarm sound is played on that speaker.

All normal controls are exposed as Home Assistant entities. No helper, timer, script, or automation YAML is required.

## Schedule modes

Choose the mode in **Settings → Devices & services → Alarm Clock → Configure**. `Compact` provides Weekday, Saturday, and Sunday times, each with an enable switch. `Per-day` provides separately enabled Monday–Friday times and the same independently enabled Saturday and Sunday controls. Changing from Compact copies the Weekday time and enabled state to Monday–Friday. Changing back uses the earliest enabled weekday time.

Choose **Minute granularity** in the same Configure screen to set the editor's minute-arrow step: 1, 2, 5, 10, 15, or 30 minutes.

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
```

Example editor card on that view:

```yaml
type: custom:alarm-clock-editor-card
entity: switch.tim_alarm_clock
```

Example advanced playback card:

```yaml
type: custom:alarm-clock-advanced-card
entity: switch.tim_alarm_clock
```

The root switch is the alarm's canonical entity (for example, `switch.tim_alarm_clock`). Select the device's **Alarm Clock** entity in the card editor; it controls the whole alarm and lets the cards locate all sibling entities.

## Playback behaviour

Primary and follow-up sequences each support an independent built-in pre-alarm tone, volume, run duration, and main media. Choose the pre-alarm tones and main media from the optional Advanced card; disable a pre-alarm switch when it is not wanted. Main media uses Home Assistant's native media picker, so it can be local audio, radio, or another supported source. Built-in tracks loop for five minutes. Follow-up and automatic stop are measured from the primary start time.
