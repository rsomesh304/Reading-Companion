import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { toPng } from "html-to-image";
import { Check, ChevronUp, Download, Share2, X as XIcon } from "lucide-react";
import "@fontsource/playfair-display/500.css";
import "@fontsource/playfair-display/600.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "./GemStoryCard.css";

const W = 1080;
const H = 1920;

const STYLES = [
  { id: "noir", label: "Noir", swatch: "linear-gradient(135deg,#f2c48d,#1a1410)" },
  { id: "aurora", label: "Aurora", swatch: "linear-gradient(135deg,#8B5CF6,#22D3EE)" },
  { id: "sunset", label: "Sunset", swatch: "linear-gradient(135deg,#fb923c,#e11d48)" },
  { id: "ocean", label: "Ocean", swatch: "linear-gradient(135deg,#22d3ee,#1d4ed8)" },
  { id: "forest", label: "Forest", swatch: "linear-gradient(135deg,#86efac,#047857)" },
  { id: "rose", label: "Rose", swatch: "linear-gradient(135deg,#fda4af,#7c3aed)" },
  { id: "mono", label: "Mono", swatch: "linear-gradient(135deg,#ffffff,#111111)" },
  { id: "vintage", label: "Vintage", swatch: "linear-gradient(135deg,#e7c9a0,#6b4423)" },
  { id: "neon", label: "Neon", swatch: "linear-gradient(135deg,#e879f9,#22d3ee)" },
];

function quoteSize(len) {
  if (len < 60) return 92;
  if (len < 110) return 80;
  if (len < 180) return 68;
  if (len < 260) return 58;
  return 50;
}

export default function GemStoryCard({ gem, author, onClose }) {
  const cardRef = useRef(null);
  const [styleId, setStyleId] = useState("noir");
  const [menuOpen, setMenuOpen] = useState(false);
  const cur = STYLES.find((s) => s.id === styleId) || STYLES[0];
  const [scale, setScale] = useState(0.3);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const quote = String(gem?.quote || "").trim();
  const img = gem?.sketch && typeof gem.sketch === "object" ? gem.sketch.dataUrl : null;
  const hasChapter = Number.isFinite(Number(gem?.chapterNumber));
  const fileName = `${(gem?.bookTitle || "gem").replace(/\s+/g, "-").toLowerCase()}-story.png`;

  // fit the 1080x1920 card into the phone screen
  useEffect(() => {
    const fit = () => {
      const w = window.innerWidth - 32;
      const h = window.innerHeight - 150;
      setScale(Math.max(0.1, Math.min(w / W, h / H)));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  function flash(text) {
    setMsg(text);
    setTimeout(() => setMsg(""), 2200);
  }

  async function render() {
    await document.fonts.load('500 80px "Playfair Display"');
    await document.fonts.load('600 26px "Inter"');
    await document.fonts.ready;
    const base = { width: W, height: H, cacheBust: true, backgroundColor: "#07070b" };
    let last;
    for (const pixelRatio of [2, 1]) {
      try {
        const opts = { ...base, pixelRatio };
        await toPng(cardRef.current, opts); // warm-up: loads images and fonts
        return await toPng(cardRef.current, opts);
      } catch (e) { last = e; }
    }
    throw last;
  }

  function saveFile(url) {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
  }

  async function download() {
    setBusy(true);
    try { saveFile(await render()); flash("Saved to your device"); }
    catch { flash("Could not create the image"); }
    finally { setBusy(false); }
  }

  async function share() {
    setBusy(true);
    try {
      const url = await render();
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: gem?.bookTitle || "Gem" });
      else { saveFile(url); flash("Sharing not supported here - saved instead"); }
    } catch (e) {
      if (e?.name !== "AbortError") flash("Could not create the image");
    } finally { setBusy(false); }
  }

  return createPortal(
    <Motion.div className="gsc-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
      <div className="gsc-stage" style={{ width: W * scale, height: H * scale }}>
        <div className="gsc-scale" style={{ transform: `scale(${scale})` }}>
          {/* ===== the card that gets exported (1080 x 1920) ===== */}
          <div className={`gsc-card ${styleId}`} ref={cardRef}>
            {img ? <img className="gsc-img" src={img} alt="" /> : <div className="gsc-img gsc-fallback" />}
            <div className="gsc-shade" />
            <div className="gsc-mesh" />
            <div className="gsc-frame" />

            <div className="gsc-content">
              <header className="gsc-top">
                <div className="gsc-kicker"><span className="gsc-dot" />Reading Companion</div>
                <h2>{gem?.bookTitle || "A saved gem"}</h2>
                {author && author !== "Author unknown" && <p>{author}</p>}
              </header>

              <footer className="gsc-bottom">
                <div className="gsc-mark">“</div>
                <blockquote style={{ fontSize: quoteSize(quote.length) }}>{quote}</blockquote>
                <div className="gsc-rule" />
                <div className="gsc-by">
                  {hasChapter && <span>Chapter {gem.chapterNumber}</span>}
                  <span>Saved gem</span>
                </div>
              </footer>
            </div>
          </div>
        </div>
      </div>

      {msg && <div className="gsc-toast">{msg}</div>}

            <Motion.div
        className="gsc-dock"
        initial={{ y: 90, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 24, delay: 0.15 }}
      >
        <div className="gsc-menu-wrap">
          <AnimatePresence>
            {menuOpen && (
              <Motion.div className="gsc-menu"
                initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.96 }} transition={{ duration: 0.18 }}>
                {STYLES.map((s) => (
                  <button key={s.id} className={`gsc-opt ${s.id === styleId ? "on" : ""}`}
                    onClick={() => { setStyleId(s.id); setMenuOpen(false); }}>
                    <span className="gsc-swatch" style={{ background: s.swatch }} />
                    <span className="gsc-opt-label">{s.label}</span>
                    {s.id === styleId && <Check size={15} />}
                  </button>
                ))}
              </Motion.div>
            )}
          </AnimatePresence>
          <button className="gsc-btn" onClick={() => setMenuOpen((o) => !o)}>
            <span className="gsc-swatch" style={{ background: cur.swatch }} />
            <span>{cur.label}</span>
            <ChevronUp size={15} style={{ transform: menuOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
          </button>
        </div>
        <button className="gsc-btn icon" onClick={share} disabled={busy} aria-label="Share"><Share2 size={18} /></button>
        <button className="gsc-btn primary" onClick={download} disabled={busy}>
          <Download size={18} /><span>{busy ? "Saving…" : "Download"}</span>
        </button>
        <button className="gsc-btn icon" onClick={onClose} aria-label="Close"><XIcon size={18} /></button>
      </Motion.div>
    </Motion.div>,
    document.body
  );
}