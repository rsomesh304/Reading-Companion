import { apiFetch } from "./api.js";

export function getDeviceDate() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// Asks the backend for a short-lived Live token. When the previous key failed, say which one and why
// so the backend rests it and hands out the next key.
export async function mintLiveToken({ failedKeyIndex, failedKeyDay, reason } = {}) {
  const deviceDay = getDeviceDate();
  const headers = { "X-Device-Date": deviceDay };
  const reported = failedKeyIndex && failedKeyDay === deviceDay;
  const body = reported
    ? JSON.stringify({ failedKeyIndex, failedKeyDate: failedKeyDay, failedKeyReason: String(reason || "").slice(0, 200) })
    : undefined;
  if (body) headers["Content-Type"] = "application/json";
  const res = await apiFetch("/api/token", { method: "POST", headers, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `token_mint_failed (${res.status})`);
  if (typeof data.token !== "string" || !data.token) throw new Error("token_missing_from_backend_response");
  return { token: data.token, keyCount: data.keyCount, keyIndex: data.keyIndex, deviceDay };
}
