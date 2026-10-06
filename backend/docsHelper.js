// Retrieval + prompt building for the Docs Helper. It only ever sees the (placeholder-only) docs bundle.
const STOP = new Set("the a an and or of to in is it for on with how do i what why where when does my can this that are be at as by from".split(" "));

export function blockToText(block, flows = {}) {
  if (block.type === "flow" && flows[block.id]) return flows[block.id].steps.map((s) => `${s.t}: ${s.d}`).join(" ");
  if (block.type === "code") return `Code: ${block.text}`;
  if (block.text) return block.text;
  if (block.items) return block.items.join("; ");
  if (block.rows) return block.rows.map((r) => r.join(" | ")).join("\n");
  return "";
}

export function buildChunks(bundle) {
  const flows = bundle?.flows || {};
  const chunks = [];
  for (const page of bundle?.pages || []) {
    let current = { pageId: page.id, title: page.title, group: page.group, heading: "", text: page.summary || "" };
    const push = () => { if (current.text.trim()) chunks.push(current); };
    for (const block of page.blocks || []) {
      if (block.type === "h2") {
        push();
        current = { pageId: page.id, title: page.title, group: page.group, heading: block.text, text: "" };
      } else {
        current.text += `${blockToText(block, flows)}\n`;
      }
    }
    push();
  }
  return chunks;
}

const tokens = (text) => String(text).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOP.has(w));
const stem = (w) => w.replace(/(ing|ed|es|s)$/, "");

export function retrieve(chunks, question, { limit = 5, pageId = "" } = {}) {
  const q = [...new Set(tokens(question).map(stem))];
  if (!q.length) return [];
  return chunks
    .map((chunk) => {
      const title = tokens(`${chunk.title} ${chunk.heading}`).map(stem);
      const body = tokens(chunk.text).map(stem);
      let score = 0;
      for (const w of q) {
        if (title.includes(w)) score += 6;
        const hits = body.filter((b) => b === w).length;
        score += Math.min(hits, 4);
      }
      if (pageId && chunk.pageId === pageId) score += 2;
      return { chunk, score };
    })
    .filter((r) => r.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.chunk);
}

export function buildMessages({ question, sources, history = [] }) {
  const context = sources.map((s, i) => `[${i + 1}] ${s.title}${s.heading ? ` > ${s.heading}` : ""}\n${s.text.slice(0, 1800)}`).join("\n\n");
  const system = [
    "You are the Docs Helper for the Reading Companion app's private handbook.",
    "Answer ONLY from the numbered excerpts. If they do not contain the answer, say you could not find it in the docs and suggest a search keyword. Never guess or invent details.",
    "Be short and clear (under 120 words), plain language, for a non-developer. Use short bullet lines when listing steps.",
    "Cite the excerpts you used as [1], [2] after the relevant sentence. Reply in the language the user wrote in.",
    "Never output secrets, keys or personal data; the docs only contain placeholders.",
    "",
    "Excerpts:",
    context || "(none)",
  ].join("\n");
  const past = history.slice(-4).filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, 600) }));
  return [{ role: "system", content: system }, ...past, { role: "user", content: String(question).slice(0, 500) }];
}

export function pickCited(answer, sources) {
  const cited = [...new Set([...String(answer).matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]) - 1))].filter((i) => sources[i]);
  const list = (cited.length ? cited : sources.slice(0, 2).map((_, i) => i)).map((i) => sources[i]);
  return list.slice(0, 3).map((s) => ({ id: s.pageId, title: s.title, heading: s.heading }));
}
