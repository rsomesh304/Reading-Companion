import { RotateCw, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import "./DeveloperCard.css";

const DEVELOPER = {
  name: "Soumyaranjan Rout",
  line: "Data Engineer at Accenture, design-curious builder",
};

const BUILD_NOTES = [
  ["Human", "Idea, product decisions, design direction and every test run came from Soumyaranjan."],
  ["Code", "GitHub Copilot (agent mode in VS Code) wrote and reviewed code under his direction."],
  ["Voice", "Google Gemini Live powers the voice companion; Gemini writes summaries and scenes."],
  ["Art", "Cloudflare Workers AI (FLUX) paints the gem illustrations."],
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Collectible card: holographic foil follows touch or device tilt, tap flips it to the build story.
export default function DeveloperCard({ compact = false }) {
  const cardRef = useRef(null);
  const frame = useRef(0);
  const touching = useRef(false);
  const [flipped, setFlipped] = useState(false);
  const [flipping, setFlipping] = useState(false);

  function setTilt(x, y) {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const el = cardRef.current;
      if (!el) return;
      el.style.setProperty("--rx", `${((0.5 - y) * 18).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${((x - 0.5) * 18).toFixed(2)}deg`);
      el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
      el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
      el.style.setProperty("--glow", "1");
    });
  }
  function resetTilt() {
    touching.current = false;
    cancelAnimationFrame(frame.current);
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--mx", "50%");
    el.style.setProperty("--my", "50%");
    el.style.setProperty("--glow", "0");
  }
  function onPointerMove(event) {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    touching.current = true;
    setTilt(clamp((event.clientX - rect.left) / rect.width, 0, 1), clamp((event.clientY - rect.top) / rect.height, 0, 1));
  }

  useEffect(() => {
    const onTilt = (event) => {
      if (touching.current || event.gamma == null || event.beta == null) return;
      setTilt(clamp(0.5 + event.gamma / 60, 0, 1), clamp(0.5 + (event.beta - 45) / 60, 0, 1));
    };
    window.addEventListener("deviceorientation", onTilt);
    return () => {
      window.removeEventListener("deviceorientation", onTilt);
      cancelAnimationFrame(frame.current);
    };
  }, []);

  function flip() {
    setFlipping(true);
    setFlipped((value) => !value);
    setTimeout(() => setFlipping(false), 850);
  }

  return (
    <div className={`dc-scene ${compact ? "compact" : ""}`}>
      <div
        ref={cardRef}
        className={`dc-card ${flipped ? "flipped" : ""} ${flipping ? "flipping" : ""}`}
        role="button"
        tabIndex={0}
        aria-label="Developer card. Tap to flip."
        onClick={flip}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } }}
        onPointerMove={onPointerMove}
        onPointerLeave={resetTilt}
        onPointerCancel={resetTilt}
        onPointerUp={(e) => { if (e.pointerType !== "mouse") resetTilt(); }}
      >
        <div className="dc-face dc-front">
          <div className="dc-holo" aria-hidden="true" />
          <div className="dc-sheen" aria-hidden="true" />
          <div className="dc-glare" aria-hidden="true" />
          <div className="dc-top"><span>Creator edition</span><span>No. 001</span></div>
          <div className="dc-ava-wrap">
            <div className="dc-ava-ring"><div className="dc-ava">
              <b>S</b>
              <img src="/developer.jpg" alt="" draggable="false" onError={(e) => { e.currentTarget.style.display = "none"; }} />
            </div></div>
          </div>
          <h3 className="dc-name">{DEVELOPER.name}</h3>
          <p className="dc-line">{DEVELOPER.line}</p>
          <div className="dc-ai"><Sparkles size={compact ? 10 : 13} /><span>Built with AI. Directed by a human.</span></div>
          <div className="dc-hint"><RotateCw size={compact ? 10 : 12} /> Tap to flip</div>
        </div>

        <div className="dc-face dc-back">
          <div className="dc-holo" aria-hidden="true" />
          <div className="dc-sheen" aria-hidden="true" />
          <div className="dc-top"><span>How it was built</span><span>AI + human</span></div>
          <ul className="dc-notes">
            {BUILD_NOTES.map(([tag, text]) => (
              <li key={tag}><b>{tag}</b><span>{text}</span></li>
            ))}
          </ul>
          <div className="dc-hint"><RotateCw size={compact ? 10 : 12} /> Tap to flip back</div>
        </div>
      </div>
    </div>
  );
}
