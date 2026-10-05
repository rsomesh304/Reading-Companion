export function sessionTitle(session) {
  const first = session.messages.find((message) => message.role === "user")?.content || session.messages[0]?.content || "Chat";
  return first.length > 56 ? `${first.slice(0, 56)}…` : first;
}

export function sessionDate(session) {
  const date = new Date(session.updatedAt);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString([], { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export function groupHelpSessions(sessions, query = "", now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);
  const groups = new Map(["Today", "Yesterday", "Previous 7 days", "Older"].map((label) => [label, []]));
  const search = query.trim().toLocaleLowerCase();
  const sorted = [...sessions].sort((a, b) => (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0));
  for (const session of sorted) {
    if (search && !session.messages.some((message) => message.content.toLocaleLowerCase().includes(search))) continue;
    const date = new Date(session.updatedAt);
    const label = date >= today ? "Today" : date >= yesterday ? "Yesterday" : date >= weekAgo ? "Previous 7 days" : "Older";
    groups.get(label).push(session);
  }
  return [...groups].filter(([, entries]) => entries.length).map(([label, entries]) => ({ label, sessions: entries }));
}
