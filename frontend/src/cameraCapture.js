const BLUR_MIN = 12;      // lower = more tolerant. Check console "[CAM] sharpness" on a clear page and tune.
const DARK_MIN = 35;

// Rear camera -> ~1 sharp JPEG/sec (up to 1600px) + brightness and sharpness check
export class CameraCapture {
  constructor(videoEl, canvasEl, onFrame, onPageQuality) {
    this.videoEl = videoEl;
    this.canvasEl = canvasEl;
    this.onFrame = onFrame;
    this.onPageQuality = onPageQuality;
    this.stream = null;
    this.intervalId = null;
    this.small = null;
    this.n = 0;
  }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 10 } },
    });
    const track = this.stream.getVideoTracks()[0];
    try {
      const caps = track?.getCapabilities?.();
      if (caps?.focusMode?.includes("continuous")) await track.applyConstraints({ advanced: [{ focusMode: "continuous" }] });
    } catch { /* focus control not supported on this phone */ }
    this.videoEl.srcObject = this.stream;
    await this.videoEl.play();
    this.intervalId = setInterval(() => this._captureFrame(), 1000);
  }

  _metrics() {
    const v = this.videoEl;
    const vw = v.videoWidth || 640, vh = v.videoHeight || 480;
    const sc = this.small || (this.small = document.createElement("canvas"));
    sc.width = 240; sc.height = Math.max(8, Math.round((240 * vh) / vw));
    const sctx = sc.getContext("2d", { willReadFrequently: true });
    sctx.drawImage(v, 0, 0, sc.width, sc.height);
    const d = sctx.getImageData(0, 0, sc.width, sc.height).data;
    const w = sc.width, h = sc.height;
    const g = new Float32Array(w * h);
    let sum = 0;
    for (let i = 0, p = 0; i < d.length; i += 4, p++) { g[p] = (d[i] + d[i + 1] + d[i + 2]) / 3; sum += g[p]; }
    const brightness = sum / (w * h);
    let s1 = 0, s2 = 0, cnt = 0;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const lap = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - w] - g[i + w];
        s1 += lap; s2 += lap * lap; cnt++;
      }
    }
    const sharp = s2 / cnt - (s1 / cnt) ** 2;
    return { brightness, sharp };
  }

  _captureFrame() {
    const v = this.videoEl;
    if (!v.videoWidth) return;
    const { brightness, sharp } = this._metrics();
    this.n += 1;
    if (import.meta.env?.DEV && this.n % 5 === 0) console.debug(`[CAM] brightness ${brightness.toFixed(0)} sharpness ${sharp.toFixed(1)}`);
    const dark = brightness <= DARK_MIN;
    const blurry = !dark && sharp < BLUR_MIN;
    this.onPageQuality?.(!dark && !blurry, dark ? "dark" : blurry ? "blurry" : "ok");
    if (dark) return;                       // never send black frames

    const scale = Math.min(1, 1152 / Math.max(v.videoWidth, v.videoHeight));
    this.canvasEl.width = Math.round(v.videoWidth * scale);
    this.canvasEl.height = Math.round(v.videoHeight * scale);
    this.canvasEl.getContext("2d").drawImage(v, 0, 0, this.canvasEl.width, this.canvasEl.height);
    this.canvasEl.toBlob((blob) => {
      if (!blob) return;
      const reader = new FileReader();
      reader.onloadend = () => this.onFrame(reader.result.split(",")[1]);
      reader.readAsDataURL(blob);
    }, "image/jpeg", 0.7);
  }

  stop() {
    clearInterval(this.intervalId);
    this.stream?.getTracks().forEach((t) => t.stop());
  }
}