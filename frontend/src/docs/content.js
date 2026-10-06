import { PAGES, FLOWS } from "./registry.js";
import { buildSearch } from "./search.js";

export { PAGES };
export const GROUPS = ["Start here", "Product tour", "Architecture", "Run it", "Reference"];
export const CONFIRMS = PAGES.flatMap((page) =>
  page.blocks.filter((b) => b.type === "callout" && b.kind === "confirm").map((b) => ({ page: page.id, title: page.title, text: b.text }))
);
export const searchDocs = buildSearch(PAGES, FLOWS);