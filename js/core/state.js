import { computeNextFireAt } from "./dates.js";

const STORE_KEY = "photo-alarm-v2";
const LEGACY_KEY = "photo-alarm-prototype-state";

const defaultSettings = () => ({
  keepAudioAlive: false,
  volumeRampEnabled: true,
  volumeRampSeconds: 30,
  selectedSoundId: "classic",
  debugMode: false,
});

export function createAlarm(overrides = {}) {
  const alarm = {
    id: crypto.randomUUID(),
    time: "07:00",
    enabled: false,
    label: "Alarm",
    repeat: "daily",
    challengeType: "photo",
    challengeConfig: {},
    lastFiredAt: null,
    nextFireAt: null,
    ...overrides,
  };
  alarm.nextFireAt = computeNextFireAt(alarm);
  return alarm;
}

function migrateLegacy() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const legacy = JSON.parse(raw);
    const alarm = createAlarm({
      time: legacy.alarmTime || "07:00",
      enabled: Boolean(legacy.enabled),
      label: "Migrated alarm",
      repeat: "daily",
    });
    return {
      version: 2,
      settings: {
        ...defaultSettings(),
        selectedSoundId: legacy.alarmSoundName ? "custom" : "classic",
      },
      alarms: [alarm],
    };
  } catch {
    return null;
  }
}

export function loadAppState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return normalizeState(parsed);
    }
  } catch {
    localStorage.removeItem(STORE_KEY);
  }

  const migrated = migrateLegacy();
  if (migrated) return normalizeState(migrated);

  return normalizeState({
    version: 2,
    settings: defaultSettings(),
    alarms: [createAlarm({ label: "Morning", enabled: false })],
  });
}

function normalizeState(input) {
  const settings = { ...defaultSettings(), ...(input.settings || {}) };
  const alarms = (input.alarms || []).map((alarm) => ({
    ...createAlarm({ enabled: false }),
    ...alarm,
    nextFireAt: alarm.nextFireAt || computeNextFireAt(alarm),
  }));

  if (!alarms.length) alarms.push(createAlarm({ label: "Morning" }));

  return { version: 2, settings, alarms };
}

export function saveAppState(state) {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

export function updateSettings(state, patch) {
  state.settings = { ...state.settings, ...patch };
  saveAppState(state);
  return state.settings;
}

export function refreshAlarmSchedule(alarm) {
  alarm.nextFireAt = computeNextFireAt(alarm);
  return alarm;
}

export function getEnabledAlarms(state) {
  return state.alarms.filter((a) => a.enabled && a.nextFireAt);
}

export function getNearestAlarm(state) {
  const enabled = getEnabledAlarms(state)
    .map((alarm) => ({ alarm, at: new Date(alarm.nextFireAt).getTime() }))
    .sort((a, b) => a.at - b.at);
  return enabled[0]?.alarm ?? null;
}
