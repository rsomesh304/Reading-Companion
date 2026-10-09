export function parseAdminUserIds(raw) {
  return new Set(String(raw || "").split(",").map((id) => id.trim().toLowerCase()).filter(Boolean));
}

export function isUserId(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function normalizeDailyLimitMinutes(value) {
  const minutes = Number(value);
  return Number.isInteger(minutes) && minutes >= 1 && minutes <= 1440 ? minutes : null;
}

export function normalizeUsageSeconds(value) {
  const seconds = Number(value);
  return Number.isInteger(seconds) && seconds >= 1 && seconds <= 60 ? seconds : null;
}

export function quotaResponse(row, canManage = false) {
  const dailyLimitMinutes = Number(row?.daily_limit_minutes);
  const usedSeconds = Number(row?.used_seconds);
  if (!Number.isInteger(dailyLimitMinutes) || dailyLimitMinutes < 1 || !Number.isInteger(usedSeconds) || usedSeconds < 0) {
    throw new Error("invalid_reading_quota");
  }
  const limitSeconds = dailyLimitMinutes * 60;
  return {
    dailyLimitMinutes,
    usedSeconds: Math.min(usedSeconds, limitSeconds),
    remainingSeconds: Math.max(0, limitSeconds - usedSeconds),
    canManage,
  };
}
