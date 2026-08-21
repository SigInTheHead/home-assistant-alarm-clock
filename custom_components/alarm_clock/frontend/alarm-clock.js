/* Optional Alarm Clock Lovelace cards. No build step or external dependency. */
const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

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
  value(key) { return this.find(key)?.state.state ?? this._hass?.states?.[this.config?.entity]?.attributes?.[key]; }
  scheduleMode() {
    const configured = this.value("schedule_mode");
    if (configured) return configured;
    const monday = this.find("per_day_monday_time")?.state;
    return monday && monday.state !== "unavailable" ? "per_day" : "compact";
  }
  async set(key, domain, service, data) { const item = this.find(key); if (item) await this._hass.callService(domain, service, { entity_id: item.entity_id, ...data }); }
  styles() { return `<style>:host{display:block}ha-card{padding:0}.card-header{display:flex;align-items:center;gap:8px;padding:16px 16px 0;font-size:20px;font-weight:500;line-height:1.4}.card-header ha-icon{--mdc-icon-size:24px}.card-content{padding:0 16px 16px}.sub,label{color:var(--secondary-text-color);font-size:13px}.card-content>.sub{margin-top:2px}.row,.media-selector{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 0}.media-selector ha-selector{flex:1;max-width:70%}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:8px;margin:12px 0}.box{background:var(--secondary-background-color);border-radius:8px;padding:9px}.schedule-list{margin:4px 0}.schedule-list .row{padding:1px 0;font-size:13px}.schedule-list .row+.row{border-top:1px solid color-mix(in srgb,var(--divider-color) 45%,transparent)}.schedule-list b{font-variant-numeric:tabular-nums}.time-header{display:flex;align-items:center;justify-content:space-between;gap:8px}input,select,button{font:inherit;padding:6px;border-radius:6px;background:var(--secondary-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color)}.time-controls{display:grid;grid-template-columns:1fr 14px 1fr;justify-items:center;align-items:center;margin-top:6px}.time-controls button{width:100%;padding:2px;border:0;background:transparent;font-size:18px;line-height:1;cursor:pointer}.time-value{font-size:20px;font-weight:600;padding:5px 0}.time-separator{font-size:18px}.hidden{display:none}</style>`; }
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
    const features = {
      alarm_times: this.config.show_alarm_times !== false ? `<div class="grid">${schedule.map(([label,key]) => `<div class="box"><label>${label}</label><br><b>${esc((this.value(key) || this._hass.states[this.config.entity]?.attributes?.day_times?.[key.replace("per_day_", "").replace("_time", "")] || "--:--").slice(0,5))}</b></div>`).join("")}</div>` : "",
      alarm_time_list: this.config.show_alarm_time_list === true ? `<div class="schedule-list">${schedule.map(([label,key]) => `<div class="row"><span>${label}</span><b>${esc((this.value(key) || this._hass.states[this.config.entity]?.attributes?.day_times?.[key.replace("per_day_", "").replace("_time", "")] || "--:--").slice(0,5))}</b></div>`).join("")}</div>` : "",
      override: this.config.show_override !== false ? `<div class="row override"><span>One-shot override <span class="sub">${esc((this.value("override_time") || "--:--").slice(0,5))}</span></span><ha-switch data-toggle="override" aria-label="Enable one-shot override"></ha-switch></div>` : "",
    };
    const featureOrder = [...new Set([...(this.config.feature_order || []), "alarm_times", "override", ...(this.config.show_alarm_time_list === true ? ["alarm_time_list"] : [])])].filter((key) => key in features);
    this.shadowRoot.innerHTML = `${this.styles()}<ha-card class="summary"><div class="card-header"><ha-icon icon="${esc(this.config.icon || "mdi:alarm")}"></ha-icon><span>${esc(this.config.title || this.config.name || "Alarm Overview")}</span></div><div class="card-content"><div class="sub">${esc(friendlyNext())}</div><div class="row"><span>Enabled</span><ha-switch data-toggle="enabled" aria-label="Enable alarm"></ha-switch></div>${featureOrder.map((key) => features[key]).join("")}</div></ha-card>`;
    this.shadowRoot.querySelectorAll("ha-switch[data-toggle]").forEach((el) => {
      el.checked = this.value(el.dataset.toggle) === "on";
      el.onchange = () => this.set(el.dataset.toggle, "switch", el.checked ? "turn_on" : "turn_off", {});
    });
  }
}

class AlarmClockCardConfigEditor extends HTMLElement {
  setConfig(config) {
    const firstConfig = !this._config;
    this._config = { ...config };
    if (firstConfig && this.isConnected) this.render();
  }
  set hass(hass) { this._hass = hass; }
  connectedCallback() { this.attachShadow({ mode: "open" }); this.render(); }
  render() {
    if (!this.shadowRoot || !this._config) return;
    const hasAlarmTimes = this._config.show_alarm_times !== false;
    const hasAlarmTimeList = this._config.show_alarm_time_list === true;
    const hasOverride = this._config.show_override !== false;
    const featureOrder = [...new Set([...(this._config.feature_order || []), "alarm_times", "override", ...(hasAlarmTimeList ? ["alarm_time_list"] : [])])].filter((key) => ["alarm_times", "alarm_time_list", "override"].includes(key));
    const featureLabels = { alarm_times: "Alarm time cards", alarm_time_list: "Compact alarm time list", override: "Override time" };
    const features = [
      ...featureOrder.filter((key) => key === "alarm_times" ? hasAlarmTimes : key === "alarm_time_list" ? hasAlarmTimeList : hasOverride).map((key) => `<div class="feature" draggable="true" data-feature="${key}"><span class="drag-handle" title="Drag to reorder">⠿</span><span>${featureLabels[key]}</span><button class="feature-action" data-feature="${key}">Remove</button></div>`),
      !hasAlarmTimes ? `<button class="add-feature" data-feature="alarm_times">+ Add alarm time cards</button>` : "",
      !hasAlarmTimeList ? `<button class="add-feature" data-feature="alarm_time_list">+ Add compact alarm time list</button>` : "",
      !hasOverride ? `<button class="add-feature" data-feature="override">+ Add override time</button>` : "",
    ].join("");
    this.shadowRoot.innerHTML = `<style>:host{display:block;padding:12px 0}.field{display:block;margin:0 0 16px}.field span{display:block;margin-bottom:6px;color:var(--primary-text-color);font-size:14px}.field small{display:block;margin-top:4px;color:var(--secondary-text-color)}input{box-sizing:border-box;width:100%;padding:10px;border:1px solid var(--divider-color);border-radius:6px;background:var(--card-background-color);color:var(--primary-text-color);font:inherit}ha-entity-picker,ha-icon-picker{display:block;width:100%}.features{border:1px solid var(--divider-color);border-radius:8px;overflow:hidden}.features-toggle,.feature-action{font:inherit;color:var(--primary-text-color);cursor:pointer}.features-toggle{display:flex;width:100%;align-items:center;justify-content:space-between;padding:12px;border:0;background:var(--card-background-color);font-weight:600}.features-body{padding:4px 12px 12px;border-top:1px solid var(--divider-color)}.feature{display:flex;align-items:center;gap:8px;padding:12px 0;cursor:grab}.feature-action{border:0;background:transparent;color:var(--primary-color);padding:6px;margin-left:auto}.drag-handle{color:var(--secondary-text-color);font-size:18px}.add-feature{border:1px solid var(--primary-color);background:transparent;color:var(--primary-color);border-radius:6px;padding:8px 10px;margin:4px 4px 4px 0}</style><label class="field"><span>Entity</span><ha-entity-picker id="entity"></ha-entity-picker><small>Select the root Alarm Clock switch.</small></label><label class="field"><span>Title</span><input data-key="title" value="${esc(this._config.title || this._config.name || "Alarm Overview")}"></label><label class="field"><span>Icon</span><ha-icon-picker id="icon"></ha-icon-picker></label><section class="features"><button class="features-toggle" id="features" aria-expanded="${this._featuresOpen ? "true" : "false"}"><span>Features</span><span>${this._featuresOpen ? "⌃" : "⌄"}</span></button>${this._featuresOpen ? `<div class="features-body">${features}</div>` : ""}</section>`;
    const entityPicker = this.shadowRoot.querySelector("#entity");
    entityPicker.hass = this._hass;
    entityPicker.value = this._config.entity || "";
    entityPicker.includeDomains = ["switch"];
    entityPicker.addEventListener("value-changed", (event) => {
      const config = { ...this._config, entity: event.detail.value };
      this._config = config;
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
    });
    const iconPicker = this.shadowRoot.querySelector("#icon");
    iconPicker.hass = this._hass;
    iconPicker.value = this._config.icon || "mdi:alarm";
    iconPicker.addEventListener("value-changed", (event) => {
      const config = { ...this._config, icon: event.detail.value || "mdi:alarm" };
      this._config = config;
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
    });
    this.shadowRoot.querySelectorAll("[data-key]").forEach((input) => input.onchange = () => {
      const key = input.dataset.key, value = input.value.trim(), config = { ...this._config };
      if (value) config[key] = value; else delete config[key];
      this._config = config;
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
    });
    this.shadowRoot.querySelector("#features").onclick = () => { this._featuresOpen = !this._featuresOpen; this.render(); };
    const setFeature = (feature, shown) => {
      const config = { ...this._config };
      const key = { alarm_times: "show_alarm_times", alarm_time_list: "show_alarm_time_list", override: "show_override" }[feature];
      if (feature === "alarm_time_list") config[key] = shown;
      else if (shown) delete config[key]; else config[key] = false;
      this._config = config;
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
      this.render();
    };
    this.shadowRoot.querySelectorAll("button[data-feature]").forEach((button) => button.addEventListener("click", () => setFeature(button.dataset.feature, button.classList.contains("add-feature"))));
    this.shadowRoot.querySelectorAll(".feature[draggable]").forEach((feature) => {
      feature.addEventListener("dragstart", (event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", feature.dataset.feature); });
      feature.addEventListener("dragover", (event) => event.preventDefault());
      feature.addEventListener("drop", (event) => {
        event.preventDefault();
        const dragged = event.dataTransfer.getData("text/plain"), target = feature.dataset.feature;
        if (!dragged || dragged === target) return;
        const order = featureOrder.filter((key) => key !== dragged);
        order.splice(order.indexOf(target), 0, dragged);
        const config = { ...this._config, feature_order: order };
        this._config = config;
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
        this.render();
      });
    });
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
    controls.push(["row", "stop_after", "Stop after"]);
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
