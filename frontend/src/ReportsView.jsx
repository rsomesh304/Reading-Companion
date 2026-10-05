import { motion as Motion } from "framer-motion";
import { ArrowUpRight, Calendar, Check, ChevronLeft, Clock, Eye, FlaskConical, Flag, Hash, Image as ImageIcon, Inbox, MapPin, Plus, RefreshCw, ScanSearch, Send, Smartphone, ThumbsUp, Wrench, X as XIcon } from "lucide-react";
import { buildReportTimeline, formatIstDate, formatIstDateTime, getReportStatusLabel, getReportStatusShortLabel, getTimelineNodeIcon, getTimelineProgress, istDayKey, normalizeReportStatus } from "./reportIssueHelpers.js";
import "./ReportsView.css";

const STAGE_ICONS = { queued: Clock, sent: Send, seen: Eye, review: ScanSearch, approved: ThumbsUp, in_progress: Wrench, testing: FlaskConical, done: Check, rejected: XIcon };

const formatDate = formatIstDate;
const ticketLabel = (report) => {
  const number = report.ticketNumber || report.ticket_number;
  return number ? `RC-${String(number).padStart(6, "0")}` : "";
};
const screenshotList = (report) => (report.screenshots?.length > 0 ? report.screenshotUrls || report.screenshots : []);

function StatusBadge({ report, large = false }) {
  const status = normalizeReportStatus(report);
  return <span className={`rq-badge ${status} ${large ? "large" : ""}`}><i />{getReportStatusShortLabel(report)}</span>;
}

export function ReportList({ reports, types, onSelect, onCompose }) {
  if (reports.length === 0) {
    return (
      <div className="rq-empty">
        <div className="rq-empty-art" aria-hidden="true">
          <span className="rq-empty-glow" />
          <Inbox size={34} />
          <i className="rq-empty-dot a" /><i className="rq-empty-dot b" />
        </div>
        <h3>No reports yet</h3>
        <p>Found a bug or have an idea? Your reports and their progress will appear here.</p>
        <button type="button" className="rq-empty-cta" onClick={onCompose}><Plus size={15} /> Raise an issue</button>
      </div>
    );
  }
  return (
    <div className="rq-list">
      {reports.map((report, index) => {
        const status = normalizeReportStatus(report);
        const type = types.find((entry) => entry.id === report.type);
        const TypeIcon = type?.Icon;
        const shots = report.screenshots?.length || 0;
        return (
          <Motion.button
            key={report.id}
            type="button"
            className={`rq-card ${status}`}
            onClick={() => onSelect(report.id)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
            whileTap={{ scale: 0.985 }}
          >
            <span className="rq-card-top">
              <span className="rq-type">{TypeIcon ? <TypeIcon size={13} /> : null}{type?.label}</span>
              <StatusBadge report={report} />
            </span>
            <span className="rq-card-title">{report.title}</span>
            {report.description ? <span className="rq-card-desc">{report.description}</span> : null}
            <span className="rq-card-meta">
              {formatDate(report.createdAt || report.created_at) && <span><Calendar size={12} />{formatDate(report.createdAt || report.created_at)}</span>}
              {ticketLabel(report) && <span><Hash size={12} />{ticketLabel(report).replace("RC-", "")}</span>}
              {report.area && <span className="rq-area"><MapPin size={12} />{report.area}</span>}
              {shots > 0 && <span className="rq-shot" aria-label={`${shots} screenshot${shots === 1 ? "" : "s"} attached`}><ImageIcon size={12} />{shots}</span>}
            </span>
          </Motion.button>
        );
      })}
    </div>
  );
}

export function ReportDetail({ report, types, appVersion, canRefresh, refreshing, onBack, onRefresh, onOpenImage, onOpenRelease }) {
  const status = normalizeReportStatus(report);
  const type = types.find((entry) => entry.id === report.type);
  const TypeIcon = type?.Icon;
  const shots = screenshotList(report);
  const steps = buildReportTimeline(report);
  const currentIndex = Math.max(0, steps.findIndex((step) => step.state === "current"));
  const terminal = status === "done" || status === "rejected";
  const progress = getTimelineProgress(steps);
  const created = report.createdAt || report.created_at;
  const resolution = status === "done" ? (report.resolutionNote || report.resolution_note || "").trim() : "";
  const doneVersion = report.resolvedInVersion || report.resolved_in_version;
  const showResolution = status === "done" && (resolution || doneVersion);
  const summary = status === "done" ? "This report is complete."
    : status === "rejected" ? "Reviewed and not planned for now."
    : "The team updates this as work moves forward.";
  const rise = (delay) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, delay } });

  return (
    <div className="rq-detail">
      <div className="rq-actions">
        <button type="button" className="rq-back" onClick={onBack}><ChevronLeft size={16} /> All reports</button>
        {canRefresh && (
          <button type="button" className="rq-refresh" onClick={onRefresh} disabled={refreshing} aria-label="Refresh report status">
            <RefreshCw size={15} className={refreshing ? "spinning" : ""} />
          </button>
        )}
      </div>

      <Motion.section className={`rq-hero ${status}`} {...rise(0)}>
        <span className="rq-hero-glow" aria-hidden="true" />
        <div className="rq-hero-row">
          <span className="rq-type">{TypeIcon ? <TypeIcon size={13} /> : null}{type?.label}</span>
          {ticketLabel(report) && <span className="rq-ticket">{ticketLabel(report)}</span>}
        </div>
        <h3 className="rq-title">{report.title}</h3>
        <div className="rq-status-line">
          <StatusBadge report={report} large />
          <span>{getReportStatusLabel(report)}</span>
        </div>
        <p className="rq-summary">{summary}</p>
        <div className="rq-chips">
          {formatDate(report.createdAt || report.created_at) && <span><Calendar size={12} />{formatDate(report.createdAt || report.created_at)}</span>}
          {report.area && <span><MapPin size={12} />{report.area}</span>}
          {report.severity && <span><Flag size={12} />{report.severity}</span>}
          <span><Smartphone size={12} />v{report.appVersion || report.app_version || appVersion}</span>
        </div>
      </Motion.section>

      <Motion.section className="rq-block" {...rise(0.05)}>
        <h4>What happened</h4>
        <p className="rq-text">{report.description}</p>
        {report.steps ? <><h4 className="rq-sub">Steps to reproduce</h4><p className="rq-text">{report.steps}</p></> : null}
      </Motion.section>

      {report.screenshots?.length > 0 && (
        <Motion.section className="rq-block" {...rise(0.1)}>
          <h4>Screenshots <span className="rq-count">{report.screenshots.length}</span></h4>
          {shots.length > 0 ? (
            <div className="rq-shots">
              {shots.map((shot, index) => (
                <button type="button" key={`${report.id}-${index}`} className="rq-shot-btn" onClick={() => onOpenImage(shots, index)} aria-label={`Open screenshot ${index + 1}`}>
                  <img src={shot} alt={`Screenshot ${index + 1}`} loading="lazy" />
                </button>
              ))}
            </div>
          ) : <p className="rq-text">Screenshots are temporarily unavailable.</p>}
        </Motion.section>
      )}

      <Motion.section className={`rq-block rq-track ${status}`} style={{ "--s": `var(--c-${status})` }} {...rise(0.15)}>
        <div className="rq-track-head">
          <h4>Status timeline</h4>
          <span className="rq-track-count">{terminal ? (status === "rejected" ? "Closed" : "Complete") : `Step ${currentIndex + 1} of ${steps.length}`}</span>
        </div>
        <div className="rq-meter" role="progressbar" aria-label="Report progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <span style={{ "--p": progress }} />
        </div>
        <ol className="rq-timeline">
          {steps.map((step, index) => {
            const isFirst = step.key === "sent" || step.key === "queued";
            const stamp = isFirst
              ? formatIstDateTime(created)
              : step.date && istDayKey(step.date) !== istDayKey(created) ? formatDate(step.date) : "";
            const icon = getTimelineNodeIcon(step);
            const StageIcon = STAGE_ICONS[step.key] || Clock;
            const next = steps[index + 1];
            const note = step.notes.at(-1);
            return (
              <li
                key={step.key}
                className={`rq-step ${step.state} key-${step.key} icon-${icon}`}
                style={{ "--i": index, "--s": `var(--c-${step.key})`, "--next": next ? `var(--c-${next.key})` : "transparent" }}
                aria-current={step.state === "current" ? "step" : undefined}
              >
                <span className="rq-node" aria-hidden="true">
                  {icon === "check" && <Check size={13} strokeWidth={3.2} />}
                  {icon === "cross" && <XIcon size={13} strokeWidth={3.2} />}
                  {icon === "clock" && <Clock size={13} strokeWidth={2.6} />}
                  {icon === "stage" && <StageIcon size={12} strokeWidth={2.2} />}
                  {step.state === "current" && icon === "clock" && <i className="rq-orbit" />}
                  {step.state === "current" && icon === "check" && <><i className="rq-burst" /><i className="rq-burst b" /></>}
                </span>
                <div className="rq-step-body">
                  <div className="rq-step-head">
                    <b>{step.label}</b>
                    {step.state === "current" && !terminal ? <em className="rq-now">Now</em> : null}
                    {stamp ? <time>{stamp}</time> : null}
                  </div>
                  {note ? <p className="rq-note">{note.text}</p> : null}
                </div>
              </li>
            );
          })}
        </ol>
      </Motion.section>

      {showResolution && (
        <Motion.section className="rq-resolution" {...rise(0.2)}>
          <span className="rq-resolution-glow" aria-hidden="true" />
          <h4><Check size={14} strokeWidth={3} /> Resolution</h4>
          {resolution ? <p className="rq-text">{resolution}</p> : null}
          {doneVersion ? (
            onOpenRelease ? (
              <button type="button" className="rq-version link" onClick={() => onOpenRelease(String(doneVersion))} aria-label={`See what changed in version ${doneVersion}`}>
                Completed in v{doneVersion} <ArrowUpRight size={13} strokeWidth={2.6} />
              </button>
            ) : <span className="rq-version">Completed in v{doneVersion}</span>
          ) : null}
        </Motion.section>
      )}
    </div>
  );
}
