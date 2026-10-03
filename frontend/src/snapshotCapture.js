const MAX_SIDE = 1600;
const DARK_MIN = 35;
const BLUR_MIN = 8;

function loadBitmap(file) {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => loadImageElement(file));
  }
  return loadImageElement(file);
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image_unreadable")); };
    img.src = url;
  });
}

function measure(ctx, width, height) {
  const d = ctx.getImageData(0, 0, width, height).data;
  const g = new Float32Array(width * height);
  let sum = 0;
  for (let i = 0, p = 0; i < d.length; i += 4, p += 1) { g[p] = (d[i] + d[i + 1] + d[i + 2]) / 3; sum += g[p]; }
  let s1 = 0, s2 = 0, count = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const lap = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - width] - g[i + width];
      s1 += lap; s2 += lap * lap; count += 1;
    }
  }
  return { brightness: sum / (width * height), sharpness: s2 / count - (s1 / count) ** 2 };
}

// Resizes a photo for the model and reports whether the page looks readable.
export async function prepareSnapshot(file) {
  const bitmap = await loadBitmap(file);
  const srcW = bitmap.width, srcH = bitmap.height;
  if (!srcW || !srcH) throw new Error("image_unreadable");
  const scale = Math.min(1, MAX_SIDE / Math.max(srcW, srcH));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(srcW * scale);
  canvas.height = Math.round(srcH * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  const probe = document.createElement("canvas");
  probe.width = 240;
  probe.height = Math.max(8, Math.round((240 * canvas.height) / canvas.width));
  const pctx = probe.getContext("2d", { willReadFrequently: true });
  pctx.drawImage(canvas, 0, 0, probe.width, probe.height);
  const { brightness, sharpness } = measure(pctx, probe.width, probe.height);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return {
    dataUrl,
    base64: dataUrl.split(",")[1],
    quality: brightness <= DARK_MIN ? "dark" : sharpness < BLUR_MIN ? "blurry" : "ok",
  };
}
