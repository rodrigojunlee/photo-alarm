import { repeatLabel } from "../core/dates.js";

export function createAlarmListUI({ container, store, onChange, onEdit, challenges }) {
  function render(alarms) {
    container.innerHTML = "";

    alarms.forEach((alarm) => {
      const card = document.createElement("article");
      card.className = "alarm-card";
      card.dataset.id = alarm.id;

      card.innerHTML = `
        <div class="alarm-card-main">
          <input type="time" class="alarm-time-input" value="${alarm.time}" aria-label="Alarm time" />
          <div class="alarm-card-meta">
            <input type="text" class="alarm-label-input" value="${escapeHtml(alarm.label)}" maxlength="40" aria-label="Alarm label" />
            <p class="alarm-hint">${escapeHtml(store.hintFor(alarm))}</p>
          </div>
        </div>
        <div class="alarm-card-controls">
          <label class="inline-select-wrap">
            <span class="sr-only">Repeat</span>
            <select class="alarm-repeat-select" aria-label="Repeat schedule">
              ${repeatOptions(alarm.repeat)}
            </select>
          </label>
          <label class="inline-select-wrap challenge-select-wrap">
            <span class="sr-only">Challenge</span>
            <select class="alarm-challenge-select" aria-label="Wake-up challenge">
              ${challengeOptions(alarm.challengeType, challenges)}
            </select>
          </label>
          <label class="toggle-switch" title="Enable alarm">
            <input type="checkbox" class="alarm-enable-toggle" ${alarm.enabled ? "checked" : ""} />
            <span class="toggle-track"></span>
          </label>
          <button type="button" class="icon-button subtle alarm-delete" title="Delete alarm" aria-label="Delete alarm">×</button>
        </div>
      `;

      const timeInput = card.querySelector(".alarm-time-input");
      const labelInput = card.querySelector(".alarm-label-input");
      const repeatSelect = card.querySelector(".alarm-repeat-select");
      const challengeSelect = card.querySelector(".alarm-challenge-select");
      const enableToggle = card.querySelector(".alarm-enable-toggle");
      const deleteBtn = card.querySelector(".alarm-delete");

      timeInput.addEventListener("change", () => {
        store.updateAlarm(alarm.id, { time: timeInput.value });
        onChange();
      });

      labelInput.addEventListener("change", () => {
        store.updateAlarm(alarm.id, { label: labelInput.value.trim() || "Alarm" });
        onChange();
      });

      repeatSelect.addEventListener("change", () => {
        store.updateAlarm(alarm.id, { repeat: repeatSelect.value });
        onChange();
      });

      challengeSelect.addEventListener("change", () => {
        store.updateAlarm(alarm.id, { challengeType: challengeSelect.value });
        onChange();
      });

      enableToggle.addEventListener("change", async () => {
        store.toggleAlarm(alarm.id, enableToggle.checked);
        onChange();
        if (enableToggle.checked) onEdit?.("armed");
      });

      deleteBtn.addEventListener("click", () => {
        if (alarms.length <= 1) {
          store.updateAlarm(alarm.id, {
            enabled: false,
            time: "07:00",
            label: "Alarm",
            repeat: "daily",
          });
        } else {
          store.deleteAlarm(alarm.id);
        }
        onChange();
      });

      card.addEventListener("click", (event) => {
        if (event.target.closest("button, input, select, label")) return;
        onEdit?.("select", alarm.id);
      });

      container.appendChild(card);
    });
  }

  return { render };
}

function repeatOptions(selected) {
  const options = [
    ["once", "Once"],
    ["daily", "Daily"],
    ["weekdays", "Weekdays"],
    ["weekends", "Weekends"],
  ];
  return options
    .map(([value, label]) => `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`)
    .join("");
}

function challengeOptions(selected, challenges) {
  return challenges
    .list()
    .map((challenge) => {
      const suffix = challenge.id === "photo" ? "" : " (soon)";
      const disabled = challenge.id !== "photo" ? "disabled" : "";
      return `<option value="${challenge.id}" ${challenge.id === selected ? "selected" : ""} ${disabled}>${challenge.label}${suffix}</option>`;
    })
    .join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
