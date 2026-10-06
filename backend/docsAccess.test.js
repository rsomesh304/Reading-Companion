import assert from "node:assert/strict";
import test from "node:test";
import { parseOwnerIds, verifyDocsOwner } from "./docsAccess.js";

const env = { SUPABASE_URL: "https://example.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "key", DOCS_OWNER_USER_IDS: "AAA-1, bbb-2" };
const okFetch = (id) => async () => ({ ok: true, json: async () => ({ id }) });

test("parseOwnerIds trims and lowercases", () => {
  assert.deepEqual([...parseOwnerIds(" A-1 , ,b-2")], ["a-1", "b-2"]);
});

test("owner is allowed, others are not", async () => {
  assert.equal((await verifyDocsOwner({ authorization: "Bearer t", env, fetchImpl: okFetch("aaa-1") })).allowed, true);
  const denied = await verifyDocsOwner({ authorization: "Bearer t", env, fetchImpl: okFetch("zzz") });
  assert.equal(denied.allowed, false);
  assert.equal(denied.reason, "not_owner");
});

test("fails closed when not configured or signed out", async () => {
  assert.equal((await verifyDocsOwner({ authorization: "Bearer t", env: { ...env, DOCS_OWNER_USER_IDS: "" }, fetchImpl: okFetch("x") })).reason, "not_configured");
  assert.equal((await verifyDocsOwner({ authorization: "", env })).reason, "signed_out");
  assert.equal((await verifyDocsOwner({ authorization: "Bearer t", env, fetchImpl: async () => ({ ok: false }) })).reason, "signed_out");
  assert.equal((await verifyDocsOwner({ authorization: "Bearer t", env, fetchImpl: async () => { throw new Error("down"); } })).reason, "auth_unavailable");
});