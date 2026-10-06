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
