export const ACCOUNT_DATA_TABLE = "reading_companion_accounts";
export const ACCOUNT_SYNC_META_KEY = "rc_account_sync_meta";
export const READER_DATA_KEYS = [
  "reading_companion_profile",
  "reading_companion_library",
  "reading_companion_gems",
  "reading_companion_memory",
  "reading_companion_mascot",
];
const MAX_SNAPSHOT_BYTES = 12 * 1024 * 1024;

function storageKeys(storage) {
  if (typeof storage.key === "function" && Number.isFinite(storage.length)) {
    return Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(Boolean);
  }
  return Object.keys(storage);
}

export function collectLocalReaderSnapshot(storage = localStorage) {
  const data = {};
  for (const key of READER_DATA_KEYS) {
    const value = storage.getItem(key);
    if (value !== null) data[key] = value;
  }
  for (const key of storageKeys(storage)) {
    if (key.startsWith("rc_convo_")) {
      const value = storage.getItem(key);
      if (value !== null) data[key] = value;
    }
  }
  return { version: 1, data };
}

export function hasLocalReaderData(snapshot) {
  const data = snapshot?.data || {};
  try {
    const profile = JSON.parse(data.reading_companion_profile || "{}");
    if (profile.hasCompletedOnboarding || (profile.name && profile.name !== "Reader") || profile.companionName || profile.dailyGoal || profile.preferences?.length || profile.activeDays?.length || profile.avatar || profile.avatarPreset !== null && profile.avatarPreset !== undefined || profile.theme && profile.theme !== "dark" || profile.voice && profile.voice !== "Leda") return true;
    const library = JSON.parse(data.reading_companion_library || "{}");
    if (Object.keys(library.books || {}).length) return true;
    const gems = JSON.parse(data.reading_companion_gems || "[]");
    if (Array.isArray(gems) && gems.length) return true;
    const memories = JSON.parse(data.reading_companion_memory || "[]");
    if (Array.isArray(memories) && memories.length) return true;
    if (data.reading_companion_mascot) return true;
    if (data.reading_companion_mascot) return true;
    return Object.entries(data).some(([key, raw]) => key.startsWith("rc_convo_") && raw && raw !== "[]");
  } catch {
    return Object.keys(data).length > 0;
  }
}

export function readerSnapshotSignature(snapshot) {
  // Postgres jsonb reorders object keys, so hash a key-sorted form to match the cloud copy.
  const data = snapshot?.data || {};
  const text = JSON.stringify(Object.keys(data).sort().map((key) => [key, data[key]]));
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function accountCopyDecision({ userId, meta, localSnapshot, remoteSnapshot }) {
  if (!remoteSnapshot) return "device";
  const localSignature = readerSnapshotSignature(localSnapshot);
  const remoteSignature = readerSnapshotSignature(remoteSnapshot);
  if (localSignature === remoteSignature) return "same";
  if (!meta || meta.userId !== userId || !meta.signature) return "conflict";
  if (localSignature === meta.signature) return "cloud";
  if (remoteSignature === meta.signature) return "device";
  return "conflict";
}

export function localReaderCacheBelongsToAnotherAccount(userId, meta) {
  return Boolean(meta?.userId && meta.userId !== userId);
}

export function restoreLocalReaderSnapshot(snapshot, storage = localStorage) {
  const next = snapshot?.data && typeof snapshot.data === "object" ? snapshot.data : {};
  for (const key of storageKeys(storage)) {
    if (key.startsWith("rc_convo_")) storage.removeItem(key);
  }
  for (const key of READER_DATA_KEYS) {
    if (typeof next[key] === "string") storage.setItem(key, next[key]);
    else storage.removeItem(key);
  }
  for (const [key, value] of Object.entries(next)) {
    if (key.startsWith("rc_convo_") && typeof value === "string") storage.setItem(key, value);
  }
}

export function readAccountSyncMeta(storage = localStorage) {
  try { return JSON.parse(storage.getItem(ACCOUNT_SYNC_META_KEY) || "null"); } catch { return null; }
}

export function writeAccountSyncMeta(meta, storage = localStorage) {
  storage.setItem(ACCOUNT_SYNC_META_KEY, JSON.stringify(meta));
}

export function dispatchLocalDataChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("rc:local-data-changed"));
}

export async function fetchAccountSnapshot(client, userId) {
  const { data, error } = await client.from(ACCOUNT_DATA_TABLE).select("snapshot, updated_at").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data?.snapshot ? { snapshot: data.snapshot, updatedAt: data.updated_at } : null;
}

export async function saveAccountSnapshot(client, userId, snapshot) {
  const serialized = JSON.stringify(snapshot);
  if (new TextEncoder().encode(serialized).byteLength > MAX_SNAPSHOT_BYTES) {
    throw new Error("Your saved data is larger than the cloud-sync limit. Remove large generated images before syncing.");
  }
  const { error } = await client.from(ACCOUNT_DATA_TABLE).upsert({
    user_id: userId,
    snapshot,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) throw error;
  return readerSnapshotSignature(snapshot);
}
