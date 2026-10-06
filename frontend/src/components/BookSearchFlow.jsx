import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, BookOpen, Camera, Check, ImagePlus, Loader2, Plus, Search, Trash2, UserRound, X } from "lucide-react";
import { apiFetch } from "../api.js";
import "./BookSearchFlow.css";

const STEPS = ["Finding the book", "Fetching chapters", "Getting author details", "Adding to your library"];
const MAX_PHOTOS = 6;


async function post(path, body) {
  const response = await apiFetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, { retries: 4, delayMs: 4000 });
  if (!response.ok) throw Object.assign(new Error(`HTTP ${response.status}`), { status: response.status });
  return response.json();
}

// Phone photos are large: shrink and re-encode before upload. The result only lives in memory.
function compressImage(file, maxSide = 1280, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("unreadable_image")); };
    img.src = url;
  });
}

function Avatar({ name, src, size = 44 }) {
  const initials = String(name || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return src
    ? <img className="bsf-avatar" style={{ width: size, height: size }} src={src} alt="" />
    : <span className="bsf-avatar bsf-avatar-fallback" style={{ width: size, height: size }} aria-hidden="true">{initials || <UserRound size={size / 2} />}</span>;
}

function Progress({ step, failedStep }) {
  return (
    <ol className="bsf-steps" aria-label="Progress">
      {STEPS.map((label, i) => {
        const state = failedStep === i ? "fail" : i < step ? "done" : i === step ? "active" : "idle";
        return (
          <li key={label} className={state} style={{ "--i": i }}>
            <span className="bsf-dot">{state === "done" ? <Check size={14} /> : state === "active" ? <Loader2 size={14} className="spin" /> : state === "fail" ? <X size={14} /> : null}</span>
            <span>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function BookSearchFlow({ initialTitle = "", findExisting, onSave, onManual, onClose }) {
  const [stage, setStage] = useState("query"); // query | results | working | scan | review | error
  const [query, setQuery] = useState(initialTitle);
  const [results, setResults] = useState([]);
  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [portrait, setPortrait] = useState("");
  const [bio, setBio] = useState("");
  const [brave, setBrave] = useState({ available: false, candidate: "", busy: false });
  const [photos, setPhotos] = useState([]);
  const [step, setStep] = useState(0);
  const [failed, setFailed] = useState(null);
  const [message, setMessage] = useState("");
  const [fromScan, setFromScan] = useState(false);
  const alive = useRef(true);
  const lastAction = useRef(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  async function search(event) {
    event?.preventDefault();
    const title = query.trim();
    if (title.length < 2) return;
    setStage("working"); setStep(0); setFailed(null);
    lastAction.current = () => search();
    try {
      const data = await post("/api/book-lookup/search", { title });
      if (!alive.current) return;
      if (data.unavailable) throw new Error("catalogue_unavailable");
      if (!data.books?.length) { onManual(title, "notfound"); return; }
      setResults(data.books);
      setStage("results");
    } catch {
      if (alive.current) { setFailed(0); setMessage("The book catalogue could not be reached. Check your connection and try again."); setStage("error"); }
    }
  }

  async function choose(candidate) {
    setBook(candidate); setChapters([]); setPortrait(""); setBio(""); setPhotos([]); setFromScan(false);
    setBrave({ available: false, candidate: "", busy: false });
    const existing = findExisting?.(candidate.title);
    if (existing) { setMessage(`"${existing.title}" is already in your library.`); setStage("duplicate"); return; }
    setStage("working"); setStep(1); setFailed(null);
    lastAction.current = () => choose(candidate);
    const author = candidate.authors[0] || "";
    const photoJob = author ? post("/api/book-lookup/author-photo", { authorName: author, bookTitle: candidate.title }).catch(() => null) : Promise.resolve(null);
    let toc;
    try {
      toc = await post("/api/book-lookup/toc", { isbns: candidate.isbns });
    } catch {
      if (alive.current) { setFailed(1); setMessage("Could not look up the chapters right now."); setStage("error"); }
      return;
    }
    if (!alive.current) return;
    setStep(2);
    const photo = await photoJob;
    if (!alive.current) return;
    if (photo?.dataUrl) setPortrait(photo.dataUrl);
    if (photo?.bio) setBio(photo.bio);
    setBrave({ available: Boolean(photo?.braveAvailable) && !photo?.dataUrl, candidate: "", busy: false });
    if (toc.chapters?.length) { setChapters(toc.chapters); setStage("review"); }
    else setStage("scan");
  }

  async function findPhotoOnline() {
    const author = book?.authors[0];
    if (!author) return;
    setBrave((b) => ({ ...b, busy: true }));
    try {
      const data = await post("/api/book-lookup/author-photo", { authorName: author, bookTitle: book.title, allowBrave: true });
      if (!alive.current) return;
      setBrave({ available: false, candidate: data?.dataUrl || "", busy: false, none: !data?.dataUrl });
    } catch {
      if (alive.current) setBrave({ available: false, candidate: "", busy: false, none: true });
    }
  }

  async function addPhotos(fileList) {
    const files = [...fileList].slice(0, MAX_PHOTOS - photos.length);
    const next = [];
    for (const file of files) {
      try { next.push(await compressImage(file)); } catch { /* skip unreadable file */ }
    }
    if (alive.current && next.length) setPhotos((prev) => [...prev, ...next].slice(0, MAX_PHOTOS));
  }

  async function scan() {
    setStage("working"); setStep(1); setFailed(null);
    lastAction.current = () => scan();
    try {
      const data = await post("/api/book-lookup/toc-scan", { images: photos });
      if (!alive.current) return;
      if (!data.chapters?.length) { setMessage("I could not read any chapters from those photos. Try a clearer, well-lit photo of the contents page."); setStage("scan"); return; }
      setChapters(data.chapters); setFromScan(true); setPhotos([]); setStage("review");
    } catch (error) {
      if (!alive.current) return;
      if (error.status === 429) setMessage("You have scanned a lot of pages for now. Please try again in a while, or add the book manually.");
      else setMessage("Reading the photos failed. Try again.");
      setFailed(1); setStage("error");
    }
  }

  const updateChapter = (i, patch) => setChapters((list) => list.map((c, n) => (n === i ? { ...c, ...patch } : c)));
  const removeChapter = (i) => setChapters((list) => list.filter((_, n) => n !== i));
  const addChapter = () => setChapters((list) => [...list, { number: list.length + 1, title: "", startPage: null }]);

  function save() {
    const clean = chapters.map((c) => ({ ...c, title: c.title.trim() })).filter((c) => c.title).map((c, i) => ({ ...c, number: i + 1 }));
    if (!book.title.trim() || !clean.length) return;
    const duplicate = findExisting?.(book.title);
    if (duplicate) { setMessage(`"${duplicate.title}" is already in your library.`); setStage("duplicate"); return; }
    setStage("working"); setStep(3); setFailed(null);
    window.setTimeout(() => onSave({ title: book.title.trim(), authorName: book.authors.join(", "), coverUrl: book.coverUrl, portrait, bio, chapters: clean }), 450);
  }

  const author = book?.authors[0] || "";

  return (
    <div className="bsf">
      <header className="bsf-head">
        {stage !== "query" && stage !== "working" ? (
          <button type="button" className="bsf-icon" aria-label="Back" onClick={() => setStage(stage === "results" ? "query" : stage === "review" || stage === "scan" || stage === "duplicate" ? "results" : "query")}><ArrowLeft size={18} /></button>
        ) : <span className="bsf-icon-gap" />}
        <h2>Search a book</h2>
        <button type="button" className="bsf-icon" aria-label="Close" onClick={onClose}><X size={18} /></button>
      </header>

      {stage === "query" && (
        <form className="bsf-body" onSubmit={search}>
          <p className="bsf-hint">Type the title and I will look up the author and chapters from public book catalogues. Only the book's details are read, never the book.</p>
          <div className="bsf-field">
            <Search size={17} aria-hidden="true" />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Book title" aria-label="Book title" enterKeyHint="search" />
          </div>
          <div className="bsf-actions">
            <button type="button" className="icon-button ghost" onClick={() => onManual(query.trim(), "manual")}>Add manually</button>
            <button type="submit" className="primary-button" disabled={query.trim().length < 2}>Search</button>
          </div>
        </form>
      )}

      {stage === "working" && (
        <div className="bsf-body">
          <div className="bsf-orb" aria-hidden="true"><BookOpen size={26} /></div>
          <Progress step={step} failedStep={failed} />
        </div>
      )}

      {stage === "error" && (
        <div className="bsf-body">
          <Progress step={failed ?? 0} failedStep={failed} />
          <p className="bsf-msg err"><AlertTriangle size={16} />{message}</p>
          <div className="bsf-actions">
            <button type="button" className="icon-button ghost" onClick={() => onManual(book?.title || query.trim(), "manual")}>Add manually</button>
            <button type="button" className="primary-button" onClick={() => lastAction.current?.()}>Try again</button>
          </div>
        </div>
      )}

      {stage === "results" && (
        <div className="bsf-body">
          <p className="bsf-hint">Pick your book.</p>
          <ul className="bsf-results">
            {results.map((b, i) => (
              <li key={b.key} style={{ "--i": i }}>
                <button type="button" onClick={() => choose(b)}>
                  {b.coverUrl ? <img src={b.coverUrl} alt="" loading="lazy" /> : <span className="bsf-nocover"><BookOpen size={18} /></span>}
                  <span><b>{b.title}</b><small>{b.authors.join(", ")}{b.year ? ` · ${b.year}` : ""}</small></span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="bsf-link" onClick={() => onManual(query.trim(), "manual")}>Not here? Add it manually</button>
        </div>
      )}

      {stage === "duplicate" && (
        <div className="bsf-body">
          <p className="bsf-msg"><Check size={16} />{message}</p>
          <div className="bsf-actions"><button type="button" className="primary-button" onClick={onClose}>OK</button></div>
        </div>
      )}

      {stage === "scan" && book && (
        <div className="bsf-body">
          <div className="bsf-book"><Avatar name={author} src={portrait} /><span><b>{book.title}</b><small>{author}</small></span></div>
          <p className="bsf-msg"><AlertTriangle size={16} />I could not find this book's chapters online.</p>
          <h3 className="bsf-sub">Upload the book's contents page</h3>
          <p className="bsf-hint">Take a clear photo of the contents page. If it spans more pages, add them all (up to {MAX_PHOTOS}). Photos are read once and not stored.</p>
          {message && <p className="bsf-msg err"><AlertTriangle size={16} />{message}</p>}
          <div className="bsf-thumbs">
            {photos.map((p, i) => (
              <span key={i} className="bsf-thumb"><img src={p} alt={`Contents page ${i + 1}`} /><button type="button" aria-label="Remove photo" onClick={() => setPhotos((l) => l.filter((_, n) => n !== i))}><X size={12} /></button></span>
            ))}
            {photos.length < MAX_PHOTOS && (
              <label className="bsf-add"><ImagePlus size={20} /><span>Add photo</span>
                <input type="file" accept="image/*" multiple capture="environment" hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
              </label>
            )}
          </div>
          <div className="bsf-actions">
            <button type="button" className="icon-button ghost" onClick={() => onManual(book.title, "manual", author)}>Add manually</button>
            <button type="button" className="primary-button" disabled={!photos.length} onClick={scan}><Camera size={15} /> Read contents</button>
          </div>
        </div>
      )}

      {stage === "review" && book && (
        <div className="bsf-body">
          <div className="bsf-book">
            <Avatar name={author} src={portrait || brave.candidate} />
            <span>
              <input className="bsf-title" value={book.title} onChange={(e) => setBook({ ...book, title: e.target.value })} aria-label="Book title" />
              <small>{author}</small>
            </span>
          </div>
          {brave.available && <button type="button" className="bsf-link" disabled={brave.busy} onClick={findPhotoOnline}>{brave.busy ? "Searching the web…" : "No photo found. Search the web for one?"}</button>}
          {brave.candidate && (
            <div className="bsf-confirm">
              <img src={brave.candidate} alt="Possible author photo" />
              <span>Is this {author}?</span>
              <button type="button" className="icon-button ghost" onClick={() => setBrave({ available: false, candidate: "", busy: false })}>No</button>
              <button type="button" className="primary-button" onClick={() => { setPortrait(brave.candidate); setBrave({ available: false, candidate: "", busy: false }); }}>Yes, use it</button>
            </div>
          )}
          {brave.none && <p className="bsf-hint">No confident match found, so a simple avatar will be used.</p>}
          <h3 className="bsf-sub">{fromScan ? "Read from your photos. Please check" : "Chapters"} ({chapters.length})</h3>
          <ul className="bsf-chapters">
            {chapters.map((c, i) => (
              <li key={i}>
                <span className="bsf-num">{i + 1}</span>
                <input value={c.title} onChange={(e) => updateChapter(i, { title: e.target.value })} aria-label={`Chapter ${i + 1} title`} />
                <input className="bsf-page" inputMode="numeric" placeholder="Page" value={c.startPage ?? ""} onChange={(e) => updateChapter(i, { startPage: e.target.value.replace(/\D/g, "") ? Number(e.target.value.replace(/\D/g, "")) : null })} aria-label={`Chapter ${i + 1} start page (optional)`} />
                <button type="button" aria-label="Remove chapter" onClick={() => removeChapter(i)}><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>
          <button type="button" className="bsf-link" onClick={addChapter}><Plus size={14} /> Add a chapter</button>
          <div className="bsf-actions">
            <button type="button" className="icon-button ghost" onClick={onClose}>Cancel</button>
            <button type="button" className="primary-button" disabled={!book.title.trim() || !chapters.some((c) => c.title.trim())} onClick={save}>Add to library</button>
          </div>
        </div>
      )}
    </div>
  );
}
