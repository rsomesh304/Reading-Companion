import { AlertTriangle } from "lucide-react";
import "./ServiceNotice.css";

// Animated "checking" / calm "error" card shown instead of raw technical messages.
export default function ServiceNotice({ kind = "checking", title, detail, actions = [], compact = false }) {
  return (
    <div className={`svc-notice ${kind} ${compact ? "compact" : ""}`} role="status" aria-live="polite">
      <div className="svc-visual" aria-hidden="true">
        {kind === "checking" ? (
          <>
            <span className="svc-ring r1" />
            <span className="svc-ring r2" />
            <span className="svc-arc" />
            <span className="svc-core" />
          </>
        ) : (
          <span className="svc-warn"><AlertTriangle size={compact ? 16 : 22} /></span>
        )}
      </div>
      <div className="svc-text">
        <b>{title}</b>
        {detail && <span>{detail}</span>}
        {actions.length > 0 && (
          <div className="svc-actions">
            {actions.map((action) => (
              <button key={action.label} type="button" className={action.primary ? "primary" : ""} onClick={action.onClick}>{action.label}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
