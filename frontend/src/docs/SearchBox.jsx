import { useEffect, useState } from "react";
import { Search, Sparkles } from "lucide-react";

const HINTS = [
  "How do I roll back a bad deploy?",
  "Where is the Groq key set?",
  "Why did push notifications stop?",
  "What changed in 2.1.0?",
  "How does the AI fallback work?",
  "Renew the domain",
];

// The signature element of the docs: search, with the single "Ask AI" entry point beside it.
export default function SearchBox({ onOpen, onAsk, variant = "hero" }) {
  const [hint, setHint] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setHint((h) => (h + 1) % HINTS.length), 3200);
    return () => clearInterval(t);
  }, []);
  const open = (event) => {
    const r = event.currentTarget.getBoundingClientRect();
    onOpen({ origin: { x: r.left + r.width / 2, y: r.top + r.height / 2 } });
  };
  return (
    <div className={`dxs dxs-${variant}`}>
      <span className="dxs-glow" aria-hidden="true" />
      <button type="button" className="dxs-main" onClick={open} aria-label="Search the docs">
        <Search size={variant === "hero" ? 20 : 17} aria-hidden="true" />
        <span className="dxs-hint" key={hint}>{HINTS[hint]}</span>
        <kbd aria-hidden="true">/</kbd>
      </button>
      <button type="button" className="dxs-ask" onClick={() => onAsk()} aria-label="Ask the Docs Helper">
        <Sparkles size={15} aria-hidden="true" /><span>Ask AI</span>
      </button>
    </div>
  );
}
