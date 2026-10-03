import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { Profile } from "./profile.js";

function createStorage() {
  const values = new Map();
  const storage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) {
      values.set(key, String(value));
      Object.defineProperty(storage, key, { configurable: true, enumerable: true, value: String(value) });
    },
    removeItem(key) { values.delete(key); delete storage[key]; },
    clear() {
      for (const key of values.keys()) delete storage[key];
      values.clear();
    },
    key(index) { return [...values.keys()][index] ?? null; },
    get length() { return values.size; },
  };
  return storage;
}

beforeEach(() => {
  globalThis.localStorage = createStorage();
});

afterEach(() => {
  delete globalThis.localStorage;
});

test("a clean browser profile still requires first-run onboarding", () => {
  const profile = new Profile();

  assert.equal(profile.hasCompletedOnboarding(), false);
});

test("repairs legacy replay state when saved reader data exists", () => {
  localStorage.setItem("reading_companion_profile", JSON.stringify({
    name: "Reader",
    theme: "dark",
    hasCompletedOnboarding: false,
  }));
  localStorage.setItem("reading_companion_library", JSON.stringify({ books: {} }));
  const profile = new Profile();

  assert.equal(profile.hasCompletedOnboarding(), true);
  assert.equal(JSON.parse(localStorage.getItem("reading_companion_profile")).hasCompletedOnboarding, true);
});

test("incidental app caches do not skip onboarding for a new user", () => {
  localStorage.setItem("rc_last_version", "1.0.1");
  localStorage.setItem("reading_companion_openers", "[]");
  const profile = new Profile();

  assert.equal(profile.hasCompletedOnboarding(), false);
});

test("clearing browser data restores first-run onboarding", () => {
  localStorage.setItem("reading_companion_profile", JSON.stringify({ hasCompletedOnboarding: true }));
  localStorage.clear();

  assert.equal(new Profile().hasCompletedOnboarding(), false);
});