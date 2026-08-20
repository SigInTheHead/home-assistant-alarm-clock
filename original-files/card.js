class MorningAlarmCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
  }

  setConfig(config) {
    this._config = {
      alarm_active: "input_boolean.alarm_active",
      alarm_override: "input_boolean.alarm_override",
      weekday_time: "input_datetime.weekday_alarm_time",
      saturday_time: "input_datetime.saturday_alarm_time",
      sunday_time: "input_datetime.sunday_alarm_time",
      override_time: "input_datetime.override_alarm_time",
      navigation_path: null,
      ...config
    };

    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  getState(entityId) {
    return this._hass?.states?.[entityId];
  }

  isOn(entityId) {
    return this.getState(entityId)?.state === "on";
  }

  formatTime(entityId) {
    const state = this.getState(entityId);

    if (!state) {
      return "--:--";
    }

    const raw = state.state;

    if (!raw || raw === "unknown" || raw === "unavailable") {
      return "--:--";
    }

    const parts = raw.split(":");

    if (parts.length < 2) {
      return raw;
    }

    return `${parts[0]}:${parts[1]}`;
  }

  showMoreInfo(entityId) {
    this.dispatchEvent(
        new CustomEvent(
            "hass-more-info",
            {
              bubbles: true,
              composed: true,
              detail: {
                entityId
              }
            }
        )
    );
  }

  navigate() {
    if (!this._config.navigation_path) {
      return;
    }

    window.history.pushState(
        null,
        "",
        this._config.navigation_path
    );

    window.dispatchEvent(
        new Event("location-changed")
    );
  }

  render() {
    if (!this.shadowRoot || !this._hass) {
      return;
    }

    const alarmActive =
        this.isOn(this._config.alarm_active);

    const overrideActive =
        this.isOn(this._config.alarm_override);

    this.shadowRoot.innerHTML = `
      ${this.getStyles()}

      <ha-card>
        <div
          class="card ${
        this._config.navigation_path
            ? "clickable"
            : ""
    }"
          id="card"
        >

          <div class="top-row">

            <div class="heading">
              <div class="icon main-icon ${alarmActive ? "alarm-on" : ""}">
                <ha-icon icon="mdi:alarm"></ha-icon>
              </div>

              <div>
                <div class="title">
                  Morning Alarm
                </div>

                <div class="subtitle">
                  ${
        alarmActive
            ? "Enabled"
            : "Disabled"
    }
                </div>
              </div>
            </div>

          </div>


          <div class="times">

            ${this.renderTime(
        "Mon–Fri",
        this._config.weekday_time,
        "mdi:calendar-week"
    )}

            ${this.renderTime(
        "Saturday",
        this._config.saturday_time,
        "mdi:calendar"
    )}

            ${this.renderTime(
        "Sunday",
        this._config.sunday_time,
        "mdi:calendar"
    )}

          </div>


          <div class="divider"></div>


          <div class="override-row">

            <div class="override-left">

              <div class="
                icon
                override-icon
                ${
        overrideActive
            ? "override-on"
            : ""
    }
              ">
                <ha-icon
                  icon="mdi:alarm-plus">
                </ha-icon>
              </div>

              <div>
                <div class="override-title">
                  Override
                </div>

                <div
                  class="override-time"
                  id="override-time"
                >
                  ${this.formatTime(
        this._config.override_time
    )}
                </div>
              </div>

            </div>


            <div class="override-actions">

              ${
        overrideActive
            ? `
                    <div class="badge">
                      OVERRIDE ACTIVE
                    </div>
                  `
            : ""
    }

            </div>

          </div>

        </div>
      </ha-card>
    `;

    this.shadowRoot
        .getElementById("card")
        ?.addEventListener(
            "click",
            () => this.navigate()
        );

    this.shadowRoot
        .getElementById("override-time")
        ?.addEventListener(
            "click",
            (event) => {
              event.stopPropagation();

              this.showMoreInfo(
                  this._config.override_time
              );
            }
        );
  }

  renderTime(label, entityId, icon) {
    return `
      <div class="time-item">
        <div class="time-label">
          <ha-icon icon="${icon}"></ha-icon>
          <span>${label}</span>
        </div>

        <div class="time-value">
          ${this.formatTime(entityId)}
        </div>
      </div>
    `;
  }

  getStyles() {
    return `
      <style>

        :host {
          display: block;
        }

        ha-card {
          overflow: hidden;
        }

        .card {
          padding: 14px 16px;
        }

        .card.clickable {
          cursor: pointer;
        }

        .top-row,
        .override-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .heading,
        .override-left {
          display: flex;
          align-items: center;
          min-width: 0;
        }

        .icon {
          width: 36px;
          height: 36px;

          flex: 0 0 36px;

          display: flex;
          align-items: center;
          justify-content: center;

          margin-right: 10px;

          border-radius: 50%;

          background:
            var(--secondary-background-color);

          color:
            var(--secondary-text-color);
        }

        .icon ha-icon {
          --mdc-icon-size: 21px;
        }

        .main-icon {
          color:
            var(--secondary-text-color);
        }

        .main-icon.alarm-on {
          color:
            var(--warning-color, #ff9800);
        }

        .override-icon {
          color:
            var(--secondary-text-color);
        }

        .override-icon.override-on {
          color:
            var(--warning-color, #ff9800);
        }

        .title,
        .override-title {
          font-size: 15px;
          font-weight: 600;
          line-height: 1.2;
        }

        .subtitle {
          margin-top: 2px;

          font-size: 11px;

          color:
            var(--secondary-text-color);
        }

        .times {
          display: grid;

          grid-template-columns:
            repeat(3, minmax(0, 1fr));

          gap: 8px;

          margin-top: 12px;
        }

        .time-item {
          padding: 8px 10px;

          border-radius: 12px;

          background:
            var(--secondary-background-color);

          color:
            var(--primary-text-color);

          text-align: left;
        }

        .time-label {
          display: flex;
          align-items: center;
          gap: 5px;

          font-size: 10px;

          color:
            var(--secondary-text-color);
        }

        .time-label ha-icon {
          --mdc-icon-size: 14px;
        }

        .time-value {
          margin-top: 3px;

          font-size: 17px;
          font-weight: 600;
        }

        .divider {
          height: 1px;

          margin: 12px 0;

          background:
            var(--divider-color);
        }

        .override-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .override-time {
          margin-top: 2px;

          font-size: 17px;
          font-weight: 600;

          cursor: pointer;
        }

        .badge {
          padding: 4px 7px;

          border-radius: 999px;

          background:
            rgba(255, 152, 0, 0.16);

          color:
            var(--warning-color, #ff9800);

          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.04em;

          white-space: nowrap;
        }

        @media (max-width: 430px) {

          .card {
            padding: 12px;
          }

          .times {
            gap: 6px;
          }

          .time-item {
            padding: 7px 8px;
          }

          .time-value {
            font-size: 15px;
          }

          .badge {
            display: none;
          }

        }

      </style>
    `;
  }

  getCardSize() {
    return 2;
  }

  static getStubConfig() {
    return {
      alarm_active:
          "input_boolean.alarm_active",

      alarm_override:
          "input_boolean.alarm_override",

      weekday_time:
          "input_datetime.weekday_alarm_time",

      saturday_time:
          "input_datetime.saturday_alarm_time",

      sunday_time:
          "input_datetime.sunday_alarm_time",

      override_time:
          "input_datetime.override_alarm_time",

      navigation_path:
          null
    };
  }
}

if (
    !customElements.get(
        "morning-alarm-card"
    )
) {
  customElements.define(
      "morning-alarm-card",
      MorningAlarmCard
  );
}

window.customCards =
    window.customCards || [];

if (
    !window.customCards.some(
        card =>
            card.type === "morning-alarm-card"
    )
) {
  window.customCards.push({
    type:
        "morning-alarm-card",

    name:
        "Morning Alarm",

    description:
        "Compact configurable wake-up alarm card with one-shot override."
  });
}

console.info(
    "%c MORNING-ALARM-CARD ",
    "color: white; background: #03a9f4; font-weight: bold;"
);