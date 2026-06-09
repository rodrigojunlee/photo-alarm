import { BUNDLED_SOUNDS } from "../audio/sounds.js";

export function bindSettingsUI({ els, getState, updateSettings, alarmPlayer, keepAlive, onSettingsChange }) {
  function render() {
    const { settings } = getState();

    els.keepAudioAlive.checked = settings.keepAudioAlive;
    els.volumeRampEnabled.checked = settings.volumeRampEnabled;
    els.volumeRampSeconds.value = String(settings.volumeRampSeconds);
    els.debugMode.checked = settings.debugMode;

    els.soundSelect.innerHTML = BUNDLED_SOUNDS.map(
      (sound) =>
        `<option value="${sound.id}" ${sound.id === settings.selectedSoundId ? "selected" : ""}>${sound.label}</option>`
    ).join("");

    if (alarmPlayer.hasCustomSound()) {
      const option = document.createElement("option");
      option.value = "custom";
      option.textContent = "Custom upload";
      if (settings.selectedSoundId === "custom") option.selected = true;
      els.soundSelect.appendChild(option);
    }

    els.resetCustomSound.hidden = !alarmPlayer.hasCustomSound();
  }

  els.keepAudioAlive.addEventListener("change", async () => {
    updateSettings({ keepAudioAlive: els.keepAudioAlive.checked });
    onSettingsChange();
  });

  els.volumeRampEnabled.addEventListener("change", () => {
    updateSettings({ volumeRampEnabled: els.volumeRampEnabled.checked });
    onSettingsChange();
  });

  els.volumeRampSeconds.addEventListener("change", () => {
    const value = Math.max(5, Math.min(120, Number(els.volumeRampSeconds.value) || 30));
    els.volumeRampSeconds.value = String(value);
    updateSettings({ volumeRampSeconds: value });
  });

  els.soundSelect.addEventListener("change", () => {
    updateSettings({ selectedSoundId: els.soundSelect.value });
  });

  els.debugMode.addEventListener("change", () => {
    updateSettings({ debugMode: els.debugMode.checked });
    onSettingsChange();
  });

  els.chooseCustomSound.addEventListener("click", () => els.customSoundInput.click());

  els.customSoundInput.addEventListener("change", async () => {
    const file = els.customSoundInput.files?.[0];
    els.customSoundInput.value = "";
    if (!file) return;

    const ok =
      file.type === "audio/mpeg" ||
      file.type === "audio/mp3" ||
      file.type === "audio/wav" ||
      file.name.toLowerCase().endsWith(".mp3") ||
      file.name.toLowerCase().endsWith(".wav");

    if (!ok) {
      els.customSoundStatus.textContent = "Choose an .mp3 or .wav file.";
      return;
    }

    try {
      await alarmPlayer.saveCustomSound(file);
      updateSettings({ selectedSoundId: "custom" });
      els.customSoundStatus.textContent = file.name;
      render();
    } catch {
      els.customSoundStatus.textContent = "Could not save that file.";
    }
  });

  els.resetCustomSound.addEventListener("click", async () => {
    await alarmPlayer.clearCustomSound();
    const { settings } = getState();
    if (settings.selectedSoundId === "custom") {
      updateSettings({ selectedSoundId: "classic" });
    }
    els.customSoundStatus.textContent = "";
    render();
  });

  return { render };
}
