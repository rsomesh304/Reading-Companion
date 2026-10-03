export function errorDetails(error) {
  let serialized = "";
  try { serialized = JSON.stringify(error); } catch { /* not serializable */ }
  // A WebSocket CloseEvent keeps code/reason as prototype getters, so JSON.stringify drops them.
  return `${error?.message || ""} ${error?.status || ""} ${error?.code || ""} ${error?.reason || ""} ${error?.error?.message || ""} ${error?.error?.status || ""} ${error?.error?.code || ""} ${serialized}`;
}

export function isQuotaError(error) {
  return /429|RESOURCE_EXHAUSTED|exhausted|quota|rate.?limit|too many requests/i.test(errorDetails(error));
}

export function isModelUnavailable(error) {
  const details = errorDetails(error);
  return Number(error?.status ?? error?.code ?? error?.error?.code) === 503 || /503|UNAVAILABLE|high demand|overloaded/i.test(details);
}
