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

const STAGE_FIELDS = {
  seen: ["seen_at", "seenAt", "acknowledged_at"],
  review: ["review_at", "in_review_at", "reviewed_at", "reviewAt"],
  approved: ["approved_at", "approvedAt"],
  in_progress: ["in_progress_at", "inProgressAt", "started_at"],
  testing: ["testing_at", "testingAt"],
  done: ["done_at", "doneAt", "completed_at", "resolved_at", "resolvedAt"],
  rejected: ["rejected_at", "rejectedAt"],
};

// Looks for a per-stage timestamp in the shapes the backend might store it: a map, or one `<stage>_at` column per stage.
function stageTimestamp(report, key, currentStatus) {
  const maps = [report?.stageDates, report?.stage_dates, report?.statusDates, report?.status_dates];
  for (const map of maps) {
    if (map && typeof map === "object" && map[key]) return map[key];
  }
  for (const field of STAGE_FIELDS[key] || []) {
    if (report?.[field]) return report[field];
  }
  if (key === currentStatus) return report?.statusUpdatedAt || report?.status_updated_at || report?.updatedAt || report?.updated_at || null;
  return null;
}

// Presentation only: lays the report's existing status data out as timeline steps.
// Several notes per status are supported when the report carries a history list; the resolution note is never included.
export function buildReportTimeline(report) {
  const status = normalizeReportStatus(report);
  const resolution = text(report?.resolutionNote || report?.resolution_note).toLowerCase();
  const history = [report?.statusHistory, report?.status_history, report?.statusUpdates, report?.status_updates]
    .find((value) => Array.isArray(value)) || [];

  const notesByStage = new Map();
  const historyDates = new Map();
  const addNote = (stage, note, date) => {
    const body = text(note);
    if (!body || body.toLowerCase() === resolution) return;
    const list = notesByStage.get(stage) || [];
    if (!list.some((entry) => entry.text === body)) list.push({ text: body, date: date || null });
    notesByStage.set(stage, list);
  };
  history.forEach((entry) => {
    const stage = normalizeReportStatus({ status: entry?.status });
    const at = entry?.at || entry?.date || entry?.created_at || entry?.updated_at;
    if (at && !historyDates.has(stage)) historyDates.set(stage, at);
    addNote(stage, entry?.note ?? entry?.status_note ?? entry?.message, at);
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
    const date = historyDates.get(key) || notes[0]?.date || stageTimestamp(report, key, status) || (key === "sent" || key === "queued" ? created : key === "done" ? resolvedAt : null);
    return { key, label, state: stateName, notes, date: stateName === "upcoming" ? null : date };
  });
}

// Supabase timestamps are UTC; a value without an offset is treated as UTC too.
export function parseUtc(value) {
  if (!value) return null;
  const text = String(value).trim();
  const date = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(text) ? text : `${text.replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

const IST = "Asia/Kolkata";

export function istDayKey(value) {
  const date = parseUtc(value);
  return date ? date.toLocaleDateString("en-CA", { timeZone: IST }) : "";
}

export function formatIstDate(value) {
  const date = parseUtc(value);
  return date ? date.toLocaleDateString("en-GB", { timeZone: IST, day: "numeric", month: "short", year: "numeric" }) : "";
}

export function formatIstDateTime(value) {
  const date = parseUtc(value);
  if (!date) return "";
  const time = date.toLocaleTimeString("en-US", { timeZone: IST, hour: "numeric", minute: "2-digit", hour12: true });
  return `${formatIstDate(value)}, ${time} IST`;
}
