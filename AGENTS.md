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
- Each alarm has one configured output speaker. Media selections must not
  define their own playback speakers.
