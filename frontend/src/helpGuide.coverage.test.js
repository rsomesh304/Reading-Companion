import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildShortHelpAnswer, getRelevantHelp, HELP_GUIDE } from "./helpGuide.js";
import { HELP_FEATURE_MANIFEST, HELP_KNOWLEDGE_BAN_PATTERNS, HELP_RETRIEVAL_CASES } from "./helpGuide.coverage.data.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));

function read(relativePath) {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("every coverage question resolves to the expected guide entry", () => {
  for (const { question, expectedId } of HELP_RETRIEVAL_CASES) {
    assert.equal(getRelevantHelp(question)?.id, expectedId, question);
  }
});

test("the Hear the story answer points to the Library play icon", () => {
  const answer = buildShortHelpAnswer(getRelevantHelp("Where is Hear the story?"));
  assert.match(answer, /\*\*Play\*\* icon on a \*\*Library\*\* book tile/i);
  assert.match(answer, /\*\*Start Reading\*\*/i);
});

test("the knowledge base never exposes developer-only docs details", () => {
  const allText = HELP_GUIDE.flatMap((entry) => [entry.title, entry.content, ...(entry.keywords || [])]).join("\n");
  for (const pattern of HELP_KNOWLEDGE_BAN_PATTERNS) {
    assert.doesNotMatch(allText, pattern);
  }
});

test("feature manifest stays aligned with the code and the knowledge base", () => {
  const ids = new Set(HELP_GUIDE.map((entry) => entry.id));
  for (const feature of HELP_FEATURE_MANIFEST) {
    assert.ok(ids.has(feature.entryId), `${feature.name} is missing help entry ${feature.entryId}`);
    const code = feature.files.map((file) => read(file)).join("\n");
    for (const snippet of feature.includes) {
      assert.match(code, new RegExp(escapeRegExp(snippet)), `${feature.name} is missing code snippet: ${snippet}`);
    }
  }
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
