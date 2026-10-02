import { useEffect, useState } from "react";

const FALLBACK_COLOR = "#7c3aed";

function sampleDominantColor(image) {
  const canvas = document.createElement("canvas");
  const size = 24;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return FALLBACK_COLOR;

  context.drawImage(image, 0, 0, size, size);
  const pixels = context.getImageData(0, 0, size, size).data;
  const bins = new Map();

  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    if (pixels[index + 3] < 160) continue;
    const brightness = (red + green + blue) / 3;
    if (brightness < 24 || brightness > 244) continue;

    const key = `${red >> 4},${green >> 4},${blue >> 4}`;
    const bucket = bins.get(key) || { count: 0, red: 0, green: 0, blue: 0 };
    bucket.count += 1;
    bucket.red += red;
    bucket.green += green;
    bucket.blue += blue;
    bins.set(key, bucket);
  }

  let dominant = null;
  for (const bucket of bins.values()) {
    if (!dominant || bucket.count > dominant.count) dominant = bucket;
  }
  if (!dominant) return FALLBACK_COLOR;

  const channels = [dominant.red, dominant.green, dominant.blue].map((total) =>
    Math.round(total / dominant.count).toString(16).padStart(2, "0")
  );
  return `#${channels.join("")}`;
}

export function useBookAura(imageUrl) {
  const [color, setColor] = useState(FALLBACK_COLOR);

  useEffect(() => {
    let cancelled = false;
    if (!imageUrl) {
      return undefined;
    }

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      try {
        const nextColor = sampleDominantColor(image);
        if (!cancelled) setColor(nextColor);
      } catch {
        if (!cancelled) setColor(FALLBACK_COLOR);
      }
    };
    image.onerror = () => {
      if (!cancelled) setColor(FALLBACK_COLOR);
    };
    image.src = imageUrl;

    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
    };
  }, [imageUrl]);

  return imageUrl ? color : FALLBACK_COLOR;
}
