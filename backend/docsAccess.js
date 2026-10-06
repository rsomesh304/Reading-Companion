// Owner check for the in-app docs. It is a convenience gate: the docs bundle holds no secrets,
// so even a bypass only shows placeholder-level documentation.

export function parseOwnerIds(raw) {
  return new Set(String(raw || "").split(",").map((id) => id.trim().toLowerCase()).filter(Boolean));
}

export async function verifyDocsOwner({ authorization, env = process.env, fetchImpl = fetch } = {}) {
  const owners = parseOwnerIds(env.DOCS_OWNER_USER_IDS);
  const token = /^Bearer\s+(.+)$/i.exec(authorization || "")?.[1];
  if (!token) return { allowed: false, reason: "signed_out" };
  const supabaseUrl = (env.SUPABASE_URL || "").replace(/\/+$/, "");
  const apiKey = env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !apiKey) return { allowed: false, reason: "auth_unavailable" };

  let user;
  try {
    const response = await fetchImpl(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: apiKey },
    });
    if (!response.ok) return { allowed: false, reason: "signed_out" };
    user = await response.json();
  } catch {
    return { allowed: false, reason: "auth_unavailable" };
  }
  const userId = typeof user?.id === "string" ? user.id : "";
  if (!userId) return { allowed: false, reason: "signed_out" };
  if (owners.has(userId.toLowerCase())) return { allowed: true, userId };

  // Access can also be granted by adding a row to the docs_access table (no redeploy needed).
  let listed = false;
  try {
    const lookup = await fetchImpl(`${supabaseUrl}/rest/v1/docs_access?user_id=eq.${encodeURIComponent(userId)}&select=user_id&limit=1`, {
      headers: { Authorization: `Bearer ${apiKey}`, apikey: apiKey },
    });
    if (lookup.ok) listed = (await lookup.json()).length > 0;
  } catch { /* table unavailable: fall back to the env list only */ }
  if (listed) return { allowed: true, userId };
  return { allowed: false, reason: owners.size ? "not_owner" : "not_configured", userId };
}

export async function loadDocsBundle({ env = process.env, fetchImpl = fetch } = {}) {
  const supabaseUrl = (env.SUPABASE_URL || "").replace(/\/+$/, "");
  const apiKey = env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !apiKey) return null;
  const response = await fetchImpl(`${supabaseUrl}/rest/v1/docs_content?key=eq.main&select=body,updated_at&limit=1`, {
    headers: { Authorization: `Bearer ${apiKey}`, apikey: apiKey },
  });
  if (!response.ok) return null;
  const [row] = await response.json();
  return row ? { ...row.body, publishedAt: row.updated_at } : null;
}