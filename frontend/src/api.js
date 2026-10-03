const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || "").replace(/\/+$/, "");

export function apiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

const RETRYABLE_STATUS = new Set([502, 503, 504]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Render's free tier sleeps when idle and answers 502/503 for up to ~60s while waking.
export async function apiFetch(path, init, { retries = 8, delayMs = 5000 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(apiUrl(path), init);
      if (!RETRYABLE_STATUS.has(response.status) || attempt === retries) return response;
    } catch (error) {
      lastError = error;
      if (attempt === retries) throw lastError;
    }
    await sleep(delayMs);
  }
  throw lastError;
}

export function warmBackend() {
  apiFetch("/api/health", { cache: "no-store" }, { retries: 12, delayMs: 5000 }).catch(() => {});
}