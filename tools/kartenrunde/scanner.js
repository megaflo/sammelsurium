// Camera QR scanner built on the bundled jsQR (works offline, unlike BarcodeDetector fallbacks).

export async function startScanner(video, onCode) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio: false,
  });
  video.muted = true; // the attribute alone is not enough on iOS; autoplay needs the property
  video.playsInline = true;
  video.srcObject = stream;
  try {
    await video.play();
  } catch (e) {
    stream.getTracks().forEach((t) => t.stop());
    throw e;
  }
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  let stopped = false;
  let last = 0;
  const tick = (now) => {
    if (stopped) return;
    requestAnimationFrame(tick);
    if (now - last < 120 || video.readyState < 2 || !video.videoWidth) return;
    last = now;
    const scale = Math.min(1, 800 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hit = window.jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
    if (hit && hit.data) onCode(hit.data);
  };
  requestAnimationFrame(tick);
  return () => {
    stopped = true;
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  };
}
