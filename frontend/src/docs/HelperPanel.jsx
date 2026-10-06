import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Send, Sparkles, X } from "lucide-react";
import { useBackLayer } from "../backStack.js";
import { useViewport } from "./viewport.js";
import HelperThread from "./HelperThread.jsx";
import { HELPER_SUGGESTIONS } from "./helper.js";

// Side panel on desktop, bottom sheet on phones (kept above the keyboard).
export default function HelperPanel({ theme, helper, wide, page, onOpen, onClose }) {
  const [text, setText] = useState("");
  const vp = useViewport();
  const input = useRef(null);
  useBackLayer(!wide, onClose);
  const send = (value) => {
    const v = (value ?? text).trim();
    if (!v || helper.busy) return;
    setText("");
    helper.ask(v, page?.id || "");
  };
  const suggestions = page ? [`Summarise “${page.title}”`, `What should I know before changing anything in “${page.title}”?`, ...HELPER_SUGGESTIONS.slice(0, 1)] : HELPER_SUGGESTIONS;
  const body = (
    <div className={`dxh${wide ? " side" : ""}`} data-dx-theme={theme} style={wide ? undefined : { top: vp.top, height: vp.h }}>
      {!wide && <button type="button" className="dxh-scrim" aria-label="Close helper" onClick={onClose} />}
      <section className="dxh-card" role="dialog" aria-label="Docs Helper">
        <header>
          <span className="dxh-orb"><Sparkles size={16} /></span>
          <div><b>Docs Helper</b><small>{page ? `About: ${page.title}` : "Answers from these docs only"}</small></div>
          {helper.messages.length > 0 && <button type="button" className="dxh-clear" onClick={helper.reset}>Clear</button>}
          <button type="button" className="dx-icon" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </header>
        <div className="dxh-body"><HelperThread helper={helper} suggestions={suggestions} onAsk={send} onOpen={(id, a) => { onOpen(id, a); if (!wide) onClose(); }} /></div>
        <form className="dxh-form" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <input ref={input} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about the docs" aria-label="Ask the Docs Helper" enterKeyHint="send" />
          <button type="submit" disabled={!text.trim() || helper.busy} aria-label="Send"><Send size={16} /></button>
        </form>
      </section>
    </div>
  );
  return wide ? body : createPortal(body, document.body);
}
