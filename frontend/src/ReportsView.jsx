import { motion as Motion } from "framer-motion";
import { Calendar, Check, ChevronLeft, Clock, Flag, Hash, Image as ImageIcon, Inbox, MapPin, Plus, RefreshCw, Smartphone } from "lucide-react";
import { buildReportTimeline, getReportStatusLabel, getReportStatusShortLabel, normalizeReportStatus } from "./reportIssueHelpers.js";
import "./ReportsView.css";

const formatDate = (value) => {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime()) ? date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "";
};
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

export function ReportDetail({ report, types, appVersion, canRefresh, refreshing, onBack, onRefresh, onOpenImage }) {
  const status = normalizeReportStatus(report);
  const type = types.find((entry) => entry.id === report.type);
  const TypeIcon = type?.Icon;
  const shots = screenshotList(report);
  const steps = buildReportTimeline(report);
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

      <Motion.section className="rq-block" {...rise(0.15)}>
        <h4>Status timeline</h4>
        <ol className="rq-timeline">
          {steps.map((step) => (
            <li key={step.key} className={`rq-step ${step.state} ${step.key}`}>
              <span className="rq-node">{step.state === "done" ? <Check size={11} strokeWidth={3} /> : step.state === "current" ? <Clock size={11} /> : null}</span>
              <div className="rq-step-body">
                <div className="rq-step-head"><b>{step.label}</b>{step.date ? <time>{formatDate(step.date)}</time> : null}</div>
                {step.notes.map((note, index) => (
                  <p key={index} className="rq-note">{note.text}{note.date && index > 0 ? <time> · {formatDate(note.date)}</time> : null}</p>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </Motion.section>

      {showResolution && (
        <Motion.section className="rq-resolution" {...rise(0.2)}>
          <span className="rq-resolution-glow" aria-hidden="true" />
          <h4><Check size={14} strokeWidth={3} /> Resolution</h4>
          {resolution ? <p className="rq-text">{resolution}</p> : null}
          {doneVersion ? <span className="rq-version">Completed in v{doneVersion}</span> : null}
        </Motion.section>
      )}
    </div>
  );
}
