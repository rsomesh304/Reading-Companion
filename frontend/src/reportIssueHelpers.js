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
