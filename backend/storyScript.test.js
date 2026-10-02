import assert from "node:assert/strict";
import test from "node:test";
import {
  createFallbackStoryScript,
  normalizeStorySource,
  personalizeStoryScript,
  validateStoryScript,
} from "./storyScript.js";
import { MOTIF_IDS } from "./validateScript.js";

function makeScript(source, motifs = ["orbit", "constellation"]) {
  return {
    title: source.chapterTitle,
    mood: "reflective",
    palette: { bg1: "#101b35", bg2: "#343d71", accent: "#e9c878", accent2: "#79d9ca" },
    beats: motifs.map((motif, index) => ({
      narration: index ? "उसके बाद उसने अपना निर्णय बदला।" : "Julian ने अपने जीवन पर सवाल उठाया।",
      motif,
      label: null,
      items: index ? ["decision"] : ["Julian"],
      intensity: 0.5,
      transition: "crossfade",
    })),
    closing_line: "और अब एक नया रास्ता सामने था।",
  };
}

test("accepts motif scripts and rejects unknown or adjacent repeated motifs", () => {
  const source = normalizeStorySource({ chapterTitle: "A Question", summary: "Julian questioned his purpose. He changed his decision." });
  assert.equal(validateStoryScript(makeScript(source), source).valid, true);
  assert.equal(validateStoryScript(makeScript(source, ["invented_room"]), source).valid, false);
  assert.equal(validateStoryScript(makeScript(source, ["orbit", "orbit"]), source).valid, false);
});

test("rejects labels and items that do not appear in the source summary", () => {
  const source = normalizeStorySource({ chapterTitle: "A Question", summary: "Julian questioned his purpose." });
  const script = makeScript(source, ["orbit"]);
  script.beats[0].items = ["Mars"];
  script.beats[0].label = "secret promise";
  assert.equal(validateStoryScript(script, source).valid, false);
});

test("normalizes away vocabulary and gem fields", () => {
  const source = normalizeStorySource({
    mode: "new_chapter", chapterNumber: 4, chapterTitle: "The Crossing",
    summary: "Two people waited at a station in the rain.",
    vocabulary: [{ term: "ephemeral", meaning: "brief" }], gems: ["quote"],
  });
  assert.equal(source.mode, "new_chapter");
  assert.equal("vocabulary" in source, false);
  assert.equal("gems" in source, false);
});

test("different summaries receive stable but distinct motif films", () => {
  const first = normalizeStorySource({ chapterNumber: 1, chapterTitle: "A Question", summary: "A thinker questioned the meaning of freedom and choice." });
  const second = normalizeStorySource({ chapterNumber: 1, chapterTitle: "A Promise", summary: "Two lovers met beside the river and promised to return." });
  const scriptA = personalizeStoryScript(makeScript(first), first);
  const scriptB = personalizeStoryScript(makeScript(second), second);
  assert.deepEqual(scriptA, personalizeStoryScript(makeScript(first), first));
  assert.notDeepEqual(scriptA.palette, scriptB.palette);
  assert.notDeepEqual(scriptA.beats.map((beat) => beat.motif), scriptB.beats.map((beat) => beat.motif));
  assert.equal(scriptA.beats.every((beat) => MOTIF_IDS.includes(beat.motif)), true);
});

test("different summaries in the same theme still get different motif sequences", () => {
  const first = normalizeStorySource({ chapterNumber: 2, chapterTitle: "A Choice", summary: "The thinker considered truth, freedom, and the purpose of a difficult choice." });
  const second = normalizeStorySource({ chapterNumber: 2, chapterTitle: "A Choice", summary: "She examined the meaning of memory before choosing a new direction." });
  const a = personalizeStoryScript(makeScript(first), first).beats.map((beat) => beat.motif);
  const b = personalizeStoryScript(makeScript(second), second).beats.map((beat) => beat.motif);
  assert.notDeepEqual(a, b);
  const paletteA = personalizeStoryScript(makeScript(first), first).palette;
  const paletteB = personalizeStoryScript(makeScript(second), second).palette;
  assert.notDeepEqual(paletteA, paletteB);
});

test("safe fallback contains only summary narration and no literal room assets", () => {
  const source = normalizeStorySource({ chapterTitle: "The Crossing", summary: "Two people waited at a station in the rain. The train arrived late." });
  const fallback = createFallbackStoryScript(source);
  assert.equal(validateStoryScript(fallback, source).valid, true);
  assert.equal(fallback.beats[0].narration.startsWith("पिछली बार हम"), true);
  assert.equal(fallback.beats.map((beat) => beat.narration).join(" ").endsWith(source.summary), true);
  assert.equal(fallback.closing_line, "बस, पिछली बार हम यहीं तक पहुँचे थे।");
  assert.equal(fallback.beats.some((beat) => beat.motif === "generic_room"), false);
});

test("new-chapter fallback points to the next chapter without a sentimental sign-off", () => {
  const source = normalizeStorySource({ mode: "new_chapter", chapterNumber: 2, chapterTitle: "The Crossing", summary: "Mira crossed the old bridge." });
  const fallback = createFallbackStoryScript(source);
  assert.equal(fallback.closing_line, "अब अगला अध्याय शुरू होने वाला है।");
  assert.equal(/अपने साथ रहने दो/.test(fallback.closing_line), false);
});

test("requires six beats for rich sources while allowing compact thin-source scripts", () => {
  const thin = normalizeStorySource({ chapterTitle: "A Question", summary: "Julian questioned his purpose and decision." });
  assert.equal(validateStoryScript(makeScript(thin), thin).valid, true);

  const rich = normalizeStorySource({
    chapterTitle: "A Question",
    summary: "Julian questioned his purpose and examined the choices that shaped his life. He considered the decisions he had made, the ideas that influenced him, and the changes that followed. Then he chose a different direction.",
  });
  assert.equal(rich.confidence, 1);
  assert.equal(validateStoryScript(makeScript(rich, ["orbit", "constellation", "path_journey", "mirror_split", "light_beam"]), rich).valid, false);
});