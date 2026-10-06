import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Camera,
  Check,
  Globe2,
  ImagePlus,
  LibraryBig,
  ListChecks,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { apiFetch } from "../api.js";
import "./BookSearchFlow.css";

const STEPS = ["Finding the book", "Getting author details", "Fetching chapters", "Adding to your library"];
const STEP_ICONS = [Search, UserRound, ListChecks, LibraryBig];
const MAX_PHOTOS = 6;
const IDLE_BRAVE = { available: false, candidate: "", busy: false, none: false };
const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

async function post(path, body, { retries = 4, signal } = {}) {
  const response = await apiFetch(
    path,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    },
    { retries, delayMs: 4000 },
  );
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
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable_image"));
    };
    img.src = url;
  });
}

function Avatar({ name, src, size = 44 }) {
  const initials = String(name || "?").split(/\s+/).map((word) => word[0]).slice(0, 2).join("").toUpperCase();
  return src
    ? <img className="bsf-avatar" style={{ width: size, height: size }} src={src} alt="" />
    : <span className="bsf-avatar bsf-avatar-fallback" style={{ width: size, height: size }} aria-hidden="true">{initials || <UserRound size={size / 2} />}</span>;
}

function Cover({ src, size = "md" }) {
  const [badSrc, setBad] = useState("");
  const bad = badSrc === src;
  return (
    <span className={`bsf-cover ${size}`} aria-hidden="true">
      {src && !bad
        ? <img src={src} alt="" onError={() => setBad(src)} onLoad={(event) => { if (event.currentTarget.naturalWidth < 24) setBad(src); }} />
        : <span className="bsf-cover-ph"><BookOpen size={size === "lg" ? 30 : 20} /></span>}
    </span>
  );
}

function Progress({ step, failedStep }) {
  return (
    <ol className="bsf-steps" aria-label="Progress">
      {STEPS.map((label, index) => {
        const state = failedStep === index ? "fail" : index < step ? "done" : index === step ? "active" : "idle";
        const Icon = STEP_ICONS[index];
        return (
          <li key={label} className={state} style={{ "--i": index }}>
            <span className="bsf-dot">
              <Icon size={16} className="bsf-dot-icon" />
              <Check size={16} className="bsf-dot-check" />
            </span>
            <span className="bsf-step-label">{label}</span>
            <span className="bsf-step-state">{state === "done" ? "Done" : state === "active" ? "Working" : state === "fail" ? "Failed" : ""}</span>
          </li>
        );
      })}
    </ol>
  );
}

function FinderVisual({ cover }) {
  return (
    <div className={`bsf-finder ${cover ? "found" : ""}`}>
      <span className="bsf-finder-globe" aria-hidden="true">
        <Globe2 size={64} />
      </span>
      <span className="bsf-finder-search" aria-hidden="true">
        <Search size={18} />
      </span>
      <span className="bsf-finder-spark s1" aria-hidden="true" />
      <span className="bsf-finder-spark s2" aria-hidden="true" />
      <span className="bsf-finder-spark s3" aria-hidden="true" />
      <span className="bsf-finder-cover">
        <Cover src={cover} size="lg" />
      </span>
    </div>
  );
}

function Working({ step, failed, cover, title }) {
  const pct = Math.min(100, Math.round(((step + (failed == null ? 0.5 : 0)) / STEPS.length) * 100));
  const isFinding = step === 0;
  return (
    <div className="bsf-work">
      <div className="bsf-stage">
        <span className="bsf-glow" aria-hidden="true" />
        {isFinding ? (
          <FinderVisual cover={cover} />
        ) : (
          <>
            <Cover src={cover} size="lg" />
            <span className="bsf-sparkle s1" aria-hidden="true" />
            <span className="bsf-sparkle s2" aria-hidden="true" />
            <span className="bsf-sparkle s3" aria-hidden="true" />
          </>
        )}
      </div>
      {title && <p className="bsf-work-title">{title}</p>}
      <div className="bsf-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><span style={{ width: `${pct}%` }} /></div>
      <Progress step={step} failedStep={failed} />
    </div>
  );
}

function defaultBook(candidate, fallbackAuthors = []) {
  return {
    ...candidate,
    authors: Array.isArray(candidate?.authors) && candidate.authors.length ? candidate.authors : fallbackAuthors,
  };
}

export default function BookSearchFlow({ initialTitle = "", findExisting, onSave, onManual, onClose }) {
  const [stage, setStage] = useState("query"); // query | results | editions | working | scan | review | duplicate | error
  const [query, setQuery] = useState(initialTitle);
  const [results, setResults] = useState([]);
  const [selectedWork, setSelectedWork] = useState(null);
  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [portrait, setPortrait] = useState("");
  const [bio, setBio] = useState("");
  const [brave, setBrave] = useState(IDLE_BRAVE);
  const [photos, setPhotos] = useState([]);
  const [step, setStep] = useState(0);
  const [failed, setFailed] = useState(null);
  const [message, setMessage] = useState("");
  const [fromScan, setFromScan] = useState(false);
  const [workingCover, setWorkingCover] = useState("");
  const alive = useRef(true);
  const lastAction = useRef(null);
  const requestRef = useRef({ id: 0, controller: null });

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      requestRef.current.controller?.abort();
    };
  }, []);

  const beginRequest = () => {
    requestRef.current.controller?.abort();
    const controller = new AbortController();
    const id = requestRef.current.id + 1;
    requestRef.current = { id, controller };
    return { id, controller };
  };
  const isCurrent = (id) => alive.current && requestRef.current.id === id;
  const clearTransientState = () => {
    setSelectedWork(null);
    setBook(null);
    setResults([]);
    setChapters([]);
    setPortrait("");
    setBio("");
    setBrave(IDLE_BRAVE);
    setPhotos([]);
    setFromScan(false);
    setMessage("");
    setWorkingCover("");
  };
  const authorName = book?.authors?.[0] || selectedWork?.authors?.[0] || "";

  async function search(event) {
    event?.preventDefault();
    const title = query.trim();
    if (title.length < 2) return;
    const { id, controller } = beginRequest();
    clearTransientState();
    setStage("working");
    setStep(0);
    setFailed(null);
    lastAction.current = () => search();
    try {
      const data = await post("/api/book-lookup/search", { title }, { signal: controller.signal });
      if (!isCurrent(id)) return;
      if (data.unavailable) throw new Error("catalogue_unavailable");
      if (!data.books?.length) {
        onManual(title, "notfound");
        return;
      }
      const firstCover = data.books[0]?.coverUrl || "";
      if (firstCover) {
        setWorkingCover(firstCover);
        await sleep(360);
        if (!isCurrent(id)) return;
      }
      setResults(data.books);
      setStage("results");
    } catch (error) {
      if (error?.name === "AbortError" || !alive.current) return;
      setFailed(0);
      setMessage("The book catalogue could not be reached. Check your connection and try again.");
      setStage("error");
    }
  }

  async function chooseWork(candidate) {
    const { id, controller } = beginRequest();
    setSelectedWork(candidate);
    setBook(null);
    setChapters([]);
    setPortrait("");
    setBio("");
    setPhotos([]);
    setFromScan(false);
    setBrave(IDLE_BRAVE);
    setMessage("");
    setFailed(null);
    setWorkingCover(candidate.coverUrl || "");
    setStage("working");
    setStep(1);
    lastAction.current = () => chooseWork(candidate);

    const primaryAuthor = candidate.authors?.[0] || "";
    let photo;
    try {
      photo = primaryAuthor ? await post("/api/book-lookup/author-photo", { authorName: primaryAuthor, bookTitle: candidate.title }, { signal: controller.signal }) : null;
    } catch (error) {
      if (error?.name === "AbortError") return;
      photo = null;
    }
    if (!isCurrent(id)) return;
    if (photo?.dataUrl) setPortrait(photo.dataUrl);
    if (photo?.bio) setBio(photo.bio);
    setBrave({ available: Boolean(photo?.braveAvailable) && !photo?.dataUrl, candidate: "", busy: false, none: false });

    setStep(2);
    try {
      const details = await post("/api/book-lookup/details", candidate, { signal: controller.signal });
      if (!isCurrent(id)) return;
      if (!details.editions?.length) {
        setMessage("I found the book, but I could not load its editions right now. Try again, or add it manually.");
        setFailed(2);
        setStage("error");
        return;
      }
      setSelectedWork({ ...candidate, editions: details.editions });
      setStage("editions");
    } catch (error) {
      if (error?.name === "AbortError" || !alive.current) return;
      setFailed(2);
      setMessage("Could not load the editions or chapter information right now.");
      setStage("error");
    }
  }

  function chooseEdition(edition) {
    const picked = defaultBook(edition, selectedWork?.authors || []);
    const existing = findExisting?.(picked.title);
    if (existing) {
      setBook(picked);
      setMessage(`"${existing.title}" is already in your library.`);
      setStage("duplicate");
      return;
    }
    setBook(picked);
    setPhotos([]);
    setFromScan(false);
    setMessage("");
    setWorkingCover(picked.coverUrl || "");
    if (picked.chapters?.length) {
      setChapters(picked.chapters);
      setStage("review");
    } else {
      setChapters([]);
      setStage("scan");
    }
  }

  async function findPhotoOnline() {
    if (!authorName || !book) return;
    setBrave((state) => ({ ...state, busy: true, none: false }));
    try {
      const data = await post("/api/book-lookup/author-photo", { authorName, bookTitle: book.title, allowBrave: true });
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
      try {
        next.push(await compressImage(file));
      } catch {
        // Skip unreadable files.
      }
    }
    if (alive.current && next.length) setPhotos((prev) => [...prev, ...next].slice(0, MAX_PHOTOS));
  }

  async function scan() {
    const { id, controller } = beginRequest();
    setStage("working");
    setStep(2);
    setFailed(null);
    lastAction.current = () => scan();
    try {
      const data = await post("/api/book-lookup/toc-scan", { images: photos }, { retries: 0, signal: controller.signal });
      if (!isCurrent(id)) return;
      if (!data.chapters?.length) {
        setMessage("I could not read any chapters from those photos. Try a clearer, well-lit photo of the contents page.");
        setStage("scan");
        return;
      }
      setChapters(data.chapters);
      setFromScan(true);
      setPhotos([]);
      setStage("review");
    } catch (error) {
      if (error?.name === "AbortError" || !alive.current) return;
      if (error.status === 429) setMessage("You have scanned a lot of pages for now. Please try again in a while, or add the book manually.");
      else if (error.status === 400) setMessage("Those photos could not be used. Add clear JPG or PNG photos of the contents page and try again.");
      else if (error.status) setMessage("The photo reader is busy right now. Please try again in a moment, or add the book manually.");
      else setMessage("Could not reach the server to read your photos. Check your connection and try again.");
      setFailed(2);
      setStage("error");
    }
  }

  const updateChapter = (index, patch) => setChapters((list) => list.map((chapter, n) => (n === index ? { ...chapter, ...patch } : chapter)));
  const removeChapter = (index) => setChapters((list) => list.filter((_, n) => n !== index));
  const addChapter = () => setChapters((list) => [...list, { number: list.length + 1, title: "", startPage: null }]);

  async function save() {
    const cleanChapters = chapters
      .map((chapter) => ({ ...chapter, title: chapter.title.trim() }))
      .filter((chapter) => chapter.title)
      .map((chapter, index) => ({ ...chapter, number: index + 1 }));
    if (!book?.title?.trim() || !cleanChapters.length) return;
    const duplicate = findExisting?.(book.title);
    if (duplicate) {
      setMessage(`"${duplicate.title}" is already in your library.`);
      setStage("duplicate");
      return;
    }
    requestRef.current.controller?.abort();
    setStage("working");
    setStep(3);
    setFailed(null);
    lastAction.current = () => save();
    try {
      await onSave({
        title: book.title.trim(),
        authorName: (book.authors || []).join(", "),
        coverUrl: book.coverUrl,
        isbn: book.primaryIsbn || "",
        portrait,
        bio,
        chapters: cleanChapters,
      });
    } catch {
      if (alive.current) {
        setFailed(3);
        setMessage("The book could not be saved. Your chapters are kept, so tap Try again.");
        setStage("error");
      }
    }
  }

  function goBack() {
    requestRef.current.controller?.abort();
    if (stage === "results") setStage("query");
    else if (stage === "editions") setStage("results");
    else if (stage === "review" || stage === "scan" || stage === "duplicate") setStage("editions");
    else setStage("query");
  }

  const author = book?.authors?.[0] || selectedWork?.authors?.[0] || "";

  return (
    <div className="bsf">
      <header className="bsf-head">
        {stage !== "query" && stage !== "working" ? (
          <button type="button" className="bsf-icon" aria-label="Back" onClick={goBack}><ArrowLeft size={18} /></button>
        ) : <span className="bsf-icon-gap" />}
        <h2>Search a book</h2>
        <button type="button" className="bsf-icon" aria-label="Close" onClick={onClose}><X size={18} /></button>
      </header>

      {stage === "query" && (
        <form className="bsf-body" onSubmit={search}>
          <p className="bsf-hint">Type the title and I will look up matching editions from public book catalogues. Only the book&apos;s details are read, never the book.</p>
          <div className="bsf-field">
            <Search size={17} aria-hidden="true" />
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Book title" aria-label="Book title" enterKeyHint="search" />
          </div>
          <div className="bsf-actions">
            <button type="button" className="icon-button ghost" onClick={() => onManual(query.trim(), "manual")}>Add manually</button>
            <button type="submit" className="primary-button" disabled={query.trim().length < 2}>Search</button>
          </div>
        </form>
      )}

      {stage === "working" && (
        <div className="bsf-body">
          <Working step={step} failed={failed} cover={workingCover || book?.coverUrl || selectedWork?.coverUrl} title={selectedWork?.title || book?.title || query.trim()} />
        </div>
      )}

      {stage === "error" && (
        <div className="bsf-body">
          <Working step={failed ?? 0} failed={failed} cover={workingCover || book?.coverUrl || selectedWork?.coverUrl} title={selectedWork?.title || book?.title || query.trim()} />
          <p className="bsf-msg err"><AlertTriangle size={16} />{message}</p>
          <div className="bsf-actions">
            <button type="button" className="icon-button ghost" onClick={() => onManual(book?.title || selectedWork?.title || query.trim(), "manual", author)}>Add manually</button>
            <button type="button" className="primary-button" onClick={() => lastAction.current?.()}>Try again</button>
          </div>
        </div>
      )}

      {stage === "results" && (
        <div className="bsf-body">
          <p className="bsf-hint">Pick the book first. I&apos;ll then load the matching editions so you can choose the right cover, publisher, year, language and chapter availability.</p>
          <ul className="bsf-results">
            {results.map((candidate, index) => (
              <li key={candidate.key} style={{ "--i": index }}>
                <button type="button" onClick={() => chooseWork(candidate)}>
                  <Cover src={candidate.coverUrl} size="sm" />
                  <span className="bsf-result-main">
                    <b>{candidate.title}</b>
                    <small>{candidate.authors.join(", ")}{candidate.year ? ` · ${candidate.year}` : ""}</small>
                    <small>{candidate.editionCount > 1 ? `${candidate.editionCount} editions` : "1 edition"}{candidate.language ? ` · ${candidate.language}` : ""}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="bsf-link" onClick={() => onManual(query.trim(), "manual")}>Not here? Add it manually</button>
        </div>
      )}

      {stage === "editions" && selectedWork && (
        <div className="bsf-body">
          <div className="bsf-book">
            <Cover src={selectedWork.coverUrl} />
            <span className="bsf-book-text">
              <b>{selectedWork.title}</b>
              <small>{selectedWork.authors.join(", ") || "Author unknown"}</small>
            </span>
          </div>
          <p className="bsf-hint">Choose the right edition. “Chapters available” means the contents page was found online; otherwise you can scan the contents page yourself next.</p>
          <ul className="bsf-results bsf-editions">
            {(selectedWork.editions || []).map((edition, index) => (
              <li key={edition.editionKey || edition.key} style={{ "--i": index }}>
                <button type="button" onClick={() => chooseEdition(edition)}>
                  <Cover src={edition.coverUrl} size="sm" />
                  <span className="bsf-result-main">
                    <b>{edition.title}</b>
                    <small>{(edition.authors || selectedWork.authors).join(", ") || "Author unknown"}</small>
                    <small>{[edition.publisher, edition.year, edition.language].filter(Boolean).join(" · ") || "Publisher or year unavailable"}</small>
                  </span>
                  <span className={`bsf-badge ${edition.tocAvailable ? "ok" : "muted"}`}>{edition.tocAvailable ? "Chapters available" : "No chapters"}</span>
                </button>
              </li>
            ))}
          </ul>
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
          <div className="bsf-book"><Cover src={book.coverUrl} /><span className="bsf-book-text"><b>{book.title}</b><small>{author || "Author unknown"}</small></span></div>
          <p className="bsf-msg"><AlertTriangle size={16} />I could not find this edition&apos;s chapters online.</p>
          <h3 className="bsf-sub">Upload the book&apos;s contents page</h3>
          <p className="bsf-hint">Take a clear photo of the contents page. If it spans more pages, add them all (up to {MAX_PHOTOS}). Photos are read once and not stored.</p>
          {message && <p className="bsf-msg err"><AlertTriangle size={16} />{message}</p>}
          <div className="bsf-thumbs">
            {photos.map((photo, index) => (
              <span key={index} className="bsf-thumb"><img src={photo} alt={`Contents page ${index + 1}`} /><button type="button" aria-label="Remove photo" onClick={() => setPhotos((list) => list.filter((_, n) => n !== index))}><X size={12} /></button></span>
            ))}
            {photos.length < MAX_PHOTOS && (
              <label className="bsf-add"><ImagePlus size={20} /><span>Add photo</span>
                <input type="file" accept="image/*" multiple capture="environment" hidden onChange={(event) => { addPhotos(event.target.files); event.target.value = ""; }} />
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
            <Cover src={book.coverUrl} />
            <span className="bsf-book-text">
              <input className="bsf-title" value={book.title} onChange={(event) => setBook({ ...book, title: event.target.value })} aria-label="Book title" />
              <small className="bsf-by"><Avatar name={author} src={portrait || brave.candidate} size={20} />{author || "Author unknown"}</small>
              {!!book.primaryIsbn && <small className="bsf-isbn">ISBN {book.primaryIsbn}</small>}
            </span>
          </div>
          {brave.available && <button type="button" className="bsf-link" disabled={brave.busy} onClick={findPhotoOnline}>{brave.busy ? "Searching the web…" : "No photo found. Search the web for one?"}</button>}
          {brave.candidate && (
            <div className="bsf-confirm">
              <img src={brave.candidate} alt="Possible author photo" />
              <span>Is this {author}?</span>
              <button type="button" className="icon-button ghost" onClick={() => setBrave(IDLE_BRAVE)}>No</button>
              <button type="button" className="primary-button" onClick={() => { setPortrait(brave.candidate); setBrave(IDLE_BRAVE); }}>Yes, use it</button>
            </div>
          )}
          {brave.none && <p className="bsf-hint">No confident match found, so a simple avatar will be used.</p>}
          <h3 className="bsf-sub">{fromScan ? "Read from your photos. Please check" : "Chapters"} ({chapters.length})</h3>
          <ul className="bsf-chapters">
            {chapters.map((chapter, index) => (
              <li key={index}>
                <span className="bsf-num">{index + 1}</span>
                <input value={chapter.title} onChange={(event) => updateChapter(index, { title: event.target.value })} aria-label={`Chapter ${index + 1} title`} />
                <input className="bsf-page" inputMode="numeric" placeholder="Page" value={chapter.startPage ?? ""} onChange={(event) => updateChapter(index, { startPage: event.target.value.replace(/\D/g, "") ? Number(event.target.value.replace(/\D/g, "")) : null })} aria-label={`Chapter ${index + 1} start page (optional)`} />
                <button type="button" aria-label="Remove chapter" onClick={() => removeChapter(index)}><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>
          <button type="button" className="bsf-link" onClick={addChapter}><Plus size={14} /> Add a chapter</button>
          <div className="bsf-actions">
            <button type="button" className="icon-button ghost" onClick={onClose}>Cancel</button>
            <button type="button" className="primary-button" disabled={!book.title.trim() || !chapters.some((chapter) => chapter.title.trim())} onClick={save}>Add to library</button>
          </div>
        </div>
      )}
    </div>
  );
}
