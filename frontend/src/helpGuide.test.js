import assert from "node:assert/strict";
import test from "node:test";
import { buildShortHelpAnswer, findRelevantHelp, getRelevantHelp, HELP_GUIDE } from "./helpGuide.js";

const top = (question) => getRelevantHelp(question)?.id;

test("guide ids are unique and every demo is a known animation", () => {
  assert.equal(new Set(HELP_GUIDE.map((entry) => entry.id)).size, HELP_GUIDE.length);
  for (const entry of HELP_GUIDE) assert.ok(!entry.demo || ["dock", "ghost", "camera", "progress", "mindmap", "tabs", "library", "vocab", "home", "gems", "settings", "report"].includes(entry.demo), entry.id);
});

test("reading screen questions reach the right entries", () => {
  assert.equal(top("What is ghost mode in the reading session?"), "ghost-mode");
  assert.equal(top("What is the use of the Ghost button?"), "ghost-mode");
  assert.equal(top("What is the difference between the live camera and snapshot?"), "camera-options");
  assert.ok(findRelevantHelp("What do all the buttons on the reading screen do?", 2).some((entry) => entry.id === "session-buttons"));
  assert.equal(top("how do i end the session"), "session-end");
  assert.equal(top("What is the chapter progress at the top of the reading screen?"), "session-progress");
});

test("mind map questions reach the detailed mind map entry", () => {
  assert.equal(top("mind map kaise kaam karta hai?"), "mind-map");
  assert.equal(top("do you have any idea about mind map?"), "mind-map");
  assert.equal(top("what are echoes?"), "mind-map");
});

test("other sections are reachable", () => {
  assert.equal(top("How do I save new vocabulary words?"), "vocabulary");
  assert.equal(top("How do I sync my account?"), "account-sync");
  assert.equal(top("How do I change the app theme to dark?"), "settings");
  assert.equal(top("how do I undo the AI rewrite in a report"), "report-issue");
  assert.equal(top("how do I add a book"), "add-book");
});

test("retrieval returns only matching entries and nothing for unrelated text", () => {
  const matches = findRelevantHelp("ghost mode", 3);
  assert.equal(matches[0].id, "ghost-mode");
  assert.ok(matches.every((entry) => entry.score > 0));
  assert.deepEqual(findRelevantHelp("zzz qqq", 3), []);
});

test("privacy question can be answered from the local help guide", () => {
  const answer = getRelevantHelp("What data does Help send to AI?");
  assert.equal(answer?.id, "help-privacy");
  assert.match(answer.content, /never sends your books/i);
});

test("camera and dock answers explain the actual controls", () => {
  const camera = buildShortHelpAnswer(getRelevantHelp("Live camera or snapshot?"));
  assert.match(camera, /\*\*Camera\*\*/);
  assert.match(camera, /\*\*Page snapshot\*\*/);
  assert.match(camera, /\*\*Next page\*\*/);
  const buttons = buildShortHelpAnswer(getRelevantHelp("What do the reading buttons do?"));
  assert.match(buttons, /\*\*Mic\*\*/);
  assert.match(buttons, /\*\*Transcript\*\*/);
  assert.match(buttons, /\*\*End session\*\*/);
});
