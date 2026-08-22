/* Optional Alarm Clock Lovelace cards. No build step or external dependency. */
const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const SUMMARY_FEATURES = {
  alarm_times: { label: "Alarm time cards", icon: "mdi:calendar-clock" },
  alarm_time_list: { label: "Compact alarm time list", icon: "mdi:format-list-bulleted" },
  override: { label: "Override time", icon: "mdi:calendar-sync" },
  snooze: { label: "Snooze", icon: "mdi:alarm-snooze", stop_label: "Stop", stop_icon: "mdi:stop-circle" },
  skip: { label: "Skip", icon: "mdi:skip-next" },
  stop_alarm: { label: "Stop alarm", icon: "mdi:stop-circle" },
};

const featureType = (type) => type === "kill_alarm" ? "stop_alarm" : type === "stop_playback" ? "snooze" : type;
const normaliseFeature = (feature) => {
  const type = featureType(feature?.type);
  return SUMMARY_FEATURES[type] ? { ...SUMMARY_FEATURES[type], ...feature, type } : null;
};
const legacySummaryFeatures = (config) => {
  const visible = {
    alarm_times: config.show_alarm_times !== false,
    alarm_time_list: config.show_alarm_time_list === true,
    snooze: config.show_snooze === true || config.show_stop_playback === true,
    skip: config.show_skip !== false,
    stop_alarm: config.show_kill_alarm === true,
    override: config.show_override !== false,
  };
  const order = [...new Set([
    ...(config.feature_order || []).map(featureType),
    "alarm_times", "override", "alarm_time_list", "snooze", "skip", "stop_alarm",
  ])];
  return order.filter((type) => visible[type]).map((type) => normaliseFeature({ type }));
};
const summaryFeatures = (config) => Array.isArray(config.features)
  ? config.features.map(normaliseFeature).filter(Boolean)
  : legacySummaryFeatures(config);

class AlarmClockBase extends HTMLElement {
  setConfig(config) { if (!config.entity) throw new Error("Set entity to the root Alarm Clock switch"); this.config = config; this.render(); }
  set hass(hass) {
    const previous = this._hass;
    this._hass = hass;
    if (!previous || this._alarmStateChanged(previous, hass)) this.render();
  }
  connectedCallback() { if (!this.shadowRoot) this.attachShadow({ mode: "open" }); this.render(); }
  _alarmStateChanged(previous, current) {
    const root = this.config?.entity;
    const entryId = current.states?.[root]?.attributes?.alarm_clock_entry_id || previous.states?.[root]?.attributes?.alarm_clock_entry_id;
    if (!entryId) return previous.states?.[root] !== current.states?.[root];
    const ids = new Set([...Object.keys(previous.states || {}), ...Object.keys(current.states || {})]);
    return [...ids].some((id) => {
      const oldState = previous.states[id], newState = current.states[id];
      return oldState !== newState && (oldState?.attributes?.alarm_clock_entry_id === entryId || newState?.attributes?.alarm_clock_entry_id === entryId);
    });
  }
  entities() { const entryId = this._hass?.states?.[this.config?.entity]?.attributes?.alarm_clock_entry_id; return Object.entries(this._hass?.states || {}).filter(([, state]) => state.attributes?.alarm_clock_entry_id === entryId).map(([entity_id, state]) => ({ entity_id, state, key: state.attributes.alarm_clock_key })); }
  find(key) { return this.entities().find((item) => item.key === key); }
  value(key) {
    const rootValue = this._hass?.states?.[this.config?.entity]?.attributes?.[key];
    if (key === "status" && rootValue !== undefined) return rootValue;
    return this.find(key)?.state.state ?? rootValue;
  }
  scheduleMode() {
    const configured = this.value("schedule_mode");
    if (configured) return configured;
    const monday = this.find("per_day_monday_time")?.state;
    return monday && monday.state !== "unavailable" ? "per_day" : "compact";
  }
  async set(key, domain, service, data) { const item = this.find(key); if (item) await this._hass.callService(domain, service, { entity_id: item.entity_id, ...data }); }
  styles() { return `<style>:host{display:block}ha-card{padding:0}.card-header{display:flex;align-items:center;gap:8px;padding:16px 16px 0;font-size:20px;font-weight:500;line-height:1.4}.card-header ha-icon{--mdc-icon-size:24px}.card-content{padding:0 16px 16px}.sub,label{color:var(--secondary-text-color);font-size:13px}.card-content>.sub{margin-top:2px}.row,.media-selector{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 0}.media-selector ha-selector{flex:1;max-width:70%}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:8px;margin:12px 0}.box{background:var(--secondary-background-color);border-radius:8px;padding:9px}.schedule-list{margin:4px 0}.schedule-list .row{padding:1px 0;font-size:13px}.schedule-list .row+.row{border-top:1px solid color-mix(in srgb,var(--divider-color) 45%,transparent)}.schedule-list b{font-variant-numeric:tabular-nums}.config-warning{margin-top:8px;color:var(--error-color);font-size:13px}.alarm-action{width:100%;margin-top:8px;padding:10px;background:var(--primary-color);border:0;color:var(--text-primary-color,#fff);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px}.alarm-action ha-icon{--mdc-icon-size:20px}.alarm-action.stop-action{background:var(--error-color)}.alarm-action:disabled{background:var(--disabled-color,#7f7f7f);color:var(--disabled-text-color,#aaa);cursor:not-allowed}.time-header{display:flex;align-items:center;justify-content:space-between;gap:8px}input,select,button{font:inherit;padding:6px;border-radius:6px;background:var(--secondary-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color)}button.alarm-action{border:0}.time-controls{display:grid;grid-template-columns:1fr 14px 1fr;justify-items:center;align-items:center;margin-top:6px}.time-controls button{width:100%;padding:2px;border:0;background:transparent;font-size:18px;line-height:1;cursor:pointer}.time-value{font-size:20px;font-weight:600;padding:5px 0}.time-separator{font-size:18px}.hidden{display:none}</style>`; }
}

class AlarmClockCard extends AlarmClockBase {
  static getConfigElement() { return document.createElement("alarm-clock-card-config-editor"); }
  static getStubConfig(hass) {
    const entity = Object.keys(hass.states).find((id) => hass.states[id].attributes?.alarm_clock_entry_id);
    return { entity, title: "Alarm Overview", icon: "mdi:alarm" };
  }
  render() {
    if (!this.shadowRoot || !this._hass || !this.config) return;
    const mode = this.scheduleMode();
    const schedule = mode === "per_day"
      ? [["Monday", "per_day_monday_time"], ["Tuesday", "per_day_tuesday_time"], ["Wednesday", "per_day_wednesday_time"], ["Thursday", "per_day_thursday_time"], ["Friday", "per_day_friday_time"], ["Saturday", "saturday_time"], ["Sunday", "sunday_time"]]
      : [["Mon–Fri", "weekday_time"], ["Saturday", "saturday_time"], ["Sunday", "sunday_time"]];
    const next = this.value("next_alarm");
    const enabled = this._hass.states[this.config.entity]?.state === "on";
    const entryId = this._hass.states[this.config.entity]?.attributes?.alarm_clock_entry_id;
    const status = this.value("status");
    const playbackActive = ["pre_alarm", "playing", "follow_up_pre_alarm", "follow_up_playing"].includes(status);
    const alarmActive = this.value("alarm_active") === true || playbackActive;
    const configurationError = this.value("alarm_configuration_error");
    const snoozeDuration = Number(this.value("snooze_duration")) || 5;
    const stopDeadline = this.value("stop_deadline");
    const snoozeWouldStop = this.value("snooze_would_stop") === true || (stopDeadline && new Date(stopDeadline).getTime() - Date.now() <= snoozeDuration * 60000);
    const snoozing = status === "snoozed";
    const canSkip = this.value("can_skip") === true;
    const friendlyNext = () => {
      if (!enabled) return "Next: alarm is off";
      if (!next || next === "unknown") return "Next: not scheduled";
      const date = new Date(next), now = new Date();
      const at = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const day = date.toDateString();
      if (day === now.toDateString()) return `Next: today at ${at}`;
      const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
      if (day === tomorrow.toDateString()) return `Next: tomorrow at ${at}`;
      return `Next: ${date.toLocaleDateString([], { weekday: "long", day: "numeric", month: "short" })} at ${at}`;
    };
    const actionButton = (feature, action, disabled, stopAction = false, label = feature.label) => `<button class="alarm-action${stopAction ? " stop-action" : ""}" data-action="${action}" ${disabled ? "disabled" : ""}><ha-icon icon="${esc(feature.icon)}"></ha-icon><span>${esc(label)}</span></button>`;
    const renderFeature = (feature) => {
      if (feature.type === "alarm_times") return `<div class="grid">${schedule.map(([label,key]) => `<div class="box"><label>${label}</label><br><b>${esc((this.value(key) || this._hass.states[this.config.entity]?.attributes?.day_times?.[key.replace("per_day_", "").replace("_time", "")] || "--:--").slice(0,5))}</b></div>`).join("")}</div>`;
      if (feature.type === "alarm_time_list") return `<div class="schedule-list">${schedule.map(([label,key]) => `<div class="row"><span>${label}</span><b>${esc((this.value(key) || this._hass.states[this.config.entity]?.attributes?.day_times?.[key.replace("per_day_", "").replace("_time", "")] || "--:--").slice(0,5))}</b></div>`).join("")}</div>`;
      if (feature.type === "snooze") {
        const activeFeature = snoozeWouldStop ? { ...feature, label: feature.stop_label, icon: feature.stop_icon } : feature;
        return actionButton(activeFeature, snoozeWouldStop ? "stop" : "snooze", !playbackActive, snoozeWouldStop, snoozing ? "Snoozing" : activeFeature.label);
      }
      if (feature.type === "skip") return actionButton(feature, "skip", !canSkip);
      if (feature.type === "stop_alarm") return actionButton(feature, "stop", !alarmActive, true);
      if (feature.type === "override") return `<div class="row override"><span>One-shot override <span class="sub">${esc((this.value("override_time") || "--:--").slice(0,5))}</span></span><ha-switch data-toggle="override" aria-label="Enable one-shot override"></ha-switch></div>`;
      return "";
    };
    this.shadowRoot.innerHTML = `${this.styles()}<ha-card class="summary"><div class="card-header"><ha-icon icon="${esc(this.config.icon || "mdi:alarm")}"></ha-icon><span>${esc(this.config.title || this.config.name || "Alarm Overview")}</span></div><div class="card-content"><div class="sub">${esc(friendlyNext())}</div>${configurationError ? `<div class="config-warning">${esc(configurationError)}</div>` : ""}<div class="row"><span>Enabled</span><ha-switch data-toggle="enabled" aria-label="Enable alarm"></ha-switch></div>${summaryFeatures(this.config).map(renderFeature).join("")}</div></ha-card>`;
    this.shadowRoot.querySelectorAll("ha-switch[data-toggle]").forEach((el) => {
      el.checked = this.value(el.dataset.toggle) === "on";
      if (el.dataset.toggle === "enabled") el.disabled = Boolean(configurationError) && !el.checked;
      el.onchange = () => this.set(el.dataset.toggle, "switch", el.checked ? "turn_on" : "turn_off", {});
    });
    this.shadowRoot.querySelectorAll("button[data-action]").forEach((button) => {
      button.onclick = () => this._hass.callService("alarm_clock", button.dataset.action, { entry_id: entryId });
    });
    if (this._snoozeLabelTimer) clearTimeout(this._snoozeLabelTimer);
    if (playbackActive && stopDeadline && !snoozeWouldStop) {
      const delay = new Date(stopDeadline).getTime() - Date.now() - snoozeDuration * 60000;
      if (delay > 0) this._snoozeLabelTimer = setTimeout(() => this.render(), delay + 50);
    }
  }
}

class AlarmClockCardConfigEditor extends HTMLElement {
  setConfig(config) { const firstConfig = !this._config; this._config = { ...config }; if (firstConfig && this.isConnected) this.render(); }
  set hass(hass) { this._hass = hass; }
  connectedCallback() { this.attachShadow({ mode: "open" }); this.render(); }
  _update(config) { this._config = config; this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true })); }
  _updateFeatures(features) {
    const config = { ...this._config, features };
    ["feature_order", "show_alarm_times", "show_alarm_time_list", "show_snooze", "show_stop_playback", "show_skip", "show_kill_alarm", "show_override"].forEach((key) => delete config[key]);
    this._update(config);
  }
  render() {
    if (!this.shadowRoot || !this._config) return;
    const features = summaryFeatures(this._config);
    const available = Object.keys(SUMMARY_FEATURES).filter((type) => !features.some((feature) => feature.type === type));
    const actionSettings = (feature) => ["snooze", "skip", "stop_alarm"].includes(feature.type) ? `<ha-expansion-panel class="feature-settings" ${this._editingFeature === feature.type ? "expanded" : ""}><span slot="header">${esc(feature.label)} settings</span><label>Label<input data-feature-field="label" data-feature="${feature.type}" value="${esc(feature.label)}"></label><label>Icon<ha-icon-picker data-feature-icon="icon" data-feature="${feature.type}"></ha-icon-picker></label>${feature.type === "snooze" ? `<label>Stop label<input data-feature-field="stop_label" data-feature="snooze" value="${esc(feature.stop_label)}"></label><label>Stop icon<ha-icon-picker data-feature-icon="stop_icon" data-feature="snooze"></ha-icon-picker></label>` : ""}</ha-expansion-panel>` : "";
    const featureRows = features.map((feature) => `<div class="feature" draggable="true" data-feature="${feature.type}"><span class="drag-handle" title="Drag to reorder">⠿</span><ha-icon icon="${esc(feature.icon)}"></ha-icon><span>${esc(feature.label)}</span>${["snooze", "skip", "stop_alarm"].includes(feature.type) ? `<ha-icon-button data-edit="${feature.type}" label="Edit ${esc(feature.label)}"><ha-icon icon="mdi:pencil"></ha-icon></ha-icon-button>` : ""}<ha-icon-button data-remove="${feature.type}" label="Remove ${esc(feature.label)}"><ha-icon icon="mdi:delete"></ha-icon></ha-icon-button></div>${actionSettings(feature)}`).join("");
    this.shadowRoot.innerHTML = `<style>:host{display:block;padding:12px 0}.field{display:block;margin:0 0 16px}.field span{display:block;margin-bottom:6px;color:var(--primary-text-color);font-size:14px}.field small{display:block;margin-top:4px;color:var(--secondary-text-color)}input{box-sizing:border-box;width:100%;padding:10px;border:1px solid var(--divider-color);border-radius:6px;background:var(--card-background-color);color:var(--primary-text-color);font:inherit}ha-entity-picker,ha-icon-picker,ha-selector{display:block;width:100%}.features{border:1px solid var(--divider-color);border-radius:8px;overflow:hidden}.features-toggle{font:inherit;color:var(--primary-text-color);cursor:pointer;display:flex;width:100%;align-items:center;justify-content:space-between;padding:12px;border:0;background:var(--card-background-color);font-weight:600}.features-body{padding:4px 12px 12px;border-top:1px solid var(--divider-color)}.feature{display:flex;align-items:center;gap:8px;padding:8px 0;cursor:grab}.feature ha-icon{color:var(--secondary-text-color)}.feature ha-icon-button{margin-left:auto}.feature ha-icon-button+ha-icon-button{margin-left:0}.drag-handle{color:var(--secondary-text-color);font-size:18px}.add-feature{margin-top:8px}.feature-settings{margin:0 0 8px}.feature-settings label{display:block;margin:10px 0}.feature-settings ha-icon-picker{margin-top:6px}</style><label class="field"><span>Entity</span><ha-entity-picker id="entity"></ha-entity-picker><small>Select the root Alarm Clock switch.</small></label><label class="field"><span>Title</span><input data-key="title" value="${esc(this._config.title || this._config.name || "Alarm Overview")}"></label><label class="field"><span>Icon</span><ha-icon-picker id="icon"></ha-icon-picker></label><section class="features"><button class="features-toggle" id="features" aria-expanded="${this._featuresOpen ? "true" : "false"}"><span>Features</span><span>${this._featuresOpen ? "⌃" : "⌄"}</span></button>${this._featuresOpen ? `<div class="features-body">${featureRows}${available.length ? `<div class="add-feature"><label>Add feature<ha-selector id="add-feature"></ha-selector></label></div>` : ""}</div>` : ""}</section>`;
    const entityPicker = this.shadowRoot.querySelector("#entity"); entityPicker.hass = this._hass; entityPicker.value = this._config.entity || ""; entityPicker.includeDomains = ["switch"];
    entityPicker.addEventListener("value-changed", (event) => this._update({ ...this._config, entity: event.detail.value }));
    const iconPicker = this.shadowRoot.querySelector("#icon"); iconPicker.hass = this._hass; iconPicker.value = this._config.icon || "mdi:alarm";
    iconPicker.addEventListener("value-changed", (event) => this._update({ ...this._config, icon: event.detail.value || "mdi:alarm" }));
    this.shadowRoot.querySelectorAll("[data-key]").forEach((input) => input.onchange = () => { const config = { ...this._config }, value = input.value.trim(); if (value) config[input.dataset.key] = value; else delete config[input.dataset.key]; this._update(config); });
    this.shadowRoot.querySelector("#features").onclick = () => { this._featuresOpen = !this._featuresOpen; this.render(); };
    const addFeature = this.shadowRoot.querySelector("#add-feature");
    if (addFeature) { addFeature.hass = this._hass; addFeature.selector = { select: { mode: "dropdown", options: available.map((type) => ({ value: type, label: SUMMARY_FEATURES[type].label })) } }; addFeature.addEventListener("value-changed", (event) => { const feature = normaliseFeature({ type: event.detail.value }); if (feature) this._updateFeatures([...features, feature]); this.render(); }); }
    this.shadowRoot.querySelectorAll("[data-edit]").forEach((button) => button.onclick = () => { this._editingFeature = this._editingFeature === button.dataset.edit ? null : button.dataset.edit; this.render(); });
    this.shadowRoot.querySelectorAll("[data-remove]").forEach((button) => button.onclick = () => { this._editingFeature = null; this._updateFeatures(features.filter((feature) => feature.type !== button.dataset.remove)); this.render(); });
    this.shadowRoot.querySelectorAll("[data-feature-field]").forEach((input) => input.onchange = () => { const updated = features.map((feature) => feature.type === input.dataset.feature ? { ...feature, [input.dataset.featureField]: input.value.trim() || SUMMARY_FEATURES[feature.type][input.dataset.featureField] } : feature); this._updateFeatures(updated); });
    this.shadowRoot.querySelectorAll("[data-feature-icon]").forEach((picker) => { const feature = features.find((item) => item.type === picker.dataset.feature); picker.hass = this._hass; picker.value = feature[picker.dataset.featureIcon]; picker.addEventListener("value-changed", (event) => { const updated = features.map((item) => item.type === picker.dataset.feature ? { ...item, [picker.dataset.featureIcon]: event.detail.value || SUMMARY_FEATURES[item.type][picker.dataset.featureIcon] } : item); this._updateFeatures(updated); }); });
    this.shadowRoot.querySelectorAll(".feature[draggable]").forEach((feature) => { feature.addEventListener("dragstart", (event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", feature.dataset.feature); }); feature.addEventListener("dragover", (event) => event.preventDefault()); feature.addEventListener("drop", (event) => { event.preventDefault(); const dragged = event.dataTransfer.getData("text/plain"), target = feature.dataset.feature; if (!dragged || dragged === target) return; const reordered = features.filter((item) => item.type !== dragged); reordered.splice(reordered.findIndex((item) => item.type === target), 0, features.find((item) => item.type === dragged)); this._updateFeatures(reordered); this.render(); }); });
  }
}

class AlarmClockEditorCardConfigEditor extends HTMLElement {
  setConfig(config) {
    const firstConfig = !this._config;
    this._config = { ...config };
    // Home Assistant can send config updates while an entity picker is open.
    // Rebuilding the editor at that point closes the picker.
    if (firstConfig && this.isConnected) this.render();
  }
  set hass(hass) {
    const firstHass = !this._hass;
    this._hass = hass;
    // Home Assistant updates hass frequently. Re-rendering here closes the
    // entity picker while the user is searching, so only render on first load.
    if (firstHass && this.isConnected) this.render();
  }
  connectedCallback() { this.attachShadow({ mode: "open" }); this.render(); }
  render() {
    if (!this.shadowRoot || !this._config) return;
    this.shadowRoot.innerHTML = `<style>:host{display:block;padding:12px 0}.field{display:block;margin:0 0 16px}.field span{display:block;margin-bottom:6px;color:var(--primary-text-color);font-size:14px}.field small{display:block;margin-top:4px;color:var(--secondary-text-color)}input,ha-entity-picker,ha-icon-picker{box-sizing:border-box;display:block;width:100%}input{padding:10px;border:1px solid var(--divider-color);border-radius:6px;background:var(--card-background-color);color:var(--primary-text-color);font:inherit}</style><label class="field"><span>Entity</span><ha-entity-picker id="entity"></ha-entity-picker><small>Select the root Alarm Clock switch.</small></label><label class="field"><span>Title</span><input id="title" value="${esc(this._config.title || "")}" placeholder="Alarm Schedule"></label><label class="field"><span>Icon</span><ha-icon-picker id="icon"></ha-icon-picker></label>`;
    const entityPicker = this.shadowRoot.querySelector("#entity");
    entityPicker.hass = this._hass;
    entityPicker.value = this._config.entity || "";
    entityPicker.includeDomains = ["switch"];
    entityPicker.addEventListener("value-changed", (event) => {
      const config = { ...this._config, entity: event.detail.value };
      this._config = config;
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
    });
    const update = (key, value) => {
      const config = { ...this._config };
      if (value) config[key] = value; else delete config[key];
      this._config = config;
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
    };
    this.shadowRoot.querySelector("#title").onchange = (event) => update("title", event.target.value.trim());
    const iconPicker = this.shadowRoot.querySelector("#icon");
    iconPicker.hass = this._hass;
    iconPicker.value = this._config.icon || "";
    iconPicker.addEventListener("value-changed", (event) => update("icon", event.detail.value));
  }
}

class AlarmClockEditorCard extends AlarmClockBase {
  static getConfigElement() { return document.createElement("alarm-clock-editor-card-config-editor"); }
  static getStubConfig(hass) {
    const entity = Object.keys(hass.states).find((id) => hass.states[id].attributes?.alarm_clock_entry_id);
    return { entity, title: "Alarm Schedule", icon: "mdi:calendar-clock" };
  }
  render() {
    if (!this.shadowRoot || !this._hass || !this.config) return;
    const mode = this.scheduleMode();
    const days = ["monday","tuesday","wednesday","thursday","friday"];
    const toggle = (label,key) => `<div class="row"><span>${label}</span><ha-switch data-toggle="${key}" aria-label="${label}"></ha-switch></div>`;
    const minuteStep = Number(this.value("minute_granularity")) || 5;
    const clock = (label,key,toggleKey) => {
      const [hour = "07", minute = "00"] = String(this.value(key) || "07:00").slice(0, 5).split(":");
      return `<div class="box"><div class="time-header"><label>${label}</label>${toggleKey ? `<ha-switch data-toggle="${toggleKey}" aria-label="Enable ${label}"></ha-switch>` : ""}</div><div class="time-controls"><button data-time-adjust="${key}" data-unit="hour" data-direction="1" aria-label="Increase hour">⌃</button><span></span><button data-time-adjust="${key}" data-unit="minute" data-direction="1" aria-label="Increase minutes">⌃</button><strong class="time-value">${esc(hour)}</strong><span class="time-separator">:</span><strong class="time-value">${esc(minute)}</strong><button data-time-adjust="${key}" data-unit="hour" data-direction="-1" aria-label="Decrease hour">⌄</button><span></span><button data-time-adjust="${key}" data-unit="minute" data-direction="-1" aria-label="Decrease minutes">⌄</button></div></div>`;
    };
    const schedule = mode === "compact" ? [["Weekday","weekday_time","weekday_enabled"],["Saturday","saturday_time","saturday_enabled"],["Sunday","sunday_time","sunday_enabled"]].map(([label,key,toggleKey]) => clock(label,key,toggleKey)).join("") : `${days.map((day) => clock(day[0].toUpperCase()+day.slice(1), `per_day_${day}_time`, `${day}_enabled`)).join("")}${clock("Saturday","saturday_time","saturday_enabled")}${clock("Sunday","sunday_time","sunday_enabled")}`;
    this.shadowRoot.innerHTML = `${this.styles()}<ha-card><div class="card-header"><ha-icon icon="${esc(this.config.icon || "mdi:calendar-clock")}"></ha-icon><span>${esc(this.config.title || "Alarm Schedule")}</span></div><div class="card-content"><div class="sub">${esc(this.value("status") || "unknown")}</div>${toggle("Enabled","enabled")}${toggle("One-shot override","override")}<div class="grid">${schedule}${clock("Override time","override_time")}</div></div></ha-card>`;
    this.shadowRoot.querySelectorAll("ha-switch[data-toggle]").forEach((el) => {
      el.checked = this.value(el.dataset.toggle) === "on";
      el.onchange = () => this.set(el.dataset.toggle,"switch",el.checked?"turn_on":"turn_off",{});
    });
    this.shadowRoot.querySelectorAll("[data-time-adjust]").forEach((el)=>el.onclick=()=>{
      const key = el.dataset.timeAdjust, [hour = "07", minute = "00"] = String(this.value(key) || "07:00").slice(0, 5).split(":");
      const delta = Number(el.dataset.direction) * (el.dataset.unit === "hour" ? 60 : minuteStep);
      const total = (Number(hour) * 60 + Number(minute) + delta + 1440) % 1440;
      this.set(key,"time","set_value",{time:`${String(Math.floor(total / 60)).padStart(2,"0")}:${String(total % 60).padStart(2,"0")}:00`});
    });
  }
}

class AlarmClockAdvancedCard extends AlarmClockBase {
  static getConfigElement() { return document.createElement("alarm-clock-editor-card-config-editor"); }
  static getStubConfig(hass) {
    const entity = Object.keys(hass.states).find((id) => hass.states[id].attributes?.alarm_clock_entry_id);
    return { entity, title: "Alarm Playback", icon: "mdi:cog" };
  }
  render() {
    if (!this.shadowRoot || !this._hass || !this.config) return;
    const enabled = (key) => this.value(key) === "on";
    const controls = [["row", "primary_pre_enabled", "Primary pre-alarm"]];
    if (enabled("primary_pre_enabled")) controls.push(["row", "primary_pre_media", "Pre-alarm tone"], ["row", "primary_pre_duration", "Run for"], ["row", "primary_pre_volume", "Pre-alarm volume"]);
    controls.push(["row", "primary_main_volume", "Main volume"], ["media", "primary_main", "primary_main_media", "Primary main media"], ["row", "followup_enabled", "Follow-up"]);
    if (enabled("followup_enabled")) {
      controls.push(["row", "followup_delay", "Follow-up delay"], ["row", "followup_pre_enabled", "Follow-up pre-alarm"]);
      if (enabled("followup_pre_enabled")) controls.push(["row", "followup_pre_media", "Follow-up pre-alarm tone"], ["row", "followup_pre_duration", "Follow-up run for"], ["row", "followup_pre_volume", "Follow-up pre-alarm volume"]);
      controls.push(["row", "followup_reuse_primary", "Reuse primary main media"]);
      if (!enabled("followup_reuse_primary")) controls.push(["media", "followup_main", "followup_main_media", "Follow-up main media"]);
      controls.push(["row", "followup_main_volume", "Follow-up main volume"]);
    }
    controls.push(["row", "snooze_duration", "Snooze duration"], ["row", "stop_after", "Stop after"]);
    const rootName = this._hass.states[this.config.entity]?.attributes?.friendly_name || this.config.name || "Alarm Clock";
    const subtitle = rootName.replace(/^Alarm Clock\s*-\s*/i, "").replace(/\s+Alarm Clock$/i, "");
    const renderId = (this._nativeRowRenderId || 0) + 1;
    this._nativeRowRenderId = renderId;
    this.shadowRoot.innerHTML = `${this.styles()}<ha-card><div class="card-header"><ha-icon icon="${esc(this.config.icon || "mdi:cog")}"></ha-icon><span>${esc(this.config.title || "Alarm Playback")}</span></div><div class="card-content"><div class="sub">${esc(subtitle)}</div><div class="entities"></div></div></ha-card>`;
    const container = this.shadowRoot.querySelector(".entities");
    const entryId = this._hass.states[this.config.entity]?.attributes?.alarm_clock_entry_id;
    const appendMediaSelector = (stage, key, label) => {
      const wrapper = document.createElement("div");
      wrapper.className = "media-selector";
      const heading = document.createElement("label");
      heading.textContent = label;
      const selector = document.createElement("ha-selector");
      selector.hass = this._hass;
      selector.selector = { media: { accept: ["audio/*"] } };
      selector.value = this.value(key) || null;
      selector.addEventListener("value-changed", (event) => this._hass.callService("alarm_clock", "set_media", { entry_id: entryId, stage, media: event.detail.value || null }));
      wrapper.append(heading, selector);
      container.append(wrapper);
    };
    window.loadCardHelpers().then(async (helpers) => {
      if (renderId !== this._nativeRowRenderId) return;
      for (const control of controls) {
        if (renderId !== this._nativeRowRenderId) return;
        const [type] = control;
        if (type === "media") {
          appendMediaSelector(control[1], control[2], control[3]);
          continue;
        }
        const [, key, label] = control;
        const entity = this.find(key)?.entity_id;
        if (!entity) continue;
        const config = { entity, name: label };
        const row = await helpers.createRowElement(config);
        row.hass = this._hass;
        container.append(row);
      }
    });
  }
}

[["alarm-clock-card", AlarmClockCard], ["alarm-clock-editor-card", AlarmClockEditorCard], ["alarm-clock-advanced-card", AlarmClockAdvancedCard], ["alarm-clock-card-config-editor", AlarmClockCardConfigEditor], ["alarm-clock-editor-card-config-editor", AlarmClockEditorCardConfigEditor]].forEach(([name, element]) => {
  if (!customElements.get(name)) customElements.define(name, element);
});
window.customCards = window.customCards || [];
window.customCards.push({ type:"alarm-clock-card", name:"Alarm Overview", description:"Alarm overview and status" }, { type:"alarm-clock-editor-card", name:"Alarm Schedule", description:"Alarm schedule controls" }, { type:"alarm-clock-advanced-card", name:"Alarm Playback", description:"Alarm playback controls" });
