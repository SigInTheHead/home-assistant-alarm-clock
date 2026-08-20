/* Optional Alarm Clock Lovelace cards. No build step or external dependency. */
const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

class AlarmClockBase extends HTMLElement {
  setConfig(config) { if (!config.entity) throw new Error("Set entity to the root Alarm Clock switch"); this.config = config; this.render(); }
  set hass(hass) {
    const previous = this._hass;
    this._hass = hass;
    if (!previous || this._alarmStateChanged(previous, hass)) this.render();
  }
  connectedCallback() { this.attachShadow({ mode: "open" }); this.render(); }
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
  async set(key, domain, service, data) { const item = this.find(key); if (item) await this._hass.callService(domain, service, { entity_id: item.entity_id, ...data }); }
  styles() { return `<style>:host{display:block}ha-card{padding:16px}h2{display:flex;align-items:center;gap:8px;margin-top:0}h2 ha-icon{--mdc-icon-size:28px}h2 ha-icon.enabled{color:var(--state-switch-on-color,var(--state-icon-active-color,#ff9800))}h2 ha-icon.disabled{color:var(--state-switch-off-color,var(--state-icon-color))}.sub,label{color:var(--secondary-text-color);font-size:13px}.row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 0;border-top:1px solid var(--divider-color)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:8px;margin:12px 0}.box{background:var(--secondary-background-color);border-radius:8px;padding:9px}input,select,button{font:inherit;padding:6px;border-radius:6px;background:var(--secondary-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color)}.time-controls{display:grid;grid-template-columns:1fr 14px 1fr;justify-items:center;align-items:center;margin-top:6px}.time-controls button{width:100%;padding:2px;border:0;background:transparent;font-size:18px;line-height:1;cursor:pointer}.time-value{font-size:20px;font-weight:600;padding:5px 0}.time-separator{font-size:18px}.hidden{display:none}</style>`; }
}

class AlarmClockCard extends AlarmClockBase {
  static getConfigElement() { return document.createElement("alarm-clock-card-config-editor"); }
  static getStubConfig(hass) {
    const entity = Object.keys(hass.states).find((id) => hass.states[id].attributes?.alarm_clock_entry_id);
    return { entity, title: "Alarm Clock", icon: "mdi:alarm" };
  }
  render() {
    if (!this.shadowRoot || !this._hass || !this.config) return;
    const schedule = [["Mon–Fri", "weekday_time"], ["Saturday", "saturday_time"], ["Sunday", "sunday_time"]];
    const next = this.value("next_alarm");
    const enabled = this.value("enabled") === "on";
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
    this.shadowRoot.innerHTML = `${this.styles()}<ha-card><h2><ha-icon class="${enabled ? "enabled" : "disabled"}" icon="${esc(this.config.icon || "mdi:alarm")}"></ha-icon>${esc(this.config.title || this.config.name || "Alarm Clock")}</h2><div class="sub">${esc(friendlyNext())}</div><div class="grid">${schedule.map(([label,key]) => `<div class="box"><label>${label}</label><br><b>${esc((this.value(key) || "--:--").slice(0,5))}</b></div>`).join("")}</div><div class="row"><span>Override ${esc((this.value("override_time") || "--:--").slice(0,5))}</span><button id="open">${this.config.navigation_path ? "Open alarm" : "Details"}</button></div></ha-card>`;
    this.shadowRoot.querySelector("#open").onclick = () => { if (this.config.navigation_path) { history.pushState(null, "", this.config.navigation_path); window.dispatchEvent(new Event("location-changed")); } else this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles:true, composed:true, detail:{entityId:this.config.entity} })); };
  }
}

class AlarmClockCardConfigEditor extends HTMLElement {
  setConfig(config) { this._config = { ...config }; this.render(); }
  set hass(hass) { this._hass = hass; }
  connectedCallback() { this.attachShadow({ mode: "open" }); this.render(); }
  render() {
    if (!this.shadowRoot || !this._config) return;
    this.shadowRoot.innerHTML = `<style>:host{display:block;padding:12px 0}.field{display:block;margin:0 0 16px}.field span{display:block;margin-bottom:6px;color:var(--primary-text-color);font-size:14px}.field small{display:block;margin-top:4px;color:var(--secondary-text-color)}input{box-sizing:border-box;width:100%;padding:10px;border:1px solid var(--divider-color);border-radius:6px;background:var(--card-background-color);color:var(--primary-text-color);font:inherit}</style><label class="field"><span>Title</span><input data-key="title" value="${esc(this._config.title || this._config.name || "Alarm Clock")}"></label><label class="field"><span>Icon</span><input data-key="icon" value="${esc(this._config.icon || "mdi:alarm")}"><small>Use a Material Design Icon, for example: mdi:alarm</small></label>`;
    this.shadowRoot.querySelectorAll("[data-key]").forEach((input) => input.onchange = () => {
      const key = input.dataset.key, value = input.value.trim(), config = { ...this._config };
      if (value) config[key] = value; else delete config[key];
      this._config = config;
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
    });
  }
}

class AlarmClockEditorCard extends AlarmClockBase {
  render() {
    if (!this.shadowRoot || !this._hass || !this.config) return;
    const advanced = this._advanced || false, mode = this.value("schedule_mode") || "compact";
    const days = ["monday","tuesday","wednesday","thursday","friday"];
    const toggle = (label,key) => `<div class="row"><span>${label}</span><input data-toggle="${key}" type="checkbox" ${this.value(key)==="on"?"checked":""}></div>`;
    const num = (label,key) => `<div class="row"><label>${label}</label><input data-number="${key}" type="number" value="${esc(this.value(key))}"></div>`;
    const minuteStep = Number(this.value("minute_granularity")) || 5;
    const clock = (label,key) => {
      const [hour = "07", minute = "00"] = String(this.value(key) || "07:00").slice(0, 5).split(":");
      return `<div class="box"><label>${label}</label><div class="time-controls"><button data-time-adjust="${key}" data-unit="hour" data-direction="1" aria-label="Increase hour">⌃</button><span></span><button data-time-adjust="${key}" data-unit="minute" data-direction="1" aria-label="Increase minutes">⌃</button><strong class="time-value">${esc(hour)}</strong><span class="time-separator">:</span><strong class="time-value">${esc(minute)}</strong><button data-time-adjust="${key}" data-unit="hour" data-direction="-1" aria-label="Decrease hour">⌄</button><span></span><button data-time-adjust="${key}" data-unit="minute" data-direction="-1" aria-label="Decrease minutes">⌄</button></div></div>`;
    };
    const compact = mode === "compact" ? [["Weekday","weekday_time"],["Saturday","saturday_time"],["Sunday","sunday_time"]].map(([label,key])=>clock(label,key)).join("") : "";
    const daily = mode === "per_day" ? `<div class="grid">${days.map(day=>`<div class="box"><label>${day[0].toUpperCase()+day.slice(1)}</label><br><input data-toggle="${day}_enabled" type="checkbox" ${this.value(`${day}_enabled`)==="on"?"checked":""}><input data-time="${day}_time" type="time" value="${esc((this.value(`${day}_time`)||"").slice(0,5))}"></div>`).join("")}${clock("Saturday","saturday_time")}${clock("Sunday","sunday_time")}</div>` : "";
    this.shadowRoot.innerHTML = `${this.styles()}<ha-card><h2>⏰ ${esc(this.config.name || "Alarm Clock")}</h2><div class="sub">${esc(this.value("status") || "unknown")}</div>${toggle("Enabled","enabled")}${toggle("One-shot override","override")}<div class="grid">${compact}${clock("Override time","override_time")}</div><button id="advanced">${advanced?"Hide":"Show"} advanced settings</button><section class="${advanced?"":"hidden"}">${daily}${toggle("Primary pre-alarm","primary_pre_enabled")}${num("Primary pre-alarm volume (%)","primary_pre_volume")}${num("Primary pre-alarm duration (seconds)","primary_pre_duration")}${num("Primary pre-alarm repeat (seconds)","primary_pre_repeat")}${num("Primary main volume (%)","primary_main_volume")}${toggle("Follow-up","followup_enabled")}${num("Follow-up delay (minutes)","followup_delay")}${toggle("Follow-up pre-alarm","followup_pre_enabled")}${num("Follow-up pre-alarm volume (%)","followup_pre_volume")}${num("Follow-up pre-alarm duration (seconds)","followup_pre_duration")}${num("Follow-up pre-alarm repeat (seconds)","followup_pre_repeat")}${toggle("Reuse primary main media","followup_reuse_primary")}${num("Follow-up main volume (%)","followup_main_volume")}${num("Stop after (minutes)","stop_after")}<div class="row"><span>Media and schedule mode are set in the integration Configure screen.</span><button id="configure">Configure</button></div></section></ha-card>`;
    this.shadowRoot.querySelector("#advanced").onclick = () => { this._advanced = !advanced; this.render(); };
    this.shadowRoot.querySelectorAll("[data-toggle]").forEach((el)=>el.onchange=()=>this.set(el.dataset.toggle,"switch",el.checked?"turn_on":"turn_off",{}));
    this.shadowRoot.querySelectorAll("[data-number]").forEach((el)=>el.onchange=()=>this.set(el.dataset.number,"number","set_value",{value:Number(el.value)}));
    this.shadowRoot.querySelectorAll("[data-time-adjust]").forEach((el)=>el.onclick=()=>{
      const key = el.dataset.timeAdjust, [hour = "07", minute = "00"] = String(this.value(key) || "07:00").slice(0, 5).split(":");
      const delta = Number(el.dataset.direction) * (el.dataset.unit === "hour" ? 60 : minuteStep);
      const total = (Number(hour) * 60 + Number(minute) + delta + 1440) % 1440;
      this.set(key,"time","set_value",{time:`${String(Math.floor(total / 60)).padStart(2,"0")}:${String(total % 60).padStart(2,"0")}:00`});
    });
    this.shadowRoot.querySelectorAll("[data-select]").forEach((el)=>el.onchange=()=>this.set(el.dataset.select,"select","select_option",{option:el.value}));
    this.shadowRoot.querySelector("#configure").onclick = () => { history.pushState(null,"","/config/integrations"); window.dispatchEvent(new Event("location-changed")); };
  }
}

customElements.define("alarm-clock-card", AlarmClockCard);
customElements.define("alarm-clock-editor-card", AlarmClockEditorCard);
customElements.define("alarm-clock-card-config-editor", AlarmClockCardConfigEditor);
window.customCards = window.customCards || [];
window.customCards.push({ type:"alarm-clock-card", name:"Alarm Clock", description:"Alarm Clock summary" }, { type:"alarm-clock-editor-card", name:"Alarm Clock Editor", description:"Alarm Clock controls" });
