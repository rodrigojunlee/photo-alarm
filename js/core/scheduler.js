import { alreadyFiredForOccurrence, msUntil } from "./dates.js";
import { getEnabledAlarms, getNearestAlarm, refreshAlarmSchedule } from "./state.js";
import { logEvent } from "./logger.js";

const WATCHDOG_MS = 12_000;

export function createScheduler({ getState, onFire, onTick }) {
  let timeoutId = null;
  let watchdogId = null;
  let firing = false;

  function clearTimers() {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (watchdogId !== null) {
      clearInterval(watchdogId);
      watchdogId = null;
    }
  }

  function scheduleTimeout() {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    const nearest = getNearestAlarm(getState());
    if (!nearest?.nextFireAt || firing) return;

    const delay = msUntil(nearest.nextFireAt);
    if (delay === null || delay < 0) return;

    const capped = Math.min(delay, 2_147_483_647);
    timeoutId = setTimeout(() => checkDue("timeout"), capped);
    logEvent("schedule", "timeout_set", {
      alarmId: nearest.id,
      nextFireAt: nearest.nextFireAt,
      delayMs: capped,
    });
  }

  function checkDue(reason = "watchdog") {
    if (firing) return false;

    const state = getState();
    const now = Date.now();
    const enabled = getEnabledAlarms(state);

    logEvent("watchdog", reason, {
      enabledCount: enabled.length,
      now: new Date(now).toISOString(),
    });

    for (const alarm of enabled) {
      const fireAt = alarm.nextFireAt;
      if (!fireAt) continue;

      const dueAt = new Date(fireAt).getTime();
      if (now >= dueAt && !alreadyFiredForOccurrence(alarm, fireAt)) {
        firing = true;
        logEvent("alarm", "triggered", { alarmId: alarm.id, fireAt, reason });
        onFire(alarm, { reason });
        firing = false;
        onTick?.();
        scheduleTimeout();
        return true;
      }
    }

    onTick?.();
    scheduleTimeout();
    return false;
  }

  function arm() {
    clearTimers();
    const state = getState();

    for (const alarm of state.alarms) {
      if (alarm.enabled) refreshAlarmSchedule(alarm);
    }

    const nearest = getNearestAlarm(state);
    if (nearest) {
      logEvent("alarm", "scheduled", {
        alarmId: nearest.id,
        nextFireAt: nearest.nextFireAt,
      });
    }

    scheduleTimeout();
    watchdogId = setInterval(() => {
      if (document.visibilityState === "visible") checkDue("watchdog");
    }, WATCHDOG_MS);

    checkDue("arm");
  }

  function disarm() {
    clearTimers();
    logEvent("schedule", "disarmed");
  }

  function handleResume(source) {
    logEvent("visibility", "visible", { source });
    checkDue("resume");
  }

  function handleHidden() {
    logEvent("visibility", "hidden");
  }

  function bindLifecycle() {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") handleResume("visibilitychange");
      else handleHidden();
    });

    window.addEventListener("pageshow", (event) => {
      if (event.persisted) handleResume("pageshow");
    });

    window.addEventListener("focus", () => handleResume("focus"));
  }

  return {
    arm,
    disarm,
    checkDue,
    bindLifecycle,
    scheduleTimeout,
  };
}
