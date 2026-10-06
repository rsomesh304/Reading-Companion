import test from "node:test";
import assert from "node:assert/strict";
import { buildChunks, retrieve, buildMessages, pickCited } from "./docsHelper.js";

const bundle = {
  flows: {},
  pages: [
    { id: "ops", title: "Runbook", group: "Run it", summary: "Fix things", blocks: [{ type: "h2", text: "Site is down" }, { type: "p", text: "Check Vercel deployments and roll back." }] },
    { id: "ref", title: "Settings", group: "Reference", summary: "Env", blocks: [{ type: "h2", text: "Variables" }, { type: "p", text: "GROQ_API_KEY powers the help chat." }] },
  ],
};

test("retrieves the matching section and cites it", () => {
  const chunks = buildChunks(bundle);
  const found = retrieve(chunks, "the site is down, how to roll back?");
  assert.equal(found[0].pageId, "ops");
  const msgs = buildMessages({ question: "x", sources: found });
  assert.match(msgs[0].content, /\[1\]/);
  assert.deepEqual(pickCited("Roll back [1].", found)[0], { id: "ops", title: "Runbook", heading: "Site is down" });
});

test("returns nothing for unrelated questions", () => {
  assert.deepEqual(retrieve(buildChunks(bundle), "pizza recipe"), []);
});
