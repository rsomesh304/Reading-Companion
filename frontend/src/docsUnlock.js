import { useSyncExternalStore } from "react";

export const DOCS_UNLOCK_KEY = "rc_docs_unlocked";
export const DOCS_OWNER_CACHE_KEY = "rc_docs_owner_ok";
const CHANGE_EVENT = "rc-docs-unlock-change";

function defaultStorage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function isDocsUnlocked(storage = defaultStorage()) {
  try {
    return storage?.getItem(DOCS_UNLOCK_KEY) === "1";
  } catch {
    return false;
  }
}

export function setDocsUnlocked(value, storage = defaultStorage()) {
  try {
    if (value) storage?.setItem(DOCS_UNLOCK_KEY, "1");
    else storage?.removeItem(DOCS_UNLOCK_KEY);
  } catch { /* storage unavailable */ }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGE_EVENT));
}

// Counts consecutive taps; a pause longer than `windowMs` starts the count again.
export function createTapCounter({ required = 7, windowMs = 2000, now = Date.now } = {}) {
  let count = 0;
  let last = 0;
  return {
    tap() {
      const at = now();
      count = last && at - last <= windowMs ? count + 1 : 1;
      last = at;
      if (count >= required) {
        count = 0;
        last = 0;
        return { count: required, unlocked: true };
      }
      return { count, unlocked: false };
    },
    reset() {
      count = 0;
      last = 0;
    },
  };
}

function subscribe(callback) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useDocsUnlocked() {
  return useSyncExternalStore(subscribe, () => isDocsUnlocked(), () => false);
}