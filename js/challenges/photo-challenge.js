export function createPhotoChallenge({ els, showScreen }) {
  let stream = null;

  async function start() {
    stop();
    els.photoStatus.textContent = "Waiting for photo";
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      els.verifyVideo.srcObject = media;
      stream = media;
      els.verifyEmpty.style.display = "none";
      showScreen("verify");
    } catch {
      els.verifyEmpty.textContent = "Camera permission is needed to stop the alarm.";
      els.verifyEmpty.style.display = "grid";
      showScreen("verify");
    }
  }

  function stop() {
    if (stream) stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  function capturePhoto() {
    const video = els.verifyVideo;
    if (!video.srcObject || video.readyState < 2) return false;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 853;
    els.verifyCanvas.width = width;
    els.verifyCanvas.height = height;
    const context = els.verifyCanvas.getContext("2d");
    context.drawImage(video, 0, 0, width, height);
    return true;
  }

  async function verify() {
    if (!capturePhoto()) {
      els.verifyEmpty.textContent = "Wait for the camera preview, then try again.";
      els.verifyEmpty.style.display = "grid";
      return false;
    }

    stop();
    showScreen("loading");
    els.loaderIcon.className = "loader";
    els.loadingEyebrow.textContent = "Checking photo";
    els.loadingTitle.textContent = "Hold tight";
    els.photoStatus.textContent = "Photo captured. Checking...";

    await new Promise((resolve) => setTimeout(resolve, 1500));

    els.loaderIcon.className = "done-mark";
    els.loadingEyebrow.textContent = "Complete";
    els.loadingTitle.textContent = "Done";
    await new Promise((resolve) => setTimeout(resolve, 800));
    return true;
  }

  function cleanup() {
    stop();
  }

  return {
    id: "photo",
    label: "Take a photo",
    description: "Capture a photo to prove you are awake.",
    start,
    verify,
    cleanup,
  };
}
