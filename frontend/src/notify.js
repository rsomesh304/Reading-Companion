// Tiny global notification bus. Any code can call notify() - App renders
// the toast. kind: "info" | "error" | "success".
export function notify(text, kind = "info", ms = 4200) {
  try {
    window.dispatchEvent(new CustomEvent("app:notify", { detail: { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, text, kind, ms } }));
  } catch { /* non-browser context */ }
}

export function notifyPersistent({ code, title, message, level = "error", action }) {
  try {
    window.dispatchEvent(new CustomEvent("app:notice", {
      detail: { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, code, title, message, level, action },
    }));
  } catch { /* non-browser context */ }
}

export function dismissNotice(id) {
  try { window.dispatchEvent(new CustomEvent("app:notice-dismiss", { detail: { id } })); } catch { /* non-browser context */ }
}
