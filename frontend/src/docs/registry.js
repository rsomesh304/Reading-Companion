import { apiFetch } from "../api.js";
import { supabaseClient } from "../supabaseClient.js";

// Docs content is never committed. On a machine that has ./private it is bundled directly;
// elsewhere it is downloaded (owner-only) from the backend and cached for offline reading.
const mods = import.meta.glob(["./private/*.js", "!./private/*.test.js"], { eager: true });
const pick = (name) => mods[`./private/${name}.js`] || {};
const CACHE_KEY = "rc_docs_bundle_v1";

export const DIAGRAMS = {};
export const FLOWS = {};
export const PAGES = [];

export function hydrateDocs({ pages = [], diagrams = {}, flows = {} }) {
  PAGES.splice(0, PAGES.length, ...pages);
  for (const target of [DIAGRAMS, FLOWS]) for (const key of Object.keys(target)) delete target[key];
  Object.assign(DIAGRAMS, diagrams);
  Object.assign(FLOWS, flows);
}

hydrateDocs({
  pages: [
    ...(pick("contentStory").STORY_PAGES || []),
    ...(pick("contentStory").TOUR_PAGES || []),
    ...(pick("contentArch").ARCH_PAGES || []),
    ...(pick("contentOps").OPS_PAGES || []),
    ...(pick("contentRef").REF_PAGES || []),
  ],
  diagrams: pick("diagrams").DIAGRAMS,
  flows: pick("diagrams").FLOWS,
});

const readCache = () => { try { return JSON.parse(window.localStorage.getItem(CACHE_KEY) || "null"); } catch { return null; } };
const writeCache = (bundle) => { try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(bundle)); } catch { /* storage full */ } };

// Resolves to { status: "ready" | "missing" | "error" }.
export async function loadDocsContent() {
  if (PAGES.length) return { status: "ready" };
  const cached = readCache();
  if (cached?.pages?.length) hydrateDocs(cached);
  if (navigator.onLine === false) return { status: PAGES.length ? "ready" : "error" };
  try {
    const { data } = (await supabaseClient?.auth.getSession()) || {};
    const token = data?.session?.access_token;
    if (!token) return { status: PAGES.length ? "ready" : "error" };
    const response = await apiFetch("/api/docs/content", { headers: { Authorization: `Bearer ${token}` } }, { retries: 1 });
    if (response.status === 404) return { status: PAGES.length ? "ready" : "missing" };
    const bundle = await response.json();
    if (bundle?.pages?.length) { hydrateDocs(bundle); writeCache(bundle); return { status: "ready" }; }
  } catch { /* fall through to cached content */ }
  return { status: PAGES.length ? "ready" : "error" };
}
