import { useEffect, useRef, useState } from "react";
import { Play, Pause, ChevronLeft, ChevronRight, Lightbulb, AlertTriangle, Info, HelpCircle, Copy, Check } from "lucide-react";
import HelpAnimations from "../HelpAnimations.jsx";
import "../HelpGuideScreen.css";
import { DIAGRAMS, FLOWS } from "./registry.js";
import { slugify } from "./text.js";
import { Diagram as DiagramSvg } from "./diagram.jsx";

export function Inline({ text }) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i} className="dx-code-inline">{part.slice(1, -1)}</code>;
    return <span key={i}>{part}</span>;
  });
}

export function Diagram({ id, active = [] }) {
  const spec = DIAGRAMS[id];
  return spec ? <DiagramSvg id={id} spec={spec} active={active} /> : null;
}

export function FlowPlayer({ id }) {
  const flow = FLOWS[id];
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const last = flow.steps.length - 1;
  useEffect(() => {
    if (!playing) return undefined;
    const timer = setTimeout(() => {
      if (step >= last) setPlaying(false);
      else setStep(step + 1);
    }, 2600);
    return () => clearTimeout(timer);
  }, [playing, step, last]);
  const current = flow.steps[step];
  return (
    <figure className="dx-flow">
      <figcaption>{flow.title}</figcaption>
      <Diagram id={flow.diagram} active={current.on} />
      <div className="dx-flow-card" key={step}>
        <span className="dx-flow-count">Step {step + 1} of {flow.steps.length}</span>
        <h4>{current.t}</h4>
        <p>{current.d}</p>
      </div>
      <div className="dx-flow-ctl">
        <button type="button" onClick={() => { setPlaying(false); setStep(Math.max(0, step - 1)); }} disabled={step === 0} aria-label="Previous step"><ChevronLeft size={16} /></button>
        <button type="button" className="play" onClick={() => { if (!playing && step >= last) setStep(0); setPlaying(!playing); }} aria-label={playing ? "Pause" : "Play"}>
          {playing ? <Pause size={15} /> : <Play size={15} />}
        </button>
        <button type="button" onClick={() => { setPlaying(false); setStep(Math.min(last, step + 1)); }} disabled={step === last} aria-label="Next step"><ChevronRight size={16} /></button>
        <div className="dx-dots">{flow.steps.map((_, i) => <i key={i} className={i === step ? "on" : i < step ? "done" : ""} />)}</div>
      </div>
    </figure>
  );
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
function StreakDemo() {
  const [days, setDays] = useState([true, true, false, false, false, false, false]);
  let best = 0;
  let run = 0;
  for (const d of days) { run = d ? run + 1 : 0; best = Math.max(best, run); }
  return (
    <div className="dx-demo">
      <p className="dx-demo-hint">Tap days to mark them as “read”.</p>
      <div className="dx-days">
        {DAYS.map((d, i) => (
          <button key={d} type="button" className={days[i] ? "on" : ""} onClick={() => setDays(days.map((v, j) => (j === i ? !v : v)))}>{d}</button>
        ))}
      </div>
      <p className="dx-demo-out">Streak: <b>{best}</b> day{best === 1 ? "" : "s"}{best >= 7 ? " · weekly goal reached" : ""}</p>
    </div>
  );
}

const STAGES = ["Queued", "Sent", "Seen", "In review", "Approved", "In progress", "Testing", "Done"];
function StatusDemo() {
  const [at, setAt] = useState(2);
  return (
    <div className="dx-demo">
      <p className="dx-demo-hint">Move the report forward. “Done” stays grey until it is really reached.</p>
      <ol className="dx-stages">
        {STAGES.map((s, i) => <li key={s} className={i < at ? "past" : i === at ? "now" : ""}><i />{s}</li>)}
      </ol>
      <div className="dx-demo-row">
        <button type="button" onClick={() => setAt(Math.max(0, at - 1))}>Back</button>
        <button type="button" onClick={() => setAt(Math.min(STAGES.length - 1, at + 1))}>Next status</button>
      </div>
    </div>
  );
}

function FallbackDemo() {
  const [groqDown, setGroqDown] = useState(false);
  const [cfDown, setCfDown] = useState(false);
  const who = !groqDown ? "Groq answers (live AI)" : !cfDown ? "Cloudflare answers (backup AI)" : "Predefined guide answer";
  return (
    <div className="dx-demo">
      <p className="dx-demo-hint">Pretend a provider is down and see who answers.</p>
      <div className="dx-demo-row">
        <label><input type="checkbox" checked={groqDown} onChange={(e) => setGroqDown(e.target.checked)} /> Groq is down</label>
        <label><input type="checkbox" checked={cfDown} onChange={(e) => setCfDown(e.target.checked)} /> Cloudflare is down</label>
      </div>
      <p className="dx-demo-out">→ <b>{who}</b></p>
    </div>
  );
}

function ReminderDemo() {
  const [time, setTime] = useState("21:00");
  const [h, m] = time.split(":").map(Number);
  const total = (((h * 60 + m - 15) % 1440) + 1440) % 1440;
  const out = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  return (
    <div className="dx-demo">
      <p className="dx-demo-hint">You usually start reading at:</p>
      <input type="time" value={time} onChange={(e) => e.target.value && setTime(e.target.value)} className="dx-time" />
      <p className="dx-demo-out">Reminder arrives at <b>{out}</b> (15 minutes earlier)</p>
    </div>
  );
}

function BackStackDemo() {
  const [stack, setStack] = useState(["Profile"]);
  const next = ["About", "Docs", "Docs page", "Search"][stack.length - 1];
  return (
    <div className="dx-demo">
      <p className="dx-demo-hint">Each screen or panel you open is one layer. Back removes exactly one.</p>
      <div className="dx-stack">
        {stack.map((s, i) => <span key={`${s}${i}`} className={i === stack.length - 1 ? "top" : ""}>{s}</span>)}
      </div>
      <div className="dx-demo-row">
        <button type="button" disabled={!next} onClick={() => setStack([...stack, next])}>Open {next || "—"}</button>
        <button type="button" disabled={stack.length < 2} onClick={() => setStack(stack.slice(0, -1))}>Back</button>
      </div>
    </div>
  );
}

const DEMOS = { streak: StreakDemo, status: StatusDemo, fallback: FallbackDemo, reminder: ReminderDemo, backstack: BackStackDemo };

function CodeBlock({ text }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <div className="dx-codeblock">
      <button type="button" aria-label="Copy" onClick={() => { navigator.clipboard?.writeText(text).then(() => { setCopied(true); timer.current = setTimeout(() => setCopied(false), 1400); }).catch(() => {}); }}>
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      <pre><code>{text}</code></pre>
    </div>
  );
}

const CALLOUT_ICON = { tip: Lightbulb, warn: AlertTriangle, info: Info, confirm: HelpCircle };

export function Block({ block }) {
  switch (block.type) {
    case "p": return <p><Inline text={block.text} /></p>;
    case "h2": return <h2 id={slugify(block.text)}>{block.text}</h2>;
    case "h3": return <h3>{block.text}</h3>;
    case "ul": return <ul>{block.items.map((it, i) => <li key={i}><Inline text={it} /></li>)}</ul>;
    case "ol": return <ol>{block.items.map((it, i) => <li key={i}><Inline text={it} /></li>)}</ol>;
    case "callout": {
      const Icon = CALLOUT_ICON[block.kind] || Info;
      return (
        <aside className={`dx-callout ${block.kind}`}>
          <Icon size={16} aria-hidden="true" />
          <div><Inline text={block.kind === "confirm" ? `**TO CONFIRM:** ${block.text}` : block.text} /></div>
        </aside>
      );
    }
    case "code": return <CodeBlock text={block.text} />;
    case "table":
      return (
        <div className="dx-table-wrap">
          <table>
            <thead><tr>{block.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{block.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} data-label={block.head[j]}><Inline text={c} /></td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    case "diagram": return <figure className="dx-flow"><figcaption>{block.caption}</figcaption><Diagram id={block.id} /></figure>;
    case "flow": return <FlowPlayer id={block.id} />;
    case "demo": { const Demo = DEMOS[block.id]; return <figure className="dx-demo-wrap"><figcaption>{block.caption}</figcaption><Demo /></figure>; }
    case "anim": return <div className="dx-anim"><HelpAnimations ids={block.ids} /></div>;
    default: return null;
  }
}
