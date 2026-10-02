const KEY = (id) => `rc_convo_${id}`;
const MAX_TURNS = 20;

function ago(iso) {
  const m = Math.max(0, (Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${Math.round(m)} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} d ago`;
}

export function saveTurn(bookId, speaker, text) {
  if (!bookId || !text) return;
  try {
    const arr = JSON.parse(localStorage.getItem(KEY(bookId)) || "[]");
    arr.push({ s: speaker, t: String(text).slice(0, 220), at: new Date().toISOString() });
    localStorage.setItem(KEY(bookId), JSON.stringify(arr.slice(-MAX_TURNS)));
  } catch { /* ignore */ }
}

export function getRecap(bookId) {
  try {
    const arr = JSON.parse(localStorage.getItem(KEY(bookId)) || "[]");
    if (!arr.length) return "";
    return arr.map((x) => `[${ago(x.at)}] ${x.s === "reader" ? "Reader" : "You"}: ${x.t}`).join("\n");
  } catch { return ""; }
}