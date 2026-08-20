# Alarm Clock — Home Assistant Custom Integration Specification

## 1. Purpose

Build a HACS-installable Home Assistant custom integration named **Alarm Clock** that replaces the current collection of helpers, timers, scripts, and automations used to implement configurable wake-up alarms.

The integration must support **multiple independent alarm instances**, so a separate alarm can be created for each member of a household.

Each alarm instance should be configurable entirely from the Home Assistant UI and should expose standard Home Assistant entities for dashboard use, automations, and custom cards.

The integration should also support a two-stage playback sequence for both the initial alarm and the follow-up alarm:

1. **Pre-alarm media** — typically a short beep/chime.
2. **Main media** — typically a radio station, local media file, or other Home Assistant-selectable media.

The primary and follow-up alarm stages must have independent media and volume settings.

## 2. Core Design Principles

- HACS-installable custom integration.
- UI configuration; no YAML required for normal use.
- Multiple config entries / multiple alarm instances.
- Each config entry behaves independently.
- Use standard Home Assistant entity platforms wherever practical.
- Avoid creating Home Assistant Helpers behind the scenes.
- Do not depend on global timers or global integration state.
- Use Home Assistant-native media selection and `media-source://` URIs.
- Support local media, radio-browser media, and other media supported by `media_player.play_media`.
- Bundle optional built-in pre-alarm sounds with the integration.
- Built-in sounds should be short assets, repeated or sequenced by the integration when necessary rather than shipping long multi-minute WAV files.
- Design configuration so future features such as volume ramping can be added without breaking existing entries.

## 3. Example User Experience

A user installs **Alarm Clock** from HACS, restarts Home Assistant, then selects:

**Settings → Devices & services → Add Integration → Alarm Clock**

The setup flow creates one alarm instance.

Example:

```text
Name: Tim
Media player: Bedroom Speaker
```

The user can later create additional instances:

```text
Alarm Clock - Tim
Alarm Clock - Julie
Alarm Clock - Josh
Alarm Clock - Ollie
```

Each instance appears as its own Home Assistant device with its own schedule and controls.

## 4. Proposed Repository Structure

```text
ha-alarm-clock/
├── custom_components/
│   └── alarm_clock/
│       ├── __init__.py
│       ├── manifest.json
│       ├── const.py
│       ├── config_flow.py
│       ├── coordinator.py
│       ├── alarm.py
│       ├── switch.py
│       ├── time.py
│       ├── number.py
│       ├── select.py
│       ├── sensor.py
│       ├── media_source.py
│       ├── strings.json
│       ├── translations/
│       │   └── en.json
│       └── media/
│           ├── soft-beep.wav
│           ├── soft-chime.wav
│           └── gentle-alarm.wav
├── hacs.json
├── README.md
├── LICENSE
└── tests/
```

The exact platform split can be adjusted during implementation, but the integration should remain modular.

## 5. Multi-Instance Architecture

The integration must support multiple Home Assistant config entries.

Each config entry represents one complete alarm clock.

For example:

```text
Config Entry A
  Name: Tim

Config Entry B
  Name: Julie
```

Each entry must maintain its own:

- enabled state
- schedules
- override state
- override time
- selected media player
- primary pre-alarm configuration
- primary main-media configuration
- follow-up configuration
- follow-up pre-alarm configuration
- follow-up main-media configuration
- stop timer / scheduled callback
- runtime playback state
- scheduled Home Assistant callbacks

There must be no shared timer object that can cause one person's alarm to interfere with another person's alarm.

## 6. Entities

Each alarm instance should create a Home Assistant device.

For an instance named `Tim`, suggested entities are:

```text
switch.tim_alarm_clock
switch.tim_alarm_override

time.tim_weekday_alarm
time.tim_saturday_alarm
time.tim_sunday_alarm
time.tim_override_alarm
```

Optional diagnostic/status entities:

```text
sensor.tim_alarm_clock_next_alarm
sensor.tim_alarm_clock_status
```

Possible status values:

```text
disabled
scheduled
pre_alarm
playing
follow_up_pre_alarm
follow_up_playing
stopped
```

Entity naming must follow Home Assistant's normal entity registry conventions rather than manually forcing entity IDs wherever possible.

## 7. Scheduling

Each alarm instance must support:

- Weekday alarm time — Monday to Friday
- Saturday alarm time
- Sunday alarm time
- Enabled / disabled state
- One-shot override
- One-shot override time

### 7.1 Normal Schedule

If the alarm is enabled and the override is not active:

```text
Mon-Fri → weekday time
Saturday → Saturday time
Sunday → Sunday time
```

### 7.2 One-Shot Override

If override is enabled:

- the normal scheduled alarm should be suppressed
- the alarm should fire at the configured override time
- after the override alarm fires, the override must automatically disable itself

The override is therefore one-shot.

Example:

```text
Normal weekday alarm: 06:00

Override:
  Enabled: yes
  Time: 07:30

Result:
  06:00 alarm does not fire
  07:30 alarm fires
  Override automatically becomes disabled
```

## 8. Primary Alarm Playback

When the scheduled alarm fires, the integration performs a primary alarm sequence.

### 8.1 Primary Pre-Alarm

Configurable settings:

```text
Enabled
Media
Volume
Duration / playback behaviour
```

Example:

```text
Primary Pre-Alarm
  Enabled: Yes
  Media: Built-in Soft Beep
  Volume: 25%
```

The pre-alarm is intended to be a short audible cue before the main alarm media starts.

### 8.2 Primary Main Media

Configurable settings:

```text
Media
Volume
```

Example:

```text
Primary Main Media
  Media: BBC Radio 2
  Volume: 30%
```

### 8.3 Sequence

```text
Scheduled alarm fires
        ↓
set speaker to primary pre-alarm volume
        ↓
play primary pre-alarm
        ↓
wait for configured pre-alarm completion/duration
        ↓
set speaker to primary main volume
        ↓
play primary main media
```

The integration should explicitly set the volume immediately before each playback stage.

Do not assume the media player retained a previous volume.

## 9. Follow-Up Alarm

Each alarm instance supports an optional follow-up alarm.

Configurable:

```text
Enabled
Delay after primary alarm start
```

Example:

```text
Follow-up
  Enabled: Yes
  Delay: 10 minutes
```

The follow-up timing is based on the **original primary alarm start time**, not on completion of the first media item.

## 10. Follow-Up Pre-Alarm

The follow-up alarm has its own independent pre-alarm settings.

Configurable:

```text
Media
Volume
Duration / playback behaviour
```

Example:

```text
Follow-Up Pre-Alarm
  Media: Built-in Soft Beep
  Volume: 35%
```

It may reuse the same pre-alarm media as the primary alarm, but this must not be mandatory.

## 11. Follow-Up Main Media

Configurable independently from the primary main media:

```text
Media
Volume
```

Example:

```text
Follow-Up Main Media
  Media: BBC Radio 2
  Volume: 40%
```

The UI should offer an option to reuse the primary media configuration, but internally the architecture should allow independent values.

Example sequence:

```text
06:00 Primary alarm fires
      ↓
Primary beep @ 25%
      ↓
BBC Radio 2 @ 30%
      ↓
06:10 Follow-up fires
      ↓
Follow-up beep @ 35%
      ↓
BBC Radio 2 @ 40%
```

## 12. Automatic Stop

Each alarm instance has a configurable automatic stop duration.

Example:

```text
Stop playback after: 60 minutes
```

The stop deadline must be calculated from the **primary alarm start time**.

A follow-up alarm must **not restart or extend** the automatic stop timer.

Example:

```text
06:00 Primary alarm starts
06:10 Follow-up alarm fires
07:00 Playback stops
```

The follow-up does not move the stop time to 07:10.

The integration should stop playback even if the alarm's enabled switch has subsequently been turned off.

This addresses the current automation issue where a top-level "alarm active" condition could prevent the stop event from executing.

## 13. Media Player Behaviour

The user selects a target Home Assistant `media_player` entity during configuration.

Example:

```text
media_player.bedroom_speaker
```

The integration should use:

```text
media_player.volume_set
media_player.play_media
```

and where appropriate:

```text
media_player.media_stop
```

### 13.1 Stop Error Handling

Some Google Cast / Nest speakers may reject or fail `media_stop`.

A failed stop command must not abort a subsequent playback stage.

Equivalent behaviour should be:

```yaml
continue_on_error: true
```

If a new media item is about to be played, the integration may attempt to stop the existing media first, but playback of the next media item must continue if the stop operation fails.

## 14. Home Assistant Media Selection

Do not hard-code BBC Radio 2 or any other media source.

The user must be able to select media using Home Assistant's media browser / media selector.

Stored values should use Home Assistant-compatible media identifiers, for example:

```text
media-source://radio_browser/...
```

or:

```text
media-source://media_source/local/...
```

The configuration should preserve both:

```text
media_content_id
media_content_type
```

and any other metadata required by Home Assistant's media selector implementation.

## 15. Built-In Media

The integration should ship with optional built-in alarm sounds.

Suggested initial sounds:

```text
Soft Beep
Soft Chime
Gentle Alarm
```

These are intended mainly for pre-alarm use.

The bundled files should be short.

Example:

```text
soft-beep.wav     ~2 seconds
soft-chime.wav    ~2 seconds
gentle-alarm.wav  ~3 seconds
```

Do not bundle 2-minute, 3-minute, or 10-minute WAV files.

If a repeating sound is required, repeat/replay the short asset in software.

## 16. Media Source Integration

Prefer implementing a Home Assistant media-source provider so bundled media is visible in the Media browser.

Desired presentation:

```text
Media
└── Alarm Clock
    ├── Soft Beep
    ├── Soft Chime
    └── Gentle Alarm
```

Users should be able to select built-in sounds through the same UI model used for other media.

If implementing a full media source provider substantially complicates the first version, built-in assets may initially be selectable from an integration-specific selector, but the architecture should allow migration to Media Source later.

## 17. Config Flow

Initial setup should be deliberately small.

Suggested first screen:

```text
Alarm name
Media player
```

Example:

```text
Name: Tim
Media player: Bedroom Speaker
```

After creation, detailed settings should be available through the integration's options flow.

## 18. Options Flow

Suggested configuration sections:

### General

```text
Name
Media player
Enabled by default
```

### Schedule

```text
Weekday time
Saturday time
Sunday time
```

### Primary Alarm

```text
Pre-alarm enabled
Pre-alarm media
Pre-alarm volume
Pre-alarm duration

Main media
Main volume
```

### Follow-Up

```text
Follow-up enabled
Follow-up delay

Follow-up pre-alarm enabled
Follow-up pre-alarm media
Follow-up pre-alarm volume
Follow-up pre-alarm duration

Reuse primary main media
Follow-up main media
Follow-up main volume
```

### Playback

```text
Stop after
```

Keep configuration values internally normalized.

Suggested units:

```text
volume: 0.0 - 1.0
durations: seconds
times: native time objects / serialized HA-supported values
```

The UI can display volumes as percentages.

## 19. Runtime Scheduling

Use Home Assistant's native event-loop scheduling helpers.

Do not implement polling loops.

Recommended design:

- schedule next normal alarm callback
- reschedule when a time entity/configuration changes
- schedule override separately when override is active
- schedule follow-up callback when primary alarm begins
- schedule automatic-stop callback when primary alarm begins
- cancel callbacks when entry is unloaded
- restore schedule after Home Assistant restart

The integration must correctly reconstruct future scheduled callbacks when Home Assistant starts.

## 20. Restart Behaviour

After Home Assistant restart:

- alarm schedules must still exist
- enabled state must persist
- override state/time must persist
- the next alarm must be rescheduled
- multiple config entries must each restore independently

If Home Assistant restarts while media is already playing, version 1 does not need to reconstruct an in-progress alarm sequence unless straightforward.

However, the next future scheduled alarm must remain correct.

## 21. Concurrency

An individual alarm instance should avoid overlapping its own playback sequences.

Suggested behaviour:

- a new alarm event for the same config entry supersedes the previous playback stage where sensible
- follow-up is associated with the currently active primary alarm occurrence
- stale follow-up callbacks from a previous occurrence must not trigger

Use an occurrence ID/token or equivalent internal mechanism if necessary.

Different alarm instances must be allowed to operate independently.

## 22. Shared Speaker Consideration

Multiple alarm instances may target the same media player.

Version 1 does not need to arbitrate ownership of a shared speaker.

Document that if two alarms fire at the same time on the same media player, the most recent `play_media` call may replace the previous one.

The architecture should not make future arbitration impossible.

## 23. Suggested Device Representation

Each config entry should create one HA device.

Example:

```text
Device: Alarm Clock - Tim
Manufacturer: Custom Integration
Model: Alarm Clock
```

Associated entities:

```text
Enabled
Override
Weekday time
Saturday time
Sunday time
Override time
Next alarm
Status
```

The device name should include the user-defined alarm name.

## 24. Custom Dashboard Card

There is an existing custom Lovelace card:

```yaml
type: custom:alarm-clock-card
```

The existing card currently reads helper entities such as:

```text
input_boolean.alarm_active
input_boolean.alarm_override
input_datetime.weekday_alarm_time
input_datetime.saturday_alarm_time
input_datetime.sunday_alarm_time
input_datetime.override_alarm_time
```

The integration should expose equivalent standard entities so this card can later be adapted.

Do not make the integration depend on the custom card.

The integration must work fully using standard Home Assistant UI controls.

A later version of the card may support selecting an Alarm Clock device/config entry instead of manually specifying individual entities.

## 25. Existing Behaviour to Preserve

The current implementation has the following behaviour and the integration must preserve it:

### Active Toggle

The whole alarm can be enabled/disabled.

### Weekday / Weekend Scheduling

Separate:

```text
Mon-Fri
Saturday
Sunday
```

### Override

One-shot override time which suppresses that day's normal alarm and automatically clears after use.

### Follow-Up

A second alarm fires after the configured delay regardless of interaction with the first alarm.

### Overall Stop

Playback stops after a configured duration calculated from the first alarm's start time.

### Independent Follow-Up Volume

The follow-up can be louder than the primary alarm.

## 26. Current Real-World Example

Current setup behaviour is approximately:

```text
Primary alarm
  Speaker: Bedroom Speaker
  Main media: BBC Radio 2
  Volume: 30%

Follow-up
  Volume: 40%

Automatic stop
  Based on original primary playback start time
```

The integration extends this to:

```text
Primary
  Pre-alarm media
  Pre-alarm volume
  Main media
  Main volume

Follow-up
  Delay
  Pre-alarm media
  Pre-alarm volume
  Main media
  Main volume
```

## 27. Future Features — Do Not Implement in V1 Unless Easy

The architecture should leave room for:

### Volume Ramping

Example:

```text
Main media starts: 30%
Ramp to: 40%
Over: 5 minutes
```

### Multiple Speakers

Allow one alarm instance to target a media player group or multiple speakers.

### Per-Day Schedules

Separate alarm times for every day of the week.

### Holiday / Workday Integration

Optional integration with Home Assistant Workday sensors.

### Snooze

Expose a service/button to snooze the active alarm.

### Alarm History

Track:

```text
last fired
last follow-up
last stopped
```

### User Presence Conditions

Optionally only run an alarm when a selected person is home.

These should not complicate the first release.

## 28. Services / Actions

Consider exposing integration actions such as:

```text
alarm_clock.trigger
alarm_clock.trigger_follow_up
alarm_clock.stop
alarm_clock.enable_override
alarm_clock.cancel_override
```

Example intended use:

```yaml
action: alarm_clock.trigger
target:
  device_id: ...
```

This would make manual testing and external automations easier.

Services should operate on a specific alarm instance/device rather than globally.

## 29. Testing Requirements

At minimum, tests should cover:

### Schedule selection

- weekday alarm fires Monday-Friday
- Saturday alarm only fires Saturday
- Sunday alarm only fires Sunday

### Disable

- disabled alarm does not fire

### Override

- override suppresses normal alarm
- override fires at override time
- override automatically clears

### Primary Playback

- pre-alarm volume set
- pre-alarm media played
- main volume set
- main media played

### Follow-Up

- follow-up fires at correct delay
- follow-up has independent media/volume
- follow-up does not move overall stop deadline

### Stop

- stop fires based on primary alarm start
- stop still runs if the alarm has since been disabled
- failure of `media_stop` does not prevent later playback stages

### Multiple Entries

- Tim and Julie alarms maintain independent schedules/state
- unloading one entry does not affect another

### Restart

- schedules restore after integration reload / HA restart simulation

## 30. Acceptance Criteria for V1

V1 is complete when:

1. The integration can be installed as a HACS custom repository.
2. Home Assistant discovers it under Add Integration.
3. Multiple Alarm Clock instances can be created.
4. Each instance can select its own media player.
5. Each instance exposes enabled, override, weekday, Saturday, Sunday, and override-time entities.
6. Weekday/Saturday/Sunday scheduling works.
7. One-shot override works and automatically resets.
8. Primary pre-alarm media can be configured.
9. Primary pre-alarm volume can be configured.
10. Primary main media can be selected through Home Assistant media selection.
11. Primary main volume can be configured.
12. Follow-up delay can be configured.
13. Follow-up pre-alarm media and volume can be configured independently.
14. Follow-up main media and volume can be configured independently.
15. Automatic playback stop works from the original primary alarm start time.
16. Follow-up does not extend the automatic-stop deadline.
17. Built-in soft alarm sounds are available.
18. A media stop failure does not abort the rest of an alarm transition.
19. Integration reload/restart correctly reschedules future alarms.
20. Two or more alarm instances operate independently.

## 31. Suggested Implementation Order

### Phase 1 — Skeleton

- repository structure
- manifest
- HACS metadata
- config flow
- multiple config entry support
- one device per entry

### Phase 2 — Entities

- enabled switch
- override switch
- weekday time
- Saturday time
- Sunday time
- override time
- next-alarm sensor

### Phase 3 — Scheduler

- normal schedule
- override schedule
- persistence/reload

### Phase 4 — Playback Engine

Create a reusable internal playback engine such as:

```python
async_play_alarm_stage(
    media_player,
    pre_alarm_media,
    pre_alarm_volume,
    pre_alarm_duration,
    main_media,
    main_volume,
)
```

Do not duplicate playback logic for primary and follow-up.

### Phase 5 — Follow-Up and Stop

- follow-up callback
- overall stop callback
- occurrence protection
- stop error handling

### Phase 6 — Built-In Media

- short soft alarm files
- media source support
- media browser integration if practical

### Phase 7 — Polish

- translations
- diagnostics
- README
- tests
- HACS validation

## 32. Important Naming Note

Avoid naming the integration simply `alarm` because Home Assistant already has alarm-related domains and concepts.

Suggested domain:

```text
alarm_clock
```

Suggested display name:

```text
Alarm Clock
```

## 33. Codex Task

Implement the above as a production-quality Home Assistant custom integration.

Prioritize:

1. correct Home Assistant architecture
2. multi-config-entry support
3. reliable scheduling
4. clean async behaviour
5. standard HA entities
6. no helper/automation YAML dependency
7. safe media-player error handling
8. maintainable separation between scheduling and playback logic

Before implementing unusual custom behaviour, prefer Home Assistant's standard APIs, selectors, entity models, config-entry lifecycle, and async scheduling utilities.

Where this specification leaves implementation details open, choose the approach most consistent with current Home Assistant custom-integration development practices.
