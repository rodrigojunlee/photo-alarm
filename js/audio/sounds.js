export const BUNDLED_SOUNDS = [
  {
    id: "classic",
    label: "Classic beep",
    src: "./assets/sounds/alarm-classic.wav",
  },
  {
    id: "radar",
    label: "Radar sweep",
    src: "./assets/sounds/alarm-radar.wav",
  },
  {
    id: "bells",
    label: "Morning bells",
    src: "./assets/sounds/alarm-bells.wav",
  },
];

export const SILENCE_LOOP_SRC = "./assets/sounds/silence-loop.wav";

export function getSoundById(id) {
  return BUNDLED_SOUNDS.find((s) => s.id === id) ?? BUNDLED_SOUNDS[0];
}
