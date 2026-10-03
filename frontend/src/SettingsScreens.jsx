/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/immutability */
import { motion as Motion } from "framer-motion";
import {
  Bug,
  ChevronLeft, ChevronRight, Code, Download, HardDrive, Heart, ImagePlus, Lightbulb, Moon, RefreshCw,
  Send, Shield, Sparkles, Sun, Target, Trash2, Upload, User, Volume2, Wrench, X as XIcon, Zap
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "./api.js";
import { INTERACTION_SPRING } from "./motionConfig.js";
import { useGeminiVoiceDriver } from "./onboarding/avatarDriver.js";
import { buildResolutionSummary, getReleaseHistory, getReportStatusLabel, normalizeReportStatus } from "./reportIssueHelpers.js";
import "./SettingsScreens.css";
import { useHaptic } from "./useHaptic.js";
import { APP_VERSION } from "./version.js";

export { APP_VERSION };
const VOICES = ["Leda", "Aoede", "Kore", "Despina", "Erinome", "Sulafat", "Achernar", "Charon", "Orus"];
const GOALS = ["10 min", "20 min", "30 min", "1 hour"];
const PREVIEW_PROMPT =
  "You are a calm, warm reading companion. Every message looks like: [LINE] text. Say ONLY that text, word for word, " +
  "in a natural, relaxed, medium-low pitched voice with an Indian accent. Never add words.";

function Head({ title, sub, onBack }) {
  return (
    <header className="screen-header st-head">
      <button className="st-back" onClick={onBack} aria-label="Back"><ChevronLeft size={20} /></button>
      <div className="header-left"><h1>{title}</h1>{sub && <p className="eyebrow">{sub}</p>}</div>
    </header>
  );
}
function Group({ title, children }) {
  return <section className="st-group"><div className="st-group-title">{title}</div>{children}</section>;
}
function Item({ icon, label, hint, children, onClick, danger }) {
  return (
    <div className={`st-item elevated ${onClick ? "tap" : ""} ${danger ? "danger" : ""}`} onClick={onClick} role={onClick ? "button" : undefined}>
      <span className="st-ic">{icon}</span>
      <span className="st-tx"><b>{label}</b>{hint && <small>{hint}</small>}</span>
      {children}
    </div>
  );
}

function ReleaseNotesScreen({ releases, onBack }) {
  return (
    <div className="screen st-screen">
      <div className="aurora-bg" />
      <Head title="Version & release notes" sub={`Current version ${APP_VERSION}`} onBack={onBack} />
      <Group title="Release history">
        {releases.length === 0 ? (
          <div className="st-note"><Sparkles size={15} /><span>Release notes are loading or not available yet.</span></div>
        ) : (
          <div className="st-release-list">
            {releases.map((release, releaseIndex) => (
              <Motion.article
                key={`${release.version}-${release.date || "release"}`}
                className="st-release-entry"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(releaseIndex * 0.07, 0.35), duration: 0.28, ease: "easeOut" }}
              >
                <span className="st-release-node" aria-hidden="true" />
                <div className="st-release elevated">
                  <div className="st-release-head">
                    <div>
                      <b>{release.title || `Version ${release.version}`}</b>
                      <small>{release.date || "Recently updated"}</small>
                    </div>
                    <span>v{release.version}</span>
                  </div>
                  <div className="st-release-cards">
                    {(release.items || []).map((item, index) => (
                      <div key={`${release.version}-${index}`} className={`st-release-card st-release-card-${index % 4}`}>
                        <span className="st-release-card-mark" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                        <p>{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Motion.article>
            ))}
          </div>
        )}
      </Group>
    </div>
  );
}

function UpdateDetailsScreen({ releases, onBack, onApply, applying }) {
  const updates = releases.flatMap((release) => (release.items || []).map((item, index) => ({
    ...item,
    key: `${release.version}-${index}`,
    version: release.version,
    date: release.date,
  })));
  return (
    <div className="screen st-screen">
      <div className="aurora-bg" />
      <Head title="Update available" sub="A fresh version is ready" onBack={onBack} />
      <Group title="What’s new">
        {updates.length ? (
          <div className="st-update-cards">
            {updates.map((item, index) => {
              const Icon = item.type === "fix" ? Bug : item.type === "improve" ? Wrench : Sparkles;
              return (
                <Motion.article
                  key={item.key}
                  className={`st-update-card st-release-card-${index % 4}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.06, 0.3), duration: 0.25 }}
                >
                  <span className="st-update-icon"><Icon size={17} /></span>
                  <div><b>{item.type === "fix" ? "Fixed" : item.type === "improve" ? "Improved" : "New"}</b><p>{item.text}</p></div>
                  <span className="st-update-card-version">v{item.version}</span>
                </Motion.article>
              );
            })}
          </div>
        ) : (
          <div className="st-update-card"><span className="st-update-icon"><Sparkles size={17} /></span><p>A newer app version is ready to install.</p></div>
        )}
      </Group>
      <Group>
        <button className="primary-button st-update-install" onClick={onApply} disabled={applying}>
          <Download size={16} /> {applying ? "Updating…" : "Update now"}
        </button>
      </Group>
    </div>
  );
}

// ======================= SETTINGS =======================
export function SettingsScreen({ nav, stores }) {
  const { profile, library, memory, gems } = stores;
  const [, bump] = useState(0);
  const [msg, setMsg] = useState("");
  const [voice, setVoice] = useState(profile.data.voice || "Leda");
  const [theme, setThemeState] = useState(profile.getTheme());
  const [previewing, setPreviewing] = useState(false);
  const [updateDetailsOpen, setUpdateDetailsOpen] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [applyingUpdate, setApplyingUpdate] = useState(false);
  const { triggerLightTap } = useHaptic();
  const drv = useGeminiVoiceDriver({ voiceName: voice });
  const fileRef = useRef(null);

  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(""), 2800); };
  const save = (k, v) => { profile.data[k] = v; profile._save(); bump((n) => n + 1); };
  const kb = Math.round(Object.keys(localStorage).reduce((s, k) => s + k.length + (localStorage.getItem(k) || "").length, 0) * 2 / 1024);

  function setTheme(next) {
    triggerLightTap();
    setThemeState(next);
    profile.setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
  }
  async function preview() {
    if (previewing) return;
    setPreviewing(true);
    try {
      if (await drv.connect(PREVIEW_PROMPT)) {
        await drv.say("[LINE] Namaste! Main aapka reading companion hoon. Chaliye, kitaab kholte hain.", { fallback: "Namaste!" });
      } else flash("Voice preview is unavailable right now");
    } finally { drv.close(); setPreviewing(false); }
  }
  function exportAll() {
    const data = {};
    Object.keys(localStorage).forEach((k) => { if (k.startsWith("reading_companion") || k.startsWith("rc_")) data[k] = localStorage.getItem(k); });
    const blob = new Blob([JSON.stringify({ __rc: 1, version: APP_VERSION, data }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "reading-companion-backup.json"; a.click();
    URL.revokeObjectURL(a.href);
    flash("Backup downloaded");
  }
  function importFile(file) {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(String(r.result));
        if (d.__rc === 1) Object.entries(d.data).forEach(([k, v]) => localStorage.setItem(k, v));
        else if (d.books) library.importData(String(r.result));
        else throw new Error("bad");
        flash("Restored. Reloading…");
        setTimeout(() => window.location.reload(), 600);
      } catch { flash("That is not a valid backup file"); }
    };
    r.readAsText(file);
  }
  function clearChats() {
    if (!window.confirm("Clear the saved conversation recaps for all books?")) return;
    Object.keys(localStorage).forEach((k) => { if (k.startsWith("rc_convo_") || k === "reading_companion_openers") localStorage.removeItem(k); });
    flash("Conversation history cleared"); bump((n) => n + 1);
  }
  function clearMemory() {
    if (!window.confirm("Delete all saved preferences?")) return;
    memory.memories = []; memory._save(); flash("Preferences cleared");
  }
  function clearGems() {
    if (!window.confirm("Delete ALL saved gems? This cannot be undone.")) return;
    gems.gems = []; gems._save(); flash("Gems deleted"); bump((n) => n + 1);
  }
  function wipe() {
    if (!window.confirm("Delete EVERYTHING (books, gems, memory, profile)? This cannot be undone.")) return;
    localStorage.clear(); window.location.reload();
  }
  async function checkUpdate() {
    if (nav.updateAvailable) {
      setUpdateDetailsOpen(true);
      return;
    }
    if (checkingUpdate) return;
    setCheckingUpdate(true);
    try {
      const available = await nav.checkForUpdates?.();
      if (available || nav.updateAvailable) setUpdateDetailsOpen(true);
      else flash("There is currently no update available for the app.");
    } catch {
      flash("Could not check for updates right now.");
    } finally {
      setCheckingUpdate(false);
    }
  }

  const [releaseHistory, setReleaseHistory] = useState([]);
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(false);
  useEffect(() => {
    let active = true;
    fetch(`/release-notes.json?t=${Date.now()}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { releases: [] }))
      .then((data) => {
        if (active) setReleaseHistory(getReleaseHistory(data.releases || []));
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  if (updateDetailsOpen) {
    return (
      <UpdateDetailsScreen
        releases={nav.updateReleases || []}
        onBack={() => setUpdateDetailsOpen(false)}
        onApply={async () => {
          setApplyingUpdate(true);
          try { await nav.applyUpdate?.(); }
          finally { setApplyingUpdate(false); }
        }}
        applying={applyingUpdate}
      />
    );
  }

  if (releaseNotesOpen) {
    return <ReleaseNotesScreen releases={releaseHistory} onBack={() => setReleaseNotesOpen(false)} />;
  }

  return (
    <div className="screen st-screen">
      <div className="aurora-bg" />
      <Head title="Settings" sub={`Version ${APP_VERSION}`} onBack={nav.goBack} />

      <Group title="You & your companion">
        <Item icon={<User size={17} />} label="Your name">
          <input className="st-input" defaultValue={profile.data.name} maxLength={30} onBlur={(e) => e.target.value.trim() && save("name", e.target.value.trim())} />
        </Item>
        <Item icon={<Sparkles size={17} />} label="Companion's name" hint="What you call your reading friend">
          <input className="st-input" defaultValue={profile.data.companionName || ""} maxLength={20} placeholder="e.g. Sathi" onBlur={(e) => save("companionName", e.target.value.trim())} />
        </Item>
        <div className="st-item elevated col">
          <div className="st-row"><span className="st-ic"><Target size={17} /></span><span className="st-tx"><b>Daily reading goal</b></span></div>
          <div className="st-chips">
            {GOALS.map((g) => <Motion.button key={g} whileTap={{ scale: 0.96 }} transition={INTERACTION_SPRING} className={profile.data.dailyGoal === g ? "on" : ""} onClick={() => { triggerLightTap(); save("dailyGoal", g); }}>{g}</Motion.button>)}
          </div>
        </div>
      </Group>

      <Group title="Appearance">
        <div className="st-item elevated">
          <span className="st-ic">{theme === "dark" ? <Moon size={17} /> : <Sun size={17} />}</span>
          <span className="st-tx"><b>Theme</b></span>
          <div className="st-seg">
            <Motion.button whileTap={{ scale: 0.96 }} transition={INTERACTION_SPRING} className={theme === "light" ? "on" : ""} onClick={() => setTheme("light")}><Sun size={14} /> Light</Motion.button>
            <Motion.button whileTap={{ scale: 0.96 }} transition={INTERACTION_SPRING} className={theme === "dark" ? "on" : ""} onClick={() => setTheme("dark")}><Moon size={14} /> Dark</Motion.button>
          </div>
        </div>
      </Group>

      <Group title="Voice">
        <Item icon={<Volume2 size={17} />} label="Companion voice" hint="Applies from your next session">
          <select className="st-input sm" value={voice} onChange={(e) => { setVoice(e.target.value); save("voice", e.target.value); }}>
            {VOICES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </Item>
        <button className="st-btn" onClick={preview} disabled={previewing}>{previewing ? "Playing…" : "Preview this voice"}</button>
      </Group>

      <Group title="Privacy & storage">
        <div className="st-note"><Shield size={15} />
          <span>Your books, gems, words and memories are stored only on this device. During a session your voice and camera frames are sent to Google Gemini to generate replies, and nowhere else.</span>
        </div>
        <Item icon={<HardDrive size={17} />} label="Storage used" hint="On this device"><span className="st-val">{kb} KB</span></Item>
        <Item icon={<Trash2 size={17} />} label="Clear conversation history" hint="Recaps used for continuity" onClick={clearChats} />
        <Item icon={<Trash2 size={17} />} label="Clear saved preferences" onClick={clearMemory} />
        <Item icon={<Trash2 size={17} />} label="Delete all gems" onClick={clearGems} />
      </Group>

      <Group title="Backup">
        <Item icon={<Download size={17} />} label="Export backup" hint="Everything, as one JSON file" onClick={exportAll} />
        <Item icon={<Upload size={17} />} label="Restore from backup" onClick={() => fileRef.current?.click()} />
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => { importFile(e.target.files?.[0]); e.target.value = ""; }} />
      </Group>

      <Group title="App">
        <Item icon={<RefreshCw size={17} />} label="Check for updates" hint={checkingUpdate ? "Checking for a newer version…" : `Version ${APP_VERSION}`} onClick={checkUpdate}>
          {nav.updateAvailable && <span className="st-update-badge" aria-label="1 update available">1</span>}
        </Item>
        <button
          type="button"
          className="st-item elevated tap st-release-trigger"
          onClick={() => setReleaseNotesOpen(true)}
        >
          <span className="st-ic"><Sparkles size={17} /></span>
          <span className="st-tx"><b>Version & release notes</b><small>See what’s new in Reading Companion</small></span>
          <span className="st-release-version">v{APP_VERSION}</span>
          <ChevronRight className="st-release-arrow" size={17} />
        </button>
      </Group>

      <Group title="Danger zone">
        <Item icon={<Trash2 size={17} />} label="Delete all my data" hint="Books, gems, memory and profile" onClick={wipe} danger />
      </Group>

      {msg && <div className="st-toast">{msg}</div>}
    </div>
  );
}

// ======================= ABOUT =======================
// EDIT THESE TEXTS with your own story whenever you like.
const ABOUT = {
  tagline: "A friend who reads with you.",
  why: [
    "Reading in English can feel like walking with a stone in your shoe. One hard word, and you leave the book to open a dictionary. The flow breaks, and often the book stays closed.",
    "And not everyone has a friend sitting next to them who can explain that word in their own language. Reading Companion is built to be that friend, for Hindi and Odia speakers who want to read English books.",
  ],
  principles: [
    { t: "Your language, your pace", d: "Meanings in Hindi and Odia, with real examples, never a lecture." },
    { t: "The book stays open", d: "Ask out loud, get the answer, keep reading. No tabs, no typing." },
    { t: "What you read, you keep", d: "Words, gems and preferences are saved, so reading adds up." },
    { t: "Your data stays with you", d: "Everything lives on your device. You can export or delete it any time." },
  ],
  dev: {
    name: "Soumyaranjan",
    role: "Data Engineer @ Accenture",
    quote: "Data se roz ka kaam, design se roz ke sapne.",
    story: "By day he builds data pipelines. By night he loves design. Reading Companion started from one question: what if a book could answer back? It was built with the help of AI, and this is version one. The real story is just beginning.",
  },
};

export function AboutScreen({ nav }) {
  return (
    <div className="screen st-screen">
      <div className="aurora-bg" />
      <Head title="About" sub="Reading Companion" onBack={nav.goBack} />

      <div className="ab-hero">
        <div className="ab-mark"><Heart size={26} /></div>
        <h2>Reading Companion</h2>
        <p>{ABOUT.tagline}</p>
        <span className="ab-ver">Version {APP_VERSION}</span>
      </div>

      <Group title="Why it exists">
        {ABOUT.why.map((t, i) => <p key={i} className="ab-p elevated">{t}</p>)}
      </Group>

      <Group title="Who it is for">
        <p className="ab-p elevated">Students, working people and book lovers whose first language is Hindi or Odia, and who want to enjoy English books without feeling stuck.</p>
      </Group>

      <Group title="What we believe">
        <div className="ab-grid">
          {ABOUT.principles.map((p) => <div key={p.t} className="ab-card elevated"><b>{p.t}</b><span>{p.d}</span></div>)}
        </div>
      </Group>

      <Group title="The developer">
        <div className="ab-dev elevated">
          <div className="ab-ava"><b>{ABOUT.dev.name[0]}</b><img src="/developer.jpg" alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} /></div>
          <div className="ab-dev-name">{ABOUT.dev.name}</div>
          <div className="ab-dev-role">{ABOUT.dev.role}</div>
          <p className="ab-quote">“{ABOUT.dev.quote}”</p>
          <p className="ab-story">{ABOUT.dev.story}</p>
        </div>
      </Group>

      <Group title="Built with">
        <div className="st-chips static">
          {["React", "Vite", "Gemini Live", "Framer Motion", "Web Audio"].map((t) => <span key={t}><Code size={12} /> {t}</span>)}
        </div>
      </Group>
      <p className="ab-foot">Made with care in India.</p>
    </div>
  );
}

// ======================= REPORT AN ISSUE =======================
const REPORT_KEY = "rc_reports";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const FORMSPREE_ENDPOINT = import.meta.env.VITE_FORMSPREE_ENDPOINT;

async function signReportScreenshots(report) {
  const screenshots = Array.isArray(report.screenshots) ? report.screenshots : [];
  const paths = screenshots.filter((screenshot) => typeof screenshot === "string" && !/^(?:data:image\/|https?:\/\/)/i.test(screenshot));
  if (paths.length === 0 || !report.id) return { ...report, screenshotUrls: screenshots };

  try {
    const response = await apiFetch("/api/bug-reports/screenshot-urls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId: report.id, paths }),
    });
    if (!response.ok) return { ...report, screenshotUrls: screenshots.filter((screenshot) => /^(?:data:image\/|https?:\/\/)/i.test(screenshot)) };
    const data = await response.json();
    const urls = new Map((data.screenshots || []).map(({ path, url }) => [path, url]));
    return {
      ...report,
      screenshotUrls: screenshots
        .map((screenshot) => urls.get(screenshot) || (/^(?:data:image\/|https?:\/\/)/i.test(screenshot) ? screenshot : null))
        .filter(Boolean),
    };
  } catch {
    return { ...report, screenshotUrls: screenshots.filter((screenshot) => /^(?:data:image\/|https?:\/\/)/i.test(screenshot)) };
  }
}

async function deliver(report) {
  let storedReport = null;
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const response = await apiFetch("/api/bug-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report }),
      });
      if (!response.ok) return null;
      storedReport = await response.json();
    } catch {
      return null;
    }
  }
  const screenshots = storedReport?.screenshots || report.screenshots || [];
  const deliveries = [];
  if (FORMSPREE_ENDPOINT) {
    deliveries.push(fetch(FORMSPREE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        _subject: `[Reading Companion] ${report.type}: ${report.title}`,
        report_id: report.id,
        type: report.type,
        area: report.area,
        severity: report.severity || "Not applicable",
        title: report.title,
        description: report.description,
        steps: report.steps || "Not provided",
        reporter: report.reporter,
        app_version: report.appVersion,
        ticket_number: storedReport?.ticketNumber || report.ticketNumber || "Pending",
        device: JSON.stringify(report.device),
        created_at: report.createdAt,
        screenshot_count: screenshots.length,
        status: "sent",
      }),
    }).then((res) => res.ok).catch(() => false));
  }
  if (!storedReport && deliveries.length === 0) return null;
  const results = await Promise.all(deliveries);
  if (!results.every(Boolean)) return null;
  const displayReport = await signReportScreenshots({ ...report, screenshots });
  return {
    ticketNumber: storedReport?.ticketNumber || report.ticketNumber || null,
    screenshots,
    screenshotUrls: displayReport.screenshotUrls,
  };
}

async function syncReportsFromSupabase(reporterName) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/bug_reports`);
    url.searchParams.set("select", "*");
    url.searchParams.set("order", "created_at.desc");
    if (reporterName && reporterName.trim()) {
      url.searchParams.set("reporter", `eq.${encodeURIComponent(reporterName.trim())}`);
    }
    const res = await fetch(url.toString(), {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? Promise.all(rows.map(signReportScreenshots)) : [];
  } catch {
    return [];
  }
}
const TYPES = [
  { id: "bug", label: "Bug", Icon: Bug, description: "Something is broken, confusing, or not working as expected." },
  { id: "issue", label: "Issue", Icon: Zap, description: "A problem, blocker, or friction point in the app flow." },
  { id: "feature", label: "New feature", Icon: Lightbulb, description: "Suggest a new capability or experience you want added." },
  { id: "enhance", label: "Improvement", Icon: Sparkles, description: "Recommend a better version of an existing feature or flow." },
];
const REPORT_STAGES = [
  ["sent", "Sent"],
  ["seen", "Seen"],
  ["review", "Review"],
  ["approved", "Approved"],
  ["in_progress", "Work in progress"],
  ["testing", "Testing"],
  ["done", "Completed"],
];
const AREAS = ["Home", "Reading session", "Welcome tour", "Library", "Gems & story card", "Memory & mind map", "Profile & settings", "Other"];
const SEV = ["Low", "Medium", "High", "Blocking"];

function toDataUrl(file, max = 1000) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = reject;
    r.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.72));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}
function loadReports() { try { return JSON.parse(localStorage.getItem(REPORT_KEY) || "[]"); } catch { return []; } }

export function ReportScreen({ nav, stores }) {
  const [type, setType] = useState("bug");
  const [area, setArea] = useState(AREAS[0]);
  const [sev, setSev] = useState("Medium");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [steps, setSteps] = useState("");
  const [shots, setShots] = useState([]);
  const [view, setView] = useState("compose");
  const [reportFilter, setReportFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [list, setList] = useState(loadReports);
  const [msg, setMsg] = useState("");
  const [refreshingReports, setRefreshingReports] = useState(false);
  const fileRef = useRef(null);
  const isFault = type === "bug" || type === "issue";

  const filteredReports = list.filter((item) => reportFilter === "all" || item.type === reportFilter);
  const selectedReport = filteredReports.find((item) => item.id === selectedId) || null;

  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(""), 2800); };

  function persist(next) {
    const prepared = next.map((r) => ({
      ...r,
      status: normalizeReportStatus(r),
      resolvedAt: r.resolvedAt || r.resolved_at || null,
      resolvedInVersion: r.resolvedInVersion || r.resolved_in_version || null,
      resolutionNote: r.resolutionNote || r.resolution_note || "",
    }));
    setList(prepared);
    try { localStorage.setItem(REPORT_KEY, JSON.stringify(prepared)); }
    catch { try { localStorage.setItem(REPORT_KEY, JSON.stringify(prepared.map((r) => ({ ...r, screenshots: [] })))); } catch { /* storage full */ } }
  }

  async function refreshReports() {
    if (!SUPABASE_URL || !SUPABASE_KEY || refreshingReports) return;
    setRefreshingReports(true);
    try {
      const remote = await syncReportsFromSupabase(stores.profile.data.name || "");
      if (remote.length) {
        const local = loadReports();
        const merged = [...remote, ...local.filter((item) => !remote.some((row) => row.id === item.id))];
        persist(merged.slice(0, 25));
      }
      flash("Report statuses refreshed");
    } catch {
      flash("Could not refresh reports right now");
    } finally {
      setRefreshingReports(false);
    }
  }

  useEffect(() => {
    let active = true;
    async function sync() {
      if (!SUPABASE_URL || !SUPABASE_KEY) return;
      const remote = await syncReportsFromSupabase(stores.profile.data.name || "");
      if (!active || !remote.length) return;
      const local = loadReports();
      const merged = [...remote, ...local.filter((item) => !remote.some((row) => row.id === item.id))];
      persist(merged.slice(0, 25));
    }
    sync();
    return () => { active = false; };
  }, [stores.profile.data.name]);

  useEffect(() => {
    if (selectedId && !filteredReports.some((item) => item.id === selectedId)) {
      setSelectedId(null);
    }
  }, [filteredReports, selectedId]);

  async function flush(current) {
    let changed = false;
    const next = [...current];
    for (let i = 0; i < next.length; i++) {
      if (normalizeReportStatus(next[i]) === "queued") {
        const delivered = await deliver(next[i]);
        if (!delivered) continue;
        next[i] = {
          ...next[i],
          status: "sent",
          ticketNumber: delivered.ticketNumber,
          screenshots: delivered.screenshots,
          screenshotUrls: delivered.screenshotUrls,
        };
        changed = true;
      }
    }
    if (changed) persist(next);
  }
  useEffect(() => { flush(list); }, []);

  async function addShots(files) {
    const room = 4 - shots.length;
    const picked = [...files].slice(0, room);
    const done = await Promise.all(picked.map((f) => toDataUrl(f).catch(() => null)));
    setShots((s) => [...s, ...done.filter(Boolean)]);
  }

  function submit() {
    if (title.trim().length < 3 || desc.trim().length < 10) return flash("Add a short title and a few details first");
    const r = {
      id: `r-${Date.now()}`, type, area, severity: isFault ? sev : null,
      title: title.trim(), description: desc.trim(), steps: isFault ? steps.trim() : "",
      screenshots: shots, status: "queued", createdAt: new Date().toISOString(),
      reporter: stores.profile.data.name, appVersion: APP_VERSION,
      device: {
        ua: navigator.userAgent, screen: `${window.innerWidth}x${window.innerHeight}`, lang: navigator.language,
        theme: stores.profile.getTheme(), standalone: window.matchMedia?.("(display-mode: standalone)").matches || false,
      },
    };
    const next = [r, ...list].slice(0, 25);
    persist(next);
    setSelectedId(r.id);
    setView("reports");
    setTitle(""); setDesc(""); setSteps(""); setShots([]);
    flash("Saved. Thank you for helping improve the app!");
    flush(next);
  }

  return (
    <div className="screen st-screen">
      <div className="aurora-bg" />
      <Head title="Report an issue" sub="Bugs, ideas and improvements" onBack={nav.goBack} />

      <Group>
        <div className="rp-slider-wrap">
          <div className="rp-slider">
            <button className={view === "compose" ? "on" : ""} onClick={() => setView("compose")}>Raise an issue</button>
            <button className={view === "reports" ? "on" : ""} onClick={() => setView("reports")}>Your reports</button>
          </div>
        </div>
      </Group>

      {view === "compose" && (
        <>
          <Group title="What is it about?">
            <label className="rp-dropdown-label">
              <span>Category</span>
              <select className="rp-type-select" value={type} onChange={(e) => setType(e.target.value)}>
                {TYPES.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
              </select>
            </label>
            <div className="rp-type-summary">
              <span className="rp-type-badge">{TYPES.find((entry) => entry.id === type)?.label}</span>
              <p>{TYPES.find((entry) => entry.id === type)?.description}</p>
            </div>
          </Group>

          <Group title="Details">
            <div className="st-form elevated">
              <label>Where did it happen?
                <select className="st-input full" value={area} onChange={(e) => setArea(e.target.value)}>{AREAS.map((a) => <option key={a}>{a}</option>)}</select>
              </label>
              {isFault && (
                <div>
                  <div className="st-lbl">How serious?</div>
                  <div className="st-chips">{SEV.map((s) => <button key={s} className={sev === s ? "on" : ""} onClick={() => setSev(s)}>{s}</button>)}</div>
                </div>
              )}
              <label>Title<input className="st-input full" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder={type === "feature" ? "e.g. Dark reading mode" : "e.g. Mind map does not load"} /></label>
              <label>{type === "feature" || type === "enhance" ? "Describe your idea" : "What went wrong?"}
                <textarea className="st-input full" rows={4} value={desc} maxLength={1500} onChange={(e) => setDesc(e.target.value)} placeholder="Write as much as you like" />
              </label>
              {isFault && <label>Steps to reproduce (optional)<textarea className="st-input full" rows={3} value={steps} maxLength={800} onChange={(e) => setSteps(e.target.value)} placeholder="1. Open Memory  2. Tap Mind Map  3. ..." /></label>}
              <div>
                <div className="st-lbl">Screenshots ({shots.length}/4)</div>
                <div className="rp-shots">
                  {shots.map((s, i) => (
                    <div key={i} className="rp-shot"><img src={s} alt="" /><button onClick={() => setShots((x) => x.filter((_, j) => j !== i))} aria-label="Remove"><XIcon size={12} /></button></div>
                  ))}
                  {shots.length < 4 && <button className="rp-add" onClick={() => fileRef.current?.click()}><ImagePlus size={20} /></button>}
                </div>
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addShots(e.target.files); e.target.value = ""; }} />
              </div>
              <button className="primary-button" onClick={submit}><Send size={15} /> Submit</button>
            </div>
          </Group>
        </>
      )}

      {view === "reports" && (
        <Group>
          {selectedId && selectedReport ? (
            <div className="rp-details-screen">
              <div className="rp-detail-actions">
                <button className="rp-back-link" onClick={() => setSelectedId(null)}><ChevronLeft size={16} /> Back to reports</button>
                {SUPABASE_URL && SUPABASE_KEY && (
                  <button className="rp-refresh" type="button" onClick={refreshReports} disabled={refreshingReports} aria-label="Refresh report status" title="Refresh report status">
                    <RefreshCw size={15} className={refreshingReports ? "spinning" : ""} />
                  </button>
                )}
              </div>
              <div className="rp-detail-panel">
                <div className="rp-detail-top">
                  <div>
                    <span className="rp-type-badge small">{TYPES.find((t) => t.id === selectedReport.type)?.label}</span>
                    <h4>{selectedReport.title}</h4>
                  </div>
                  <span className={`rp-status-badge ${normalizeReportStatus(selectedReport)}`}>{getReportStatusLabel(selectedReport)}</span>
                </div>

                <div className="rp-detail-grid">
                  {selectedReport.ticketNumber || selectedReport.ticket_number ? <div><span>Ticket</span><strong>{`RC-${String(selectedReport.ticketNumber || selectedReport.ticket_number).padStart(6, "0")}`}</strong></div> : null}
                  <div><span>Area</span><strong>{selectedReport.area}</strong></div>
                  <div><span>Severity</span><strong>{selectedReport.severity || "Not set"}</strong></div>
                  <div><span>Created</span><strong>{new Date(selectedReport.createdAt || selectedReport.created_at).toLocaleDateString()}</strong></div>
                  <div><span>App</span><strong>{selectedReport.appVersion || selectedReport.app_version || APP_VERSION}</strong></div>
                </div>

                <div className="rp-description-block">
                  <label>What happened</label>
                  <p>{selectedReport.description}</p>
                </div>

                {selectedReport.steps && (
                  <div className="rp-description-block">
                    <label>Steps to reproduce</label>
                    <p>{selectedReport.steps}</p>
                  </div>
                )}

                {selectedReport.screenshots?.length > 0 && (
                  <div className="rp-description-block">
                    <label>Screenshots</label>
                    {(selectedReport.screenshotUrls || selectedReport.screenshots).length > 0 ? (
                      <div className="rp-image-grid">
                        {(selectedReport.screenshotUrls || selectedReport.screenshots).map((shot, index) => (
                          <img key={`${selectedReport.id}-${index}`} src={shot} alt={`Issue snapshot ${index + 1}`} />
                        ))}
                      </div>
                    ) : <p>Snapshots are temporarily unavailable.</p>}
                  </div>
                )}

                <div className="rp-resolution-box">
                  <label>Development progress</label>
                  <div className="rp-stage-grid">
                    {REPORT_STAGES.map(([stage, label], index) => {
                      const status = normalizeReportStatus(selectedReport);
                      const currentIndex = status === "rejected" ? 2 : REPORT_STAGES.findIndex(([candidate]) => candidate === status);
                      const stageClass = index < currentIndex ? "complete" : index === currentIndex ? "current" : "";
                      return <div key={stage} className={`rp-stage ${stageClass}`}><span>{index + 1}</span><small>{label}</small></div>;
                    })}
                  </div>
                  <p>{normalizeReportStatus(selectedReport) === "done"
                    ? buildResolutionSummary(selectedReport)
                    : normalizeReportStatus(selectedReport) === "rejected"
                      ? "This report was reviewed and will not be scheduled for implementation."
                      : `Current status: ${getReportStatusLabel(selectedReport)}. Status is managed by the development team.`}</p>
                  {(selectedReport.statusNote || selectedReport.status_note || selectedReport.rejectionNote || selectedReport.rejection_note) ? (
                    <>
                      <label>{normalizeReportStatus(selectedReport) === "rejected" ? "Why this was rejected" : "Developer update"}</label>
                      <p>{selectedReport.statusNote || selectedReport.status_note || selectedReport.rejectionNote || selectedReport.rejection_note}</p>
                    </>
                  ) : null}
                  {normalizeReportStatus(selectedReport) === "done" && (selectedReport.resolutionNote || selectedReport.resolution_note) ? (
                    <>
                      <label>Resolution note</label>
                      <p>{selectedReport.resolutionNote || selectedReport.resolution_note}</p>
                    </>
                  ) : null}
                  {selectedReport.resolvedInVersion || selectedReport.resolved_in_version ? (
                    <>
                      <label>Completed in</label>
                      <p>{`v${selectedReport.resolvedInVersion || selectedReport.resolved_in_version}`}</p>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="rp-filter-row">
                <label className="rp-filter-label">Filter</label>
                <select className="rp-filter" value={reportFilter} onChange={(e) => setReportFilter(e.target.value)}>
                  <option value="all">All</option>
                  {TYPES.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
                </select>
                {SUPABASE_URL && SUPABASE_KEY && (
                  <button className="rp-refresh" type="button" onClick={refreshReports} disabled={refreshingReports} aria-label="Refresh report statuses" title="Refresh report statuses">
                    <RefreshCw size={15} className={refreshingReports ? "spinning" : ""} />
                  </button>
                )}
              </div>

              {filteredReports.length === 0 ? (
                <div className="st-note"><Sparkles size={15} /><span>No reports yet. Submit one from the issue form.</span></div>
              ) : (
                <div className="rp-report-list">
                  {filteredReports.map((report) => (
                    <Motion.button
                      layout
                      key={report.id}
                      className={`rp-report-card rp-card-${report.type || "issue"}`}
                      onClick={() => setSelectedId(report.id)}
                      whileTap={{ scale: 0.99 }}
                      transition={{ type: "spring", stiffness: 280, damping: 20 }}
                    >
                      <div className="rp-card-head">
                        <span className="rp-type-badge">{TYPES.find((t) => t.id === report.type)?.label}</span>
                        <span className={`rp-status-badge ${normalizeReportStatus(report)}`}>{getReportStatusLabel(report)}</span>
                      </div>
                      <h3>{report.title}</h3>
                      <p>{report.description}</p>
                      <div className="rp-card-meta">
                        {report.ticketNumber || report.ticket_number ? <span>{`RC-${String(report.ticketNumber || report.ticket_number).padStart(6, "0")}`}</span> : null}
                        <span>{report.area}</span>
                        <span>{new Date(report.createdAt || report.created_at).toLocaleDateString()}</span>
                        {report.screenshots?.length ? <span>{report.screenshots.length} photo(s)</span> : null}
                      </div>
                    </Motion.button>
                  ))}
                </div>
              )}
            </>
          )}
        </Group>
      )}
      {msg && <div className="st-toast">{msg}</div>}
    </div>
  );
}