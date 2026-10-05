import { apiUrl } from "./api.js";

export function getDeviceDate() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// Asks the backend for a short-lived Live token. When the previous key failed, say which one and why
// so the backend rests it and hands out the next key.
export async function mintLiveToken({ failedKeyIndex, failedKeyDay, reason, leaseId } = {}) {
  const deviceDay = getDeviceDate();
  const headers = { "X-Device-Date": deviceDay };
  const body = {
    ...(Number.isInteger(Number(failedKeyIndex)) && Number(failedKeyIndex) > 0 ? {
      failedKeyIndex: Number(failedKeyIndex),
      failedKeyDate: typeof failedKeyDay === "string" ? failedKeyDay : deviceDay,
      failedKeyReason: String(reason || "").slice(0, 200),
    } : {}),
    ...(typeof leaseId === "string" && leaseId.length <= 128 ? { leaseId } : {}),
  };
  headers["Content-Type"] = "application/json";
  const res = await fetch(apiUrl("/api/token"), { method: "POST", headers, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || "Voice service abhi available nahi hai.");
    error.code = data.error || data.code || "server_error";
    error.status = res.status;
    error.retryAfterSec = Math.max(0, Number(data.retryAfterSec || res.headers.get("Retry-After")) || 0);
    throw error;
  }
  if (typeof data.token !== "string" || !data.token) throw new Error("token_missing_from_backend_response");
  return {
    token: data.token,
    keyCount: data.keyCount,
    keyIndex: data.keyIndex,
    leaseId: typeof data.leaseId === "string" ? data.leaseId : "",
    leaseTtlSec: Number(data.leaseTtlSec) || 0,
    deviceDay: data.deviceDay || deviceDay,
  };
}

export function releaseLiveLease(leaseId, { beacon = false } = {}) {
  if (typeof leaseId !== "string" || !leaseId) return false;
  const url = apiUrl("/api/token/release");
  const body = JSON.stringify({ leaseId });
  if (beacon && typeof navigator !== "undefined" && navigator.sendBeacon && typeof Blob !== "undefined") {
    if (navigator.sendBeacon(url, new Blob([body], { type: "application/json" }))) return true;
  }
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
  return true;
}
