import { createAlarmStore } from "./alarms/alarm-store.js";
import { createAlarmPlayer } from "./audio/alarm-player.js";
import { createKeepAlive } from "./audio/keep-alive.js";
import { createChallengeRegistry } from "./challenges/registry.js";
import { createScheduler } from "./core/scheduler.js";
import {
  getNearestAlarm,
  loadAppState,
  saveAppState,
  updateSettings as patchSettings,
} from "./core/state.js";
import { logEvent } from "./core/logger.js";
import { createAlarmListUI } from "./ui/alarm-list.js";
import { createDebugLogUI } from "./ui/debug-log.js";
import { bindSettingsUI } from "./ui/settings.js";
import { createScreenRouter } from "./ui/screens.js";

const screens = {
  home: document.querySelector("#homeScreen"),
  settings: document.querySelector("#settingsScreen"),
  debug: document.querySelector("#debugScreen"),
  ringing: document.querySelector("#ringingScreen"),
  verify: document.querySelector("#verifyScreen"),
  loading: document.querySelector("#loadingScreen"),
};

const els = {
  alarmList: document.querySelector("#alarmList"),
  addAlarmButton: document.querySelector("#addAlarmButton"),
  openSettingsButton: document.querySelector("#openSettingsButton"),
  openDebugButton: document.querySelector("#openDebugButton"),
  backHomeButton: document.querySelector("#backHomeButton"),
  backFromDebugButton: document.querySelector("#backFromDebugButton"),
  testAlarmButton: document.querySelector("#testAlarmButton"),
  statusBanner: document.querySelector("#statusBanner"),
  nearestAlarmLabel: document.querySelector("#nearestAlarmLabel"),
  ringingTime: document.querySelector("#ringingTime"),
  ringingLabel: document.querySelector("#ringingLabel"),
  verifyButton: document.querySelector("#verifyButton"),
  captureVerifyButton: document.querySelector("#captureVerifyButton"),
  keepRingingButton: document.querySelector("#keepRingingButton"),
  verifyVideo: document.querySelector("#verifyVideo"),
  verifyCanvas: document.querySelector("#verifyCanvas"),
  verifyEmpty: document.querySelector("#verifyEmpty"),
  photoStatus: document.querySelector("#photoStatus"),
  loaderIcon: document.querySelector("#loaderIcon"),
  loadingEyebrow: document.querySelector("#loadingEyebrow"),
  loadingTitle: document.querySelector("#loadingTitle"),
  logContainer: document.querySelector("#logContainer"),
  clearLogsButton: document.querySelector("#clearLogsButton"),
  exportLogsButton: document.querySelector("#exportLogsButton"),
  keepAudioAlive: document.querySelector("#keepAudioAlive"),
  volumeRampEnabled: document.querySelector("#volumeRampEnabled"),
  volumeRampSeconds: document.querySelector("#volumeRampSeconds"),
  soundSelect: document.querySelector("#soundSelect"),
  chooseCustomSound: document.querySelector("#chooseCustomSound"),
  resetCustomSound: document.querySelector("#resetCustomSound"),
  customSoundInput: document.querySelector("#customSoundInput"),
  customSoundStatus: document.querySelector("#customSoundStatus"),
  debugMode: document.querySelector("#debugMode"),
};

let appState = loadAppState();
let ringing = false;
let activeAlarm = null;

const router = createScreenRouter(screens);
const alarmPlayer = createAlarmPlayer();
const keepAlive = createKeepAlive();
const store = createAlarmStore(() => appState);
const challenges = createChallengeRegistry({ els, showScreen: (name) => router.show(name) });

const scheduler = createScheduler({
  getState: () => appState,
  onFire: (alarm, meta) => startAlarm(alarm, meta),
  onTick: () => renderHome(),
});

const alarmListUI = createAlarmListUI({
  container: els.alarmList,
  store,
  challenges,
  onChange: () => {
    saveAppState(appState);
    syncScheduler();
    renderHome();
  },
  onEdit: async (action) => {
    if (action === "armed") {
      await keepAlive.unlock();
      await syncKeepAlive();
    }
  },
});

const settingsUI = bindSettingsUI({
  els,
  getState: () => appState,
  updateSettings: (patch) => {
    patchSettings(appState, patch);
    return appState.settings;
  },
  alarmPlayer,
  keepAlive,
  onSettingsChange: () => {
    renderHome();
    syncKeepAlive();
    if (appState.settings.debugMode) debugUI.render();
  },
});

const debugUI = createDebugLogUI({ container: els.logContainer, els });

function getState() {
  return appState;
}

function updateSettings(patch) {
  patchSettings(appState, patch);
}

async function syncKeepAlive() {
  const { settings } = appState;
  const hasEnabled = appState.alarms.some((a) => a.enabled);

  if (ringing) {
    keepAlive.stop();
    return;
  }

  if (settings.keepAudioAlive && hasEnabled) {
    await keepAlive.unlock();
    await keepAlive.start();
  } else {
    keepAlive.stop();
  }
}

function syncScheduler() {
  const hasEnabled = appState.alarms.some((a) => a.enabled);
  if (hasEnabled && !ringing) scheduler.arm();
  else if (!hasEnabled) scheduler.disarm();
  else scheduler.scheduleTimeout();
}

function renderHome() {
  alarmListUI.render(appState.alarms);
  settingsUI.render();

  const nearest = getNearestAlarm(appState);
  if (nearest) {
    els.nearestAlarmLabel.textContent = `Next ring: ${new Date(nearest.nextFireAt).toLocaleString(undefined, {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    })} (${nearest.label})`;
    els.statusBanner.textContent = appState.settings.keepAudioAlive
      ? "Audio keep-alive enabled. Keep this app in the foreground overnight."
      : "For best reliability, enable keep-alive and leave the app open.";
    els.statusBanner.dataset.state = "armed";
  } else {
    els.nearestAlarmLabel.textContent = "No armed alarms";
    els.statusBanner.textContent = "Arm at least one alarm for overnight use.";
    els.statusBanner.dataset.state = "idle";
  }

  els.openDebugButton.hidden = !appState.settings.debugMode;
}

async function startAlarm(alarm, meta = {}) {
  if (ringing) return;

  ringing = true;
  activeAlarm = alarm;

  if (meta.reason !== "test") {
    store.markFired(alarm);
  }

  els.ringingTime.textContent = alarm.time;
  els.ringingLabel.textContent = alarm.label;
  router.show("ringing");

  keepAlive.stop();

  const { settings } = appState;
  try {
    await alarmPlayer.play({
      soundId: settings.selectedSoundId,
      volumeRampEnabled: settings.volumeRampEnabled,
      volumeRampSeconds: settings.volumeRampSeconds,
    });
  } catch {
    els.statusBanner.textContent = "Could not start audio. Open the app and tap Test alarm once.";
  }

  logEvent("alarm", "ringing_ui", { alarmId: alarm.id, reason: meta.reason });
  renderHome();
}

async function stopAlarm() {
  ringing = false;
  activeAlarm = null;
  alarmPlayer.stop();
  challenges.get("photo").cleanup();
  els.photoStatus.textContent = "Verification complete. Alarm stopped.";
  logEvent("alarm", "stopped");
  router.show("home");
  syncScheduler();
  await syncKeepAlive();
  renderHome();
}

async function beginVerification() {
  const type = activeAlarm?.challengeType || "photo";
  const challenge = challenges.get(type);

  if (!challenges.isImplemented(type)) {
    els.photoStatus.textContent = `${challenge.label} is not available yet.`;
    return;
  }

  logEvent("challenge", "started", { type });
  await challenge.start();
}

async function completeVerification() {
  const type = activeAlarm?.challengeType || "photo";
  const challenge = challenges.get(type);
  const ok = await challenge.verify();
  if (!ok) return;

  logEvent("challenge", "completed", { type });
  await stopAlarm();
}

els.addAlarmButton.addEventListener("click", () => {
  store.addAlarm({ label: `Alarm ${appState.alarms.length + 1}` });
  renderHome();
  syncScheduler();
});

els.openSettingsButton.addEventListener("click", () => {
  settingsUI.render();
  router.show("settings");
});

els.openDebugButton.addEventListener("click", () => {
  debugUI.render();
  router.show("debug");
});

els.backHomeButton.addEventListener("click", () => router.show("home"));
els.backFromDebugButton.addEventListener("click", () => router.show("home"));

els.testAlarmButton.addEventListener("click", async () => {
  await keepAlive.unlock();
  const sample = appState.alarms[0] || { id: "test", time: "—", label: "Test", challengeType: "photo" };
  startAlarm({ ...sample, id: "test" }, { reason: "test" });
});

els.verifyButton.addEventListener("click", () => beginVerification());

els.keepRingingButton.addEventListener("click", () => {
  challenges.get("photo").cleanup();
  router.show("ringing");
});

els.captureVerifyButton.addEventListener("click", () => completeVerification());

async function boot() {
  logEvent("app", "boot");
  await alarmPlayer.loadCustomSound();
  renderHome();
  debugUI.render();
  scheduler.bindLifecycle();
  syncScheduler();
  await syncKeepAlive();
  scheduler.checkDue("boot");
}

boot();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}
