import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Send, Sparkles } from "lucide-react";
import { useBackLayer } from "../backStack.js";
import { useViewport } from "./viewport.js";
import HelperThread from "./HelperThread.jsx";
import { HELPER_SUGGESTIONS } from "./helper.js";

// Full chat page for the Docs Helper. The composer sits at the bottom and follows the keyboard.
export default function ChatPage({ theme, helper, page, onOpen, onClose }) {
  const [text, setText] = useState("");
  const vp = useViewport();
  const bodyRef = useRef(null);
  useBackLayer(true, onClose);
  useEffect(() => { bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" }); }, [helper.messages.length, helper.busy]);

  const send = (value) => {
    const v = (value ?? text).trim();
    if (!v || helper.busy) return;
    setText("");
    helper.ask(v, page?.id || "");
  };
  const suggestions = page ? [`Summarise “${page.title}”`, `What should I know before changing anything in “${page.title}”?`, ...HELPER_SUGGESTIONS.slice(0, 1)] : HELPER_SUGGESTIONS;

  return createPortal(
    <div className="dxc" data-dx-theme={theme} style={{ top: vp.top, height: vp.h }} role="dialog" aria-label="Docs Helper chat">
      <header className="dxc-head">
        <button type="button" className="dx-icon" onClick={onClose} aria-label="Back"><ArrowLeft size={18} /></button>
        <span className="dxh-orb"><Sparkles size={16} /></span>
        <div><b>Docs Helper</b><small>{page ? `About: ${page.title}` : "Answers from these docs only"}</small></div>
        {helper.messages.length > 0 && <button type="button" className="dxh-clear" onClick={helper.reset}>Clear</button>}
      </header>
      <div className="dxc-body" ref={bodyRef}>
        <div className="dxc-inner"><HelperThread helper={helper} suggestions={suggestions} onAsk={send} onOpen={onOpen} /></div>
      </div>
      <form className="dxc-form" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <div className="dxc-inner">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about the docs" aria-label="Ask the Docs Helper" enterKeyHint="send" autoComplete="off" />
          <button type="submit" disabled={!text.trim() || helper.busy} aria-label="Send"><Send size={16} /></button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
