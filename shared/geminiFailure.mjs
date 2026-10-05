const textOf = (error) => [
  error?.code,
  error?.status,
  error?.statusText,
  error?.message,
  error?.reason,
  error?.error?.code,
  error?.error?.status,
  error?.error?.message,
  error?.error?.reason,
  ...(Array.isArray(error?.details) ? error.details.flatMap((detail) => [detail?.reason, detail?.metadata?.quotaId, detail?.metadata?.service]) : []),
  error?.details?.reason,
  error?.details?.metadata?.quotaId,
  error?.details?.metadata?.service,
  error?.cause?.message,
].filter((value) => value !== undefined && value !== null).join(" ").toLowerCase();

export function classifyGeminiFailure(error) {
  const text = textOf(error);
  const code = String(error?.code ?? error?.error?.code ?? "").toLowerCase();
  const numericStatus = [error?.status, error?.error?.status, error?.error?.code, error?.code].map(Number).find(Number.isFinite);
  const status = numericStatus || 0;
  const compact = `${code} ${text}`.replace(/[\s_-]+/g, "");
  if (/no[_ -]?reply|silent|silence|idle|watchdog/.test(text)) return "silent";
  if (/quota_exceeded|quota[_ -]?daily|daily quota|requests per day|per-day quota|daily limit|quotaid[^ ]*day/i.test(`${code} ${text}`)
    || /perday|requestsperday|inputtokenspermodelperday|tokensperday|dailyquota/.test(compact)) return "quota_daily";
  if (/rate_limit_exceeded|too_many_requests|rate[_ -]?limit|per.minute|per.second|requests per minute|tokens per minute|\bquota\b|resource has been exhausted/.test(`${code} ${text}`)) return "rate_limit_minute";
  if (status === 429 || /resource[_ ]exhausted/.test(text)) return "rate_limit_minute";
  if ([401, 402, 403].includes(status) || /api[_ -]?key|permission[ _-]?denied|unauthenticated|billing|payment_required/.test(text)) return "auth_permission_billing";
  if (status >= 500 || [1006, 1011].includes(status) || /\b1006\b|\b1011\b|network|failed to fetch|econnreset|socket hang up|goaway|go_away|service_unavailable|server_error|temporar|aborted|connection closed/.test(text)) return "transient";
  return "transient";
}