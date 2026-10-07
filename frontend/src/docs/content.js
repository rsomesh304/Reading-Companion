import { PAGES, FLOWS } from "./registry.js";
import { buildSearch } from "./search.js";

export { PAGES };
export const GROUPS = ["Start here", "Product tour", "Architecture", "Run it", "Reference"];

export const getConfirms = () => PAGES.flatMap((page) =>
  page.blocks.filter((b) => b.type === "callout" && b.kind === "confirm").map((b) => ({ page: page.id, title: page.title, text: b.text }))
);

let cached = { size: -1, search: null };
export function searchDocs(query) {
  if (cached.size !== PAGES.length) cached = { size: PAGES.length, search: buildSearch(PAGES, FLOWS) };
  return cached.search(query);
}
