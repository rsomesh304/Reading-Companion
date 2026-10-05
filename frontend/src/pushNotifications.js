import { apiUrl } from "./api.js";

const PREFS_KEY = "rc_push_prefs";
const LOOKBACK_DAYS = 45;
const MIN_SESSIONS = 3;
const REMINDER_LEAD_MINUTES = 15;

export function pushSupported() {
  return typeof window !== "undefined"
    && "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window;
}

export function notificationPermission() {
  return pushSupported() ? Notification.permission : "unsupported";
}

export function loadPushPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
    return { announcements: saved.announcements === true, reminders: saved.reminders === true };
  } catch {
    return { announcements: false, reminders: false };
  }
}

export function savePushPrefs(prefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify({ announcements: Boolean(prefs.announcements), reminders: Boolean(prefs.reminders) }));
}

export function collectSessionStarts(library) {
  return Object.values(library?.data?.books || {})
    .flatMap((book) => (Array.isArray(book?.sessions) ? book.sessions : []))
    .map((session) => session?.startedAt)
    .filter(Boolean);
}

/**
 * Learns when the reader usually starts reading: the busiest local hour over the last
 * few weeks, then the median start minute inside it. The reminder fires a little earlier.
 */
export function computeStudyPattern(startTimes, now = new Date()) {
  const cutoff = now.getTime() - LOOKBACK_DAYS * 86400000;
  const starts = startTimes
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()) && date.getTime() >= cutoff && date.getTime() <= now.getTime());
  if (starts.length < MIN_SESSIONS) return null;

  const byHour = new Map();
  for (const date of starts) {
    const hour = date.getHours();
    const bucket = byHour.get(hour) || { count: 0, latest: 0, minutes: [] };
    bucket.count += 1;
    bucket.latest = Math.max(bucket.latest, date.getTime());
    bucket.minutes.push(hour * 60 + date.getMinutes());
    byHour.set(hour, bucket);
  }
  const [, best] = [...byHour.entries()].sort((a, b) => b[1].count - a[1].count || b[1].latest - a[1].latest)[0];
  if (best.count < 2) return null;

  const minutes = best.minutes.sort((a, b) => a - b);
  const typicalMinute = minutes[Math.floor((minutes.length - 1) / 2)];
  return {
    typicalMinute,
    reminderMinute: (typicalMinute - REMINDER_LEAD_MINUTES + 1440) % 1440,
    sessions: best.count,
    sampleSize: starts.length,
  };
}

export function formatClockMinute(minute) {
  const date = new Date(2000, 0, 1, Math.floor(minute / 60), minute % 60);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function base64UrlToUint8Array(value) {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

async function serviceWorkerRegistration() {
  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise((resolve) => setTimeout(() => resolve(null), 4000)),
  ]);
  if (!registration) throw new Error("no_service_worker");
  return registration;
}

async function authHeaders() {
  const headers = { "Content-Type": "application/json" };
  try {
    const { supabaseClient } = await import("./supabaseClient.js");
    const { data } = (await supabaseClient?.auth.getSession()) || {};
    if (data?.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
  } catch {
    // Signed-out readers still receive announcements.
  }
  return headers;
}

async function sendSubscription(subscription, prefs, pattern) {
  const response = await fetch(apiUrl("/api/push/subscription"), {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      preferences: {
        announcements: prefs.announcements,
        reminders: prefs.reminders,
        reminderMinute: pattern?.reminderMinute ?? null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    }),
  });
  if (!response.ok) throw new Error(response.status === 503 ? "push_not_configured" : "push_save_failed");
}

async function removeSubscription(subscription) {
  await fetch(apiUrl("/api/push/subscription"), {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  }).catch(() => {});
  await subscription.unsubscribe().catch(() => {});
}

/** Applies the preferences: subscribes (asking permission if needed) or unsubscribes when everything is off. */
export async function applyPushPrefs(prefs, library) {
  if (!pushSupported()) throw new Error("unsupported");
  const registration = await serviceWorkerRegistration();
  const existing = await registration.pushManager.getSubscription();

  if (!prefs.announcements && !prefs.reminders) {
    if (existing) await removeSubscription(existing);
    savePushPrefs(prefs);
    return null;
  }

  if (Notification.permission !== "granted") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") throw new Error(permission === "denied" ? "permission_denied" : "permission_dismissed");
  }

  let subscription = existing;
  if (!subscription) {
    const configResponse = await fetch(apiUrl("/api/push/config"));
    const config = configResponse.ok ? await configResponse.json() : null;
    if (!config?.enabled || !config.publicKey) throw new Error("push_not_configured");
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(config.publicKey),
    });
  }

  const pattern = computeStudyPattern(collectSessionStarts(library));
  await sendSubscription(subscription, prefs, pattern);
  savePushPrefs(prefs);
  return pattern;
}

/** Quietly refreshes the stored study time and timezone on launch; never prompts. */
export async function refreshPushSubscription(library) {
  const prefs = loadPushPrefs();
  if (!pushSupported() || Notification.permission !== "granted" || (!prefs.announcements && !prefs.reminders)) return;
  try {
    const registration = await serviceWorkerRegistration();
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;
    await sendSubscription(subscription, prefs, computeStudyPattern(collectSessionStarts(library)));
  } catch {
    // Best effort; the next launch retries.
  }
}

export function pushErrorMessage(error) {
  switch (error?.message) {
    case "unsupported": return "This browser can't show notifications. Install the app to your home screen and try again.";
    case "no_service_worker": return "Notifications work in the installed app. Add Reading Companion to your home screen first.";
    case "permission_denied": return "Notifications are blocked. Allow them for this app in your browser or phone settings.";
    case "permission_dismissed": return "Notification permission wasn't granted.";
    case "push_not_configured": return "Notifications aren't available on the server yet.";
    default: return "Couldn't update notifications. Please try again.";
  }
}
