import { classifyGeminiFailure } from "../../shared/geminiFailure.mjs";

export function errorDetails(error) {
  let serialized = "";
  try { serialized = JSON.stringify(error); } catch { /* not serializable */ }
  // A WebSocket CloseEvent keeps code/reason as prototype getters, so JSON.stringify drops them.
  return `${error?.message || ""} ${error?.status || ""} ${error?.code || ""} ${error?.reason || ""} ${error?.error?.message || ""} ${error?.error?.status || ""} ${error?.error?.code || ""} ${serialized}`;
}

export function isQuotaError(error) {
  return ["rate_limit_minute", "quota_daily"].includes(classifyGeminiFailure(error));
}

// Only classifications that justify changing key health are reported to the server.
export function isKeyFailure(error) {
  return ["rate_limit_minute", "quota_daily", "auth_permission_billing"].includes(classifyGeminiFailure(error));
}

// Short, secret-free description sent to the backend log, e.g. "1008 API key expired".
export function failureSummary(error) {
  const text = `${error?.code || error?.status || ""} ${error?.reason || error?.message || error?.error?.message || ""}`;
  return text.replace(/[A-Za-z0-9_.-]{28,}/g, "[redacted]").replace(/\s+/g, " ").trim().slice(0, 160);
}

export function isModelUnavailable(error) {
  const details = errorDetails(error);
  return Number(error?.status ?? error?.code ?? error?.error?.code) === 503 || /503|UNAVAILABLE|high demand|overloaded/i.test(details);
}
