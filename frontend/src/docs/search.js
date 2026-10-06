import { blockText, slugify } from "./text.js";

export function buildSearch(pages, flows = {}) {
  const index = pages.map((page) => ({
    id: page.id,
    title: page.title,
    group: page.group,
    haystack: `${page.title} ${page.summary} ${page.blocks.map((b) => blockText(b, flows)).join(" ")}`.toLowerCase(),
    headings: page.blocks.filter((b) => b.type === "h2").map((b) => b.text),
  }));
  return function searchDocs(query) {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return index
      .map((entry) => {
        if (!words.every((w) => entry.haystack.includes(w))) return null;
        const title = entry.title.toLowerCase();
        const score = words.reduce((s, w) => s + (title.includes(w) ? 10 : 0) + (entry.headings.some((h) => h.toLowerCase().includes(w)) ? 4 : 1), 0);
        const heading = entry.headings.find((h) => words.some((w) => h.toLowerCase().includes(w)));
        return { id: entry.id, title: entry.title, group: entry.group, heading, anchor: heading ? slugify(heading) : "", score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  };
}