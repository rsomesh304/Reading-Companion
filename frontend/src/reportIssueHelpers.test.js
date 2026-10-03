import assert from "node:assert/strict";
import test from "node:test";
import { buildResolutionSummary, compareVersions, getReleaseHistory, getReportStatusLabel, normalizeReportStatus } from "./reportIssueHelpers.js";

test("sorts release notes by version in descending order", () => {
  const entries = getReleaseHistory([
    { version: "1.0.0", title: "Initial" },
    { version: "1.1.0", title: "Fixes" },
    { version: "1.0.5", title: "Hotfix" },
  ]);

  assert.deepEqual(entries.map((entry) => entry.version), ["1.1.0", "1.0.5", "1.0.0"]);
});

test("builds a human-friendly completed message with version details", () => {
  const summary = buildResolutionSummary({
    status: "done",
    resolvedInVersion: "1.1.0",
    resolvedAt: "2026-10-03T15:30:00.000Z",
    resolutionNote: "This was fixed in the issue tracker flow.",
  });

  assert.match(summary, /Completed in v1\.1\.0/i);
  assert.match(summary, /This was fixed in the issue tracker flow/i);
});

test("compares version numbers numerically instead of alphabetically", () => {
  assert.equal(compareVersions("1.2.10", "1.2.9"), 1);
  assert.equal(compareVersions("1.2.9", "1.2.10"), -1);
  assert.equal(compareVersions("1.2.10", "1.2.10"), 0);
});

test("normalizes legacy completed statuses to done", () => {
  assert.equal(normalizeReportStatus({ status: "completed" }), "done");
  assert.equal(normalizeReportStatus({ status: "COMPLETED" }), "done");
  assert.equal(normalizeReportStatus({ status: "resolved" }), "done");
});

test("preserves developer-managed report lifecycle statuses", () => {
  const statuses = ["sent", "seen", "review", "rejected", "approved", "in_progress", "testing", "done"];
  assert.deepEqual(statuses.map((status) => normalizeReportStatus({ status })), statuses);
  assert.equal(normalizeReportStatus({ status: "Work in progress" }), "in_progress");
  assert.equal(normalizeReportStatus({ status: "Under review" }), "review");
});

test("labels report lifecycle states for users", () => {
  assert.equal(getReportStatusLabel({ status: "review" }), "Under review");
  assert.equal(getReportStatusLabel({ status: "rejected" }), "Rejected");
  assert.equal(getReportStatusLabel({ status: "in_progress" }), "Work in progress");
  assert.equal(getReportStatusLabel({ status: "done", resolved_in_version: "1.2.0" }), "Completed · v1.2.0");
});
