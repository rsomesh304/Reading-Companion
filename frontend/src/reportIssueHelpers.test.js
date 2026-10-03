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

test("timeline lists every status note once and keeps the resolution note out", async () => {
  const { buildReportTimeline } = await import("./reportIssueHelpers.js");
  const steps = buildReportTimeline({
    status: "done",
    createdAt: "2026-10-01T10:00:00Z",
    resolutionNote: "Fixed in the new build",
    statusHistory: [
      { status: "seen", note: "Looking at it", at: "2026-10-02T09:00:00Z" },
      { status: "seen", note: "Reproduced it", at: "2026-10-02T11:00:00Z" },
      { status: "done", note: "Fixed in the new build", at: "2026-10-03T09:00:00Z" },
    ],
  });
  assert.equal(steps.find((s) => s.key === "seen").notes.length, 2);
  assert.equal(steps.find((s) => s.key === "done").notes.length, 0);
  assert.equal(steps.at(-1).state, "current");
  assert.equal(steps[0].state, "done");
});

test("rejected reports end the timeline at Rejected", async () => {
  const { buildReportTimeline } = await import("./reportIssueHelpers.js");
  const steps = buildReportTimeline({ status: "rejected", statusNote: "Out of scope" });
  assert.equal(steps.at(-1).key, "rejected");
  assert.equal(steps.at(-1).notes[0].text, "Out of scope");
});

test("IST formatting converts UTC and compares calendar days in IST", async () => {
  const { formatIstDateTime, istDayKey } = await import("./reportIssueHelpers.js");
  assert.equal(formatIstDateTime("2026-10-03T18:45:00Z"), "4 Oct 2026, 12:15 AM IST");
  assert.equal(istDayKey("2026-10-03T18:45:00Z"), "2026-10-04");
  assert.equal(istDayKey("2026-10-03 10:00:00"), "2026-10-03");
});

test("per-stage timestamps are read from stage columns", async () => {
  const { buildReportTimeline } = await import("./reportIssueHelpers.js");
  const steps = buildReportTimeline({ status: "testing", created_at: "2026-10-01T10:00:00Z", seen_at: "2026-10-02T10:00:00Z", review_at: "2026-10-04T10:00:00Z" });
  assert.equal(steps.find((s) => s.key === "seen").date, "2026-10-02T10:00:00Z");
  assert.equal(steps.find((s) => s.key === "review").date, "2026-10-04T10:00:00Z");
});
