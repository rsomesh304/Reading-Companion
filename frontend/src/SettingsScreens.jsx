/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/immutability */
import { motion as Motion } from "framer-motion";
import {
    Bug, Check, ChevronLeft, Code, Download, HardDrive, Heart, ImagePlus, Lightbulb, Moon, RefreshCw,
    Send, Shield, Sparkles, Sun, Target, Trash2, Upload, User, Volume2, X as XIcon, Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { INTERACTION_SPRING } from "./motionConfig.js";
import { useGeminiVoiceDriver } from "./onboarding/avatarDriver.js";
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

// ======================= SETTINGS =======================
export function SettingsScreen({ nav, stores }) {
  const { profile, library, memory, gems } = stores;
  const [, bump] = useState(0);
  const [msg, setMsg] = useState("");
  const [voice, setVoice] = useState(profile.data.voice || "Leda");
  const [theme, setThemeState] = useState(profile.getTheme());
  const [previewing, setPreviewing] = useState(false);
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
    const reg = await navigator.serviceWorker?.getRegistration?.();
    if (!reg) return flash("Updates are checked automatically once the app is installed from its web link");
    await reg.update(); flash("You are on the latest version");
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
        <Item icon={<RefreshCw size={17} />} label="Check for updates" hint={`Version ${APP_VERSION}`} onClick={checkUpdate} />
        <Item icon={<Sparkles size={17} />} label="Replay welcome tour" onClick={() => { profile.resetOnboarding(); nav.replayOnboarding(); }} />
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

async function deliver(report) {
  const deliveries = [];
  if (SUPABASE_URL && SUPABASE_KEY) {
    deliveries.push(fetch(`${SUPABASE_URL}/rest/v1/bug_reports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        id: report.id,
        type: report.type,
        area: report.area,
        severity: report.severity,
        title: report.title,
        description: report.description,
        steps: report.steps,
        screenshots: report.screenshots,
        reporter: report.reporter,
        app_version: report.appVersion,
        device: report.device,
        created_at: report.createdAt,
      }),
    }).then((res) => res.ok || res.status === 409).catch(() => false));
  }
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
        device: JSON.stringify(report.device),
        created_at: report.createdAt,
        screenshot_count: report.screenshots?.length || 0,
      }),
    }).then((res) => res.ok).catch(() => false));
  }
  if (deliveries.length === 0) return false;
  const results = await Promise.all(deliveries);
  return results.every(Boolean);
}
const TYPES = [
  { id: "bug", label: "Bug", Icon: Bug },
  { id: "issue", label: "Issue", Icon: Zap },
  { id: "feature", label: "New feature", Icon: Lightbulb },
  { id: "enhance", label: "Improvement", Icon: Sparkles },
];
const AREAS = ["Reading session", "Welcome tour", "Library", "Gems & story card", "Memory & mind map", "Profile & settings", "Other"];
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
  const [list, setList] = useState(loadReports);
  const [msg, setMsg] = useState("");
  const fileRef = useRef(null);
  const isFault = type === "bug" || type === "issue";

  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(""), 2800); };
  function persist(next) {
    setList(next);
    try { localStorage.setItem(REPORT_KEY, JSON.stringify(next)); }
    catch { try { localStorage.setItem(REPORT_KEY, JSON.stringify(next.map((r) => ({ ...r, screenshots: [] })))); } catch { /* storage full */ } }
  }
  async function flush(current) {
    let changed = false;
    const next = [...current];
    for (let i = 0; i < next.length; i++) {
      if (next[i].status === "queued" && (await deliver(next[i]))) { next[i] = { ...next[i], status: "sent", screenshots: [] }; changed = true; }
    }
    if (changed) persist(next);
  }
  useEffect(() => { flush(list);}, []);

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
    setTitle(""); setDesc(""); setSteps(""); setShots([]);
    flash("Saved. Thank you for helping improve the app!");
    flush(next);
  }

  return (
    <div className="screen st-screen">
      <div className="aurora-bg" />
      <Head title="Report an issue" sub="Bugs, ideas and improvements" onBack={nav.goBack} />

      <Group title="What is it about?">
        <div className="rp-types">
          {TYPES.map(({ id, label, Icon }) => (
            <button key={id} className={type === id ? "on" : ""} onClick={() => setType(id)}><Icon size={16} />{label}</button>
          ))}
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

      {list.length > 0 && (
        <Group title="Your reports">
          {list.map((r) => (
            <div key={r.id} className="rp-item elevated">
              <div className="rp-item-top">
                <span className="rp-type">{TYPES.find((t) => t.id === r.type)?.label}</span>
                <span className={`rp-status ${r.status}`}>{r.status === "sent" ? <><Check size={11} /> Sent</> : "Queued"}</span>
              </div>
              <b>{r.title}</b>
              <small>{r.area} · {new Date(r.createdAt).toLocaleDateString()}{r.screenshots?.length ? ` · ${r.screenshots.length} photo(s)` : ""}</small>
              <button className="rp-del" onClick={() => persist(list.filter((x) => x.id !== r.id))} aria-label="Delete"><Trash2 size={13} /></button>
            </div>
          ))}
        </Group>
      )}
      {msg && <div className="st-toast">{msg}</div>}
    </div>
  );
}