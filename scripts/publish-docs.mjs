// Publishes the private docs (frontend/src/docs/private) to Supabase so the deployed app can serve them
// to authorised users. Usage: node scripts/publish-docs.mjs [--dry]
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "frontend", "src", "docs", "private");
const load = (name) => import(pathToFileURL(path.join(dir, `${name}.js`)).href);

const env = { ...process.env };
try {
  for (const line of readFileSync(path.join(root, "backend", ".env"), "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* backend/.env missing: rely on process env */ }

const [story, arch, ops, ref, diagrams] = await Promise.all(["contentStory", "contentArch", "contentOps", "contentRef", "diagrams"].map(load));
const bundle = {
  pages: [...story.STORY_PAGES, ...story.TOUR_PAGES, ...arch.ARCH_PAGES, ...ops.OPS_PAGES, ...ref.REF_PAGES],
  diagrams: diagrams.DIAGRAMS,
  flows: diagrams.FLOWS,
};
const json = JSON.stringify(bundle);
console.log(`Bundle: ${bundle.pages.length} pages, ${(json.length / 1024).toFixed(1)} KB`);
if (process.argv.includes("--dry")) process.exit(0);

const url = (env.SUPABASE_URL || "").replace(/\/+$/, "");
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (backend/.env)."); process.exit(1); }
const res = await fetch(`${url}/rest/v1/docs_content?on_conflict=key`, {
  method: "POST",
  headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
  body: JSON.stringify({ key: "main", body: bundle, updated_at: new Date().toISOString() }),
});
if (!res.ok) { console.error(`Publish failed: ${res.status} ${await res.text()}`); process.exit(1); }
console.log("Published. Authorised users will get the new docs on next open.");
