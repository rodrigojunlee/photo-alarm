import { createPhotoChallenge } from "./photo-challenge.js";

const stubs = ["qr", "barcode", "object", "face"].map((id) => ({
  id,
  label: {
    qr: "Scan QR code",
    barcode: "Scan barcode",
    object: "Object detection",
    face: "Face detection",
  }[id],
  description: "Coming in a future update.",
  async start() {
    throw new Error("This challenge type is not available yet.");
  },
  async verify() {
    return false;
  },
  cleanup() {},
}));

export function createChallengeRegistry(deps) {
  const photo = createPhotoChallenge(deps);
  const byId = new Map([photo, ...stubs].map((c) => [c.id, c]));

  return {
    list() {
      return [...byId.values()];
    },
    get(id) {
      return byId.get(id) ?? photo;
    },
    isImplemented(id) {
      return id === "photo";
    },
  };
}
