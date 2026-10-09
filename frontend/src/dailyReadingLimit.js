export const DAILY_READING_LIMIT_SECONDS = 30 * 60;
export const DAILY_READING_USAGE_KEY = "reading_companion_daily_usage";

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDailyReadingUsage(storage = localStorage, date = new Date()) {
  try {
    const parsed = JSON.parse(storage.getItem(DAILY_READING_USAGE_KEY) || "{}");
    const seconds = Number(parsed?.[localDateKey(date)]);
    return Number.isFinite(seconds) ? Math.max(0, Math.min(DAILY_READING_LIMIT_SECONDS, Math.floor(seconds))) : 0;
  } catch {
    return 0;
  }
}

export function getDailyReadingRemaining(storage = localStorage, date = new Date()) {
  return Math.max(0, DAILY_READING_LIMIT_SECONDS - getDailyReadingUsage(storage, date));
}

export function recordDailyReadingSeconds(storage = localStorage, seconds = 1, date = new Date()) {
  const day = localDateKey(date);
  let usage = {};
  try {
    usage = JSON.parse(storage.getItem(DAILY_READING_USAGE_KEY) || "{}");
    if (!usage || typeof usage !== "object" || Array.isArray(usage)) usage = {};
  } catch {
    usage = {};
  }
  const increment = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const next = Math.min(DAILY_READING_LIMIT_SECONDS, Math.max(0, Number(usage[day]) || 0) + increment);
  const retainedDays = Object.keys(usage).sort().slice(-13);
  const retained = Object.fromEntries(retainedDays.map((key) => [key, usage[key]]));
  retained[day] = next;
  storage.setItem(DAILY_READING_USAGE_KEY, JSON.stringify(retained));
  return { usedSeconds: next, remainingSeconds: DAILY_READING_LIMIT_SECONDS - next };
}
