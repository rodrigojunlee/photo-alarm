import { logEvent } from "../core/logger.js";
import { getSoundById } from "./sounds.js";

const soundDbName = "photo-alarm-sounds";
const soundStoreName = "sounds";
const soundRecordKey = "alarm";

export function createAlarmPlayer() {
  let audio = null;
  let rampFrame = null;
  let customUrl = null;

  function openSoundDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(soundDbName, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(soundStoreName);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function loadCustomSound() {
    if (!("indexedDB" in window)) return null;

    try {
      const db = await openSoundDb();
      const record = await new Promise((resolve, reject) => {
        const tx = db.transaction(soundStoreName, "readonly");
        const request = tx.objectStore(soundStoreName).get(soundRecordKey);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
      if (!record?.blob) return null;
      revokeCustomUrl();
      customUrl = URL.createObjectURL(record.blob);
      return { url: customUrl, name: record.name || "Custom sound" };
    } catch {
      return null;
    }
  }

  async function saveCustomSound(file) {
    const db = await openSoundDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(soundStoreName, "readwrite");
      tx.objectStore(soundStoreName).put({ blob: file, name: file.name }, soundRecordKey);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    revokeCustomUrl();
    customUrl = URL.createObjectURL(file);
    return { url: customUrl, name: file.name };
  }

  async function clearCustomSound() {
    if ("indexedDB" in window) {
      try {
        const db = await openSoundDb();
        await new Promise((resolve, reject) => {
          const tx = db.transaction(soundStoreName, "readwrite");
          tx.objectStore(soundStoreName).delete(soundRecordKey);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch {
        // Fall through.
      }
    }
    revokeCustomUrl();
  }

  function revokeCustomUrl() {
    if (customUrl) {
      URL.revokeObjectURL(customUrl);
      customUrl = null;
    }
  }

  function stopRamp() {
    if (rampFrame !== null) {
      cancelAnimationFrame(rampFrame);
      rampFrame = null;
    }
  }

  function stop() {
    stopRamp();
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio = null;
    }
    logEvent("audio", "stop");
  }

  async function resolveSrc(soundId) {
    if (soundId === "custom" && customUrl) return customUrl;
    return getSoundById(soundId).src;
  }

  async function play({ soundId, volumeRampEnabled, volumeRampSeconds }) {
    stop();

    const src = await resolveSrc(soundId);
    audio = new Audio(src);
    audio.loop = true;
    audio.preload = "auto";
    audio.setAttribute("playsinline", "");
    audio.volume = volumeRampEnabled ? 0.001 : 1;

    try {
      await audio.play();
      logEvent("audio", "play", { soundId, volumeRampEnabled });
    } catch (error) {
      logEvent("audio", "play_failed", { error: String(error) });
      throw error;
    }

    if (volumeRampEnabled) {
      const durationMs = Math.max(5, volumeRampSeconds) * 1000;
      const start = performance.now();
      const tick = (now) => {
        if (!audio) return;
        const progress = Math.min(1, (now - start) / durationMs);
        audio.volume = 0.001 + progress * 0.999;
        if (progress < 1) rampFrame = requestAnimationFrame(tick);
      };
      rampFrame = requestAnimationFrame(tick);
    }

    return audio;
  }

  return {
    play,
    stop,
    loadCustomSound,
    saveCustomSound,
    clearCustomSound,
    hasCustomSound: () => Boolean(customUrl),
  };
}
