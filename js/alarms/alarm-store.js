import { computeNextFireAt, repeatLabel } from "../core/dates.js";
import { createAlarm, refreshAlarmSchedule, saveAppState } from "../core/state.js";
import { logEvent } from "../core/logger.js";

export function createAlarmStore(getState) {
  function persist() {
    saveAppState(getState());
  }

  function addAlarm(overrides = {}) {
    const state = getState();
    const alarm = createAlarm(overrides);
    state.alarms.push(alarm);
    persist();
    logEvent("alarm", "created", { alarmId: alarm.id });
    return alarm;
  }

  function updateAlarm(id, patch) {
    const state = getState();
    const alarm = state.alarms.find((a) => a.id === id);
    if (!alarm) return null;

    Object.assign(alarm, patch);
    if (patch.time !== undefined || patch.repeat !== undefined || patch.enabled !== undefined) {
      refreshAlarmSchedule(alarm);
    }
    persist();
    logEvent("alarm", "updated", { alarmId: id, patch });
    return alarm;
  }

  function deleteAlarm(id) {
    const state = getState();
    state.alarms = state.alarms.filter((a) => a.id !== id);
    if (!state.alarms.length) state.alarms.push(createAlarm({ label: "Morning" }));
    persist();
    logEvent("alarm", "deleted", { alarmId: id });
  }

  function toggleAlarm(id, enabled) {
    return updateAlarm(id, { enabled });
  }

  function markFired(alarm) {
    alarm.lastFiredAt = alarm.nextFireAt || new Date().toISOString();

    if (alarm.repeat === "once") {
      alarm.enabled = false;
      alarm.nextFireAt = null;
    } else {
      alarm.nextFireAt = computeNextFireAt(alarm, new Date(Date.now() + 1000));
    }

    persist();
    logEvent("alarm", "fired_marked", {
      alarmId: alarm.id,
      lastFiredAt: alarm.lastFiredAt,
      nextFireAt: alarm.nextFireAt,
    });
  }

  function hintFor(alarm) {
    if (!alarm.enabled) return "Off";
    if (!alarm.nextFireAt) return "No upcoming ring";
    return `Next: ${new Date(alarm.nextFireAt).toLocaleString(undefined, {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    })} · ${repeatLabel(alarm.repeat)}`;
  }

  return { addAlarm, updateAlarm, deleteAlarm, toggleAlarm, markFired, hintFor };
}
