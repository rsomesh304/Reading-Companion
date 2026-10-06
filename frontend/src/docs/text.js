export function slugify(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function blockText(block, flows = {}) {
  if (block.text) return block.text;
  if (block.items) return block.items.join(" ");
  if (block.rows) return [...block.head, ...block.rows.flat()].join(" ");
  if (block.id && flows[block.id]) return flows[block.id].steps.map((s) => `${s.t} ${s.d}`).join(" ");
  return block.caption || "";
}

export function pageToMarkdown(page, flows = {}) {
  const out = [`# ${page.title}`, "", page.summary, ""];
  for (const b of page.blocks) {
    if (b.type === "h2") out.push(`## ${b.text}`, "");
    else if (b.type === "h3") out.push(`### ${b.text}`, "");
    else if (b.type === "p") out.push(b.text, "");
    else if (b.type === "ul") out.push(...b.items.map((i) => `- ${i}`), "");
    else if (b.type === "ol") out.push(...b.items.map((i, n) => `${n + 1}. ${i}`), "");
    else if (b.type === "code") out.push("```", b.text, "```", "");
    else if (b.type === "callout") out.push(`> ${b.kind === "confirm" ? "TO CONFIRM: " : ""}${b.text}`, "");
    else if (b.type === "table") out.push(`| ${b.head.join(" | ")} |`, `| ${b.head.map(() => "---").join(" | ")} |`, ...b.rows.map((r) => `| ${r.join(" | ")} |`), "");
    else if (b.type === "flow" && flows[b.id]) out.push(`**${flows[b.id].title}**`, ...flows[b.id].steps.map((s, n) => `${n + 1}. ${s.t}: ${s.d}`), "");
    else if (b.caption) out.push(`_${b.caption}_`, "");
  }
  return out.join("\n").trim();
}
