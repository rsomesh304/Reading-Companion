import { AnimatePresence, motion as Motion } from "framer-motion";
import { Bug, RefreshCw, Sparkles, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import "./UpdateManager.css";
import { APP_VERSION } from "./version.js";

const ICON = { fix: Bug, feature: Sparkles, improve: Wrench };
const LABEL = { fix: "Fixed", feature: "New", improve: "Better" };

const cmp = (a, b) => {
  const x = String(a).split(".").map(Number);
  const y = String(b).split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0);
  }
  return 0;
};

async function loadNotes() {
  try {
    const r = await fetch(`/release-notes.json?t=${Date.now()}`, { cache: "no-store" });
    if (!r.ok) return [];
    const d = await r.json();
    return (d.releases || []).slice().sort((a, b) => cmp(b.version, a.version));
  } catch {
    return [];
  }
}

function Notes({ releases }) {
  return releases.map((release) => (
    <div key={release.version} className="um-rel">
      <div className="um-rel-head">
        <b>{release.title || `Version ${release.version}`}</b>
        <span>v{release.version}</span>
      </div>
      {(release.items || []).map((item, index) => {
        const Icon = ICON[item.type] || Sparkles;
        return (
          <div key={`${release.version}-${index}`} className={`um-item ${item.type}`}>
            <Icon size={14} />
            <span><em>{LABEL[item.type] || "New"}</em> {item.text}</span>
          </div>
        );
      })}
    </div>
  ));
}

export default function UpdateManager({ paused = false }) {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      const check = () => reg.update().catch(() => {});
      setInterval(check, 30 * 60 * 1000);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") check();
      });
    },
  });

  const [incoming, setIncoming] = useState([]);
  const [whatsNew, setWhatsNew] = useState([]);
  const [later, setLater] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!needRefresh) return;
    loadNotes().then((all) => setIncoming(all.filter((release) => cmp(release.version, APP_VERSION) > 0)));
  }, [needRefresh]);

  useEffect(() => {
    let prior = null;
    try {
      prior = localStorage.getItem("rc_last_version");
      localStorage.setItem("rc_last_version", APP_VERSION);
    } catch {
      // ignore storage issues
    }
    if (prior && prior !== APP_VERSION) {
      loadNotes().then((all) => setWhatsNew(all.filter((release) => cmp(release.version, prior) > 0 && cmp(release.version, APP_VERSION) <= 0)));
    }
  }, []);

  const showUpdate = needRefresh && !later && !paused;

  return (
    <>
      <AnimatePresence>
        {showUpdate && (
          <Motion.div
            className="um-card"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          >
            <div className="um-title"><RefreshCw size={16} /> Update available</div>
            <div className="um-scroll">
              {incoming.length ? <Notes releases={incoming} /> : <p className="um-plain">A newer version is ready with improvements.</p>}
            </div>
            <div className="um-actions">
              <button className="um-ghost" onClick={() => setLater(true)}>Later</button>
              <button className="um-primary" disabled={busy} onClick={() => { setBusy(true); updateServiceWorker(true); }}>
                {busy ? "Updating…" : "Update now"}
              </button>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {whatsNew.length > 0 && !paused && (
          <Motion.div className="um-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Motion.div className="um-modal" initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }}>
              <div className="um-title big"><Sparkles size={18} /> What&apos;s new</div>
              <div className="um-scroll"><Notes releases={whatsNew} /></div>
              <button className="um-primary full" onClick={() => setWhatsNew([])}>Got it</button>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
