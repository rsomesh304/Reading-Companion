export function compareVersions(a, b) {
  const left = String(a ?? "0").split(".").map(Number);
  const right = String(b ?? "0").split(".").map(Number);

  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const current = left[index] || 0;
    const next = right[index] || 0;
    if (current !== next) return current > next ? 1 : -1;
  }

  return 0;
}

export function getReleaseHistory(releases = []) {
  return [...releases].sort((a, b) => compareVersions(b.version, a.version));
}

export function normalizeReportStatus(report) {
  const value = String(report?.status ?? "queued").trim().toLowerCase().replace(/[\s-]+/g, "_");
  const aliases = {
    queued: "queued",
    pending: "queued",
    sent: "sent",
    submitted: "sent",
    new: "sent",
    seen: "seen",
    acknowledged: "seen",
    review: "review",
    in_review: "review",
    under_review: "review",
    reviewed: "review",
    rejected: "rejected",
    declined: "rejected",
    approved: "approved",
    accepted: "approved",
    in_progress: "in_progress",
    work_in_progress: "in_progress",
    working: "in_progress",
    testing: "testing",
    in_testing: "testing",
    qa: "testing",
    done: "done",
    success: "done",
    completed: "done",
    resolved: "done",
    fixed: "done",
    closed: "done",
  };
  return aliases[value] || "queued";
}

export function getReportStatusLabel(report) {
  const status = normalizeReportStatus(report);
  if (status === "done") {
    const version = report?.resolvedInVersion || report?.resolved_in_version;
    return version ? `Completed · v${version}` : "Completed";
  }
  return {
    queued: "Queued",
    sent: "Sent",
    seen: "Seen",
    review: "Under review",
    rejected: "Rejected",
    approved: "Approved",
    in_progress: "Work in progress",
    testing: "Testing",
  }[status];
}

export function buildResolutionSummary(report) {
  if (!report) return "Not resolved yet";
  const status = normalizeReportStatus(report);
  if (status !== "done") return "Not completed yet";

  const versionValue = report.resolvedInVersion || report.resolved_in_version;
  const version = versionValue ? `v${versionValue}` : "the latest update";
  const detail = report.resolutionNote || report.resolution_note ? ` — ${report.resolutionNote || report.resolution_note}` : "";
  return `Completed in ${version}${detail}`;
}

export const REPORT_STAGE_FLOW = [
  ["sent", "Sent"],
  ["seen", "Seen"],
  ["review", "In review"],
  ["approved", "Approved"],
  ["in_progress", "In progress"],
  ["testing", "Testing"],
  ["done", "Done"],
];

const SHORT_LABELS = {
  queued: "Queued",
  sent: "Sent",
  seen: "Seen",
  review: "In review",
  rejected: "Rejected",
  approved: "Approved",
  in_progress: "In progress",
  testing: "Testing",
  done: "Done",
};

// Short text that fits inside a badge; the full label stays available from getReportStatusLabel.
export function getReportStatusShortLabel(report) {
  return SHORT_LABELS[normalizeReportStatus(report)];
}

const text = (value) => String(value ?? "").trim();

// Presentation only: lays the report's existing status data out as timeline steps.
// Several notes per status are supported when the report carries a history list; the resolution note is never included.
export function buildReportTimeline(report) {
  const status = normalizeReportStatus(report);
  const resolution = text(report?.resolutionNote || report?.resolution_note).toLowerCase();
  const history = [report?.statusHistory, report?.status_history, report?.statusUpdates, report?.status_updates]
    .find((value) => Array.isArray(value)) || [];

  const notesByStage = new Map();
  const addNote = (stage, note, date) => {
    const body = text(note);
    if (!body || body.toLowerCase() === resolution) return;
    const list = notesByStage.get(stage) || [];
    if (!list.some((entry) => entry.text === body)) list.push({ text: body, date: date || null });
    notesByStage.set(stage, list);
  };
  history.forEach((entry) => {
    addNote(
      normalizeReportStatus({ status: entry?.status }),
      entry?.note ?? entry?.status_note ?? entry?.message,
      entry?.at || entry?.date || entry?.created_at || entry?.updated_at,
    );
  });
  if (!history.length) {
    addNote(
      status,
      report?.statusNote || report?.status_note || report?.rejectionNote || report?.rejection_note,
      report?.statusUpdatedAt || report?.status_updated_at || report?.updatedAt || report?.updated_at,
    );
  }

  const flow = status === "rejected"
    ? [...REPORT_STAGE_FLOW.slice(0, 3).map(([key, label]) => [key, label]), ["rejected", "Rejected"]]
    : status === "queued" ? [["queued", "Queued"], ...REPORT_STAGE_FLOW] : REPORT_STAGE_FLOW;
  const currentIndex = flow.findIndex(([key]) => key === status);
  const created = report?.createdAt || report?.created_at || null;
  const resolvedAt = report?.resolvedAt || report?.resolved_at || null;

  return flow.map(([key, label], index) => {
    const notes = notesByStage.get(key) || [];
    const stateName = index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
    const date = notes[0]?.date || (key === "sent" || key === "queued" ? created : key === "done" ? resolvedAt : null);
    return { key, label, state: stateName, notes, date: stateName === "upcoming" ? null : date };
  });
}
