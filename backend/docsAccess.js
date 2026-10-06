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
  if (!owners.size) return { allowed: false, reason: "not_configured", userId };
  return owners.has(userId.toLowerCase()) ? { allowed: true, userId } : { allowed: false, reason: "not_owner", userId };
}