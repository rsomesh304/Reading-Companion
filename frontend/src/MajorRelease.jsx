import { motion as Motion } from "framer-motion";
import { Bug, Sparkles, Wrench } from "lucide-react";
import "./MajorRelease.css";

const GROUPS = [
  { type: "feature", label: "New", Icon: Sparkles },
  { type: "improve", label: "Improved", Icon: Wrench },
  { type: "fix", label: "Fixed", Icon: Bug },
];

// Hero card for releases marked `"major": true` in release-notes.json.
export default function MajorReleaseCard({ release }) {
  const items = release.items || [];
  return (
    <Motion.article className="mj-card" initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, ease: "easeOut" }}>
      <span className="mj-aurora" aria-hidden="true" />
      <span className="mj-orb a" aria-hidden="true" />
      <span className="mj-orb b" aria-hidden="true" />
      <div className="mj-head">
        <span className="mj-badge"><Sparkles size={12} /> Major update</span>
        <span className="mj-date">{release.date || "Recently updated"}</span>
      </div>
      <div className="mj-version">v{release.version}</div>
      <h3 className="mj-title">{release.title || `Version ${release.version}`}</h3>
      <div className="mj-groups">
        {GROUPS.map(({ type, label, Icon }) => {
          const group = items.filter((item) => item.type === type);
          if (!group.length) return null;
          return (
            <section key={type} className={`mj-group ${type}`}>
              <h4><span><Icon size={14} /></span>{label}</h4>
              <ul>{group.map((item, index) => <li key={index}>{item.text}</li>)}</ul>
            </section>
          );
        })}
      </div>
    </Motion.article>
  );
}
