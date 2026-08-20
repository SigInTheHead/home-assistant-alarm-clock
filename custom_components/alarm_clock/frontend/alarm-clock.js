/* Optional Alarm Clock Lovelace cards. No build step or external dependency. */
const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

class AlarmClockBase extends HTMLElement {
  setConfig(config) { if (!config.entity) throw new Error("Set entity to the root Alarm Clock switch"); this.config = config; this.render(); }
  set hass(hass) { this._hass = hass; this.render(); }
  connectedCallback() { this.attachShadow({ mode: "open" }); this.render(); }
  entities() { const entryId = this._hass?.states?.[this.config?.entity]?.attributes?.alarm_clock_entry_id; return Object.entries(this._hass?.states || {}).filter(([, state]) => state.attributes?.alarm_clock_entry_id === entryId).map(([entity_id, state]) => ({ entity_id, state, key: state.attributes.alarm_clock_key })); }
  find(key) { return this.entities().find((item) => item.key === key); }
  value(key) { return this.find(key)?.state.state; }
  async set(key, domain, service, data) { const item = this.find(key); if (item) await this._hass.callService(domain, service, { entity_id: item.entity_id, ...data }); }
  styles() { return `<style>:host{display:block}ha-card{padding:16px}.sub,label{color:var(--secondary-text-color);font-size:13px}.row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 0;border-top:1px solid var(--divider-color)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:8px;margin:12px 0}.box{background:var(--secondary-background-color);border-radius:8px;padding:9px}input,select,button{font:inherit;padding:6px;border-radius:6px;background:var(--secondary-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color)}.hidden{display:none}</style>`; }
}

class AlarmClockCard extends AlarmClockBase {
  render() {
    if (!this.shadowRoot || !this._hass || !this.config) return;
    const schedule = [["Mon–Fri", "weekday_time"], ["Saturday", "saturday_time"], ["Sunday", "sunday_time"]];
    const next = this.value("next_alarm");
    this.shadowRoot.innerHTML = `${this.styles()}<ha-card><h2>⏰ ${esc(this.config.name || "Alarm Clock")}</h2><div class="sub">${this.value("enabled") === "on" ? "Enabled" : "Disabled"}${next && next !== "unknown" ? ` · Next: ${new Date(next).toLocaleString()}` : ""}</div><div class="grid">${schedule.map(([label,key]) => `<div class="box"><label>${label}</label><br><b>${esc((this.value(key) || "--:--").slice(0,5))}</b></div>`).join("")}</div><div class="row"><span>Override ${esc((this.value("override_time") || "--:--").slice(0,5))}</span><button id="open">${this.config.navigation_path ? "Open alarm" : "Details"}</button></div></ha-card>`;
    this.shadowRoot.querySelector("#open").onclick = () => { if (this.config.navigation_path) { history.pushState(null, "", this.config.navigation_path); window.dispatchEvent(new Event("location-changed")); } else this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles:true, composed:true, detail:{entityId:this.config.entity} })); };
  }
}

class AlarmClockEditorCard extends AlarmClockBase {
  render() {
    if (!this.shadowRoot || !this._hass || !this.config) return;
    const advanced = this._advanced || false, mode = this.value("schedule_mode") || "compact";
    const days = ["monday","tuesday","wednesday","thursday","friday"];
    const toggle = (label,key) => `<div class="row"><span>${label}</span><input data-toggle="${key}" type="checkbox" ${this.value(key)==="on"?"checked":""}></div>`;
    const num = (label,key) => `<div class="row"><label>${label}</label><input data-number="${key}" type="number" value="${esc(this.value(key))}"></div>`;
    const clock = (label,key) => `<div class="box"><label>${label}</label><br><input data-time="${key}" type="time" value="${esc((this.value(key)||"").slice(0,5))}"></div>`;
    const compact = mode === "compact" ? [["Weekday","weekday_time"],["Saturday","saturday_time"],["Sunday","sunday_time"]].map(([label,key])=>clock(label,key)).join("") : "";
    const daily = mode === "per_day" ? `<div class="grid">${days.map(day=>`<div class="box"><label>${day[0].toUpperCase()+day.slice(1)}</label><br><input data-toggle="${day}_enabled" type="checkbox" ${this.value(`${day}_enabled`)==="on"?"checked":""}><input data-time="${day}_time" type="time" value="${esc((this.value(`${day}_time`)||"").slice(0,5))}"></div>`).join("")}${clock("Saturday","saturday_time")}${clock("Sunday","sunday_time")}</div>` : "";
    this.shadowRoot.innerHTML = `${this.styles()}<ha-card><h2>⏰ ${esc(this.config.name || "Alarm Clock")}</h2><div class="sub">${esc(this.value("status") || "unknown")}</div>${toggle("Enabled","enabled")}${toggle("One-shot override","override")}<div class="grid">${compact}${clock("Override time","override_time")}</div><button id="advanced">${advanced?"Hide":"Show"} advanced settings</button><section class="${advanced?"":"hidden"}">${daily}${toggle("Primary pre-alarm","primary_pre_enabled")}${num("Primary pre-alarm volume (%)","primary_pre_volume")}${num("Primary pre-alarm duration (seconds)","primary_pre_duration")}${num("Primary pre-alarm repeat (seconds)","primary_pre_repeat")}${num("Primary main volume (%)","primary_main_volume")}${toggle("Follow-up","followup_enabled")}${num("Follow-up delay (minutes)","followup_delay")}${toggle("Follow-up pre-alarm","followup_pre_enabled")}${num("Follow-up pre-alarm volume (%)","followup_pre_volume")}${num("Follow-up pre-alarm duration (seconds)","followup_pre_duration")}${num("Follow-up pre-alarm repeat (seconds)","followup_pre_repeat")}${toggle("Reuse primary main media","followup_reuse_primary")}${num("Follow-up main volume (%)","followup_main_volume")}${num("Stop after (minutes)","stop_after")}<div class="row"><span>Media and schedule mode are set in the integration Configure screen.</span><button id="configure">Configure</button></div></section></ha-card>`;
    this.shadowRoot.querySelector("#advanced").onclick = () => { this._advanced = !advanced; this.render(); };
    this.shadowRoot.querySelectorAll("[data-toggle]").forEach((el)=>el.onchange=()=>this.set(el.dataset.toggle,"switch",el.checked?"turn_on":"turn_off",{}));
    this.shadowRoot.querySelectorAll("[data-number]").forEach((el)=>el.onchange=()=>this.set(el.dataset.number,"number","set_value",{value:Number(el.value)}));
    this.shadowRoot.querySelectorAll("[data-time]").forEach((el)=>el.onchange=()=>this.set(el.dataset.time,"time","set_value",{time:`${el.value}:00`}));
    this.shadowRoot.querySelectorAll("[data-select]").forEach((el)=>el.onchange=()=>this.set(el.dataset.select,"select","select_option",{option:el.value}));
    this.shadowRoot.querySelector("#configure").onclick = () => { history.pushState(null,"","/config/integrations"); window.dispatchEvent(new Event("location-changed")); };
  }
}

customElements.define("alarm-clock-card", AlarmClockCard);
customElements.define("alarm-clock-editor-card", AlarmClockEditorCard);
window.customCards = window.customCards || [];
window.customCards.push({ type:"alarm-clock-card", name:"Alarm Clock", description:"Alarm Clock summary" }, { type:"alarm-clock-editor-card", name:"Alarm Clock Editor", description:"Alarm Clock controls" });

// The native config-flow form cannot define custom controls. When this
// optional frontend module is loaded, enhance only Alarm Clock's media fields
// with a browser-local preview button. It resolves selected media and uses
// HTMLAudioElement, never media_player.play_media.
(() => {
  const labels = new Set(["Primary pre-alarm media", "Primary main media", "Follow-up pre-alarm media", "Follow-up main media"]);
  const enhanced = new WeakSet();
  let playing;
  const stop = () => { if (playing) { playing.pause(); playing.currentTime = 0; playing = undefined; } };
  const preview = async (selector, button, status) => {
    const media = selector.value;
    if (!media?.media_content_id || !selector.hass) return;
    stop(); button.disabled = true; status.textContent = "Loading preview…";
    try {
      const url = media.media_content_id.startsWith("http") ? media.media_content_id : (await selector.hass.callWS({ type: "media_source/resolve_media", media_content_id: media.media_content_id })).url;
      const audio = new Audio(url); playing = audio;
      audio.addEventListener("ended", () => { if (playing === audio) playing = undefined; status.textContent = ""; button.textContent = "Preview"; button.disabled = false; }, { once: true });
      await audio.play(); status.textContent = "Playing in this browser"; button.textContent = "Stop preview"; button.disabled = false;
      button.onclick = () => { stop(); status.textContent = ""; button.textContent = "Preview"; button.disabled = !selector.value?.media_content_id; };
    } catch (_) { status.textContent = "Preview unavailable for this media"; button.disabled = false; }
  };
  const enhance = (selector) => {
    if (selector?.localName !== "ha-selector-media" || !labels.has(selector.label) || enhanced.has(selector) || !selector.shadowRoot) return;
    enhanced.add(selector);
    const renderButton = () => {
      const root = selector.shadowRoot;
      if (!root || root.querySelector(".alarm-clock-preview")) return;
      const controls = document.createElement("div"); controls.className = "alarm-clock-preview";
      controls.innerHTML = `<button type="button">Preview</button><span></span>`;
      const button = controls.querySelector("button"), status = controls.querySelector("span");
      button.disabled = !selector.value?.media_content_id;
      button.onclick = () => preview(selector, button, status);
      const style = document.createElement("style");
      style.textContent = ".alarm-clock-preview{display:flex;align-items:center;gap:12px;margin-top:8px}.alarm-clock-preview button{padding:6px 12px;border:0;border-radius:6px;background:var(--primary-color);color:var(--text-primary-color,#fff);font:inherit;cursor:pointer}.alarm-clock-preview button:disabled{opacity:.5;cursor:default}.alarm-clock-preview span{font-size:12px;color:var(--secondary-text-color)}";
      root.append(style, controls);
    };
    renderButton(); new MutationObserver(renderButton).observe(selector.shadowRoot, { childList: true });
  };
  const scan = (root = document) => {
    root.querySelectorAll?.("ha-selector-media").forEach(enhance);
    root.querySelectorAll?.("*").forEach((element) => { if (element.shadowRoot) scan(element.shadowRoot); });
  };
  scan(); new MutationObserver(() => scan()).observe(document.documentElement, { childList: true, subtree: true });
})();
