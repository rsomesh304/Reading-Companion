import { dispatchLocalDataChanged, readAccountSyncMeta } from "./accountSync.js";

const STORAGE_KEY = "reading_companion_profile";
const PRIOR_READER_DATA_KEYS = new Set([
  "reading_companion_library",
  "reading_companion_gems",
  "reading_companion_memory",
  "rc_reports",
]);

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // corrupted data - start fresh
  }
  return { name: "Reader", voice: "Leda", theme: "dark", avatar: null, avatarPreset: null, activeDays: [] };
}

export class Profile {
  constructor() {
    this.data = load();
    if (!this.data.theme) this.data.theme = "dark";
    if (this.data.avatar === undefined) this.data.avatar = null;
    if (this.data.avatarPreset === undefined) this.data.avatarPreset = null;
  }
  _save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    dispatchLocalDataChanged();
  }
  markActiveToday() {
    const today = new Date().toDateString();
    if (!this.data.activeDays.includes(today)) {
      this.data.activeDays.push(today);
      this.data.activeDays = this.data.activeDays.slice(-90);
      this._save();
    }
  }
  getLast7Days() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        label: d.toLocaleDateString(undefined, { weekday: "narrow" }),
        active: this.data.activeDays.includes(d.toDateString()),
        isToday: i === 0,
      });
    }
    return days;
  }
  getStreak() {
    let streak = 0;
    for (let i = 0; ; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      if (this.data.activeDays.includes(d.toDateString())) streak += 1;
      else break;
    }
    return streak;
  }
  setName(name) { this.data.name = name; this._save(); }
  hasCompletedOnboarding() {
    if (this.data.hasCompletedOnboarding) return true;

    const hasPriorProfile = Boolean(
      (this.data.name && this.data.name !== "Reader") ||
      this.data.companionName ||
      this.data.dailyGoal ||
      this.data.preferences?.length ||
      this.data.activeDays?.length ||
      this.data.avatar ||
      this.data.avatarPreset !== null && this.data.avatarPreset !== undefined ||
      this.data.theme && this.data.theme !== "dark"
    );
    const hasPriorReaderData = !readAccountSyncMeta()?.userId && Object.keys(localStorage).some((key) => (
      PRIOR_READER_DATA_KEYS.has(key) || key.startsWith("rc_convo_")
    ));

    if (hasPriorProfile || hasPriorReaderData) {
      this.data.hasCompletedOnboarding = true;
      this._save();
      return true;
    }
    return false;
  }
  completeOnboarding({ name, companionName, preferences, dailyGoal } = {}) {
    if (name && name.trim()) this.data.name = name.trim();
    if (companionName && companionName.trim()) this.data.companionName = companionName.trim();
    if (Array.isArray(preferences)) this.data.preferences = preferences;
    if (dailyGoal) this.data.dailyGoal = dailyGoal;
    this.data.hasCompletedOnboarding = true;   // saved in localStorage under "reading_companion_profile"
    this._save();
  }
  setVoice(voice) { this.data.voice = voice; this._save(); }
  getTheme() { return this.data.theme || "dark"; }
  setTheme(theme) { this.data.theme = theme; this._save(); }
  setAvatar(dataUrl) { this.data.avatar = dataUrl; this.data.avatarPreset = null; this._save(); }
  clearAvatar() { this.data.avatar = null; this._save(); }
  setAvatarPreset(idx) { this.data.avatarPreset = idx; this._save(); }
}