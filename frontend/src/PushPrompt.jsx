import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { applyPushPrefs, loadPushPrefs, notificationPermission, pushErrorMessage, pushSupported, savePushPrefs } from "./pushNotifications.js";
import "./PushPrompt.css";

const DISMISS_KEY = "rc_push_prompt_dismissed";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function dismissedRecently(days) {
  const at = Number(localStorage.getItem(DISMISS_KEY));
  return Boolean(at) && Date.now() - at < days * WEEK_MS / 7;
}

function blockedSteps() {
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "Open iPhone Settings, find Reading Companion, tap Notifications and turn on Allow Notifications.";
  if (/Android/i.test(ua)) return "Long-press the app icon, tap App info, then Notifications and switch them on. In the browser: tap the lock icon in the address bar, then Permissions, then Notifications, then Allow.";
  return "Click the lock icon in the address bar, set Notifications to Allow, then reload the app.";
}

// One-time, dismissible invitation for existing users who have never answered the notification question.
export default function PushPrompt({ library }) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!pushSupported()) return undefined;
    const permission = notificationPermission();
    if (permission === "denied") {
      if (dismissedRecently(14)) return undefined;
      const timer = setTimeout(() => { setBlocked(true); setVisible(true); }, 4000);
      return () => clearTimeout(timer);
    }
    if (permission !== "default" || dismissedRecently(7)) return undefined;
    const prefs = loadPushPrefs();
    if (prefs.announcements || prefs.reminders) return undefined;
    const timer = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const dismiss = () => { localStorage.setItem(DISMISS_KEY, String(Date.now())); setVisible(false); };
  async function enable() {
    setBusy(true);
    setError("");
    try {
      const next = { announcements: true, reminders: false };
      await applyPushPrefs(next, library);
      savePushPrefs(next);
      localStorage.setItem(DISMISS_KEY, "1");
      setVisible(false);
    } catch (err) {
      setError(pushErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="push-prompt" role="dialog" aria-label="Turn on notifications">
      <span className="push-prompt-bell" aria-hidden="true"><Bell size={20} /></span>
      <div className="push-prompt-copy">
        <strong>{blocked ? "Notifications are blocked" : "Stay in the loop"}</strong>
        <span>{error || (blocked ? blockedSteps() : "Get updates, announcements and report status changes. Study reminders are in Settings.")}</span>
      </div>
      {!blocked && <button type="button" className="push-prompt-go" disabled={busy} onClick={enable}>{busy ? "…" : "Turn on"}</button>}
      <button type="button" className="push-prompt-x" aria-label="Not now" onClick={dismiss}><X size={16} /></button>
    </div>
  );
}
