import { apiFetch } from "./api.js";
import { supabaseClient } from "./supabaseClient.js";
import { DOCS_OWNER_CACHE_KEY } from "./docsUnlock.js";

function readCache() { try { return window.localStorage.getItem(DOCS_OWNER_CACHE_KEY); } catch { return null; } }
function writeCache(userId) { try { if (userId) window.localStorage.setItem(DOCS_OWNER_CACHE_KEY, userId); else window.localStorage.removeItem(DOCS_OWNER_CACHE_KEY); } catch { /* storage unavailable */ } }

// Returns { status: "ok" | "denied" | "error", userId, reason, cached }.
// A cached "ok" for the same user is trusted when offline or when the server cannot be reached.
export async function checkDocsAccess({ retries = 4, onCached } = {}) {
  const { data } = (await supabaseClient?.auth.getSession()) || {};
  const session = data?.session;
  if (!session) return { status: "denied", userId: "", reason: "signed_out" };
  const userId = session.user.id;
  const cachedOk = readCache() === userId;
  if (cachedOk) onCached?.(userId);
  if (cachedOk && navigator.onLine === false) return { status: "ok", userId, cached: true };
  try {
    const response = await apiFetch("/api/docs/access", { headers: { Authorization: `Bearer ${session.access_token}` } }, { retries: cachedOk ? 0 : retries });
    const body = await response.json().catch(() => ({}));
    if (body.allowed) { writeCache(userId); return { status: "ok", userId }; }
    if (["not_owner", "not_configured", "signed_out"].includes(body.reason)) {
      writeCache(null);
      return { status: "denied", userId: body.userId || userId, reason: body.reason };
    }
    return cachedOk ? { status: "ok", userId, cached: true } : { status: "error", userId, reason: body.reason || "unavailable" };
  } catch {
    return cachedOk ? { status: "ok", userId, cached: true } : { status: "error", userId, reason: "offline" };
  }
}