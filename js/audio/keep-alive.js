import { logEvent } from "../core/logger.js";
import { SILENCE_LOOP_SRC } from "./sounds.js";

export function createKeepAlive() {
  let audio = null;
  let active = false;

  function createAudio() {
    const el = new Audio(SILENCE_LOOP_SRC);
    el.loop = true;
    el.preload = "auto";
    el.setAttribute("playsinline", "");
    el.volume = 0.02;
    return el;
  }

  async function unlock() {
    try {
      const probe = createAudio();
      probe.volume = 0.001;
      await probe.play();
      probe.pause();
      probe.currentTime = 0;
      logEvent("audio", "unlock_ok");
      return true;
    } catch (error) {
      logEvent("audio", "unlock_failed", { error: String(error) });
      return false;
    }
  }

  async function start() {
    if (active) return true;

    try {
      if (!audio) audio = createAudio();
      await audio.play();
      active = true;
      logEvent("keepalive", "start");
      return true;
    } catch (error) {
      active = false;
      logEvent("keepalive", "error", { error: String(error) });
      return false;
    }
  }

  function stop() {
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    active = false;
    logEvent("keepalive", "stop");
  }

  function isActive() {
    return active;
  }

  return { unlock, start, stop, isActive };
}
