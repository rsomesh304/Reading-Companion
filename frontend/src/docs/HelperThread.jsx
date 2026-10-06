import { useEffect, useRef } from "react";
import { ArrowUpRight, Sparkles } from "lucide-react";

function Answer({ text }) {
  const lines = String(text).replace(/\[\d+\]/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
  return (
    <div className="dxa-text">
      {lines.map((line, i) => {
        const bullet = /^[-*•]\s+|^\d+[.)]\s+/.test(line);
        const body = line.replace(/^[-*•]\s+|^\d+[.)]\s+/, "");
        const parts = body.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((s, j) => (
          s.startsWith("**") ? <b key={j}>{s.slice(2, -2)}</b> : s.startsWith("`") ? <code key={j} className="dx-code-inline">{s.slice(1, -1)}</code> : s
        ));
        return bullet ? <p key={i} className="dxa-li">{parts}</p> : <p key={i}>{parts}</p>;
      })}
    </div>
  );
}

export default function HelperThread({ helper, onOpen, suggestions = [], onAsk }) {
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [helper.messages.length, helper.busy]);
  return (
    <div className="dxa">
      {!helper.messages.length && !helper.busy && (
        <div className="dxa-empty">
          <span className="dxa-orb"><Sparkles size={22} /></span>
          <b>Ask the Docs Helper</b>
          <p>It answers only from these docs and links you to the exact section.</p>
          <div className="dxa-chips">{suggestions.map((s) => <button type="button" key={s} onClick={() => onAsk(s)}>{s}</button>)}</div>
        </div>
      )}
      {helper.messages.map((m) => (
        <div key={m.id} className={`dxa-msg ${m.role}${m.error ? " err" : ""}`}>
          {m.role === "user" ? <p>{m.content}</p> : <Answer text={m.content} />}
          {m.sources?.length > 0 && (
            <div className="dxa-src">
              {m.sources.map((s, i) => (
                <button type="button" key={i} onClick={() => onOpen(s.id, s.heading)}>
                  <span><em>Open this section</em>{s.title}{s.heading ? ` › ${s.heading}` : ""}</span><ArrowUpRight size={15} />
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
      {helper.busy && <div className="dxa-msg assistant"><span className="dxa-think"><i /><i /><i /></span></div>}
      <div ref={endRef} />
    </div>
  );
}
