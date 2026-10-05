import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { applyPushPrefs, loadPushPrefs, notificationPermission, pushErrorMessage, pushSupported, savePushPrefs } from "./pushNotifications.js";
import "./PushPrompt.css";

const DISMISS_KEY = "rc_push_prompt_dismissed";

// One-time, dismissible invitation for existing users who have never answered the notification question.
export default function PushPrompt({ library }) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!pushSupported() || notificationPermission() !== "default" || localStorage.getItem(DISMISS_KEY)) return undefined;
    const prefs = loadPushPrefs();
    if (prefs.announcements || prefs.reminders) return undefined;
    const timer = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const dismiss = () => { localStorage.setItem(DISMISS_KEY, "1"); setVisible(false); };
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
        <strong>Stay in the loop</strong>
        <span>{error || "Get updates, announcements and report status changes. Study reminders are in Settings."}</span>
      </div>
      <button type="button" className="push-prompt-go" disabled={busy} onClick={enable}>{busy ? "…" : "Turn on"}</button>
      <button type="button" className="push-prompt-x" aria-label="Not now" onClick={dismiss}><X size={16} /></button>
    </div>
  );
}
