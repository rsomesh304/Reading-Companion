// Docs content lives in ./private (git-ignored). Builds without it simply have no pages.
const mods = import.meta.glob(["./private/*.js", "!./private/*.test.js"], { eager: true });
const pick = (name) => mods[`./private/${name}.js`] || {};

export const DIAGRAMS = pick("diagrams").DIAGRAMS || {};
export const FLOWS = pick("diagrams").FLOWS || {};
export const PAGES = [
  ...(pick("contentStory").STORY_PAGES || []),
  ...(pick("contentStory").TOUR_PAGES || []),
  ...(pick("contentArch").ARCH_PAGES || []),
  ...(pick("contentOps").OPS_PAGES || []),
  ...(pick("contentRef").REF_PAGES || []),
];