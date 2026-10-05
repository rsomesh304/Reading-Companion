import { motion as Motion } from "framer-motion";
import { BookOpen, Bug, Palette, Sparkles, Wrench } from "lucide-react";
import "./MajorRelease.css";

const GROUPS = [
  { type: "feature", label: "New", Icon: Sparkles },
  { type: "improve", label: "Improved", Icon: Wrench },
  { type: "fix", label: "Fixed", Icon: Bug },
];

// Hero card for releases marked `"major": true` (big release) or `"ui": true` (major UI enhancement) in release-notes.json.
export default function MajorReleaseCard({ release, variant = "major" }) {
  const items = release.items || [];
  const isUi = variant === "ui";
  const isV2 = String(release.version || "").startsWith("2.");
  return (
    <Motion.article className={`mj-card ${isUi ? "ui" : ""} ${isV2 ? "v2" : ""}`} initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, ease: "easeOut" }}>
      <span className="mj-aurora" aria-hidden="true" />
      <span className="mj-orb a" aria-hidden="true" />
      <span className="mj-orb b" aria-hidden="true" />
      {isV2 && <span className="mj-v2-arc" aria-hidden="true" />}
      {isUi && (
        <div className="mj-deco" aria-hidden="true">
          <span className="mj-swatch s1" /><span className="mj-swatch s2" /><span className="mj-swatch s3" /><span className="mj-swatch s4" />
          <svg viewBox="0 0 120 60" className="mj-curve"><path d="M4 50C26 4 52 4 66 30S100 56 116 8" /></svg>
          <span className="mj-brush"><Palette size={26} /></span>
        </div>
      )}
      <div className="mj-head">
        <span className="mj-badge">{isV2 ? <BookOpen size={13} /> : isUi ? <Palette size={12} /> : <Sparkles size={12} />} {isV2 ? "A new chapter" : isUi ? "UI enhancement" : "Major update"}</span>
        <span className="mj-date">{release.date || "Recently updated"}</span>
      </div>
      {isV2 ? (
        <div className="mj-v2-intro">
          <div className="mj-v2-number" aria-label="Version 2">02</div>
          <div className="mj-v2-copy">
            <span>READING COMPANION · SECOND EDITION</span>
            <h3>{release.title || `Version ${release.version}`}</h3>
            <p>A bigger world for every reader, every book, every idea.</p>
          </div>
          <div className="mj-v2-scene" aria-hidden="true">
            <span className="mj-v2-orbit one" /><span className="mj-v2-orbit two" />
            <span className="mj-v2-spark spark-a"><Sparkles size={14} /></span>
            <span className="mj-v2-spark spark-b"><Sparkles size={10} /></span>
            <div className="mj-v2-book">
              <i className="mj-v2-cover" />
              <i className="mj-v2-page left" />
              <i className="mj-v2-page right" />
              <i className="mj-v2-spine" />
              <b>2</b><small>CHAPTER</small>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="mj-version">v{release.version}</div>
          <h3 className="mj-title">{release.title || `Version ${release.version}`}</h3>
        </>
      )}
      {isV2 && <div className="mj-v2-track" aria-hidden="true"><i /></div>}
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
