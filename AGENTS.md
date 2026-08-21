# Repository instructions

- Always ask for explicit approval before committing changes. When approval is
  given to commit, commit and push by default; only omit the push when the user
  explicitly says "commit only".
- Keep the integration and any optional frontend assets in this single HACS
  integration repository while the project is under development.
- Core functionality must work without users editing `configuration.yaml` or
  loading global frontend modules.
- Lovelace cards are optional enhancements; the integration must not depend on
  them for normal configuration or operation.
- Prefer Home Assistant's standard frontend components and controls in optional
  Lovelace cards. Do not recreate native Home Assistant controls in custom HTML
  unless there is a clear, documented limitation that requires it.
- Each alarm has one configured output speaker. Media selections must not
  define their own playback speakers.
