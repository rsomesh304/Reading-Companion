const OPENER_KEY = "reading_companion_openers";
const OPENING_ANGLES = [
  "a quick warm hello and one light question about where they want to pick up",
  "a playful remark about the time of day, then ask what they're diving into",
  "a short encouraging line about coming back to the book",
  "a curious one-liner about what part of the story is on their mind",
  "a calm chai-time hello with no question at all",
  "a tiny joke about books or vocabulary, then wait",
  "a simple 'main sun raha hoon, bolo' style ready-to-listen line",
];
function getRecentOpeners() { try { return JSON.parse(localStorage.getItem(OPENER_KEY) || "[]"); } catch { return []; } }
function saveOpener(text) {
  try { localStorage.setItem(OPENER_KEY, JSON.stringify([...getRecentOpeners(), text.slice(0, 160)].slice(-8))); } catch { /* ignore */ }
}
function buildOpeningNote(cont) {
  const hour = new Date().getHours();
  const period = hour < 5 ? "late night" : hour < 12 ? "morning" : hour < 17 ? "afternoon" : hour < 21 ? "evening" : "night";
  let angle = OPENING_ANGLES[Math.floor(Math.random() * OPENING_ANGLES.length)];
  if (cont && cont.minutesAgo < 45) {
    angle = `the reader only stepped away about ${Math.max(1, Math.round(cont.minutesAgo))} minutes ago and is back in the SAME sitting. Say a natural 'wapas aa gaye? chalo wahin se' style line (you may mention chapter ${cont.chapter}). Do NOT say Namaste and do NOT ask what they will read today`;
  } else if (cont && cont.minutesAgo < 720) {
    angle = `the reader is back later the same day; their last session ended ${describeTimeGap(cont.endedAt)} on chapter ${cont.chapter}. Welcome them back warmly and mention where they stopped. Do not ask what they will read today`;
  } else if (cont) {
    angle = `the reader last read ${describeTimeGap(cont.endedAt)}, stopping at chapter ${cont.chapter}. Greet them freshly and gently mention where they left off`;
  }
  const recent = getRecentOpeners();
  return `[SYSTEM NOTE] The mic is live. Say ONE short opening line in Hinglish (under 18 words). Angle: ${angle}. It is ${period} in India. ` +
    (recent.length ? `Your recent openings were: ${recent.map((r) => `"${r}"`).join("; ")}. Do NOT reuse or closely paraphrase any of them. ` : "") +
    "Then stay quiet and listen.";
}
import { AnimatePresence, motion as Motion } from "framer-motion";
import {
    AlertTriangle,
    BookOpen,
    Brain,
    Bug,
    Camera as CameraIcon,
    CameraOff,
    Check,
    ChevronRight,
    Clock,
    Download,
    Flame,
    Gem,
    Home,
    Image as ImageIcon,
    Info,
    Library as LibraryIcon,
    Lock,
    MessageSquareText,
    Mic,
    MicOff,
    Moon,
    Network,
    Pencil,
    PhoneOff,
    Play,
    Plus,
    RefreshCw,
    Search,
    Settings as SettingsIcon,
    // Sun,
    Trash2,
    TrendingDown,
    TrendingUp,
    // Upload,
    User,
    Volume2,
    X as XIcon
} from "lucide-react";
import { Component, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { apiUrl } from "./api.js";
import { computeBadges } from "./appBadges.js";
import { AudioCapture } from "./audioCapture.js";
import { AudioPlayback } from "./audioPlayback.js";
import { CameraCapture } from "./cameraCapture.js";
import MascotCharacter from "./components/MascotCharacter.jsx";
import { GeminiLiveClient } from "./geminiLiveClient.js";
import { Gems } from "./gems.js";
import GemStoryCard from "./GemStoryCard.jsx";
import JourneyRecap from "./JourneyRecap.jsx";
import { Library } from "./library.js";
import { makeLocalLine, useMascotLine } from "./mascotLines.js";
import { getMascot, setMascot } from "./mascotPreference.js";
import { CompanionMemory } from "./memory.js";
import MemoryConstellation from "./MemoryConstellation.jsx";
import { INTERACTION_SPRING } from "./motionConfig.js";
import { notify } from "./notify.js";
import { MASCOT_VOICE_PROMPT, useGeminiVoiceDriver } from "./onboarding/avatarDriver.js";
import EmberOrb from "./onboarding/EmberOrb.jsx";
import Onboarding from "./onboarding/Onboarding.jsx";
import {
    CLOSE_CAMERA_TRIGGER,
    COMPLETE_CHAPTER_DECLARATION,
    DELETE_GEM_DECLARATION,
    DELETE_MEMORY_DECLARATION,
    DELETE_VOCABULARY_DECLARATION,
    END_SESSION_TRIGGER,
    EXPLICIT_MEMORY_TRIGGER,
    GET_READING_STATUS_DECLARATION,
    GET_SESSION_ACTIVITY_DECLARATION,
    LIST_SAVED_ITEMS_DECLARATION,
    LOG_VOCABULARY_DECLARATION,
    OPEN_CAMERA_TRIGGER,
    READER_PROFILE,
    RENAME_CHAPTER_DECLARATION,
    SAVE_GEM_DECLARATION,
    SAVE_GEM_TRIGGER,
    SAVE_MEMORY_DECLARATION,
    SET_BOOK_AUTHOR_DECLARATION,
    SET_CHAPTER_OUTLINE_DECLARATION,
    SET_CHAPTER_PAGES_DECLARATION,
    SET_CURRENT_CHAPTER_DECLARATION,
    UPDATE_CHAPTER_SUMMARY_DECLARATION,
    UPDATE_MEMORY_DECLARATION,
} from "./persona.js";
import { Profile } from "./profile.js";
import { getRecap, saveTurn } from "./sessionMemory.js";
import { AboutScreen, ReportScreen, SettingsScreen } from "./SettingsScreens.jsx";
import { resolveStorySource } from "./story/resolveStorySource.js";
import StoryTheatre from "./story/StoryTheatre.jsx";
import UpdateAnnouncement from "./UpdateAnnouncement.jsx";
import UpdateManager from "./UpdateManager.jsx";
import { useBookAura } from "./useBookAura.js";
import { useButtonHaptics, useHaptic } from "./useHaptic.js";

const MODEL_NAME = "gemini-3.1-flash-live-preview";
const FALLBACK_MODEL_NAME = "gemini-2.5-flash-native-audio-preview-12-2025";
const SILENCE_CHECK_MS = 4 * 60 * 1000;
const SILENCE_SHUTDOWN_MS = 45 * 1000;
const VOCAB_CONFIRM_TRIGGER = /\b(?:yes|yeah|yep|yup|haan|han|ha|bilkul|sure|okay|ok|kar do|kar dijiye|save it|add it|go ahead)\b/i;
const VOCAB_DECLINE_TRIGGER = /\b(?:no|nope|nah|nahi|nahin|mat|cancel|not now|don't|do not)\b|rehne do|mat save/i;
const EXPLICIT_VOCAB_SAVE_TRIGGER = /\b(?:save|add|log|include|put)\b.{0,50}\b(?:word|vocab(?:ulary)?|it|this)\b|\b(?:word|vocab(?:ulary)?)\b.{0,40}\b(?:save|add|log|include)\b|(?:ye|is)\s+word\s+(?:save|add|log|daal|jod)/i;
const NON_MEMORY_CONTENT_TRIGGER = /\b(?:gem|quote|quotation|book line|passage|vocab(?:ulary)?|word|chapter note)\b/i;
const GHOST_DUST = Array.from({ length: 18 }, (_, index) => ({
  id: index,
  drift: ((index * 31) % 72) - 36,
  delay: (index % 6) * 0.28,
  duration: 2.2 + (index % 5) * 0.35,
  size: 2 + (index % 3),
}));
const ACTIVITY_ICONS = { word: BookOpen, gem: Gem, author: User, chapter: Play, rename: Pencil, pages: BookOpen, summary: MessageSquareText, done: Check, outline: LibraryIcon, memory: Brain, delete: Trash2 };

const memoryStore = new CompanionMemory();
const library = new Library();
const gemsStore = new Gems();
const profileStore = new Profile();
const SILENT = new Map();
function silentChunk(len) {
  if (!SILENT.has(len)) SILENT.set(len, btoa("\0".repeat(((len * 3) >> 2) & ~1)));
  return SILENT.get(len);
}

function describeNow() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "device time";
  const text = new Date().toLocaleString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
  return `${text} (${tz})`;
}
function buildTimeLine() {
  return `Reader's current local date and time (from their device): ${describeNow()}. Use it for greetings and time-aware remarks.`;
}
function isChapterClosed(c) {
  return ["closed", "completed", "done", "finished"].includes(String(c?.status || "").trim().toLowerCase());
}

const BADGE_GRADIENTS = [
  ["#8B5CF6", "#6366F1"], ["#22D3EE", "#0EA5E9"], ["#F59E0B", "#EF4444"],
  ["#34D399", "#10B981"], ["#F472B6", "#EC4899"], ["#A78BFA", "#7C3AED"],
];
function badgeGradient(seed) {
  const [a, b] = BADGE_GRADIENTS[seed % BADGE_GRADIENTS.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}
function formatDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const datePart = d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
  const timePart = d.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true });
  return `${datePart} · ${timePart}`;
}
function formatLastRead(iso) {
  if (!iso) return { date: "—", time: "" };
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase(),
  };
}

function describeTimeGap(iso) {
  if (!iso) return null;
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = diffMs / 60000;
  if (minutes < 1) return "moments ago";
  if (minutes < 60) { const m = Math.round(minutes); return `${m} minute${m === 1 ? "" : "s"} ago`; }
  const hours = minutes / 60;
  if (hours < 20) { const h = Math.round(hours); return `${h} hour${h === 1 ? "" : "s"} ago`; }
  const days = hours / 24;
  if (days < 1.5) return "yesterday";
  if (days < 7) { const d = Math.round(days); return `${d} days ago`; }
  const weeks = days / 7;
  if (weeks < 5) { const w = Math.round(weeks); return `${w} week${w === 1 ? "" : "s"} ago`; }
  const mo = Math.round(days / 30);
  return `${mo} month${mo === 1 ? "" : "s"} ago`;
}
const GEM_ART_STYLE_OPTIONS = [
  { id: "minimalist-lofi", label: "Lo-fi Ghibli", desc: "Soft flat illustration, warm & calm" },
  { id: "charcoal-sketch", label: "Charcoal Sketch", desc: "Hand-drawn pencil sketch" },
  { id: "cinematic-silhouette", label: "Cinematic Silhouette", desc: "Moody backlit, photo-style" },
  { id: "white-ink-sketch", label: "White Ink Sketch", desc: "White pen on black journal page" },
];

function ChapterRing({ completed, total, color = "var(--primary)" }) {
  const size = 22, strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = total > 0 ? Math.min(1, completed / total) : 0;
  return (
    <svg className="book-tile-progress-ring" viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <circle className="ring-track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
      <circle
        className="ring-fill" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={circumference * (1 - pct)}
        style={{ stroke: color }}
      />
    </svg>
  );
}

function pickGemArtStyle(gem) {
  const haystack = `${gem?.bookTitle || ""} ${gem?.quote || ""}`.toLowerCase();
  let bestStyle = null;
  let bestScore = 0;
  let tie = false;
  for (const style of GEM_ART_STYLE_OPTIONS.map((o) => o.id)) {
    const keywordSets = {
      "cinematic-silhouette": /(discipline|willpower|sacrifice|solitude|leadership|courage|resilience|struggle|transform|monk|warrior|battle)/i,
      "charcoal-sketch": /(poetry|literature|philosophy|wisdom|intellect|metaphor|narrative|epiphany|paradox)/i,
      "white-ink-sketch": /(journal|diary|memoir|confession|handwritten|letter|notebook)/i,
      "minimalist-lofi": /(peace|calm|stillness|breathe|gentle|hope|dream|quiet|serenity|meditation|soft|grace)/i,
    };
    const matches = haystack.match(keywordSets[style]);
    const score = matches ? matches.length : 0;
    if (score > bestScore) { bestScore = score; bestStyle = style; tie = false; }
    else if (score > 0 && score === bestScore) tie = true;
  }
  if (bestStyle && !tie) return bestStyle;
  const styles = GEM_ART_STYLE_OPTIONS.map((o) => o.id);
  return styles[Math.abs(haystack.length) % styles.length];
}
function formatPageRange(chapter, { short = false } = {}) {
  const startPage = Number.isFinite(chapter?.startPage) ? chapter.startPage : null;
  const endPage = Number.isFinite(chapter?.endPage) ? chapter.endPage : null;

  if (startPage !== null && endPage !== null) {
    return short ? `Pg ${startPage} - ${endPage}` : `Pages ${startPage} - ${endPage}`;
  }
  if (startPage !== null) {
    return short ? `Pg ${startPage} - ?` : `Pg ${startPage} - ?`;
  }
  if (endPage !== null) {
    return short ? `Pg ? - ${endPage}` : `Pg ? - ${endPage}`;
  }
  return short ? "Pg —" : "Pg —";
}

function fallbackTranslationToHindi(text) {
  const normalized = String(text || "").trim();
  if (!normalized) return "सही अर्थ अभी उपलब्ध नहीं है।";
  const lower = normalized.toLowerCase();
  if (lower.includes("weaker") || lower.includes("lower state") || lower.includes("reduced to")) return "कमज़ोर या निचली स्थिति में होना";
  if (lower.includes("physically sturdy") || lower.includes("large build") || lower.includes("well-fed")) return "स्वस्थ, मोटा और मजबूत शरीर वाला";
  if (lower.includes("shaking uncontrollably") || lower.includes("shivering")) return "बेहद काँपना, डर या ठंड से हिलना";
  if (lower.includes("a person") && lower.includes("trained")) return "एक व्यक्ति जो नियमों के अनुसार काम करने के लिए प्रशिक्षित है";
  if (lower.includes("acting in a very wild")) return "बहुत उग्र या अराजक तरीके से व्यवहार करना";
  return normalized;
}

function fallbackTranslationToOdia(text) {
  const normalized = String(text || "").trim();
  if (!normalized) return "ସଠିକ୍ ଅର୍ଥ ବର୍ତ୍ତମାନ ଉପଲବ୍ଧ ନାହିଁ।";
  const lower = normalized.toLowerCase();
  if (lower.includes("weaker") || lower.includes("lower state") || lower.includes("reduced to")) return "କମଜୋର କିମ୍ବା ନିଚଳ ଅବସ୍ଥାରେ ରହିବା";
  if (lower.includes("physically sturdy") || lower.includes("large build") || lower.includes("well-fed")) return "ସ୍ୱାସ୍ଥ୍ୟମୟ, ମୋଟା ଏବଂ ମଜବୁତ ଶରୀର";
  if (lower.includes("shaking uncontrollably") || lower.includes("shivering")) return "ବହୁତ କମ୍ପନ, ଡର କିମ୍ବା ଶୀତଲତାରେ ହଲନା";
  if (lower.includes("a person") && lower.includes("trained")) return "ଏକ ଆଦେଶ ଅନୁସାରେ କାମ କରିବାକୁ ତିଆରି ଜନ";
  if (lower.includes("acting in a very wild")) return "ବହୁତ ଉଦ୍ଗ୍ରୀବ ଅଥବା ଅନ୍ୟାୟ କରିବା";
  return normalized;
}

function buildVocabMetadata(vocab) {
  const term = String(vocab?.term || "").trim();
  const contextMeaning = String(vocab?.contextMeaning || vocab?.meaning || "").trim();
  const generalMeaning = String(vocab?.meaning || contextMeaning || "").trim();
  const rawGrammar = String(vocab?.grammar || vocab?.partOfSpeech || "").trim();
  const grammar = rawGrammar || "Not specified";
  const pronunciation = String(vocab?.pronunciation || "").trim();
  const synonyms = Array.isArray(vocab?.synonyms) && vocab.synonyms.length ? vocab.synonyms : ["close meaning"];
  const antonyms = Array.isArray(vocab?.antonyms) && vocab.antonyms.length ? vocab.antonyms : ["opposite sense"];
  const example = String(vocab?.example || "").trim();
  const sentence = String(vocab?.sentence || "").trim();
  const hindiMeaning = String(vocab?.hindiMeaning || fallbackTranslationToHindi(contextMeaning || generalMeaning)).trim();
  const odiaMeaning = String(vocab?.odiaMeaning || fallbackTranslationToOdia(contextMeaning || generalMeaning)).trim();
  const hindiSentence = String(vocab?.hindiSentence || "").trim();
  const odiaSentence = String(vocab?.odiaSentence || "").trim();

  return {
    ...vocab,
    term,
    grammar,
    pronunciation,
    contextMeaning: contextMeaning || generalMeaning || `Meaning for "${term}" not captured yet.`,
    meaning: generalMeaning || contextMeaning || `Meaning for "${term}" not captured yet.`,
    synonyms,
    antonyms,
    example,
    sentence,
    hindiMeaning,
    odiaMeaning,
    hindiSentence,
    odiaSentence,
  };
}

function getChapterStatus(chapter, isCurrent, isLocked) {
  const normalizedStatus = String(chapter?.status || "").trim().toLowerCase();
  if (isChapterClosed(chapter)) return { label: "Completed", tone: "done" };
  if (isCurrent) return { label: "Current", tone: "current" };
  if (isLocked) return { label: "Not Started", tone: "idle" };
  if (["inprogress", "in-progress", "progress"].includes(normalizedStatus)) return { label: "In Progress", tone: "progress" };
  const hasProgress = chapter && (
    chapter.startPage !== null && chapter.startPage !== undefined ||
    chapter.endPage !== null && chapter.endPage !== undefined ||
    (Array.isArray(chapter.vocabLog) && chapter.vocabLog.length > 0) ||
    (chapter.summary && chapter.summary.trim()) ||
    Boolean(chapter.jumpNote)
  );
  if (hasProgress) return { label: "In Progress", tone: "progress" };
  return { label: "Not Started", tone: "idle" };
}

const AVATAR_PRESETS = [
  { Icon: BookOpen, gradient: badgeGradient(0) },
  { Icon: Moon, gradient: badgeGradient(1) },
  { Icon: Gem, gradient: badgeGradient(2) },
  { Icon: Brain, gradient: badgeGradient(3) },
  { Icon: Flame, gradient: badgeGradient(4) },
  { Icon: User, gradient: badgeGradient(5) },
];

function renderAvatar(size) {
  const avatar = profileStore.data.avatar;
  if (avatar) return <img src={avatar} alt="" className="avatar-img" />;
  const presetIdx = profileStore.data.avatarPreset;
  if (presetIdx !== null && presetIdx !== undefined && AVATAR_PRESETS[presetIdx]) {
    const { Icon, gradient } = AVATAR_PRESETS[presetIdx];
    return (
      <div className="avatar-preset-fill" style={{ background: gradient }}>
        <Icon size={size} color="#fff" />
      </div>
    );
  }
  return (
    <div className="avatar-preset-fill" style={{ background: AVATAR_PRESETS[5].gradient }}>
      <User size={size} color="#fff" />
    </div>
  );
}

function useMascotPreference() {
  const [mascot, setMascotState] = useState(getMascot());

  useEffect(() => {
    const handleChange = () => setMascotState(getMascot());
    window.addEventListener("app:mascot-changed", handleChange);
    return () => window.removeEventListener("app:mascot-changed", handleChange);
  }, []);

  return mascot;
}
function shrinkDataUrl(dataUrl, max = 320) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onerror = () => resolve(dataUrl);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.src = dataUrl;
  });
}
function resizeImageToDataUrl(file, maxSize = 240) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// ==================== ERROR BOUNDARY ====================
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="screen crash-screen">
          <div className="aurora-bg" />
          <h2>Something went wrong</h2>
          <p className="crash-message">{String(this.state.error.message || this.state.error)}</p>
          <button className="primary-button" onClick={() => { this.setState({ error: null }); this.props.onReset?.(); }}>
            Go home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  useButtonHaptics();
  const [screen, setScreen] = useState("dashboard");
  const [activeBookId, setActiveBookId] = useState(null);
  const [activeChapterNumber, setActiveChapterNumber] = useState(null);
  const [recapModal, setRecapModal] = useState(null);
  const [newBookModalOpen, setNewBookModalOpen] = useState(false);
  const [storyRequest, setStoryRequest] = useState(null);
  const [resetKey, setResetKey] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(() => !profileStore.hasCompletedOnboarding());
  const [updateState, setUpdateState] = useState({ available: false, releases: [] });
  const updateActionsRef = useRef(null);
  const routeRef = useRef({ screen: "dashboard", activeBookId: null, activeChapterNumber: null });
  const overlayStackRef = useRef([]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", profileStore.getTheme());
  }, []);

  useEffect(() => {
    window.history.replaceState({ screen: "dashboard" }, "");
    const onPopState = (e) => {
      const stack = overlayStackRef.current;
      if (stack.length) {
        const close = stack.pop();
        try { close?.(); } catch { /* overlay already unmounted */ }
        return;
      }
      const state = e.state || { screen: "dashboard" };
      routeRef.current = state;
      setScreen(state.screen);
      setActiveBookId(state.activeBookId ?? null);
      setActiveChapterNumber(state.activeChapterNumber ?? null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function navigateTo(nextScreen, extra = {}) {
    overlayStackRef.current = [];
    const nextBookId = "activeBookId" in extra ? extra.activeBookId : activeBookId;
    const nextChapterNumber = "activeChapterNumber" in extra ? extra.activeChapterNumber : activeChapterNumber;
    setScreen(nextScreen);
    setActiveBookId(nextBookId);
    setActiveChapterNumber(nextChapterNumber);
    const nextRoute = { screen: nextScreen, activeBookId: nextBookId, activeChapterNumber: nextChapterNumber };
    routeRef.current = nextRoute;
    window.history.pushState(nextRoute, "");
  }

  function openOverlay(onClose) {
    overlayStackRef.current.push(typeof onClose === "function" ? onClose : null);
    window.history.pushState({ ...routeRef.current, overlay: overlayStackRef.current.length }, "");
  }

  function openNewBook() {
    setNewBookModalOpen(true);
    openOverlay(() => setNewBookModalOpen(false));
  }

  function openRecap(bookId) {
    const book = library.getBook(bookId);
    if (!book) return;
    setRecapModal({ bookId, chapterNumber: book.currentChapterNumber });
    openOverlay(() => setRecapModal(null));
  }
  function startSessionFromRecap() {
    if (!recapModal) return;
    const bookId = recapModal.bookId;
    overlayStackRef.current.pop();
    window.history.replaceState(routeRef.current, "");
    setRecapModal(null);
    navigateTo("session", { activeBookId: bookId });
  }
  function openStoryFromRecap(bookId) {
    overlayStackRef.current.pop();
    window.history.replaceState(routeRef.current, "");
    setRecapModal(null);
    openStory(bookId);
  }
  function openStory(bookId) {
    const book = library.getBook(bookId);
    if (!book) return;
    setStoryRequest({ bookId });
    openOverlay(() => closeStory(true));
  }
  function finishStory(startSession = false) {
    if (!storyRequest) return;
    const bookId = storyRequest.bookId;
    const stack = overlayStackRef.current;
    if (stack.length) stack.pop();
    window.history.replaceState(routeRef.current, "");
    setStoryRequest(null);
    if (startSession) navigateTo("session", { activeBookId: bookId });
  }
  function closeStory(fromPopState = false) {
    if (fromPopState) {
      setStoryRequest(null);
      return;
    }
    if (!storyRequest) return;
    if (overlayStackRef.current.length) overlayStackRef.current.pop();
    window.history.replaceState(routeRef.current, "");
    setStoryRequest(null);
  }
  function createBookAndOpenSession(title) {
    const book = library.getOrCreateBook(title);
    overlayStackRef.current.pop();
    window.history.replaceState(routeRef.current, "");
    setNewBookModalOpen(false);
    navigateTo("session", { activeBookId: book.id });
  }

  function goBack() {
    window.history.back();
  }

  const badges = computeBadges({ updateAvailable: updateState.available });

  const nav = {
    badges,
    goDashboard: () => navigateTo("dashboard"),
    goLibrary: () => navigateTo("library"),
    goGems: () => navigateTo("gems"),
    goMemory: () => navigateTo("memory"),
    goProfile: () => navigateTo("profile"),
    goSettings: () => navigateTo("settings"),
    goAbout: () => navigateTo("about"),
    goReport: () => navigateTo("report"),
    openNewBook,
    openOverlay,
    updateAvailable: updateState.available,
    updateReleases: updateState.releases,
    checkForUpdates: () => updateActionsRef.current?.checkForUpdates?.() || false,
    applyUpdate: () => updateActionsRef.current?.applyUpdate?.(),
    openChapterGrid: (bookId) => navigateTo("chapterGrid", { activeBookId: bookId }),
    openChapterDetail: (bookId, chapterNumber) => navigateTo("chapterDetail", { activeBookId: bookId, activeChapterNumber: chapterNumber }),
    openRecap,
    openStory,
    goBack,
  };

  return (
    <ErrorBoundary key={resetKey} onReset={() => { setResetKey((k) => k + 1); navigateTo("dashboard"); }}>
      {screen === "session" ? (
        <SessionScreen bookId={activeBookId} onEnd={nav.goBack} />
      ) : (
        <div className="app-shell">
          <div className="app-content">
            {screen === "dashboard" && <DashboardScreen nav={nav} />}
            {screen === "library" && <LibraryScreen nav={nav} />}
            {screen === "chapterGrid" && <ChapterGridScreen bookId={activeBookId} nav={nav} />}
            {screen === "chapterDetail" && <ChapterDetailScreen bookId={activeBookId} chapterNumber={activeChapterNumber} nav={nav} />}
            {screen === "gems" && <GemsScreen nav={nav} />}
            {/* {screen === "memory" && <MemoryScreen nav={nav} />} */}
            {screen === "memory" && <MemoryTab nav={nav} />}
            {screen === "profile" && <ProfileScreen nav={nav} />}
                        {screen === "settings" && <SettingsScreen nav={nav} stores={{ profile: profileStore, library, memory: memoryStore, gems: gemsStore }} />}
            {screen === "about" && <AboutScreen nav={nav} />}
            {screen === "report" && <ReportScreen nav={nav} stores={{ profile: profileStore }} />}
          </div>
          <BottomNav active={["settings", "about", "report"].includes(screen) ? "profile" : screen} onNavigate={(id) => navigateTo(id)} badges={badges} />
        </div>
      )}

      {recapModal && (
        <PreSessionRecapModal
          book={library.getBook(recapModal.bookId)}
          chapterNumber={recapModal.chapterNumber}
          onStart={startSessionFromRecap}
          onStory={() => openStoryFromRecap(recapModal.bookId)}
          onClose={nav.goBack}
        />
      )}
      {newBookModalOpen && <NewBookModal onCreate={createBookAndOpenSession} onClose={nav.goBack} />}
      <UpdateManager
        paused={screen === "session" || showOnboarding}
        onUpdateState={setUpdateState}
        actionsRef={updateActionsRef}
      />
      <UpdateAnnouncement
        available={updateState.available}
        releases={updateState.releases}
        paused={screen === "session" || showOnboarding}
        onUpdate={nav.applyUpdate}
      />
      <ToastHost />
      <AnimatePresence>
        {storyRequest && (
          <StoryTheatre
            key={`${storyRequest.bookId}-${library.getBook(storyRequest.bookId)?.currentChapterNumber}`}
            bookId={storyRequest.bookId}
            book={library.getBook(storyRequest.bookId)}
            voiceName={profileStore.data.voice || "Leda"}
            onClose={() => closeStory(false)}
            onRead={() => finishStory(true)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showOnboarding && (
          <Onboarding
            key="onboarding"
            initialName={profileStore.data.name === "Reader" ? "" : profileStore.data.name}
            voiceName={profileStore.data.voice || "Leda"}
            onFinish={(data) => {
              profileStore.completeOnboarding(data);
              setShowOnboarding(false);
              setScreen("dashboard");
            }}
          />
        )}
      </AnimatePresence>
    </ErrorBoundary>
  );
}

// ==================== SHARED STICKY HEADER ====================
function MascotCorner({ mascot, size, context }) {
  const [line, setLine] = useState(() => makeLocalLine({}, context));
  useEffect(() => {
    const id = setInterval(() => setLine(makeLocalLine({}, context)), 9000);
    return () => clearInterval(id);
  }, [context]);
  return (
    <div className="mc-wrap">
      <div className="mc-bubble" key={line}>{line}</div>
      <span className="mc-dots"><i /><i /></span>
      <MascotCharacter characterId={mascot} size={size} animated silent onTap={() => setLine(makeLocalLine({}, context))} />
    </div>
  );
}

function ScreenHeader({ title, subtitle, right }) {
  return (
    <header className="screen-header">
      <div className="header-left">
        <h1>{title}</h1>
        {subtitle && <p className="eyebrow">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

// ==================== GLOBAL TOASTS ====================

function ToastHost() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const onNotify = (e) => {
      const t = e.detail;
      if (!t?.text) return;
      setItems((list) => [...list.slice(-2), t]);
      setTimeout(() => setItems((list) => list.filter((x) => x.id !== t.id)), t.ms || 4200);
    };
    window.addEventListener("app:notify", onNotify);
    return () => window.removeEventListener("app:notify", onNotify);
  }, []);
  const ICONS = { info: Info, error: AlertTriangle, success: Check };
  return createPortal(
    <div className="toast-host" role="status" aria-live="polite">
      <AnimatePresence>
        {items.map((t) => {
          const IconC = ICONS[t.kind] || Info;
          return (
            <Motion.div key={t.id} className={`toast-item ${t.kind}`}
              initial={{ opacity: 0, y: 24, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={INTERACTION_SPRING}>
              <IconC size={15} /><span>{t.text}</span>
            </Motion.div>
          );
        })}
      </AnimatePresence>
    </div>,
    document.body
  );
}

// ==================== CONFIRM MODAL ====================

function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return createPortal(
    <Motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={INTERACTION_SPRING} onClick={onCancel}>
      <Motion.div className="modal-card elevated confirm-card" initial={{ opacity: 0, y: 18, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={INTERACTION_SPRING} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p className="confirm-message">{message}</p>
        <div className="modal-actions">
          <button className="icon-button ghost" onClick={onCancel}>Cancel</button>
          <button className="danger-button" onClick={onConfirm}><Trash2 size={14} /> Delete</button>
        </div>
      </Motion.div>
    </Motion.div>,
    document.body
  );
}

// ==================== BOTTOM NAV ====================

function BottomNav({ active, onNavigate, badges = {} }) {
  const { triggerLightTap } = useHaptic();
  const items = [
    { id: "dashboard", Icon: Home, label: "Home" },
    { id: "library", Icon: LibraryIcon, label: "Library" },
    { id: "gems", Icon: Gem, label: "Gems" },
    { id: "memory", Icon: Brain, label: "Memory" },
  ];
  return (
    <div className="bottom-nav-shell">
      <nav className="bottom-nav elevated">
        {items.map(({ id, Icon, label }) => (
          <Motion.button key={id} className={`nav-item ${active === id ? "active" : ""}`} whileTap={{ scale: 0.9 }} transition={INTERACTION_SPRING} onClick={() => { triggerLightTap(); onNavigate(id); }}>
            <span className="nav-icon-box"><Icon size={28} strokeWidth={active === id ? 2.4 : 1.8} /></span>
            <span className="nav-label">{label}</span>
          </Motion.button>
        ))}
        <Motion.button className={`nav-item ${active === "profile" ? "active" : ""}`} whileTap={{ scale: 0.9 }} transition={INTERACTION_SPRING} onClick={() => { triggerLightTap(); onNavigate("profile"); }}>
          <span className="nav-icon-box">
            <span className="nav-avatar">{renderAvatar(22)}</span>
            {badges.profile > 0 && <span className="rc-badge" aria-label={`${badges.profile} pending`}>{badges.profile}</span>}
          </span>
          <span className="nav-label">Profile</span>
        </Motion.button>
      </nav>
    </div>
  );
}

// ==================== NEW BOOK MODAL ====================

function NewBookModal({ onCreate, onClose }) {
  const [title, setTitle] = useState("");
  const mascot = useMascotPreference();

  return (
    <Motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={INTERACTION_SPRING} onClick={onClose}>
      <Motion.div className="modal-card elevated" initial={{ opacity: 0, y: 18, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={INTERACTION_SPRING} onClick={(e) => e.stopPropagation()}>
        <div className="new-book-hero">
          <MascotCharacter characterId={mascot} size={120} animated context="reader is about to start a new book" bubblePosition="above"/>
        </div>
        <h2>Start a new book</h2>
        <input
          autoFocus className="title-input" placeholder="Book title..."
          value={title} onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && title.trim() && onCreate(title)}
        />
        <div className="modal-actions">
          <button className="icon-button ghost" onClick={onClose}>Cancel</button>
          <button className="primary-button" disabled={!title.trim()} onClick={() => onCreate(title)}>Start</button>
        </div>
      </Motion.div>
    </Motion.div>
  );
}

// ==================== PRE-SESSION RECAP MODAL ====================

function PreSessionRecapModal({ book, chapterNumber, onStart, onStory, onClose }) {
  if (!book) return null;
  const chapter = book.chapters[chapterNumber];
  const storySource = resolveStorySource(book);
  const pageRange = chapter?.startPage
    ? chapter.endPage ? `Pages ${chapter.startPage}–${chapter.endPage}` : `From page ${chapter.startPage}`
    : null;
  return (
    <Motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={INTERACTION_SPRING} onClick={onClose}>
      <Motion.div className="modal-card elevated recap-card" initial={{ opacity: 0, y: 18, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={INTERACTION_SPRING} onClick={(e) => e.stopPropagation()}>
        <div className="recap-label">Last time</div>
        <h2>{book.title}</h2>
        <div className="recap-chapter">
          Chapter {chapterNumber}{chapter?.title && chapter.title !== `Chapter ${chapterNumber}` ? ` · ${chapter.title}` : ""}
          {pageRange ? ` · ${pageRange}` : ""}
        </div>
        <p className="recap-summary">{chapter?.summary || "No summary yet for this chapter - you'll start fresh."}</p>
        <div className="modal-actions">
          <button className="icon-button ghost" onClick={onClose}>Skip</button>
          {storySource.mode !== "empty" && <button className="icon-button ghost" onClick={onStory}><Play size={14} /> Hear the story</button>}
          <button className="primary-button" onClick={onStart}><Play size={14} /> Start Reading</button>
        </div>
      </Motion.div>
    </Motion.div>
  );
}

// ==================== DASHBOARD ====================

function getGreeting() {
  const h = new Date().getHours();
  return h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : h < 21 ? "Good evening" : "Good night";
}
function bucketByDay(timestamps, days) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    out.push({ key: d.toDateString(), label: d.toLocaleDateString(undefined, { weekday: "short" }), short: d.getDate(), mon: d.toLocaleDateString(undefined, { month: "short" }), count: 0 });
  }
  const idx = new Map(out.map((o, i) => [o.key, i]));
  timestamps.forEach((t) => { const k = new Date(t).toDateString(); if (idx.has(k)) out[idx.get(k)].count += 1; });
  return out;
}
function allVocabTimestamps() {
  const ts = [];
  library.listBooks().forEach((b) => Object.values(b.chapters).forEach((c) => (c.vocabLog || []).forEach((v) => v.timestamp && ts.push(v.timestamp))));
  return ts;
}
function useCountUp(target, ms = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf, start;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}
function useReady(delay = 200) {
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), delay); return () => clearTimeout(t); }, [delay]);
  return ready;
}
function smoothPath(pts) {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += ` C${p1.x + (p2.x - p0.x) / 6},${p1.y + (p2.y - p0.y) / 6} ${p2.x - (p3.x - p1.x) / 6},${p2.y - (p3.y - p1.y) / 6} ${p2.x},${p2.y}`;
  }
  return d;
}

function StreakHero() {
  const streak = profileStore.getStreak();
  const days = profileStore.getLast7Days();
  const ready = useReady(150);
  const shown = useCountUp(streak, 1100);
  const R = 46, C = 2 * Math.PI * R;
  const pct = Math.min(streak / 7, 1);
  const left = 7 - streak;
  return (
    <div className="streak-hero elevated dash-card" style={{ "--i": 0 }}>
      <div className="sh-glow" />
      <div className="sh-top">
        <div className="sh-ring">
          <svg viewBox="0 0 108 108">
            <defs>
              <linearGradient id="streakGradBig" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f59e0b" /><stop offset="55%" stopColor="#ef4444" /><stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
            <circle cx="54" cy="54" r={R} className="sh-track" />
            <circle cx="54" cy="54" r={R} className="sh-prog" stroke="url(#streakGradBig)" strokeDasharray={C} strokeDashoffset={ready ? C * (1 - pct) : C} />
          </svg>
          <div className="sh-center">
            <Flame className="sh-flame" size={24} />
            <span className="sh-count">{shown}</span>
          </div>
        </div>
        <div className="sh-info">
          <div className="sh-headline">{streak > 0 ? `${streak}-day streak` : "Start your streak"}</div>
          <div className="sh-sub">{streak >= 7 ? "Weekly goal complete. Legend!" : streak === 0 ? "Read today to light the flame" : `${left} more day${left === 1 ? "" : "s"} to a 7-day streak`}</div>
        </div>
      </div>
      <div className="sh-days">
        {days.map((d, i) => (
          <span key={i} style={{ "--d": i }} className={`sh-day ${d.active ? "active" : ""} ${d.isToday ? "today" : ""}`}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

function KpiTile({ icon, label, value, delta, gradient, index }) {
  const shown = useCountUp(value);
  return (
    <Motion.div className="kpi-tile elevated" style={{ "--badge": gradient, "--i": index }} whileHover={{ y: -4, scale: 1.025 }} whileTap={{ scale: 0.985 }} transition={INTERACTION_SPRING}>
      <div className="kpi-top">
        <div className="stat-badge">{icon}</div>
        {delta !== undefined && (
          <span className={`kpi-delta ${delta >= 0 ? "up" : "down"}`}>
            {delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{Math.abs(delta)}
          </span>
        )}
      </div>
      <div className="kpi-value">{shown}</div>
      <div className="kpi-label">{label}</div>
    </Motion.div>
  );
}

function VocabAreaChart({ data }) {
  const [active, setActive] = useState(null);
  const W = 320, H = 160, padX = 10, padTop = 26, padBottom = 22;
  const max = Math.max(...data.map((d) => d.count), 3);
  const step = (W - padX * 2) / Math.max(1, data.length - 1);
  const pts = data.map((d, i) => ({ ...d, x: padX + i * step, y: padTop + (H - padTop - padBottom) * (1 - d.count / max) }));
  const line = smoothPath(pts);
  const area = `${line} L${pts[pts.length - 1].x},${H - padBottom} L${pts[0].x},${H - padBottom} Z`;
  const a = active !== null ? pts[active] : null;
  const tipX = a ? Math.min(Math.max(a.x - 52, 2), W - 106) : 0;
  const labelIdx = data.length <= 7
    ? data.map((_, i) => i)
    : Array.from({ length: 5 }, (_, k) => Math.round((k * (data.length - 1)) / 4));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="area-chart">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.5" /><stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="areaStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--primary)" /><stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      {[0, 1, 2].map((g) => {
        const y = padTop + ((H - padTop - padBottom) / 2) * g;
        return <line key={g} x1={padX} x2={W - padX} y1={y} y2={y} className="area-grid" />;
      })}
      <path d={area} fill="url(#areaFill)" className="area-fill" />
      <path d={line} fill="none" stroke="url(#areaStroke)" strokeWidth="3" strokeLinecap="round" pathLength="1" className="area-line" />
      {labelIdx.map((i, k) => {
        const p = pts[i];
        return (
          <text key={i} x={p.x} y={H - 6} textAnchor={k === 0 ? "start" : k === labelIdx.length - 1 ? "end" : "middle"} className="area-label">
            {data.length <= 7 ? p.label : `${p.short} ${p.mon}`}
          </text>
        );
      })}
      {a && (
        <g>
          <line x1={a.x} x2={a.x} y1={padTop - 6} y2={H - padBottom} className="area-cursor" />
          <circle cx={a.x} cy={a.y} r="5" className="area-dot" />
          <rect x={tipX} y="2" width="104" height="18" rx="9" className="area-tip" />
          <text x={tipX + 52} y="14.5" textAnchor="middle" className="area-tip-text">{a.short} {a.mon}: {a.count} word{a.count === 1 ? "" : "s"}</text>
        </g>
      )}
      {pts.map((p, i) => (
        <rect key={i} x={p.x - step / 2} y="0" width={step} height={H} fill="transparent"
          onClick={() => setActive(i)} onMouseEnter={() => setActive(i)} onTouchStart={() => setActive(i)} />
      ))}
    </svg>
  );
}

function RadialProgress({ percent }) {
  const ready = useReady(250);
  const shown = useCountUp(percent, 1200);
  const R = 44, C = 2 * Math.PI * R;
  return (
    <div className="radial-wrap">
      <svg viewBox="0 0 110 110">
        <defs>
          <linearGradient id="radialGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--primary)" /><stop offset="100%" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
        <circle cx="55" cy="55" r={R} className="radial-track" />
        <circle cx="55" cy="55" r={R} className="radial-prog" stroke="url(#radialGrad)" strokeDasharray={C} strokeDashoffset={ready ? C * (1 - percent / 100) : C} />
      </svg>
      <div className="radial-center"><span className="radial-num">{shown}%</span><span className="radial-sub">chapters done</span></div>
    </div>
  );
}

function MiniBars({ data }) {
  const [active, setActive] = useState(null);
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="mini-bars">
      {data.map((d, i) => (
        <button key={i} type="button" className="mini-col" onClick={() => setActive(active === i ? null : i)}>
          <span className="mini-count">{active === i || d.count > 0 ? d.count : ""}</span>
          <span className="mini-track">
            <span className={`mini-fill ${active === i ? "on" : ""}`} style={{ height: `${Math.max((d.count / max) * 100, 6)}%`, animationDelay: `${i * 70}ms` }} />
          </span>
          <span className="mini-label">{d.label.slice(0, 1)}</span>
        </button>
      ))}
    </div>
  );
}

function WordRings({ items }) {
  const [sel, setSel] = useState(null);
  const ready = useReady(250);
  const list = items.slice(0, 6);
  const total = list.reduce((s, i) => s + i.value, 0) || 1;
  const max = Math.max(...list.map((i) => i.value), 1);
  const radii = [54, 46, 38, 30, 22, 14];
  const shown = sel !== null ? list[sel] : null;
  return (
    <div className="wr-row">
      <div className="wr-box">
        <svg viewBox="0 0 120 120">
          <g transform="rotate(-90 60 60)">
            {list.map((it, i) => {
              const R = radii[i], C = 2 * Math.PI * R;
              const frac = Math.max(it.value / max, 0.06) * 0.92;
              return (
                <g key={i} style={{ opacity: sel !== null && sel !== i ? 0.22 : 1, transition: "opacity .3s" }}>
                  <circle cx="60" cy="60" r={R} className="wr-track" />
                  <circle cx="60" cy="60" r={R} className="wr-prog" stroke={it.color}
                    strokeDasharray={C} strokeDashoffset={ready ? C * (1 - frac) : C}
                    style={{ transitionDelay: `${i * 130}ms` }} />
                </g>
              );
            })}
          </g>
        </svg>
        <div className="wr-center">
          <span className="wr-num">{shown ? shown.value : total}</span>
          <span className="wr-sub">{shown ? shown.label.slice(0, 12) : "words"}</span>
        </div>
      </div>
      <div className="wr-legend">
        {list.map((it, i) => (
          <button key={i} type="button" className={`wr-item ${sel === i ? "on" : ""}`} onClick={() => setSel(sel === i ? null : i)}>
            <span className="wr-dot" style={{ background: it.color }} />
            <span className="wr-name">{it.label}</span>
            <span className="wr-val">{Math.round((it.value / total) * 100)}%</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function BookProgressList({ rows }) {
  const ready = useReady(300);
  return (
    <div className="bpl">
      {rows.map((r, i) => {
        const pct = r.total ? Math.round((r.done / r.total) * 100) : 0;
        return (
          <div className="bpl-row" key={r.book.id} style={{ "--c1": r.gradient[0], "--c2": r.gradient[1], "--d": i }}>
            <div className="bpl-cover">{(r.book.title || "?").trim()[0]?.toUpperCase()}</div>
            <div className="bpl-main">
              <div className="bpl-top"><span className="bpl-title">{r.book.title}</span><span className="bpl-pct">{pct}%</span></div>
              <div className="bpl-bar">
                <span className="bpl-fill" style={{ width: ready ? `${Math.max(pct, 4)}%` : "0%" }}><i className="bpl-knob" /></span>
              </div>
              <div className="bpl-meta">{r.done} of {r.total} chapters · {r.words} words</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DashboardScreen({ nav }) {
  const books = library.listBooks();
  const stats = library.getStats();
  const gemsList = gemsStore.list();
  const mascot = useMascotPreference();
  const [range, setRange] = useState(7);
  const { triggerLightTap } = useHaptic();
  const [now] = useState(() => Date.now());

  const vocabTs = allVocabTimestamps();
  const areaData = bucketByDay(vocabTs, range);
  const last14 = bucketByDay(vocabTs, 14);
  const thisWeek = last14.slice(7).reduce((s, d) => s + d.count, 0);
  const prevWeek = last14.slice(0, 7).reduce((s, d) => s + d.count, 0);
  const gemBars = bucketByDay(gemsList.map((g) => g.createdAt), 7);
  const mascotLine = useMascotLine({ streak: profileStore.getStreak(), words: stats.totalWords, books: stats.totalBooks, gems: gemsList.length, weekWords: thisWeek });
  const unlocked = profileStore.getStreak() >= 90 || (import.meta.env.DEV && localStorage.getItem("mascot_unlock") === "1");
  const voice = useGeminiVoiceDriver({ voiceName: profileStore.data.voice || "Leda" });
  const speakBusy = useRef(false);
  async function mascotSpeak() {
    if (speakBusy.current) return;
    speakBusy.current = true;
    const line = mascotLine.line;
    await voice.connect(MASCOT_VOICE_PROMPT);
    await voice.say(`[LINE] ${line}`, { fallback: line });
    voice.close();
    speakBusy.current = false;
  }

  const rows = books.map((b, i) => {
    const chs = library.getChapters(b.id);
    const total = chs.length;
    const done = chs.filter((c) => !c.isPlaceholder && isChapterClosed(c)).length;
    const words = chs.reduce((s, c) => s + (c.vocabLog?.length || 0), 0);
    return { book: b, total, done, words, gradient: BADGE_GRADIENTS[i % BADGE_GRADIENTS.length] };
  });
  const totalCh = rows.reduce((s, r) => s + r.total, 0);
  const doneCh = rows.reduce((s, r) => s + r.done, 0);
  const percent = totalCh ? Math.round((doneCh / totalCh) * 100) : 0;
  const wordRows = rows.filter((r) => r.words > 0).sort((a, b) => b.words - a.words);
const topItems = wordRows.slice(0, 5).map((r) => ({ label: r.book.title, value: r.words, color: r.gradient[0] }));
const restWords = wordRows.slice(5).reduce((s, r) => s + r.words, 0);
const donutItems = restWords > 0 ? [...topItems, { label: "Other books", value: restWords, color: "#94a3b8" }] : topItems;
  const recent = rows.filter((r, i) => i === 0 || now - new Date(r.book.lastReadAt).getTime() < 7 * 86400000).slice(0, 3);

  return (
    <div className="screen dashboard-screen">
      <div className="aurora-bg" />

      <div className="dash-sticky-header">
        <div className="dash-hero">
        <div className="dash-hero-text">
          <div className="dash-greeting">{getGreeting()}</div>
          <h1 className="dash-name">{profileStore.data.name}</h1>
          <p className="dash-date">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <div className="dash-mascot">
          <MascotCharacter characterId={mascot} size={84} animated silent
            onTap={unlocked ? mascotSpeak : mascotLine.next}
            talking={voice.speaking} levelRef={voice.levelRef} />
        </div>
      </div>
      <div className="mascot-say" key={mascotLine.line}>
        <span className="say-dot d1" />
        <span className="say-dot d2" />
        <div className="say-bubble">{mascotLine.line}</div>
      </div>
      </div>

      <div className="dashboard-content">
      <StreakHero />

      <div className="kpi-grid">
        <KpiTile index={1} label="Books" value={stats.totalBooks} icon={<BookOpen size={16} />} gradient={badgeGradient(0)} />
        <KpiTile index={2} label="Words learned" value={stats.totalWords} icon={<Brain size={16} />} gradient={badgeGradient(1)} />
        <KpiTile index={3} label="Words this week" value={thisWeek} delta={thisWeek - prevWeek} icon={<Flame size={16} />} gradient={badgeGradient(2)} />
        <KpiTile index={4} label="Gems saved" value={gemsList.length} icon={<Gem size={16} />} gradient={badgeGradient(4)} />
      </div>

      <div className="dash-card elevated" style={{ "--i": 5 }}>
        <div className="dash-card-head">
          <div><div className="dash-card-title">Vocabulary growth</div><div className="dash-card-sub">Tap the chart to see a day</div></div>
          <div className="seg">
            {[7, 14, 30, 90].map((r) => (
              <Motion.button key={r} className={`seg-btn ${range === r ? "active" : ""}`} whileTap={{ scale: 0.92 }} transition={INTERACTION_SPRING} onClick={() => { triggerLightTap(); setRange(r); }}>{r}D</Motion.button>
            ))}
          </div>
        </div>
        <VocabAreaChart key={range} data={areaData} />
      </div>

      <div className="dash-grid-2">
        <div className="dash-card elevated" style={{ "--i": 6 }}>
          <div className="dash-card-title">Overall progress</div>
          <RadialProgress percent={percent} />
        </div>
        <div className="dash-card elevated" style={{ "--i": 7 }}>
          <div className="dash-card-title">Gems this week</div>
          <MiniBars data={gemBars} />
        </div>
      </div>

            {donutItems.length > 0 && (
        <div className="dash-card elevated" style={{ "--i": 8 }}>
          <div className="dash-card-title">Words by book</div>
          <div className="dash-card-sub">Tap a book to focus its ring</div>
          <WordRings items={donutItems} />
        </div>
      )}

      {rows.length > 0 && (
        <div className="dash-card elevated" style={{ "--i": 9 }}>
          <div className="dash-card-title">Book progress</div>
          <BookProgressList rows={rows.slice(0, 6)} />
        </div>
      )}

      <div className="dash-section-title">Continue reading</div>
      {recent.length > 0 ? (
        <div className={`cr-scroll ${recent.length === 1 ? "single" : ""}`}>
          {recent.map((r) => {
            const pct = r.total ? Math.max(Math.round((r.done / r.total) * 100), 4) : 4;
            return (
              <Motion.button key={r.book.id} className="cr2-card" style={{ "--c1": r.gradient[0], "--c2": r.gradient[1] }} whileHover={{ y: -4, scale: 1.015 }} whileTap={{ scale: 0.985 }} transition={INTERACTION_SPRING} onClick={() => nav.openRecap(r.book.id)}>
                <span className="cr2-mark">{(r.book.title || "?").trim()[0]?.toUpperCase()}</span>
                <div className="cr2-top">
                  <span className="cr2-chip">Chapter {r.book.currentChapterNumber}</span>
                  <span className="cr2-when">{describeTimeGap(r.book.lastReadAt) || ""}</span>
                </div>
                <div className="cr2-title">{r.book.title}</div>
                <div className="cr2-bottom">
                  <div className="cr2-prog">
                    <div className="cr2-prog-bar"><span style={{ width: `${pct}%` }} /></div>
                    <span className="cr2-prog-txt">{r.done}/{r.total} chapters done</span>
                  </div>
                  <span className="cr2-play"><Play size={18} /></span>
                </div>
              </Motion.button>
            );
          })}
        </div>
      ) : (
        <div className="dash-card elevated dash-empty" style={{ "--i": 10 }}>
          <MascotCharacter characterId={mascot} size={80} animated context="no books yet on the dashboard" />
          <p className="empty-hint">No books yet. Add your first one to begin.</p>
          <button className="primary-button" onClick={nav.goLibrary}>Go to Library</button>
        </div>
      )}
      </div>
    </div>
  );
}

// ==================== LIBRARY ====================

function LibraryScreen({ nav }) {
  const [books, setBooks] = useState(library.listBooks());
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [authorEditor, setAuthorEditor] = useState(null);
  const [portraitSearching, setPortraitSearching] = useState(false);
  const [portraitError, setPortraitError] = useState(false);
  const mascot = useMascotPreference();

  function refresh() { setBooks(library.listBooks()); }
  function handleDeleteConfirmed() {
    if (confirmDelete) { library.deleteBook(confirmDelete.id); setConfirmDelete(null); refresh(); }
  }
  function openAuthorModal(book) {
    setPortraitSearching(false); setPortraitError(false);
    setAuthorEditor({
      bookId: book.id,
      authorName: book.authorName || "",
      authorBio: book.authorBio || "",
      authorPortrait: book.authorPortrait || "",
      authorPortraits: book.authorPortraits || [],
      mode: book.authorName ? "view" : "edit",
    });
  }
  function saveAuthorInfo() {
    if (!authorEditor) return;
    library.updateBookMeta(authorEditor.bookId, {
      authorName: authorEditor.authorName,
      authorBio: authorEditor.authorBio,
    });
    setAuthorEditor(null);
    refresh();
  }
  async function findAuthorPortrait(isAutoRetry = false) {
    if (!authorEditor?.authorName) return;
    setPortraitSearching(true);
    if (!isAutoRetry) setPortraitError(false);
    try {
      const res = await fetch(apiUrl("/api/author-portrait"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName: authorEditor.authorName, bookTitle: library.getBook(authorEditor.bookId)?.title || "", tried: authorEditor.tried || [] }),
      });
      const data = await res.json();
      const fallbackPortraits = data?.dataUrl ? [{ name: authorEditor.authorName, dataUrl: data.dataUrl, sourceUrl: data.sourceUrl || null }] : [];
      const list = await Promise.all((data.portraits || fallbackPortraits).map(async (p) => ({ name: p.name || authorEditor.authorName, dataUrl: p.dataUrl ? await shrinkDataUrl(p.dataUrl) : null, sourceUrl: p.sourceUrl || null })));
      const firstUrl = list.find((p) => p.dataUrl)?.dataUrl || "";
      if (firstUrl) {
        library.updateBookMeta(authorEditor.bookId, { authorPortrait: firstUrl, authorPortraits: list });
        const newTried = (data.portraits || fallbackPortraits).map((p) => p.sourceUrl).filter(Boolean);
        setAuthorEditor((prev) => ({ ...prev, authorPortrait: firstUrl, authorPortraits: list, tried: [...(prev.tried || []), ...newTried] }));
        refresh();
        return;
      }
      if (res.status === 503 && !isAutoRetry) {
        // sources were rate-limited, not empty - quietly try once more
        setTimeout(() => findAuthorPortrait(true), 6000);
        return;
      }
      throw new Error(data?.error || "not_found");
    } catch {
      setPortraitError(true);
      setAuthorEditor((prev) => (prev ? { ...prev, tried: [] } : prev));
      if (!isAutoRetry) notify("Author ki photo online nahi mil payi - naam ki spelling check karke phir try karein.", "error");
    } finally {
      setPortraitSearching(false);
    }
  }

  return (
    <div className="screen library-screen">
      <div className="aurora-bg" />
      <ScreenHeader
        title="Library"
        subtitle={`${books.length} book${books.length === 1 ? "" : "s"} on your shelf`}
        right={<button className="add-book-btn" onClick={nav.openNewBook}><Plus size={18} strokeWidth={2.6} /> Add book</button>}
      />
      <div className="book-grid">
        {books.length === 0 && (
          <div className="empty-library-state elevated">
            <MascotCorner mascot={mascot} size={92} context="library is empty" />
            <p className="empty-hint">No books yet. Tap "Add book" above to start one..</p>
          </div>
        )}
        {books.map((b, i) => {
        const chapters = library.getChapters(b.id);
        const total = chapters.length;
        const completed = chapters.filter((c) => !c.isPlaceholder && isChapterClosed(c)).length;
        const accent = BADGE_GRADIENTS[i % BADGE_GRADIENTS.length][0];
        const { date, time } = formatLastRead(b.lastReadAt);
        return (
          <Motion.div key={b.id} className="book-tile elevated" whileHover={{ y: -3, scale: 1.012 }} transition={INTERACTION_SPRING}>
            <button className="book-tile-delete" onClick={(e) => { e.stopPropagation(); setConfirmDelete(b); }} aria-label="Delete book">
              <Trash2 size={13} />
            </button>
            <div className="book-tile-body" role="button" tabIndex={0}
              onClick={() => nav.openChapterGrid(b.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); nav.openChapterGrid(b.id); } }}>
              <div className="book-tile-title">{b.title}</div>
              <div className="book-tile-progress-row">
                <span className="book-tile-progress-label">Chapters</span>
                <ChapterRing completed={completed} total={total} color={accent} />
                <span className="book-tile-progress-text" style={{ color: accent }}>{completed}/{total}</span>
              </div>
              <div className="book-tile-date"><span>Last read</span><span>{date} · {time}</span></div>
            </div>
            <div className="book-tile-footer">
              <button type="button" className="book-tile-author-btn" onClick={(e) => { e.stopPropagation(); openAuthorModal(b); }}>
                <User size={12} /> Author
              </button>
              <button className="book-tile-play" onClick={() => nav.openRecap(b.id)} aria-label="Start reading"><Play size={14} /></button>
            </div>
          </Motion.div>
        );
      })}
      </div>

      {confirmDelete && (
        <ConfirmModal
          title="Delete this book?"
          message={`"${confirmDelete.title}" and all its chapters and vocabulary will be permanently deleted. This can't be undone.`}
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {authorEditor && (
        <Motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={INTERACTION_SPRING} onClick={() => setAuthorEditor(null)}>
          <Motion.div className="modal-card elevated author-modal" initial={{ opacity: 0, y: 18, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={INTERACTION_SPRING} onClick={(e) => e.stopPropagation()}>
            {authorEditor.mode === "view" ? (
              <>
              <div className="author-info-card">
                  {(() => {
                    const faces = authorEditor.authorPortraits?.length
                      ? authorEditor.authorPortraits
                      : [{ name: authorEditor.authorName, dataUrl: authorEditor.authorPortrait }];
                    const hasAny = faces.some((f) => f.dataUrl);
                    return (
                      <>
                        <div className={`author-faces n${faces.length}`}>
                          {faces.map((f, i) => (
                            <div className="author-face" key={i}>
                              {f.dataUrl
                                ? <img className="author-info-portrait" src={f.dataUrl} alt={f.name} />
                                : <div className="author-info-avatar">{(f.name || "?")[0]?.toUpperCase()}</div>}
                              {faces.length > 1 && <span className="author-face-name">{f.name}</span>}
                            </div>
                          ))}
                        </div>
                        <div className="author-info-name">{authorEditor.authorName}</div>
                        {authorEditor.authorBio && <div className="author-info-bio">{authorEditor.authorBio}</div>}
                        {portraitSearching ? (
                          <div className="portrait-generating-hint">Searching online...</div>
                        ) : (
                          <button className="icon-button ghost portrait-generate-btn" onClick={findAuthorPortrait}>
                            {hasAny ? <RefreshCw size={14} /> : <Search size={14} />}{" "}
                            {portraitError ? "No photo found - Retry" : hasAny ? "Look up again" : "Find photo online"}
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
                <div className="modal-actions">
                  <button className="icon-button ghost" onClick={() => setAuthorEditor(null)}>Close</button>
                  <button className="primary-button" onClick={() => setAuthorEditor((prev) => ({ ...prev, mode: "edit" }))}>Edit</button>
                </div>
              </>
            ) : (
              <>
                <h2>Author details</h2>
                <input
                  className="title-input compact"
                  value={authorEditor.authorName}
                  onChange={(e) => setAuthorEditor((prev) => ({ ...prev, authorName: e.target.value }))}
                  placeholder="Author name"
                />
                <textarea
                  className="author-bio-input"
                  value={authorEditor.authorBio}
                  onChange={(e) => setAuthorEditor((prev) => ({ ...prev, authorBio: e.target.value }))}
                  placeholder="Comprehensive author bio (a few sentences)"
                  rows={5}
                />
                <div className="modal-actions">
                  <button className="icon-button ghost" onClick={() => setAuthorEditor(null)}>Cancel</button>
                  <button className="primary-button" onClick={saveAuthorInfo}>Save</button>
                </div>
              </>
            )}
          </Motion.div>
        </Motion.div>
      )}
    </div>
  );
}
// ==================== CHAPTER GRID ====================

function ChapterGridScreen({ bookId, nav }) {
  const book = library.getBook(bookId);
  if (!book) return <div className="screen"><ScreenHeader title="Book not found" onBack={nav.goBack} /></div>;

  const chapters = library.getChapters(bookId);
  const realChapters = chapters.filter((c) => !c.isPlaceholder);

  return (
    <ChapterGridTabs book={book} bookId={bookId} chapters={chapters} realChapters={realChapters} nav={nav} />
  );
}

function ChapterGridTabs({ book, bookId, chapters, realChapters, nav }) {
  const [view, setView] = useState("chapters");
  const { triggerLightTap } = useHaptic();
  return (
    <div className="screen chapter-grid-screen">
      <div className="aurora-bg" />
      <ScreenHeader title={book.title} subtitle={`${chapters.length} chapter${chapters.length === 1 ? "" : "s"}`} onBack={nav.goBack} />

      <div className="cg-tabs">
        <Motion.button className={`cg-tab ${view === "chapters" ? "on" : ""}`} whileTap={{ scale: 0.96 }} transition={INTERACTION_SPRING}
          onClick={() => { triggerLightTap(); setView("chapters"); }}>Chapters</Motion.button>
        <Motion.button className={`cg-tab ${view === "timeline" ? "on" : ""}`} whileTap={{ scale: 0.96 }} transition={INTERACTION_SPRING}
          onClick={() => { triggerLightTap(); setView("timeline"); }}>Journey Timeline</Motion.button>
      </div>

      {view === "timeline" ? (
        <div className="cg-timeline-wrap">
          {realChapters.length ? (
            <JourneyRecap embedded book={book} chapters={realChapters} />
          ) : (
            <p className="empty-hint">Kahani abhi shuru hui hai - pehla chapter padhna shuru karo, phir yahan timeline banegi.</p>
          )}
        </div>
      ) : (
      <div className="chapter-list-stack">
        {chapters.map((c) => {
          if (c.isPlaceholder) {
            return (
              <div key={c.number} className="chapter-card chapter-card-placeholder">
                <div className="chapter-card-header">
                  <span className="chapter-card-chapter">CH {c.number}</span>
                  <span className="chapter-card-status-text">Not Started</span>
                </div>
                <div className="chapter-card-title muted">Chapter {c.number}</div>
              </div>
            );
          }
          const isCurrent = c.number === book.currentChapterNumber;
          const isLocked = !isCurrent && c.number > book.currentChapterNumber;
          const status = getChapterStatus(c, isCurrent, isLocked);
          const pageRange = formatPageRange(c, { short: true });
          const gemsSaved = gemsStore.list().filter((g) => g.bookId === book.id && Number(g.chapterNumber ?? g.chapter) === c.number).length;
          const vocabCount = Array.isArray(c.vocabLog) ? c.vocabLog.length : 0;

          return (
            <Motion.button
              key={c.number}
              type="button"
              className={`chapter-card ${status.tone} ${isCurrent ? "active" : ""} ${isLocked ? "locked" : ""}`}
              whileHover={!isLocked ? { y: -3, scale: 1.01 } : undefined}
              whileTap={!isLocked ? { scale: 0.985 } : undefined}
              transition={INTERACTION_SPRING}
              onClick={() => !isLocked && nav.openChapterDetail(bookId, c.number)}
              disabled={isLocked}
            >
              <div className="chapter-card-top">
                <div className="chapter-card-left">
                  <span className="chapter-card-chapter">CH {c.number}</span>
                  <span className="chapter-card-page">{pageRange}</span>
                </div>
                <div className="chapter-card-status-box">
                  {isLocked && <Lock size={12} className="chapter-card-lock" />}
                  <span className={`chapter-card-status-pill ${status.tone}`}>{status.label}</span>
                </div>
              </div>

              <div className="chapter-card-title">{c.title}</div>

              <div className="chapter-card-footer">
                <span className="chapter-card-metrics">
                  <span className="chapter-card-metric">
                    <Gem size={12} className="chapter-card-gem-icon" />
                    {gemsSaved}
                  </span>
                  <span className="chapter-card-metric">
                    <BookOpen size={12} className="chapter-card-gem-icon" />
                    {vocabCount}
                  </span>
                </span>
                <span className="chapter-card-arrow">→</span>
              </div>
            </Motion.button>
          );
        })}
      </div>
      )}
    </div>
  );
}

// ==================== CHAPTER DETAIL ====================

function ChapterDetailScreen({ bookId, chapterNumber, nav }) {
  const [tab, setTab] = useState("summary");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [selectedVocab, setSelectedVocab] = useState(null);
  const [detailTab, setDetailTab] = useState("context");
  const [detailLang, setDetailLang] = useState("hindi");
  const { triggerLightTap } = useHaptic();
  const chapter = library.getChapter(bookId, chapterNumber);
  const book = library.getBook(bookId);

  if (!chapter || !book) return <div className="screen"><ScreenHeader title="Chapter not found" onBack={nav.goBack} /></div>;
  const storySource = resolveStorySource(book);

  function saveTitle() {
    if (titleDraft.trim()) library.renameChapter(bookId, chapterNumber, titleDraft.trim());
    setEditingTitle(false);
  }

  function speakText(text, language = "en-US") {
    if (!text || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    window.speechSynthesis.speak(utterance);
  }

  function getLanguageText(vocab, lang) {
    if (lang === "odia") {
      return vocab?.odiaMeaning || "Odia meaning not added yet.";
    }
    return vocab?.hindiMeaning || "Hindi meaning not added yet.";
  }

  const pageRange = formatPageRange(chapter);

  if (selectedVocab) {
    const vocab = buildVocabMetadata(selectedVocab);
    const dictionaryText = getLanguageText(vocab, detailLang);

    return (
      <div className="screen chapter-detail-screen">
        <div className="aurora-bg" />
        <header className="screen-header">
          <button className="gem-back-btn" onClick={() => window.history.back()} aria-label="Back to chapter">
            <ChevronRight size={18} className="back-chevron" />
          </button>
          <div className="header-left">
            <p className="eyebrow">{book.title} · Chapter {chapterNumber}</p>
            <h1 className="chapter-detail-title">{vocab.term}</h1>
          </div>
        </header>

        <div className="vocab-detail-tabs">
          <Motion.button className={`tab ${detailTab === "context" ? "active" : ""}`} whileTap={{ scale: 0.97 }} transition={INTERACTION_SPRING} onClick={() => setDetailTab("context")}>Context</Motion.button>
          <Motion.button className={`tab ${detailTab === "dictionary" ? "active" : ""}`} whileTap={{ scale: 0.97 }} transition={INTERACTION_SPRING} onClick={() => setDetailTab("dictionary")}>Analysis</Motion.button>
        </div>

        {detailTab === "context" ? (
          <div className="vocab-detail-panel">
            <div className="vocab-detail-card elevated">
              <div className="vocab-detail-label">Phrase from chapter</div>
              <div className="vocab-detail-quote">{vocab.sentence ? `“${vocab.sentence}”` : "The source sentence was not captured."}</div>

              <div className="vocab-detail-header-row">
                <div className="vocab-detail-subhead">{detailLang === "odia" ? "Odia" : "Hindi"} translation</div>
                <div className="vocab-language-toggle">
                  <Motion.button className={`lang-btn ${detailLang === "hindi" ? "active" : ""}`} whileTap={{ scale: 0.96 }} transition={INTERACTION_SPRING} onClick={() => { triggerLightTap(); setDetailLang("hindi"); }}>Hindi</Motion.button>
                  <Motion.button className={`lang-btn ${detailLang === "odia" ? "active" : ""}`} whileTap={{ scale: 0.96 }} transition={INTERACTION_SPRING} onClick={() => { triggerLightTap(); setDetailLang("odia"); }}>Odia</Motion.button>
                </div>
              </div>
              <div className="vocab-detail-meaning">
                {detailLang === "odia"
                  ? vocab.odiaSentence || "Sentence translation was not captured yet."
                  : vocab.hindiSentence || "Sentence translation was not captured yet."}
              </div>

              <div className="vocab-detail-example-block">
                <div className="vocab-detail-subhead">Meaning in this context</div>
                <div className="vocab-detail-meaning">{vocab.contextMeaning || vocab.meaning || "Contextual meaning not provided yet."}</div>
              </div>

              {vocab.example && (
                <div className="vocab-detail-example-block">
                  <div className="vocab-detail-subhead">Example</div>
                  <div className="vocab-detail-example">“{vocab.example}”</div>
                </div>
              )}

              {vocab.grammar && (
                <div className="vocab-detail-example-block">
                  <div className="vocab-detail-subhead">Grammar</div>
                  <div className="vocab-detail-example">{vocab.grammar}</div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="vocab-detail-panel">
            <div className="vocab-detail-card elevated">
              <div className="vocab-detail-header-row">
                <div className="vocab-detail-term-wrap">
                  <div className="vocab-detail-term">{vocab.term}</div>
                  {vocab.grammar && <span className="vocab-grammar">{vocab.grammar}</span>}
                </div>
                <button className="icon-button ghost square" onClick={() => speakText(vocab.term)} aria-label={`Listen to ${vocab.term}`} title="Listen to word">
                  <Volume2 size={16} />
                </button>
                <div className="vocab-language-toggle">
                  <Motion.button className={`lang-btn ${detailLang === "hindi" ? "active" : ""}`} whileTap={{ scale: 0.96 }} transition={INTERACTION_SPRING} onClick={() => { triggerLightTap(); setDetailLang("hindi"); }}>Hindi</Motion.button>
                  <Motion.button className={`lang-btn ${detailLang === "odia" ? "active" : ""}`} whileTap={{ scale: 0.96 }} transition={INTERACTION_SPRING} onClick={() => { triggerLightTap(); setDetailLang("odia"); }}>Odia</Motion.button>
                </div>
              </div>

              <button className="icon-button ghost square" onClick={() => speakText(dictionaryText, detailLang === "odia" ? "or-IN" : "hi-IN")} aria-label={`Listen to ${detailLang} translation`} title={`Listen to ${detailLang} translation`}>
                <Volume2 size={16} />
              </button>

              <div className="vocab-definition-block">
                <div className="vocab-detail-subhead">Part of speech</div>
                <div className="vocab-detail-meaning">{vocab.grammar || "Not specified"}</div>
              </div>

              {vocab.pronunciation && (
                <div className="vocab-definition-block">
                  <div className="vocab-detail-subhead">Pronunciation</div>
                  <div className="vocab-detail-meaning">{vocab.pronunciation}</div>
                </div>
              )}

              <div className="vocab-definition-block">
                <div className="vocab-detail-subhead">General meaning</div>
                <div className="vocab-detail-meaning">{vocab.meaning || "Meaning not provided yet."}</div>
              </div>

              <div className="vocab-definition-block">
                <div className="vocab-detail-subhead">{detailLang === "odia" ? "Odia" : "Hindi"} meaning</div>
                <div className="vocab-detail-meaning">{dictionaryText}</div>
              </div>

              {(Array.isArray(vocab.synonyms) && vocab.synonyms.length > 0) && (
                <div className="vocab-definition-block">
                  <div className="vocab-detail-subhead">Synonyms</div>
                  <div className="vocab-detail-tags">{vocab.synonyms.map((item) => <span key={item}>{item}</span>)}</div>
                </div>
              )}

              {(Array.isArray(vocab.antonyms) && vocab.antonyms.length > 0) && (
                <div className="vocab-definition-block">
                  <div className="vocab-detail-subhead">Antonyms</div>
                  <div className="vocab-detail-tags muted">{vocab.antonyms.map((item) => <span key={item}>{item}</span>)}</div>
                </div>
              )}

              {vocab.example && (
                <div className="vocab-definition-block">
                  <div className="vocab-detail-subhead">Example</div>
                  <div className="vocab-detail-example">“{vocab.example}”</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="screen chapter-detail-screen">
      <div className="aurora-bg" />
      <header className="screen-header">
        <button className="gem-back-btn" onClick={nav.goBack} aria-label="Back to chapters">
          <ChevronRight size={18} className="back-chevron" />
        </button>
        <div className="header-left">
          <p className="eyebrow">{book.title} · Chapter {chapterNumber}{pageRange ? ` · ${pageRange}` : ""}</p>
          {!editingTitle ? (
            <h1 className="chapter-detail-title" onClick={() => { setTitleDraft(chapter.title); setEditingTitle(true); }}>
              {chapter.title} <Pencil size={13} className="edit-hint-icon" />
            </h1>
          ) : (
            <div className="chapter-title-edit-row">
              <input className="title-input compact" autoFocus value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveTitle()} />
              <button className="icon-button ghost square" onClick={saveTitle}><Check size={14} /></button>
              <button className="icon-button ghost square" onClick={() => setEditingTitle(false)}><XIcon size={14} /></button>
            </div>
          )}
        </div>
      </header>

      <div className="tab-row">
        <Motion.button className={`tab ${tab === "summary" ? "active" : ""}`} whileTap={{ scale: 0.97 }} transition={INTERACTION_SPRING} onClick={() => setTab("summary")}>Summary</Motion.button>
        <Motion.button className={`tab ${tab === "vocab" ? "active" : ""}`} whileTap={{ scale: 0.97 }} transition={INTERACTION_SPRING} onClick={() => setTab("vocab")}>Vocabulary</Motion.button>
      </div>

      <div className="tab-viewport">
        <Motion.div className="tab-slider" initial={false} animate={{ x: tab === "summary" ? "0%" : "-50%" }} transition={INTERACTION_SPRING}>
          <div className="tab-panel">
            {chapter.jumpNote && <div className="jump-note elevated">Started out of order: {chapter.jumpNote}</div>}
            {chapter.completionNote && <div className="jump-note elevated">Closing note: {chapter.completionNote}</div>}
            {chapter.summary ? (
              <div className="plot-summary-card elevated">{chapter.summary}</div>
            ) : (
              <p className="empty-hint">No summary yet for this chapter - it'll build up automatically as you read across sessions, matching only what's actually covered so far.</p>
            )}
            {Number(chapterNumber) === Number(book.currentChapterNumber) && storySource.mode !== "empty" && (
              <button type="button" className="story-listen-button" onClick={() => nav.openStory(book.id)}>
                <Play size={16} /> Hear the story
              </button>
            )}
          </div>
          <div className="tab-panel">
            <div className="vocab-list">
              {chapter.vocabLog.length === 0 && <p className="empty-hint">No words logged for this chapter yet.</p>}
              {chapter.vocabLog.slice().reverse().map((v, i) => {
                const contextualMeaning = v.contextMeaning || v.meaning || "";
                const shortMeaning = v.meaning && v.contextMeaning && v.meaning !== v.contextMeaning ? v.meaning : "";

                return (
                  <button
                    type="button"
                    className="vocab-card elevated"
                    key={i}
                    style={{ "--badge": badgeGradient(i) }}
                    onClick={() => { nav.openOverlay(() => setSelectedVocab(null)); setSelectedVocab(v); }}
                  >
                    <div className="vocab-term-row">
                      <div className="vocab-term">{v.term}</div>
                      {v.grammar && <span className="vocab-grammar">{v.grammar}</span>}
                    </div>

                    {contextualMeaning && <div className="vocab-context"><strong>Context:</strong> {contextualMeaning}</div>}
                    {shortMeaning && <div className="vocab-meaning"><strong>Meaning:</strong> {shortMeaning}</div>}

                    {(v.hindiMeaning || v.odiaMeaning) && (
                      <div className="vocab-bilingual">
                        {v.hindiMeaning && <div><strong>Hindi:</strong> {v.hindiMeaning}</div>}
                        {v.odiaMeaning && <div><strong>Odia:</strong> {v.odiaMeaning}</div>}
                      </div>
                    )}

                    {(Array.isArray(v.synonyms) && v.synonyms.length > 0) || (Array.isArray(v.antonyms) && v.antonyms.length > 0) ? (
                      <div className="vocab-relations">
                        {Array.isArray(v.synonyms) && v.synonyms.length > 0 && (
                          <div><strong>Synonyms:</strong> {v.synonyms.join(", ")}</div>
                        )}
                        {Array.isArray(v.antonyms) && v.antonyms.length > 0 && (
                          <div><strong>Antonyms:</strong> {v.antonyms.join(", ")}</div>
                        )}
                      </div>
                    ) : null}

                    {v.sentence && <div className="vocab-sentence"><strong>In book:</strong> {v.sentence}</div>}
                    {v.example && <div className="vocab-example"><strong>Example:</strong> "{v.example}"</div>}
                  </button>
                );
              })}
            </div>
          </div>
        </Motion.div>
      </div>
    </div>
  );
}

// ==================== GEMS — book filter as a dropdown ====================

function GemsScreen({ nav }) {
  const [filterBook, setFilterBook] = useState("all");
  const [selectedGemId, setSelectedGemId] = useState(null);
  const [stylePicking, setStylePicking] = useState(false);
  const [storyGem, setStoryGem] = useState(null);
  const [, forceTick] = useState(0);
  const mascot = useMascotPreference();
  const allGems = gemsStore.list();
  const bookTitles = [...new Set(allGems.map((g) => g.bookTitle).filter(Boolean))];
  const gems = filterBook === "all" ? allGems : allGems.filter((g) => g.bookTitle === filterBook);

  useEffect(() => {
    const onGemsUpdate = () => forceTick((n) => n + 1);
    window.addEventListener("gems:updated", onGemsUpdate);
    return () => window.removeEventListener("gems:updated", onGemsUpdate);
  }, []);

  function getGemPreview(gem) {
    if (gem.summary && gem.summary.trim()) return gem.summary.trim();
    const raw = gem.quote || "A meaningful quote";
    return raw.length > 120 ? `${raw.slice(0, 117).trim()}…` : raw;
  }

  async function generateIllustration(gem, style) {
    setStylePicking(false);
    gemsStore.setSketchStyle(gem.id, style);
    gemsStore.markSketchPending(gem.id);
    forceTick((n) => n + 1);
    try {
      const res = await fetch(apiUrl("/api/sketch-gem"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style, quote: gem.quote, bookTitle: gem.bookTitle }),
      });
      const data = await res.json();
      if (!res.ok || !data?.dataUrl) throw new Error(data?.error || "no_image_returned");
      gemsStore.setSketchSuccess(gem.id, data.dataUrl);
    } catch {
      gemsStore.setSketchFailed(gem.id);
      notify("Illustration abhi nahi ban payi - backend server ya internet check karke phir try karein.", "error");
    }
    forceTick((n) => n + 1);
  }

  function getGemAuthor(gem) {
    const bookAuthor = gem?.bookId ? library.getBook(gem.bookId)?.authorName || "" : "";
    return (gem?.attributedTo || gem?.authorName || gem?.quoteSource || bookAuthor || "Author unknown").trim() || "Author unknown";
  }


  const selectedGem = selectedGemId ? gems.find((g) => g.id === selectedGemId) || null : null;

  if (selectedGem) {
    return (
        <div className="screen gem-detail-screen">
        <div className="aurora-bg" />
        <div className="gem-detail-header">
          <button className="gem-back-btn" onClick={() => window.history.back()} aria-label="Back to gems">
            <ChevronRight size={18} className="back-chevron" />
          </button>
          <div className="gem-detail-title-block">
            {selectedGem.bookTitle && <div className="gem-detail-book">{selectedGem.bookTitle}</div>}
            <div className="gem-detail-meta-row">
              {(selectedGem.attributedTo || selectedGem.authorName || selectedGem.quoteSource) && (
                <span className="gem-detail-author">{getGemAuthor(selectedGem)}</span>
              )}
              {Number.isFinite(Number(selectedGem.chapterNumber)) && (
                <span className="gem-detail-chapter">Chapter {selectedGem.chapterNumber}</span>
              )}
            </div>
          </div>
        </div>

        <div className="gem-detail-card elevated">
          <div className="gem-detail-quote">“{String(selectedGem.quote || "A meaningful quote").trim()}”</div>

          <div className="gem-detail-art-wrap">
            {selectedGem.sketch === "pending" && (
              <div className="gem-sketch-skeleton" aria-label="Sketch loading">
                <div className="gem-sketch-shimmer" />
              </div>
            )}
            {selectedGem.sketch && typeof selectedGem.sketch === "object" && selectedGem.sketch.dataUrl && (
              <div className="gem-art-card">
                <img className="gem-sketch-image" src={selectedGem.sketch.dataUrl} alt="Decorative illustration for saved gem" />
                <div className="gem-art-overlay" aria-hidden="true" />
              </div>
            )}
            {selectedGem.sketch === "failed" && (
              <button className="gem-retry-btn" onClick={() => generateIllustration(selectedGem, selectedGem.sketchStyle || pickGemArtStyle(selectedGem))}>
                Illustration failed - Retry
              </button>
            )}
            {!selectedGem.sketch && !stylePicking && (
              <button className="icon-button ghost illustration-cta" onClick={() => setStylePicking(true)}>
                <ImageIcon size={14} /> Generate illustration for this quote
              </button>
            )}
            {stylePicking && (
              <div className="portrait-style-grid">
                {GEM_ART_STYLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    className={`portrait-style-btn ${pickGemArtStyle(selectedGem) === opt.id ? "suggested" : ""}`}
                    onClick={() => generateIllustration(selectedGem, opt.id)}
                  >
                    <div className="portrait-style-label">{opt.label}{pickGemArtStyle(selectedGem) === opt.id ? " · Suggested" : ""}</div>
                    <div className="portrait-style-desc">{opt.desc}</div>
                  </button>
                ))}
              </div>
            )}
            {selectedGem.sketch && typeof selectedGem.sketch === "object" && !stylePicking && (
              <button className="icon-button ghost illustration-cta" onClick={() => setStylePicking(true)}>
                <RefreshCw size={14} /> Regenerate illustration
              </button>
            )}
          </div>
          {/* <button className="icon-button ghost illustration-cta" style={{ marginBottom: 16 }} onClick={() => setStoryGem(selectedGem)}>
            <Share2 size={14} /> Create story card
          </button>    */}
          <div className="gem-application-block">
            <div className="gem-application-label">Real-life application</div>
            {selectedGem.takeawaySituation || selectedGem.takeawaySteps?.length ? (
              <div className="gem-takeaway-structured">
                {selectedGem.takeawaySituation && (
                  <div className="gem-takeaway-part">
                    <div className="gem-takeaway-heading">Situation</div>
                    <div className="gem-takeaway-text">{selectedGem.takeawaySituation}</div>
                  </div>
                )}
                {selectedGem.takeawaySteps?.length > 0 && (
                  <div className="gem-takeaway-part">
                    <div className="gem-takeaway-heading">Steps</div>
                    <ol className="gem-takeaway-steps">
                      {selectedGem.takeawaySteps.map((step, i) => <li key={i}>{step}</li>)}
                    </ol>
                  </div>
                )}
                {selectedGem.takeawayExample && (
                  <div className="gem-takeaway-part">
                    <div className="gem-takeaway-heading">Example</div>
                    <div className="gem-takeaway-text">{selectedGem.takeawayExample}</div>
                  </div>
                )}
                {selectedGem.takeawayWhyItMatters && (
                  <div className="gem-takeaway-part">
                    <div className="gem-takeaway-heading">Why it matters</div>
                    <div className="gem-takeaway-text">{selectedGem.takeawayWhyItMatters}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="gem-application">{selectedGem.takeaway || selectedGem.application || "Keep this idea close and apply it in a small, concrete way."}</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen gems-screen">
      <div className="aurora-bg" />
      {storyGem && <GemStoryCard gem={storyGem} author={getGemAuthor(storyGem)} onClose={() => window.history.back()} />}
      <ScreenHeader title="Gems" subtitle={`${gems.length} saved`} onProfile={nav.goProfile} />

      {bookTitles.length > 0 && (
        <div className="gems-filter-row">
          <select className="book-select" value={filterBook} onChange={(e) => setFilterBook(e.target.value)}>
            <option value="all">All books</option>
            {bookTitles.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      )}

      <div className="gems-list">
        {gems.length === 0 && (
          <div className="empty-state-card elevated tiny-mascot-card">
            <MascotCorner mascot={mascot} size={80} context="no gems saved yet" />
            <p className="empty-hint">No quotes saved yet. During a session, say "save this quote".</p>
          </div>
        )}
        {gems.map((g, i) => (
          <div className="gem-card elevated compact" key={g.id} style={{ "--badge": badgeGradient(i) }}>
            <div className="gem-card-toolbar">
              <div className="gem-badge"><Gem size={16} /></div>
              <div className="gem-toolbar-actions">
                <button className="gem-download-btn" onClick={(e) => { e.stopPropagation(); nav.openOverlay(() => setStoryGem(null)); setStoryGem(g); }} aria-label="Download gem card">
                  <Download size={14} />
                </button>
                <button className="gem-delete-btn" onClick={(e) => { e.stopPropagation(); gemsStore.remove(g.id); forceTick((n) => n + 1); if (selectedGemId === g.id) setSelectedGemId(null); }} aria-label="Delete gem">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <Motion.button className="gem-card-toggle" whileHover={{ y: -3, scale: 1.01 }} whileTap={{ scale: 0.985 }} transition={INTERACTION_SPRING} onClick={() => { nav.openOverlay(() => { setSelectedGemId(null); setStylePicking(false); }); setSelectedGemId(g.id); }}>
              <div className="gem-preview-block">
                {g.bookTitle && (
                  <div className="gem-book-title">
                    {g.bookTitle}{Number.isFinite(Number(g.chapterNumber)) ? ` · Ch. ${g.chapterNumber}` : ""}
                  </div>
                )}
                <div className="gem-preview-quote">{getGemPreview(g)}</div>
              </div>
              <div className="gem-chevron-wrap"><ChevronRight size={18} /></div>
            </Motion.button>
          </div>
        ))}
      </div>
    </div>
  );
}

function MemoryTab({ nav }) {
  const [data, setData] = useState(() => ({ books: library.listBooks(), gems: gemsStore.list() }));
  const [tab, setTab] = useState("list");
  const tabs = [
    { id: "list", label: "Preferences", Icon: Brain },
    { id: "map", label: "Mind Map", Icon: Network },
  ];
  const spring = INTERACTION_SPRING;
  const { triggerLightTap } = useHaptic();

  // keep the mind map fresh: gems saved during sessions arrive via this event
  useEffect(() => {
    const refresh = () => setData({ books: library.listBooks(), gems: gemsStore.list() });
    window.addEventListener("gems:updated", refresh);
    return () => window.removeEventListener("gems:updated", refresh);
  }, []);

  return (
    <div className="mem-tab">
      <ScreenHeader title="Memory" subtitle="Preferences & your mind map" />

      <div className="mem-switch" role="tablist">
        <div className="mem-switch-in">
          <Motion.span className="mem-pill" initial={false} animate={{ x: tab === "list" ? "0%" : "100%" }} transition={spring} />
          {tabs.map(({ id, label, Icon }) => (
            <Motion.button key={id} role="tab" aria-selected={tab === id} className={`mem-tab-btn ${tab === id ? "on" : ""}`} whileTap={{ scale: 0.96 }} transition={spring} onClick={() => { triggerLightTap(); setTab(id); if (id === "map") setData({ books: library.listBooks(), gems: gemsStore.list() }); }}>
              <Icon size={15} /> {label}
            </Motion.button>
          ))}
        </div>
      </div>

      <div className="mem-viewport">
        <Motion.div className="mem-track" initial={false} animate={{ x: tab === "list" ? "0%" : "-50%" }} transition={spring}>
          <div className="mem-pane scroll"><MemoryScreen nav={nav} /></div>
          <div className="mem-pane"><MemoryConstellation books={data.books} gems={data.gems} paused={tab !== "map"} /></div>
        </Motion.div>
      </div>
    </div>
  );
}
// ==================== MEMORY ====================

function MemoryScreen() {
  const [, setTick] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editingText, setEditingText] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const mascot = useMascotPreference();
  const memories = memoryStore?.memories || [];

  function handleDeleteConfirmed() {
    if (confirmDelete !== null) { memoryStore.remove(confirmDelete); setConfirmDelete(null); setTick((n) => n + 1); }
  }
  function startEdit(text) {
    setEditingText(text);
    setEditDraft(text);
  }
  function saveEdit() {
    if (editingText !== null && editDraft.trim()) memoryStore.update(editingText, editDraft.trim());
    setEditingText(null);
    setTick((n) => n + 1);
  }

  return (
    <div className="memory-screen">
      <div className="memory-list">
        {memories.length === 0 && (
          <div className="empty-state-card elevated tiny-mascot-card">
            <MascotCorner mascot={mascot} size={80} context="no memories saved yet" />
            <p className="empty-hint">No preferences saved yet.</p>
          </div>
        )}
        {memories.slice().reverse().map((m, i) => (
          <Motion.div className="memory-card elevated" key={i} whileHover={{ y: -2 }} transition={INTERACTION_SPRING}>
            {editingText === m.text ? (
              <div className="memory-edit-row">
                <input
                  className="title-input compact memory-edit-input"
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                  autoFocus
                />
                <button className="icon-button ghost square" onClick={saveEdit}><Check size={14} /></button>
                <button className="icon-button ghost square" onClick={() => setEditingText(null)}><XIcon size={14} /></button>
              </div>
            ) : (
              <>
                <div className="memory-text-block">
                  <span className="memory-text">{m.text}</span>
                  {m.timestamp && <span className="memory-timestamp">{formatDateTime(m.timestamp)}</span>}
                </div>
                <div className="memory-card-actions">
                  <button className="memory-edit" onClick={() => startEdit(m.text)} aria-label="Edit memory"><Pencil size={13} /></button>
                  <button className="memory-delete" onClick={() => setConfirmDelete(m.text)} aria-label="Delete memory"><Trash2 size={14} /></button>
                </div>
              </>
            )}
          </Motion.div>
        ))}
      </div>
      {confirmDelete !== null && (
        <ConfirmModal title="Delete this memory?" message="This preference will be permanently deleted." onConfirm={handleDeleteConfirmed} onCancel={() => setConfirmDelete(null)} />
      )}
    </div>
  );
}
// ==================== PROFILE — with photo upload + default presets ====================

function ProfileScreen({ nav }) {
  const [name, setName] = useState(profileStore.data.name);
  const mascot = useMascotPreference();
  const [, forceUpdate] = useState(0);
  const fileInputRef = useRef(null);

  async function handleAvatarPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await resizeImageToDataUrl(file);
    profileStore.setAvatar(dataUrl);
    forceUpdate((n) => n + 1);
  }
  function handleAvatarRemove() {
    profileStore.clearAvatar();
    forceUpdate((n) => n + 1);
  }
  function handlePresetPick(idx) {
    profileStore.clearAvatar();
    profileStore.setAvatarPreset(idx);
    forceUpdate((n) => n + 1);
  }

  const hasPhoto = !!profileStore.data.avatar;

  return (
    <div className="screen profile-screen">
      <div className="aurora-bg" />
      <header className="screen-header">
        <div className="header-left">
          <h1>Profile</h1>
        </div>
      </header>

      <div className="profile-identity">
        <div className="profile-avatar-wrap">
          <button className="profile-avatar" onClick={() => fileInputRef.current?.click()}>
            {renderAvatar(30)}
          </button>
          <button className="avatar-edit-btn" onClick={() => fileInputRef.current?.click()} aria-label="Upload photo">
            <CameraIcon size={12} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarPick} />
        </div>
        {hasPhoto && <button className="avatar-remove-link" onClick={handleAvatarRemove}>Remove photo</button>}

        <div className="avatar-preset-row">
          {AVATAR_PRESETS.map(({ Icon, gradient }, idx) => (
            <button
              key={idx}
              className={`avatar-preset-swatch ${!hasPhoto && profileStore.data.avatarPreset === idx ? "selected" : ""}`}
              style={{ background: gradient }}
              onClick={() => handlePresetPick(idx)}
              aria-label={`Choose default icon ${idx + 1}`}
            >
              <Icon size={16} color="#fff" />
            </button>
          ))}
        </div>

        <input className="profile-name-input" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => profileStore.setName(name)} />
        <div className="profile-streak-chip"><Flame size={13} /> {profileStore.getStreak()}-day streak</div>
      </div>

            <div className="settings-group">
        <div className="settings-group-title">Companion</div>
        <div className="profile-mascot-card elevated">
          <div className="profile-mascot-header">
            <span className="profile-mascot-title">Companion</span>
            <div className="profile-mascot-mini"><MascotCharacter characterId={mascot || "owl"} size={28} animated={false} /></div>
          </div>
          <div className="mascot-picker-grid">
            {["owl", "robot", "sprout", "fox", "book"].map((id) => (
              <button key={id} type="button" className={`mascot-picker-button ${mascot === id ? "selected" : ""}`}
                onClick={() => { setMascot(id); forceUpdate((n) => n + 1); }} aria-label={`Choose ${id} mascot`}>
                <MascotCharacter characterId={id} size={42} animated={false} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="settings-group">
        <div className="settings-group-title">More</div>
        {[
          { Icon: SettingsIcon, label: "Settings", hint: "Theme, voice, backup, privacy", go: nav.goSettings, badge: nav.badges?.settings },
          { Icon: Bug, label: "Report an issue", hint: "Bugs, ideas and improvements", go: nav.goReport },
          { Icon: Info, label: "About", hint: "Why this app exists", go: nav.goAbout },
        ].map(({ Icon, label, hint, go, badge }) => (
          <div key={label} className="settings-row elevated" onClick={go} role="button">
            <div className="settings-row-icon"><Icon size={17} /></div>
            <div className="settings-row-text"><div className="settings-row-label">{label}</div><div className="settings-row-hint">{hint}</div></div>
            {badge > 0 && <span className="rc-badge" aria-label={`${badge} pending`}>{badge}</span>}
            <ChevronRight size={18} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SessionScreen({ bookId, onEnd }) {
  const book = library.getBook(bookId);
  const [lookedUpCover, setLookedUpCover] = useState({ bookId: null, dataUrl: "" });
  const auraImageUrl = book?.coverImage || (lookedUpCover.bookId === bookId ? lookedUpCover.dataUrl : "") || book?.coverUrl || book?.authorPortrait || "";
  const auraColor = useBookAura(auraImageUrl);
  const { triggerLightTap, triggerSuccess } = useHaptic();
  const [status, setStatus] = useState("Connecting...");
  const [speaking, setSpeaking] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [muted, setMuted] = useState(false);
  const [, setSleepState] = useState("active");
  const [chapterNumber, setChapterNumber] = useState(book?.currentChapterNumber || 1);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [, setMeterLevel] = useState(0);
  const [cameraExpanded, setCameraExpanded] = useState(false);
  const [orbVisual, setOrbVisual] = useState({ orbMode: "idle" });
  const [elapsed, setElapsed] = useState(0);
  const [sessionStats, setSessionStats] = useState({ words: 0, gems: 0 });
  const [isGhostMode, setIsGhostMode] = useState(false);
  const [ghostToast, setGhostToast] = useState(false);
  const [activities, setActivities] = useState([]);
  const [liveActivity, setLiveActivity] = useState(null);
  const [feedOpen, setFeedOpen] = useState(false);
  const activitiesRef = useRef([]);
  const activityTimerRef = useRef(null);
  const sessionMascot = useMascotPreference();
  useEffect(() => {
    if (!book?.title || book.coverImage) return undefined;
    let cancelled = false;
    fetch(apiUrl("/api/book-cover"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: book.title, author: book.authorName || "" }),
    }).then(async (response) => {
      if (!response.ok) return null;
      return response.json();
    }).then((cover) => {
      if (cancelled || !cover?.dataUrl) return;
      setLookedUpCover({ bookId, dataUrl: cover.dataUrl });
      library.updateBookMeta(bookId, { coverImage: cover.dataUrl, coverUrl: cover.coverUrl || "" });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [bookId, book?.title, book?.authorName, book?.coverImage]);
  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!ghostToast) return undefined;
    const id = setTimeout(() => setGhostToast(false), 3500);
    return () => clearTimeout(id);
  }, [ghostToast]);
  const micLevelRef = useRef(0);
  const speakingNowRef = useRef(false);
  const outputLevelRef = useRef(0);
  const openerSavedRef = useRef(false);
  const contRef = useRef(null);
  const orbLevelRef = useRef(0);
  const darkFramesRef = useRef(0);
  const lastDarkNoteRef = useRef(0);

  const clientRef = useRef(null);
  const audioCaptureRef = useRef(null);
  const audioPlaybackRef = useRef(null);
  const cameraRef = useRef(null);
  const userTurnBufRef = useRef("");
  const userTurnCountRef = useRef(0);
  const lastUserTurnRef = useRef("");
  const pendingVocabularyRef = useRef(null);
  const companionTurnBufRef = useRef("");
  const turnActedRef = useRef(false);
  const chapterNumberRef = useRef(book?.currentChapterNumber || 1);
  const videoEl = useRef(null);
  const canvasEl = useRef(null);

  const endingRef = useRef(false);
  const prevSpeakingRef = useRef(false);
  const lastActivityRef = useRef(Date.now());
  const sleepStateRef = useRef("active");
  // useEffect(() => {
  //   if (!import.meta.env.DEV) return undefined;
  //   const id = setInterval(() => {
  //     const s = clientRef.current?.stats;
  //     if (s) setDbg(`sent ${s.sent} · got ${s.recv} · heard ${s.heard} · mic ${micLevelRef.current.toFixed(2)}${s.err ? " · ERR " + s.err : ""}`);
  //   }, 1000);
  //   return () => clearInterval(id);
  // }, []);
  useEffect(() => {
    library.endSession(bookId);
    connectSession();
    library.touch(bookId);
    library.startSession(bookId);
    profileStore.markActiveToday();
    lastActivityRef.current = Date.now();

    const sleepInterval = setInterval(() => {
      if (endingRef.current) return;
      const idleMs = Date.now() - lastActivityRef.current;
      if (sleepStateRef.current === "active" && idleMs > SILENCE_CHECK_MS) {
        sleepStateRef.current = "checking";
        setSleepState("checking");
        lastActivityRef.current = Date.now() - (SILENCE_CHECK_MS - SILENCE_SHUTDOWN_MS);
        setStatus("Checking in...");
        clientRef.current?.sendText("[SYSTEM NOTE] Kaafi der se reader ne kuch nahi bola - ho sakta hai so gaye hon. Ek chhota, dheema check-in karo Hinglish mein.");
      } else if (sleepStateRef.current === "checking" && idleMs > SILENCE_SHUTDOWN_MS) {
        quietShutdown();
      }
    }, 15000);

    return () => {
      clearInterval(sleepInterval);
      clearTimeout(activityTimerRef.current);
      clientRef.current?.close();
      audioPlaybackRef.current?.close();
      audioCaptureRef.current?.stop();
      cameraRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (endingRef.current && prevSpeakingRef.current && !speaking) handleEnd();
    prevSpeakingRef.current = speaking;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speaking]);

  function appendLine(speaker, text) {
    const cleanText = String(text || "").trim();
    if (!cleanText) return;
    saveTurn(bookId, speaker, cleanText);
    library.beat(bookId);
    setTranscript((t) => [...t.slice(-30), { speaker, text: cleanText }]);
  }
  function markActive() { lastActivityRef.current = Date.now(); sleepStateRef.current = "active"; setSleepState("active"); }

  // the session mascot narrates everything the model quietly does in the background
  function pushActivity(icon, text) {
    const item = { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, icon, text, createdAt: new Date().toISOString() };
    const next = [...activitiesRef.current.slice(-7), item];
    activitiesRef.current = next;
    setActivities(next);
    setLiveActivity(item);
    clearTimeout(activityTimerRef.current);
    activityTimerRef.current = setTimeout(() => setLiveActivity(null), 4600);
  }

  function beginGracefulEnd() {
    if (endingRef.current) return;
    endingRef.current = true;
    setStatus("Saying goodnight...");
    audioCaptureRef.current?.setMuted(true);
    clientRef.current?.sendText("[SYSTEM NOTE] Reader ne session khatam karne ko kaha hai - ek chhota warm goodnight Hinglish mein bolo, phir chup ho jao.");
    setTimeout(() => { if (endingRef.current) handleEnd(); }, 8000);
  }
  function quietShutdown() {
    if (endingRef.current) return;
    endingRef.current = true;
    setStatus("Session ending (silence)");
    handleEnd();
  }

  async function startCameraThenNotify() {
    if (cameraOn || !videoEl.current) return;
    setCameraOn(true);
    setCameraExpanded(false);
    cameraRef.current = new CameraCapture(
      videoEl.current, canvasEl.current,
      (base64Jpeg) => clientRef.current?.sendVideoFrame(base64Jpeg),
       (ok, reason) => {
        if (ok) { darkFramesRef.current = 0; return; }
        darkFramesRef.current += 1;
        const now = Date.now();
        if (darkFramesRef.current >= 6 && now - lastDarkNoteRef.current > 90000) {
          lastDarkNoteRef.current = now;
          clientRef.current?.sendText(reason === "blurry"
            ? "[SYSTEM NOTE] Camera ki picture dhundhli hai, focus nahi mil raha. Sirf EK chhoti, saral Hinglish line mein kaho ki phone ko thoda peeche karke ya book ko seedha karke do second ruk jaaye. Reader ka naam mat lo. Picture saaf hone tak dobara mat bolo."
            : "[SYSTEM NOTE] Camera abhi dark/black dikh raha hai. Sirf EK chhoti Hinglish line bolo ki camera dhaka hua ya galat jagah ho sakta hai. Reader ka naam mat lo. Jab tak camera theek na ho, dobara mat bolo.");
        }
      }
    );
    try {
      await cameraRef.current.start();
    } catch (e) {
      setStatus(`Camera error: ${e.message}`);
      setCameraOn(false);
    }
  }
  function stopCameraNow() { cameraRef.current?.stop(); cameraRef.current = null; setCameraOn(false); setCameraExpanded(false); }
  function toggleMute() { triggerLightTap(); const next = !muted; setMuted(next); audioCaptureRef.current?.setMuted(next); }
  function toggleCamera() {
    triggerLightTap();
    if (cameraOn) stopCameraNow();
    else startCameraThenNotify();
  }
  function toggleTranscript() { triggerLightTap(); setTranscriptOpen((value) => !value); }
  function toggleGhostMode() {
    const next = !isGhostMode;
    setIsGhostMode(next);
    setGhostToast(next);
    triggerSuccess();
    const author = book?.authorName || "the author of this book";
    clientRef.current?.sendText(next
      ? `[SYSTEM NOTE] Author's Ghost Mode is ON. Let explanations draw on ${author}'s known themes and broad literary perspective while remaining the reader's companion. This is imaginative mode: do not claim to literally be the author, invent personal memories, or fabricate quotations. Keep responses grounded in the actual book and speak naturally in Hinglish.`
      : "[SYSTEM NOTE] Author's Ghost Mode is OFF. Return to your usual warm reading-companion voice and answer plainly in Hinglish.");
  }

  function addVocabularyEntry(entry, chapter = chapterNumberRef.current) {
    const saved = library.addVocab(bookId, chapter, entry);
    if (saved) {
      setSessionStats((stats) => ({ ...stats, words: stats.words + 1 }));
      pushActivity("word", `Naya word save hua: ${entry.term || ""}`);
    }
    return saved;
  }

  function handleUserTurnText(fullText) {
    fullText = fullText.trim();
    if (!fullText) return;
    appendLine("reader", fullText);
    const pendingVocabulary = pendingVocabularyRef.current;
    if (pendingVocabulary && pendingVocabulary.requestTurn < userTurnCountRef.current) {
      if (VOCAB_DECLINE_TRIGGER.test(fullText) || !VOCAB_CONFIRM_TRIGGER.test(fullText)) {
        pendingVocabularyRef.current = null;
      }
    }
    const explicitPersonalMemory = EXPLICIT_MEMORY_TRIGGER.test(fullText) &&
      !SAVE_GEM_TRIGGER.test(fullText) && !NON_MEMORY_CONTENT_TRIGGER.test(fullText);
    if (explicitPersonalMemory) {
      fetch(apiUrl("/api/rephrase-memory"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: fullText }) })
        .then((r) => r.json()).then(({ fact }) => fact && memoryStore.add(fact)).catch(() => {});
    }
    lastUserTurnRef.current = fullText;
    userTurnCountRef.current += 1;
  }

  function isProbableNoiseGemQuote(quote) {
    if (!quote || typeof quote !== "string") return true;
    const clean = quote.trim();
    if (!clean) return true;
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length < 4) return true;
    const uniqueWords = new Set(words.map((word) => word.toLowerCase()));
    const repeatedRatio = (words.length - uniqueWords.size) / Math.max(words.length, 1);
    if (repeatedRatio > 0.45) return true;
    if (/^(?:hi|hello|hey|hii|yeah|yes|no|ok|okay|thanks|thank you|yaar|bro|bhai|hmm|um|uh)$/i.test(clean)) return true;
    return false;
  }

   async function finalizeSessionArtifacts() {
    const transcriptSnapshot = transcript;
    const currentMemories = memoryStore?.memories || [];
    try {
      const summaryRes = await fetch(apiUrl("/api/compact-session"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcriptSnapshot, existingMemories: currentMemories }),
      });
      const summaryJson = await summaryRes.json();
      if (Array.isArray(summaryJson?.facts)) {
        summaryJson.facts.forEach((fact) => memoryStore.add(fact));
      }
    } catch {
      // End-of-session summarization is best-effort and must never block the app.
    }
  }
  async function tryFetchAuthorPortraitInBackground(authorName) {
    if (!authorName || !authorName.trim()) return;
    const current = library.getBook(bookId);
    if (current?.authorPortraits?.some((p) => p.dataUrl)) return;
    try {
      const res = await fetch(apiUrl("/api/author-portrait"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName, bookTitle: book?.title || "" }),
      });
      const data = await res.json();
      if (res.ok && (data?.dataUrl || (data?.portraits || []).some((p) => p.dataUrl))) {
        const list = await Promise.all((data.portraits || []).map(async (p) => ({ name: p.name, dataUrl: p.dataUrl ? await shrinkDataUrl(p.dataUrl) : null })));
        library.updateBookMeta(bookId, { authorPortrait: list.find((p) => p.dataUrl)?.dataUrl || "", authorPortraits: list });
      }
    } catch {
      // silent - Library mein manual retry hai
    }
  }
  async function handleToolCall(toolCall) {
    const responses = [];
    for (const fc of toolCall.functionCalls || []) {
      let result = { status: "ignored" };
      try {
      if (fc.name === "save_memory") {
        const fact = fc.args?.fact;
        const currentUserText = userTurnBufRef.current.trim();
        const explicitPersonalMemory = EXPLICIT_MEMORY_TRIGGER.test(currentUserText) &&
          !SAVE_GEM_TRIGGER.test(currentUserText) && !NON_MEMORY_CONTENT_TRIGGER.test(currentUserText);
        result = explicitPersonalMemory && typeof fact === "string" && memoryStore.add(fact)
          ? { status: "saved" }
          : { status: "not_explicitly_requested", message: "Do not save this. Reader memory is only for personal facts they explicitly asked to remember; quotes, gems, book facts, and vocabulary belong elsewhere." };
      } else if (fc.name === "log_vocabulary") {
        const { term, meaning, contextMeaning, example, grammar, pronunciation, synonyms, antonyms, hindiMeaning, odiaMeaning, hindiSentence, odiaSentence, sentence } = fc.args || {};
        const currentUserText = userTurnBufRef.current.trim();
        const currentTurn = userTurnCountRef.current;
        const entry = {
          term,
          meaning,
          contextMeaning,
          example,
          grammar,
          pronunciation,
          synonyms,
          antonyms,
          hindiMeaning,
          odiaMeaning,
          hindiSentence,
          odiaSentence,
          sentence,
        };
        const pendingVocabulary = pendingVocabularyRef.current;
        const confirmedPendingWord = pendingVocabulary &&
          pendingVocabulary.requestTurn < currentTurn &&
          String(pendingVocabulary.entry.term || "").toLowerCase() === String(term || "").toLowerCase();
        const directlyRequested = EXPLICIT_VOCAB_SAVE_TRIGGER.test(currentUserText);
        if (confirmedPendingWord && !VOCAB_DECLINE_TRIGGER.test(currentUserText) && VOCAB_CONFIRM_TRIGGER.test(currentUserText)) {
          pendingVocabularyRef.current = null;
          result = addVocabularyEntry(pendingVocabulary.entry, pendingVocabulary.chapter) ? { status: "saved" } : { status: "skipped" };
        } else if (directlyRequested && !VOCAB_DECLINE_TRIGGER.test(currentUserText)) {
          pendingVocabularyRef.current = null;
          result = addVocabularyEntry(entry) ? { status: "saved" } : { status: "skipped" };
        } else if (confirmedPendingWord && VOCAB_DECLINE_TRIGGER.test(currentUserText)) {
          pendingVocabularyRef.current = null;
          result = { status: "declined" };
        } else {
          pendingVocabularyRef.current = { entry, chapter: chapterNumberRef.current, requestTurn: currentTurn };
          result = {
            status: "needs_confirmation",
            message: "This word has NOT been saved. Explain it first, then ask whether the reader wants it added to this book chapter's vocabulary. Wait for a clear yes; if they say no or change topic, discard it.",
          };
        }
      } else if (fc.name === "update_chapter_summary") {
        const summary = fc.args?.summary;
        if (typeof summary === "string") { library.updateChapterSummary(bookId, chapterNumberRef.current, summary); result = { status: "saved" }; }
      } else if (fc.name === "set_current_chapter") {
        const num = Number(fc.args?.chapterNumber);
        const justification = fc.args?.justification;
        const title = fc.args?.title;
        if (!Number.isFinite(num) || num < 1) {
          result = { status: "invalid" };
        } else {
          const outcome = library.setCurrentChapter(bookId, num, justification, title);
          if (outcome.ok) { chapterNumberRef.current = num; setChapterNumber(num); result = { status: "saved" }; }
          else if (outcome.needsJustification) result = { status: "needs_justification", message: "This jumps ahead of the current chapter - ask the reader why, then call again with their reason as justification." };
          else result = { status: "skipped" };
        }
      } else if (fc.name === "rename_chapter") {
        const num = Number(fc.args?.chapterNumber);
        const title = fc.args?.title;
        if (Number.isFinite(num) && title) { library.renameChapter(bookId, num, title); result = { status: "saved" }; }
        else result = { status: "invalid" };
      } else if (fc.name === "set_book_author") {
        const authorName = fc.args?.authorName;
        const authorBio = fc.args?.authorBio;
        if (typeof authorName === "string" && authorName.trim()) {
          library.updateBookMeta(bookId, { authorName, authorBio: typeof authorBio === "string" ? authorBio : undefined });
          tryFetchAuthorPortraitInBackground(authorName);
          result = { status: "saved" };
        } else {
          result = { status: "invalid" };
        }
      } else if (fc.name === "set_chapter_pages") {
        const num = Number(fc.args?.chapterNumber);
        const startPage = Number(fc.args?.startPage);
        const endPage = Number(fc.args?.endPage);
        if (Number.isFinite(num)) {
          library.setChapterPages(bookId, num, Number.isFinite(startPage) ? startPage : undefined, Number.isFinite(endPage) ? endPage : undefined);
          result = { status: "saved" };
        } else {
          result = { status: "invalid" };
        }
      } else if (fc.name === "save_gem") {
        const { quote, takeawaySituation, takeawaySteps, takeawayExample, takeawayWhyItMatters, authorName, authorBio } = fc.args || {};
        const cleanQuote = typeof quote === "string" ? quote.trim() : "";
        const finalAuthorName = (typeof authorName === "string" && authorName.trim()) ? authorName.trim() : (book?.authorName || "");
        if (!cleanQuote || isProbableNoiseGemQuote(cleanQuote)) {
          result = { status: "needs_confirmation", message: "I need the exact quote or line from the book before saving it as a gem. Please confirm the exact text or repeat the line clearly." };
        } else {
          const saved = gemsStore.add({
            quote: cleanQuote,
            takeawaySituation,
            takeawaySteps,
            takeawayExample,
            takeawayWhyItMatters,
            bookTitle: book?.title,
            bookId: bookId,
            chapter: chapterNumberRef.current,
            chapterNumber: chapterNumberRef.current,
            authorName: finalAuthorName,
            attributedTo: finalAuthorName,
            quoteSource: (typeof authorBio === "string" && authorBio.trim()) ? authorBio.trim() : (book?.authorBio || ""),
          });
          result = saved ? { status: "saved" } : { status: "skipped" };
        }
      }else if (fc.name === "set_chapter_outline") {
        const saved = library.setChapterOutline(bookId, fc.args?.chapters);
        result = saved > 0 ? { status: "saved", chaptersSaved: saved } : { status: "invalid" };
      }else if (fc.name === "get_reading_status") {
        const b = library.getBook(bookId);
        const all = library.getChapters(bookId);
        const real = all.filter((c) => !c.isPlaceholder);
        const cur = b?.chapters?.[chapterNumberRef.current];
        result = {
          status: "ok",
          now: describeNow(),
          currentChapter: chapterNumberRef.current,
          totalKnownChapters: all.length,
          completedChapters: real.filter(isChapterClosed).length,
          currentChapterStatus: cur && isChapterClosed(cur) ? "completed" : "in_progress",
          currentChapterStartPage: cur?.startPage ?? null,
          currentChapterEndPage: cur?.endPage ?? null,
          wordsLoggedThisChapter: cur?.vocabLog?.length || 0,
          summaryCharacters: cur?.summary ? cur.summary.length : 0,
          chapters: real.slice(0, 60).map((c) => ({ number: c.number, title: c.title, status: isChapterClosed(c) ? "completed" : "open", startPage: c.startPage, endPage: c.endPage })),
        };
      } else if (fc.name === "get_session_activity") {
        result = {
          status: "ok",
          activities: activitiesRef.current.map(({ text, createdAt }) => ({ text, createdAt })),
        };
      } else if (fc.name === "complete_chapter") {
        const num = Number(fc.args?.chapterNumber) || chapterNumberRef.current;
        const endPage = Number(fc.args?.endPage);
        const why = typeof fc.args?.justification === "string" ? fc.args.justification.trim() : "";
        const outcome = library.completeChapter(bookId, num, why);
        if (outcome.ok) {
          if (Number.isFinite(endPage)) library.setChapterPages(bookId, num, undefined, endPage);
          result = { status: "completed", closedEarly: outcome.early };
        } else if (outcome.needsJustification) {
          result = { status: "needs_justification", message: "Little of this chapter has been covered. Gently ask the reader why they want to close it now, then call complete_chapter again with their reason as justification." };
        } else {
          result = { status: "invalid" };
        }
      }
      else if (fc.name === "list_saved_items") {
        const kind = fc.args?.kind;
        if (kind === "gems") {
          const all = fc.args?.scope === "all";
          const gems = gemsStore.list().filter((g) => all || g.bookId === bookId);
          result = { status: "ok", count: gems.length, items: gems.slice(0, 30).map((g) => ({ quote: g.quote.slice(0, 220), book: g.bookTitle, chapter: g.chapterNumber })) };
        } else if (kind === "vocabulary") {
          const items = [];
          Object.values(library.getBook(bookId)?.chapters || {}).forEach((ch) =>
            (ch.vocabLog || []).forEach((v) => items.push({ term: v.term, meaning: v.meaning, chapter: ch.number })));
          result = { status: "ok", count: items.length, items: items.slice(-40) };
        } else if (kind === "memory") {
          const items = (memoryStore.memories || []).map((m) => m.text);
          result = { status: "ok", count: items.length, items };
        } else {
          result = { status: "invalid" };
        }
      }else if (fc.name === "delete_vocabulary") {
        const term = (fc.args?.term || "").trim();
        const num = Number(fc.args?.chapterNumber);
        if (!term) {
          result = { status: "invalid" };
        } else {
          result = library.removeVocab(bookId, term, Number.isFinite(num) ? num : undefined)
            ? { status: "deleted" }
            : { status: "not_found", message: "That word is not saved in this book - tell the reader honestly." };
        }
      }else if (fc.name === "delete_memory") {
        const frag = (fc.args?.factFragment || "").trim().toLowerCase();
        const match = frag ? (memoryStore.memories || []).find((m) => m.text.toLowerCase().includes(frag)) : null;
        result = match && memoryStore.remove(match.text)
          ? { status: "deleted" }
          : { status: "not_found", message: "No saved memory matched - tell the reader honestly." };
      }else if (fc.name === "update_memory") {
        const frag = (fc.args?.oldFragment || "").trim().toLowerCase();
        const newText = (fc.args?.newText || "").trim();
        const match = frag ? (memoryStore.memories || []).find((m) => m.text.toLowerCase().includes(frag)) : null;
        result = match && newText && memoryStore.update(match.text, newText)
          ? { status: "saved" }
          : { status: "not_found", message: "No saved memory matched - tell the reader honestly." };
      }else if (fc.name === "delete_gem") {
        const fragment = (fc.args?.quoteFragment || "").trim().toLowerCase();
        if (!fragment) {
          result = { status: "invalid" };
        } else {
          const match = gemsStore.list().find(
            (g) => g.bookId === bookId && g.quote.toLowerCase().includes(fragment)
          );
          if (match) {
            gemsStore.remove(match.id);
            result = { status: "deleted" };
          } else {
            result = { status: "not_found" };
          }
        }
      }
      responses.push({ id: fc.id, name: fc.name, response: result });
          } catch (err) {
        console.warn("[TOOL] failed", fc.name, err);
        result = { status: "error", message: "That could not be saved. Tell the reader briefly and carry on." };
      } if (result.status === "saved") {
        if (fc.name === "save_gem") {
          setSessionStats((s) => ({ ...s, gems: s.gems + 1 }));
          triggerSuccess();
          pushActivity("gem", "Gem save ho gaya");
        } else if (fc.name === "save_memory") pushActivity("memory", "Preference yaad kar li");
        else if (fc.name === "set_book_author") pushActivity("author", `Author save ho gaya: ${fc.args?.authorName || ""}`);
        else if (fc.name === "set_current_chapter") pushActivity("chapter", `Chapter ${fc.args?.chapterNumber} shuru`);
        else if (fc.name === "rename_chapter") pushActivity("rename", `Chapter ${fc.args?.chapterNumber} ka naam mila`);
        else if (fc.name === "set_chapter_pages") pushActivity("pages", `Chapter ${fc.args?.chapterNumber} ke pages note kiye`);
        else if (fc.name === "update_chapter_summary") pushActivity("summary", "Chapter ki notes update hui");
        else if (fc.name === "set_chapter_outline") pushActivity("outline", "Poori chapter list save hui");
        else if (fc.name === "update_memory") pushActivity("memory", "Memory update hui");
      } else if (result.status === "completed") {
        pushActivity("done", `Chapter ${fc.args?.chapterNumber || chapterNumberRef.current} complete!`);
      } else if (result.status === "deleted") {
        if (fc.name === "delete_gem") pushActivity("delete", "Gem delete ho gaya");
        else if (fc.name === "delete_vocabulary") pushActivity("delete", `Word hata diya: ${fc.args?.term || ""}`);
        else if (fc.name === "delete_memory") pushActivity("delete", "Ek memory delete hui");
      }
    }
    if (responses.length) await clientRef.current?.sendToolResponse(responses);
  }

   useEffect(() => {
    let rafId = 0;
    const tick = () => {
      audioPlaybackRef.current?.poke();
      const micLevel = micLevelRef.current;
      const outputLevel = outputLevelRef.current;
      const listening = !speaking && micLevel > 0.04;
      const reconnecting = /reconnect|resum|connecting/i.test(status);
      const orbMode = reconnecting ? "reconnecting" : speaking ? "speaking" : listening ? "listening" : "idle";
      const live = speaking ? outputLevel : micLevel;
      setOrbVisual((p) => (p.orbMode === orbMode ? p : { ...p, orbMode }));
      orbLevelRef.current = live;
      setMeterLevel((p) => (Math.abs(p - live) > 0.04 ? live : p));
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [speaking, status]);

  async function connectSession() {
    const memoryContext = memoryStore.promptContext();
    const ctx = library.getModelContext(bookId);
    const currentChapter = book?.chapters?.[ctx?.currentChapterNumber];
    const pageInfo = currentChapter?.startPage
      ? ` Currently known to start at page ${currentChapter.startPage}${currentChapter.endPage ? `, ended at page ${currentChapter.endPage}` : " (end page still unknown; ask the reader to confirm the final page later)"}.`
      : "";
    const authorLine = book?.authorName || book?.authorBio
      ? ` Reader note: Author ${book.authorName || "is listed"}. ${book.authorBio ? `Brief context: ${book.authorBio}` : ""}`
      : " Author details for this book are not saved yet - ask the reader early in this session, then call set_book_author with what you learn.";
    const timeGapText = book && book.sessionCount > 0 ? describeTimeGap(book.lastReadAt) : null;
    const timingLine = timeGapText
      ? ` The reader last opened this book ${timeGapText}.`
      : " This is the reader's very first session with this book.";
    const bookContext = book
      ? `\n\nBook: '${book.title}'. Currently on Chapter ${ctx.currentChapterNumber}.${timingLine}${pageInfo}` +
        authorLine +
        (ctx.overview ? ` ${ctx.overview}` : "") +
        (ctx.recentChapters.length ? " Recent chapters: " + ctx.recentChapters.map((c) => `Ch.${c.number} "${c.title}": ${c.summary}`).join(" ") : " This is the first chapter - no recap needed.")
      : "";
    const chapterList = library.getChapters(bookId);
const closedCount = chapterList.filter((c) => !c.isPlaceholder && isChapterClosed(c)).length;
const curCh = book?.chapters?.[ctx?.currentChapterNumber];
const progressLine = book
  ? `\n\nReading progress: ${closedCount} of ${chapterList.length} known chapters are marked completed. Chapter ${ctx.currentChapterNumber} is ${curCh && isChapterClosed(curCh) ? "already completed" : "in progress"}; pages ${curCh?.startPage ?? "?"} to ${curCh?.endPage ?? "?"}; ${curCh?.vocabLog?.length || 0} words logged; summary is ${curCh?.summary ? curCh.summary.length : 0} characters long.`
  : "";
const pd = profileStore.data;
const profileLine = `\n\nReader profile: the reader's name is ${pd.name}.` +
  (pd.companionName ? ` The reader calls you "${pd.companionName}" - that is your name.` : "") +
  (pd.preferences?.length ? ` Favourite kinds of books: ${pd.preferences.join(", ")}.` : "") +
  (pd.dailyGoal ? ` Daily reading goal: ${pd.dailyGoal}.` : "") +
  " Use the reader's name very sparingly.";
const cont = library.getContinuity(bookId);
contRef.current = cont;
const contLine = cont
  ? `\n\nSESSION CONTINUITY: the reader's previous session on this book ended ${describeTimeGap(cont.endedAt)} (it lasted about ${cont.durationMin} min; they were on chapter ${cont.chapter}; ${cont.wordsLearned} new words were logged). ` +
    (cont.minutesAgo < 45
      ? "This is a QUICK RETURN in the same sitting: never greet like a fresh start, never ask what they will read today, just pick up naturally."
      : cont.minutesAgo < 720
        ? "Same day, later: welcome back and mention where they stopped."
        : "A new day: greet freshly but refer to where they last stopped.")
  : "\n\nSESSION CONTINUITY: this is the reader's very first session on this book.";
const recap = getRecap(bookId);
const recapLine = recap ? `\n\nRECENT CONVERSATION with this reader (earlier, for continuity only; do not repeat it, just carry on naturally):\n${recap}` : "";
const systemInstructionText = READER_PROFILE + "\n\n" + buildTimeLine() + profileLine + bookContext + progressLine + contLine + recapLine + (memoryContext ? `\n\n${memoryContext}` : "");
    const systemInstruction = { parts: [{ text: systemInstructionText }] };

    audioPlaybackRef.current = new AudioPlayback(
      (isPlaying) => { speakingNowRef.current = isPlaying; setSpeaking(isPlaying); },
      (level) => { outputLevelRef.current = Math.min(1, Number(level) || 0); }
    );

    clientRef.current = new GeminiLiveClient({
      modelName: MODEL_NAME,
      fallbackModelName: FALLBACK_MODEL_NAME,
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: profileStore.data.voice || "Leda" } } },
        systemInstruction,
        outputAudioTranscription: {},
        inputAudioTranscription: {},
        realtimeInputConfig: {
          automaticActivityDetection: {
            startOfSpeechSensitivity: "START_SENSITIVITY_HIGH",
            endOfSpeechSensitivity: "END_SENSITIVITY_HIGH",
            prefixPaddingMs: 300,
            silenceDurationMs: 900,
          },
        },
        tools: [{ functionDeclarations: [SAVE_MEMORY_DECLARATION, LOG_VOCABULARY_DECLARATION, UPDATE_CHAPTER_SUMMARY_DECLARATION, SET_CURRENT_CHAPTER_DECLARATION, RENAME_CHAPTER_DECLARATION, SET_BOOK_AUTHOR_DECLARATION, SET_CHAPTER_PAGES_DECLARATION, SAVE_GEM_DECLARATION, DELETE_GEM_DECLARATION, DELETE_VOCABULARY_DECLARATION, DELETE_MEMORY_DECLARATION, UPDATE_MEMORY_DECLARATION, LIST_SAVED_ITEMS_DECLARATION, GET_READING_STATUS_DECLARATION, GET_SESSION_ACTIVITY_DECLARATION, COMPLETE_CHAPTER_DECLARATION,SET_CHAPTER_OUTLINE_DECLARATION,] }],
      },
      handlers: {
        onStatus: (s) => setStatus(s),
        onAudio: (data) => audioPlaybackRef.current?.enqueue(data),
        onText: (text) => { companionTurnBufRef.current += text; },
        onUserText: (text) => {
          userTurnBufRef.current += text;
          markActive();
          if (!turnActedRef.current) {
            if (END_SESSION_TRIGGER.test(userTurnBufRef.current)) { turnActedRef.current = true; beginGracefulEnd(); }
            else if (CLOSE_CAMERA_TRIGGER.test(userTurnBufRef.current)) { turnActedRef.current = true; stopCameraNow(); }
            else if (OPEN_CAMERA_TRIGGER.test(userTurnBufRef.current)) { turnActedRef.current = true; startCameraThenNotify(); }
          }
        },
        onFirstReady: () => clientRef.current?.sendText(buildOpeningNote(contRef.current)),
        onTurnComplete: () => {
        const companionText = companionTurnBufRef.current.trim();
        if (companionText) {
          appendLine("companion", companionText);
          companionTurnBufRef.current = "";
          if (!openerSavedRef.current) { openerSavedRef.current = true; saveOpener(companionText); }
        }
        if (userTurnBufRef.current.trim()) { handleUserTurnText(userTurnBufRef.current.trim()); userTurnBufRef.current = ""; }
        turnActedRef.current = false;
      },
        onInterrupted: () => audioPlaybackRef.current?.clear(),
        onToolCall: (tc) => handleToolCall(tc),
      },
    });

    audioCaptureRef.current = new AudioCapture(
      (base64Pcm) => {
        // echo gate: soften the mic only while the companion is ACTUALLY audible
        const playingNow = audioPlaybackRef.current?.isActuallyPlaying?.() ?? speakingNowRef.current;
        const quiet = playingNow && micLevelRef.current < 0.2;
        clientRef.current?.sendAudio(quiet ? silentChunk(base64Pcm.length) : base64Pcm);
      },
      (level) => {
        micLevelRef.current = Math.min(1, Number(level) || 0);
        if (micLevelRef.current > 0.22 && !audioCaptureRef.current?.muted) clientRef.current?.noteSpeech();
      }
    );
    const [conn, mic] = await Promise.allSettled([
      clientRef.current.connect(),
      audioCaptureRef.current.start(),
    ]);
    if (mic.status === "rejected") setStatus(`Mic error: ${mic.reason?.message || mic.reason}`);
    else if (conn.status === "rejected") {
      console.warn("[LIVE] initial connection failed", conn.reason);
      setStatus("connection problem");
      notify("Connection mein dikkat aa gayi. Internet check karke session dobara shuru karein.", "error", 6000);
    }
  }

  async function handleEnd() {
    library.endSession(bookId);
    audioCaptureRef.current?.stop();
    audioPlaybackRef.current?.close();
    stopCameraNow();
    await clientRef.current?.close();
    onEnd();
    void finalizeSessionArtifacts();
  }

    const totalChapters = book ? library.getChapters(bookId).length || 1 : 1;
  const doneCount = book ? library.getChapters(bookId).filter((c) => !c.isPlaceholder && isChapterClosed(c)).length : 0;
  const donePct = Math.round((doneCount / totalChapters) * 100);
  const reachPct = Math.min(100, Math.round((chapterNumber / totalChapters) * 100));
  const RR = 17;
  const RC = 2 * Math.PI * RR;
  const railChapters = book ? library.getChapters(bookId).filter((c) => !c.isPlaceholder) : [];
  const statusKey = /reconnect|resum/i.test(status) ? "reconnecting"
    : /connecting|starting/i.test(status) ? "connecting"
    : /closed|lost|error|failed/i.test(status) ? "lost" : "connected";
  const statusMeta = {
    connected: { label: "Live", dotClass: "status-dot connected" },
    connecting: { label: "Getting ready", dotClass: "status-dot reconnecting" },
    reconnecting: { label: "Reconnecting", dotClass: "status-dot reconnecting" },
    lost: { label: "Offline", dotClass: "status-dot lost" },
  }[statusKey];
  const mode = orbVisual.orbMode;
  const fmt = (s) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const mm = String(m).padStart(h ? 2 : 1, "0"), ss = String(sec).padStart(2, "0");
    return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  };

  return (
    <div className="ghost-hud" style={{ "--book-aura-color": auraColor }}>
      <Motion.div className="book-aura" animate={{ opacity: [0.2, 0.42, 0.2], scale: [1, 1.12, 1] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} />
      <div className={`hud-aura ${mode}`} />

      <div className="hud-top">
        <div className="hud-journey">
          <div className="hud-jr-head">
            <div className="hud-jr-ring">
              <svg viewBox="0 0 44 44">
                <defs>
                  <linearGradient id="hudRingGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ffd7a3" /><stop offset="55%" stopColor="#f2a65a" /><stop offset="100%" stopColor="#d6607a" />
                  </linearGradient>
                </defs>
                <circle cx="22" cy="22" r={RR} className="ring-track" />
                <circle cx="22" cy="22" r={RR} className="ring-done" stroke="url(#hudRingGrad)" strokeDasharray={RC} strokeDashoffset={RC * (1 - donePct / 100)} />
              </svg>
              <span className="hud-ring-num">{chapterNumber}</span>
            </div>
            <div className="hud-journey-text">
              <span className="hud-book-title">{book?.title || "Reading"}</span>
              <span className="hud-book-ch">Chapter {chapterNumber} of {totalChapters} · {doneCount} done</span>
            </div>
          </div>
          {railChapters.length <= 40 ? (
            <div className="hud-rail" aria-hidden="true">
              {railChapters.map((c) => (
                <span key={c.number} className={`hud-seg ${isChapterClosed(c) ? "done" : c.number === chapterNumber ? "current" : ""}`} />
              ))}
            </div>
          ) : (
            <div className="hud-rail-bar" aria-hidden="true">
              <span style={{ width: `${donePct}%` }} />
              <i style={{ left: `${Math.min(100, reachPct)}%` }} />
            </div>
          )}
        </div>
        <div className="hud-pills">
          <span className="hud-pill"><Clock size={12} />{fmt(elapsed)}</span>
          <span className="hud-pill"><span className={statusMeta.dotClass} />{statusMeta.label}</span>
        </div>
      </div>

      <div className="hud-stage">
        <div className="orb-wrap">
          <EmberOrb levelRef={orbLevelRef} mode={mode === "listening" ? "listening" : mode === "speaking" ? "speaking" : "idle"} ghostMode={isGhostMode} />
          <AnimatePresence>
            {isGhostMode && GHOST_DUST.map((particle) => (
              <Motion.span
                key={particle.id}
                className="ghost-stardust"
                style={{ width: particle.size, height: particle.size }}
                initial={{ opacity: 0, x: 0, y: 14, scale: 0.5 }}
                animate={{ opacity: [0, 0.9, 0], x: [0, particle.drift], y: -108, scale: [0.5, 1, 0.7] }}
                exit={{ opacity: 0 }}
                transition={{ duration: particle.duration, delay: particle.delay, repeat: Infinity, ease: "easeOut" }}
              />
            ))}
          </AnimatePresence>
        </div>
        <div className="hud-chips">
          <span key={`w-${sessionStats.words}`}><BookOpen size={13} /> {sessionStats.words} words</span>
          <span key={`g-${sessionStats.gems}`}><Gem size={13} /> {sessionStats.gems} gems</span>
          {muted && <span className="muted-chip"><MicOff size={13} /> Muted</span>}
        </div>
      </div>

      <div className={`camera-preview elevated ${cameraOn ? "" : "hidden"} ${cameraExpanded ? "expanded" : ""}`}>
        <video ref={videoEl} muted playsInline />
        <div className="camera-controls">
          <Motion.button type="button" className="camera-adjust-button" whileTap={{ scale: 0.97 }} transition={INTERACTION_SPRING} onClick={() => setCameraExpanded((v) => !v)}>
            {cameraExpanded ? "Restore compact" : "Adjust camera"}
          </Motion.button>
        </div>
      </div>
      <canvas ref={canvasEl} style={{ display: "none" }} />

      <div className="glass-dock">
        <Motion.button className={`hud-btn ${muted ? "active" : ""}`} whileTap={{ scale: 0.94 }} transition={INTERACTION_SPRING} onClick={toggleMute} aria-label={muted ? "Unmute microphone" : "Mute microphone"}>
          {muted ? <MicOff size={22} /> : <Mic size={22} />}
        </Motion.button>
        <Motion.button className={`hud-btn ${cameraOn ? "active" : ""}`} whileTap={{ scale: 0.94 }} transition={INTERACTION_SPRING} onClick={toggleCamera} aria-label={cameraOn ? "Close camera" : "Open camera"}>
          {cameraOn ? <CameraIcon size={22} /> : <CameraOff size={22} />}
        </Motion.button>
        <Motion.button className={`hud-btn ${transcriptOpen ? "active" : ""}`} whileTap={{ scale: 0.94 }} transition={INTERACTION_SPRING} onClick={toggleTranscript} aria-label="Toggle transcript">
          <MessageSquareText size={22} />
        </Motion.button>
        <Motion.button type="button" className={`hud-btn ghost-toggle ${isGhostMode ? "active on" : ""}`} role="switch" aria-checked={isGhostMode} onClick={toggleGhostMode} whileTap={{ scale: 0.94 }} transition={INTERACTION_SPRING} aria-label="Toggle Author's Ghost Mode">
          <span className="ghost-toggle-label">Ghost</span>
          <span className={`ghost-toggle-track ${isGhostMode ? "on" : ""}`}><Motion.span className="ghost-toggle-knob" layout transition={INTERACTION_SPRING} /></span>
        </Motion.button>
        <Motion.button className="hud-btn stop" whileTap={{ scale: 0.94 }} transition={INTERACTION_SPRING} onClick={handleEnd} aria-label="End session">
          <PhoneOff size={22} />
        </Motion.button>
      </div>

      <div className="sess-sidekick">
        <AnimatePresence>
          {feedOpen && activities.length > 0 && (
            <Motion.div className="sess-feed" initial={{ opacity: 0, y: 14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.96 }} transition={INTERACTION_SPRING}>
              <div className="sess-feed-title">Background mein ho raha kaam</div>
              {activities.slice().reverse().map((a) => {
                const Ico = ACTIVITY_ICONS[a.icon] || Check;
                return <div key={a.id} className="sess-feed-row"><Ico size={13} /><span>{a.text}</span></div>;
              })}
            </Motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {liveActivity && !feedOpen && (
            <Motion.div key={liveActivity.id} className="sess-activity-bubble"
              initial={{ opacity: 0, y: 12, scale: 0.85 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.9 }} transition={INTERACTION_SPRING}>
              {liveActivity.text}
            </Motion.div>
          )}
        </AnimatePresence>
        <div className={`sess-mascot-btn ${feedOpen ? "on" : ""}`}>
          <MascotCharacter characterId={sessionMascot} size={54} animated silent onTap={() => { triggerLightTap(); setFeedOpen((o) => !o); }} />
          {activities.length > 0 && <span className="sess-count">{activities.length}</span>}
        </div>
      </div>

      <AnimatePresence>
        {ghostToast && (
          <Motion.div className="ghost-toast" initial={{ opacity: 0, y: 20, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: 12, filter: "blur(4px)" }} transition={INTERACTION_SPRING}>
            Channeling the Author's Persona...
          </Motion.div>
        )}
      </AnimatePresence>

      {transcriptOpen && (
        <div className="transcript-drawer elevated">
          {transcript.map((line, i) => (
            <div className="transcript-line" key={i}><b>{line.speaker === "reader" ? "You" : "Companion"}:</b> {line.text}</div>
          ))}
        </div>
      )}
    </div>
  );
}