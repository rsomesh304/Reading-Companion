import { AnimatePresence, motion as Motion, useReducedMotion } from "framer-motion";
import {
  ArrowUp,
  Bookmark,
  BookPlus,
  Bug, ChevronLeft, ChevronRight, Ghost,
  History,
  
  Plus, Quote, ScanText, Sparkles, X,
} from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { apiFetchFast } from "./api.js";
import { useBackLayer } from "./backStack.js";
import HelpAnimations from "./HelpAnimations.jsx";
import { pickAnimationsByKeywords, sanitizeAnimationIds } from "./helpAnimations.js";
import HelpChatHistory from "./HelpChatHistory.jsx";
import { sessionDate, sessionTitle } from "./helpHistory.js";
import { buildShortHelpAnswer, findRelevantHelp, HELP_GUIDE } from "./helpGuide.js";
import "./HelpGuideScreen.css";
import { detectNewReaderIntent, HELP_TOUR_STORAGE_KEY } from "./helpTourData.js";
import { useHaptic } from "./useHaptic.js";

const CHAT_KEY = "rc_help_chat_v1";
// Device-only: not part of READER_DATA_KEYS, so it is never backed up to the cloud.
const HISTORY_KEY = "rc_help_history_v1";
const MAX_SESSIONS = 30;
const CACHE_KEY = "rc_help_answer_cache_v2";
const HelpTour = lazy(() => import("./HelpTour.jsx"));
const TOPIC_ROUTES = {
  dashboard: "goDashboard", library: "goLibrary", gems: "goGems", memory: "goMemory",
  profile: "goProfile", account: "goAccount", settings: "goSettings", report: "goReport",
};
const SCREEN_LABELS = {
  dashboard: "Home", library: "Library", gems: "Gems", memory: "Memory", profile: "Profile",
  account: "Account", settings: "Settings", report: "Report an issue",
};
const QUESTIONS = [
  { label: "How do I add a book?", id: "add-book", Icon: BookPlus, tone: "mint" },
  { label: "Save a word or quote", id: "save-items", Icon: Bookmark, tone: "blue" },
  { label: "What do the reading buttons do?", id: "session-buttons", Icon: ScanText, tone: "gold" },
  { label: "How does Ghost mode work?", id: "ghost-mode", Icon: Ghost, tone: "violet" },
  { label: "Live camera or snapshot?", id: "camera-options", Icon: Quote, tone: "pink" },
  { label: "Report a problem", id: "report-issue", Icon: Bug, tone: "coral" },
];
const PLACEHOLDERS = [
  "Ask how to save a word…", "What does Ghost mode do?", "How do I add a book?", "Ask about reading controls…",
];
const SAVE_ITEMS_TOPIC = {
  id: "save-items",
  title: "Save a word or quote",
  content: "While reading, ask what a word means and say yes when asked to save it. To save a quote, say save this line. Words appear in Chapter details, Vocabulary; quotes are in Gems.",
  actionScreens: ["library", "gems"],
};
const TOUR_DONE_ACTIONS = [
  { id: "tour-add-book", label: "Add my first book" },
  { id: "tour-session", label: "How does a reading session work?" },
  { id: "tour-commands", label: "What can I say to the companion?" },
];
const getTopic = (id) => id === SAVE_ITEMS_TOPIC.id ? SAVE_ITEMS_TOPIC : HELP_GUIDE.find((topic) => topic.id === id);
const createMessage = (role, content, extra = {}) => ({
  id: `${Date.now()}-${Math.random()}`,
  role,
  content,
  createdAt: new Date().toISOString(),
  ...extra,
});

const validMessages = (value) => Array.isArray(value)
  ? value.filter((message) => message?.role && typeof message.content === "string" && !message.streaming).slice(-20)
  : [];

function readStoredSessions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return (Array.isArray(parsed) ? parsed : [])
      .map((session) => ({ ...session, messages: validMessages(session?.messages) }))
      .filter((session) => session.id && session.messages.length);
  } catch {
    return [];
  }
}

function readHistory() {
  try {
    const sessions = readStoredSessions();
    // Move the old single-thread chat into history once.
    const legacy = validMessages(JSON.parse(localStorage.getItem(CHAT_KEY) || "[]"));
    if (legacy.length) {
      sessions.push({ id: `legacy-${Date.now()}`, updatedAt: legacy[legacy.length - 1].createdAt || new Date().toISOString(), messages: legacy });
    }
    localStorage.removeItem(CHAT_KEY);
    const kept = sessions.slice(-MAX_SESSIONS);
    if (legacy.length) writeHistory(kept);
    return kept;
  } catch {
    return [];
  }
}

function writeHistory(sessions) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions)); } catch { /* optional persistence */ }
}

function readCachedAnswer(question) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    return cache[question.trim().toLowerCase()] || null;
  } catch {
    return null;
  }
}

function cacheAnswer(question, answer) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    cache[question.trim().toLowerCase()] = answer;
    const recent = Object.entries(cache).slice(-30);
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(recent)));
  } catch {
    // The chat remains usable when browser storage is unavailable.
  }
}

function formatMessage(content) {
  return content.split(/(\*\*[^*]+\*\*)/g).map((part, index) => (
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={index}>{part.slice(2, -2)}</strong>
      : part
  ));
}

function localTopicFor(question) {
  const normalized = question.trim().toLowerCase().replace(/[?!.,]/g, "");
  if (/\bghost\b/.test(normalized)) return getTopic("ghost-mode");
  const exact = QUESTIONS.find((entry) => entry.label.toLowerCase().replace(/[?!.,]/g, "") === normalized);
  if (exact) return getTopic(exact.id);
  const match = findRelevantHelp(question, 1)[0];
  return match?.score >= 4 ? match : null;
}

function timestamp(message) {
  const date = new Date(message.createdAt || Date.now());
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function HelpGuideScreen({ nav, userName = "there" }) {
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState(readHistory);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [viewingId, setViewingId] = useState(null);
  const [sessionId, setSessionId] = useState(() => `s-${Date.now()}`);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);
  const [introActive, setIntroActive] = useState(true);
  const [introStage, setIntroStage] = useState(0);
  const [introRun, setIntroRun] = useState(0);
  const [greeting, setGreeting] = useState("");
  const [fallback, setFallback] = useState([]);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [tourProgress, setTourProgress] = useState(readTourProgress);
  const [showTourRow, setShowTourRow] = useState(() => !readTourProgress().status);
  const [tourOpen, setTourOpen] = useState(false);
  const [serviceNotice, setServiceNotice] = useState(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [viewport, setViewport] = useState(null);
  const [aiStatus, setAiStatus] = useState(() => (typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "checking"));
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const reducedMotion = useReducedMotion();
  const { triggerLightTap } = useHaptic();

  useBackLayer(Boolean(viewingId), () => setViewingId(null));
  useBackLayer(historyOpen, () => setHistoryOpen(false));
  useBackLayer(browseOpen, () => setBrowseOpen(false));
  useBackLayer(tourOpen, () => setTourOpen(false));

  useEffect(() => {
    let cancelled = false;
    async function checkStatus() {
      if (navigator.onLine === false) { setAiStatus("offline"); return; }
      try {
        const response = await apiFetchFast("/api/ai/help/status", { cache: "no-store" }, { timeoutMs: 6000 });
        const data = response.ok ? await response.json() : null;
        if (!cancelled) setAiStatus(data?.available ? "online" : "offline");
      } catch {
        if (!cancelled) setAiStatus("offline");
      }
    }
    void checkStatus();
    const goOffline = () => setAiStatus("offline");
    window.addEventListener("online", checkStatus);
    window.addEventListener("offline", goOffline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", checkStatus);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    const saved = validMessages(messages);
    if (!saved.length) return;
    const entry = { id: sessionId, updatedAt: new Date().toISOString(), messages: saved };
    writeHistory([...readStoredSessions().filter((session) => session.id !== sessionId), entry].slice(-MAX_SESSIONS));
  }, [messages, sessionId]);

  function openHistory() {
    setHistory(readStoredSessions());
    setBrowseOpen(false);
    setHistoryOpen(true);
  }

  const viewing = viewingId ? history.find((session) => session.id === viewingId) : null;
  const shownMessages = viewing ? viewing.messages : messages;
  const pastSessions = history.filter((session) => session.id !== sessionId).reverse();

  function deleteSession(id) {
    setHistory((current) => {
      const next = current.filter((session) => session.id !== id);
      writeHistory(next);
      return next;
    });
    if (viewingId === id) setViewingId(null);
  }

  function clearPastSessions() {
    setHistory((current) => {
      const next = current.filter((session) => session.id === sessionId);
      writeHistory(next);
      return next;
    });
    setViewingId(null);
  }

  useEffect(() => {
    const displayName = userName.trim() || "there";
    const text = `Hi ${displayName}`;
    let typeTimer;
    const greetingTimer = window.setTimeout(() => {
      setIntroStage(1);
      if (reducedMotion) {
        setGreeting(text);
        setIntroStage(2);
        window.setTimeout(() => setIntroStage(3), 0);
        return;
      }
      let index = 0;
      typeTimer = window.setInterval(() => {
        index += 1;
        setGreeting(text.slice(0, index));
        if (index >= text.length) {
          window.clearInterval(typeTimer);
          setIntroStage(2);
          window.setTimeout(() => setIntroStage(3), 260);
        }
      }, 38);
    }, reducedMotion ? 0 : 520);
    return () => { window.clearTimeout(greetingTimer); window.clearInterval(typeTimer); };
  }, [introRun, reducedMotion, userName]);

  useEffect(() => {
    if (focused || question) return undefined;
    const timer = window.setInterval(() => setPlaceholderIndex((index) => (index + 1) % PLACEHOLDERS.length), 3600);
    return () => window.clearInterval(timer);
  }, [focused, question]);

  useEffect(() => {
    const updateViewport = () => {
      const visualViewport = window.visualViewport;
      if (!visualViewport) return setViewport(null);
      setViewport({ height: visualViewport.height, top: visualViewport.offsetTop });
    };
    updateViewport();
    window.visualViewport?.addEventListener("resize", updateViewport);
    window.visualViewport?.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);
    return () => {
      window.visualViewport?.removeEventListener("resize", updateViewport);
      window.visualViewport?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
    };
  }, []);


  useEffect(() => {
    const thread = listRef.current;
    if (!thread) return undefined;
    const frame = window.requestAnimationFrame(() => thread.scrollTo({ top: thread.scrollHeight, behavior: "smooth" }));
    return () => window.cancelAnimationFrame(frame);
  }, [messages, fallback, browseOpen, viewingId]);

  const openTopic = (topic) => {
    const route = TOPIC_ROUTES[topic?.screen];
    if (route) nav[route]?.();
  };

  function saveTourProgress(nextProgress) {
    setTourProgress(nextProgress);
    try { localStorage.setItem(HELP_TOUR_STORAGE_KEY, JSON.stringify(nextProgress)); } catch { /* optional persistence */ }
  }

  function markTourOffered() {
    saveTourProgress({ status: "offered", sceneIndex: 0 });
    setShowTourRow(false);
  }

  function beginTour(sceneIndex = 0) {
    saveTourProgress({ status: "in-progress", sceneIndex });
    setTourOpen(true);
    setHistoryOpen(false);
    setBrowseOpen(false);
    setViewingId(null);
    setIntroActive(false);
    setBusy(false);
  }

  function completeTour() {
    saveTourProgress({ status: "completed", sceneIndex: 9 });
    setTourOpen(false);
    setMessages((current) => [...current, createMessage("assistant", "Great, you are ready! What would you like to do next?", { quickActions: TOUR_DONE_ACTIONS })].slice(-20));
  }

  function closeTour(sceneIndex) {
    saveTourProgress({ status: "skipped", sceneIndex });
    setTourOpen(false);
    setMessages((current) => [...current, createMessage("assistant", "No rush. You can continue the tour or replay it whenever you like.", {
      quickActions: [{ id: "tour-continue", label: "Continue tour" }, { id: "tour-replay", label: "Replay tour" }],
    })].slice(-20));
  }

  function handleMessageAction(message, actionId) {
    if (actionId === "tour-start" || actionId === "tour-yes" || actionId === "tour-replay") {
      if (actionId === "tour-yes") setMessages((current) => [...current, createMessage("user", "Yes, I'm new")].slice(-20));
      beginTour(actionId === "tour-replay" ? 0 : actionId === "tour-yes" ? 0 : tourProgress.sceneIndex || 0);
      return;
    }
    if (actionId === "tour-continue") { beginTour(tourProgress.sceneIndex || 0); return; }
    if (actionId === "tour-dismiss") {
      setMessages((current) => current.map((item) => item.id === message.id ? { ...item, quickActions: [] } : item));
      return;
    }
    if (actionId === "tour-no") {
      setMessages((current) => current.map((item) => item.id === message.id ? { ...item, quickActions: [] } : item));
      if (message.pendingQuestion) void sendQuestion(message.pendingQuestion, null, true, true);
      return;
    }
    if (actionId === "tour-add-book") { nav.openNewBook?.(); return; }
    if (actionId === "tour-session") { askLocalTopic(getTopic("session-overview"), "How does a reading session work?"); return; }
    if (actionId === "tour-commands") { askLocalTopic(getTopic("voice-commands"), "What can I say to the companion?"); }
  }

  function askLocalTopic(topic, displayQuestion = topic?.title) {
    if (!topic) return;
    void sendQuestion(displayQuestion, topic);
  }

  async function sendQuestion(value = question, preferredTopic = null, userAlreadyInChat = false, skipBeginnerCheck = false) {
    const text = value.trim();
    if (!text || busy) return;
    triggerLightTap();
    setQuestion("");
    setFallback([]);
    setBrowseOpen(false);
    setHistoryOpen(false);
    setViewingId(null);
    setIntroActive(false);
    const matches = findRelevantHelp(text, 2);
    const topic = preferredTopic || localTopicFor(text);
    const userMessage = userAlreadyInChat ? null : createMessage("user", text);
    const history = messages.slice(-4).map(({ role, content }) => ({ role, content: content.slice(0, 350) }));
    const appendMessages = (assistant) => setMessages((current) => [...current, ...(userMessage ? [userMessage] : []), assistant].slice(-20));

    if (!userAlreadyInChat) {
      const tourIntent = detectNewReaderIntent(text);
      if (tourIntent === "start") {
        appendMessages(createMessage("assistant", "Chalo, let’s take a quick tour of the app."));
        beginTour(0);
        return;
      }
      if (tourIntent === "offer" && !tourProgress.status) {
        markTourOffered();
        appendMessages(createMessage("assistant", "A one-minute tour can show you where to begin. Want to take it?", {
          quickActions: [{ id: "tour-start", label: "Start the 1-minute tour" }, { id: "tour-dismiss", label: "Not now" }],
        }));
        return;
      }
    }

    const cached = readCachedAnswer(text);
    if (cached?.content) {
      appendMessages(createMessage("assistant", cached.content, { topicId: cached.topicId || null, animationIds: cached.animationIds?.length ? cached.animationIds : pickAnimationsByKeywords(text) }));
      return;
    }

    const demoTopic = topic || (matches[0]?.score >= 3 ? matches[0] : null);
    const assistantMessage = createMessage("assistant", "", { streaming: true, topicId: demoTopic?.id || null, animationIds: [] });
    appendMessages(assistantMessage);
    setBusy(true);
    let answer = "";
    let intentHandled = false;
    let animationIds = null;
    try {
      const response = await apiFetchFast("/api/ai/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, history, checkNewUser: !tourProgress.status && !skipBeginnerCheck }),
      }, { timeoutMs: 20000 });
      if (!response.ok || !response.body) throw new Error("help_unavailable");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = "";
      while (true) {
        const { done, value: chunk } = await reader.read();
        pending += decoder.decode(chunk || new Uint8Array(), { stream: !done });
        const lines = pending.split(/\r?\n/);
        pending = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          const eventData = JSON.parse(data);
          if (eventData.error) throw new Error(eventData.error);
          if (eventData.type === "provider") {
            setAiStatus("online");
            setServiceNotice(eventData.provider === "cloudflare"
              ? { kind: "backup", text: eventData.groqConfigured ? "Groq is unavailable right now. A backup AI is answering." : "Groq is not configured here. The backup AI is answering." }
              : null);
            continue;
          }
          if (eventData.type === "animations") {
            animationIds = sanitizeAnimationIds(eventData.ids);
            continue;
          }
          if (eventData.type === "tour-intent") {
            intentHandled = true;
            if (eventData.intent === "tour") {
              setMessages((current) => current.map((message) => message.id === assistantMessage.id
                ? { ...message, content: "It sounds like a quick tour would help. Let's get started!", streaming: false }
                : message));
              beginTour(0);
            } else {
              markTourOffered();
              setMessages((current) => current.map((message) => message.id === assistantMessage.id
                ? {
                  ...message,
                  content: "Quick check: is this your first time using the app?",
                  streaming: false,
                  pendingQuestion: text,
                  quickActions: [{ id: "tour-yes", label: "Yes, I'm new" }, { id: "tour-no", label: "No, I've used it" }],
                }
                : message));
            }
            continue;
          }
          if (typeof eventData.token !== "string") continue;
          answer += eventData.token;
          const partial = answer;
          setMessages((current) => current.map((message) => message.id === assistantMessage.id ? { ...message, content: partial } : message));
        }
        if (done) break;
      }
      if (intentHandled) return;
      if (!answer.trim()) throw new Error("help_empty");
      setAiStatus("online");
      const responseTopic = demoTopic;
      const finalAnimations = animationIds?.length ? animationIds : pickAnimationsByKeywords(text);
      setMessages((current) => current.map((message) => message.id === assistantMessage.id
        ? { ...message, streaming: false, topicId: responseTopic?.id || message.topicId || null, animationIds: finalAnimations }
        : message));
      cacheAnswer(text, { content: answer, topicId: responseTopic?.id || null, animationIds: finalAnimations });
    } catch {
      const usefulTopics = demoTopic ? [] : matches.length ? matches : QUESTIONS.slice(0, 3).map(({ id }) => getTopic(id)).filter(Boolean);
      if (!answer) setAiStatus("offline");
      setServiceNotice(null);
      setMessages((current) => current.map((message) => message.id === assistantMessage.id
        ? { ...message, content: answer || (demoTopic ? buildShortHelpAnswer(demoTopic) : "I couldn't get a reliable answer just now. Try one of these guide topics:"), streaming: false, failed: !answer && !demoTopic }
        : message));
      setFallback(usefulTopics);
    } finally {
      setBusy(false);
    }
  }

  function handleInputFocus() {
    setFocused(true);
    // iOS pans the page instead of resizing it; pin the window and keep the composer in view.
    const settle = () => {
      if (window.scrollY) window.scrollTo(0, 0);
      inputRef.current?.scrollIntoView({ block: "nearest" });
      const list = listRef.current;
      if (list && messages.length) list.scrollTop = list.scrollHeight;
    };
    window.setTimeout(settle, 60);
    window.setTimeout(settle, 320);
  }

  function clearChat() {
    if (busy) return;
    // The finished chat stays in history; the next one gets its own session.
    setSessionId(`s-${Date.now()}`);
    setViewingId(null);
    setHistoryOpen(false);
    setMessages([]);
    setFallback([]);
    setBrowseOpen(false);
    setQuestion("");
    setShowTourRow(false);
    setServiceNotice(null);
    setIntroActive(true);
    setGreeting("");
    setIntroStage(0);
    setIntroRun((run) => run + 1);
  }

  const browseTopics = HELP_GUIDE.slice(0, 9);
  const rootStyle = viewport ? { top: `${viewport.top}px`, height: `${viewport.height}px`, minHeight: 0 } : undefined;
  const statusLabel = aiStatus === "online" ? "AI online" : aiStatus === "offline" ? "AI offline" : "Checking AI";
  const statusNotice = aiStatus === "online"
    ? "Good news, the AI assistant is online. You'll get a live answer to anything you ask."
    : aiStatus === "offline"
      ? "The AI assistant is taking a short break. For now you'll get answers from the built-in Help guide."
      : null;

  return (
    <main className="screen help-screen" style={rootStyle}>
      <div className="help-aurora" aria-hidden="true"><i /><i /><i /></div>
      <header className="help-header">
        <button className="help-round-button" type="button" onClick={nav.goBack} aria-label="Back to Profile"><ChevronLeft size={21} /></button>
        <div className={`help-header-avatar ${aiStatus}`} aria-hidden="true"><Sparkles size={17} /><i /></div>
        <div className="help-header-copy">
          <h1>Help &amp; Support</h1>
          <div className="help-header-sub">
            <b>AI</b>
            <span>{aiStatus === "online" ? "Live replies" : aiStatus === "offline" ? "Guide replies for now" : "Checking…"}</span>
            <span className={`help-status-pill ${aiStatus}`} role="status" aria-label={statusLabel} title={statusNotice || statusLabel}>
              <i aria-hidden="true" />{aiStatus === "online" ? "Online" : aiStatus === "offline" ? "Offline" : "…"}
            </span>
          </div>
        </div>
      </header>
      <nav className="help-toolbar" aria-label="Help navigation">
        <div className="help-toolbar-inner">
          <button className="help-toolbar-button primary" type="button" onClick={clearChat} disabled={busy}><Plus size={16} />New chat</button>
          <button className="help-toolbar-button" type="button" onClick={openHistory} aria-haspopup="dialog" aria-expanded={historyOpen}><History size={16} />Chat history</button>
          <button className="help-toolbar-button help-tour-button" type="button" disabled={busy} onClick={() => beginTour(tourProgress.status === "skipped" || tourProgress.status === "in-progress" ? tourProgress.sceneIndex : 0)}><Sparkles size={16} />{tourProgress.status === "skipped" || tourProgress.status === "in-progress" ? "Continue tour" : "App tour"}</button>
        </div>
      </nav>

      <div className="help-thread" ref={listRef} aria-live="polite" aria-relevant="additions text">
        <AnimatePresence>
          {serviceNotice && (
            <Motion.div className={`help-service-notice ${serviceNotice.kind}`} role="status" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <span className="help-service-icon"><Sparkles size={16} /></span>
              <span>{serviceNotice.text}</span>
              <button type="button" onClick={() => setServiceNotice(null)} aria-label="Dismiss notice"><X size={16} /></button>
            </Motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence mode="wait">
          {introActive && !messages.length && !viewing && (
            <Motion.section className="help-intro" key="intro" initial={{ opacity: 1 }} exit={{ opacity: 0, y: -16, scale: 0.98 }} transition={{ duration: reducedMotion ? 0 : 0.3 }}>
              <Motion.div className="help-orb" initial={{ opacity: 0, scale: 0.55 }} animate={{ opacity: 1, scale: 1 }} transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 180, damping: 14 }}>
                <i /><i /><span><Sparkles size={26} /></span>
              </Motion.div>
              <div className="help-intro-copy">
                <h2 aria-label={`Hi ${userName}`}>{greeting}</h2>
                <Motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: introStage >= 2 ? 1 : 0, y: introStage >= 2 ? 0 : 6 }} transition={{ duration: reducedMotion ? 0 : 0.35 }}>Ask me anything about the app</Motion.p>
              </div>
              <div className="help-question-list">
                {showTourRow && (
                  <Motion.button type="button" className="help-question-row help-tour-question" onClick={() => {
                    setMessages((current) => [...current, createMessage("user", "New here? Take the 1-minute tour")].slice(-20));
                    beginTour(0);
                  }} initial={{ opacity: 0, x: -16 }} animate={{ opacity: introStage >= 3 ? 1 : 0, x: introStage >= 3 ? 0 : -16 }}
                    transition={reducedMotion ? { duration: 0 } : { delay: 0.05, type: "spring", stiffness: 220, damping: 22 }}>
                    <span className="help-question-icon tour"><Sparkles size={17} /></span><span>New here? Take the 1-minute tour</span><ChevronRight size={17} />
                  </Motion.button>
                )}
                {QUESTIONS.map(({ label, id, Icon, tone }, index) => (
                  <Motion.button key={id} type="button" className="help-question-row" onClick={() => askLocalTopic(getTopic(id), label)}
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: introStage >= 3 ? 1 : 0, x: introStage >= 3 ? 0 : -16 }}
                    transition={reducedMotion ? { duration: 0 } : { delay: (index + (showTourRow ? 1 : 0)) * 0.075, type: "spring", stiffness: 220, damping: 22 }}>
                    <span className={`help-question-icon ${tone}`}><Icon size={17} /></span><span>{label}</span><ChevronRight size={17} />
                  </Motion.button>
                ))}
              </div>
            </Motion.section>
          )}
        </AnimatePresence>

        {viewing && (
          <div className="help-history-banner" role="status">
            <History size={18} aria-hidden="true" />
            <div><b>{sessionTitle(viewing)}</b><span>{sessionDate(viewing)} · Saved conversation</span></div>
            <button type="button" onClick={openHistory}>History</button>
          </div>
        )}
        <div className="help-message-list">
          {shownMessages.map((message) => {
            const topic = getTopic(message.topicId);
            const unknown = message.failed || /i (?:do not|don't) know|not covered|not sure/i.test(message.content);
            const actionScreens = topic?.actionScreens || [];
            return (
              <Motion.article key={message.id} className={`help-message ${message.role}`} layout
                initial={reducedMotion ? false : { opacity: 0, y: 14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 280, damping: 24 }}>
                {message.role === "assistant" && <span className="help-message-spark"><Sparkles size={13} /></span>}
                <div className="help-bubble">
                  {message.content
                    ? <p>{formatMessage(message.content)}</p>
                    : message.streaming && <div className="help-typing" aria-label="Assistant is typing"><i /><i /><i /></div>}
                  {message.streaming && message.content && <span className="help-stream-cursor" aria-hidden="true" />}
                  {!message.streaming && message.animationIds?.length > 0 && <HelpAnimations ids={message.animationIds} />}
                  <div className="help-bubble-meta"><time>{timestamp(message)}</time></div>
                </div>
                {(actionScreens.length > 0 || unknown) && (
                  <div className="help-actions">
                    {actionScreens.map((screen) => (
                      <button key={screen} type="button" onClick={() => openTopic({ ...topic, screen })}>Open {SCREEN_LABELS[screen]}</button>
                    ))}
                    {unknown && <button type="button" onClick={() => nav.goReport?.()}>Report an issue</button>}
                  </div>
                )}
                {!viewing && message.quickActions?.length > 0 && (
                  <div className="help-actions help-quick-actions">
                    {message.quickActions.map((action) => (
                      <button key={action.id} type="button" onClick={() => handleMessageAction(message, action.id)}>{action.label}</button>
                    ))}
                  </div>
                )}
              </Motion.article>
            );
          })}
          {!viewing && fallback.length > 0 && (
            <Motion.div className="help-fallback-rows" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <span>Try one of these topics</span>
              {fallback.slice(0, 3).map((topic) => (
                <button key={topic.id} type="button" onClick={() => askLocalTopic(topic)}>
                  <span>{topic.title}</span><ChevronRight size={16} />
                </button>
              ))}
            </Motion.div>
          )}
        </div>
      </div>

      <div className="help-composer-area">
        <AnimatePresence>
          {browseOpen && !viewing && (
            <Motion.section className="help-browse-panel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} aria-label="Browse help topics">
              <div className="help-browse-heading"><b>Browse topics</b><button type="button" onClick={() => setBrowseOpen(false)} aria-label="Close topics"><X size={17} /></button></div>
              {browseTopics.map((topic) => <button className="help-browse-row" key={topic.id} type="button" onClick={() => askLocalTopic(topic)}>{topic.title}<ChevronRight size={15} /></button>)}
            </Motion.section>
          )}
        </AnimatePresence>
        {viewing ? (
          <div className="help-archive-footer">
            <p>This saved conversation is read-only.</p>
            <button className="help-toolbar-button primary" type="button" onClick={() => { setViewingId(null); window.requestAnimationFrame(() => inputRef.current?.focus()); }}>Back to current chat<ChevronRight size={16} /></button>
          </div>
        ) : <form className={`help-composer ${focused ? "focused" : ""}`} onSubmit={(event) => { event.preventDefault(); void sendQuestion(); }}>
          <Sparkles className="help-composer-spark" size={18} aria-hidden="true" />
          <div className="help-input-wrap">
            <input ref={inputRef} type="text" value={question} maxLength={700} disabled={busy}
              onChange={(event) => setQuestion(event.target.value)} onFocus={handleInputFocus} onBlur={() => setFocused(false)}
              aria-label="Your question" autoComplete="off" />
            {!question && <AnimatePresence mode="wait"><Motion.span key={placeholderIndex} className="help-placeholder" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: reducedMotion ? 0 : 0.22 }}>{PLACEHOLDERS[placeholderIndex]}</Motion.span></AnimatePresence>}
          </div>
          <button className={`help-send ${question.trim() ? "ready" : ""}`} type="submit" disabled={busy || !question.trim()} aria-label="Send question">
            <ArrowUp size={20} />
          </button>
        </form>}
        {!viewing && <p className="help-footer-note">AI can make mistakes. Check <button type="button" onClick={() => setBrowseOpen((open) => !open)}>Browse topics</button> or <button type="button" onClick={() => nav.goReport?.()}>Report an issue</button>.</p>}
      </div>
      {historyOpen && <HelpChatHistory sessions={pastSessions} selectedId={viewingId} onSelect={(id) => { setViewingId(id); setHistoryOpen(false); }} onDelete={deleteSession} onClear={clearPastSessions} onClose={() => setHistoryOpen(false)} />}
      {tourOpen && (
        <Suspense fallback={<div className="help-tour-loading" role="status">Preparing your tour…</div>}>
          <HelpTour
            initialScene={tourProgress.sceneIndex}
            onProgress={(sceneIndex) => saveTourProgress({ status: "in-progress", sceneIndex })}
            onComplete={completeTour}
            onClose={closeTour}
            onAddBook={() => nav.openNewBook?.()}
            onAskQuestion={() => { setTourOpen(false); window.setTimeout(() => inputRef.current?.focus(), 80); }}
          />
        </Suspense>
      )}
    </main>
  );
}

function readTourProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(HELP_TOUR_STORAGE_KEY) || "null");
    if (!saved || !["offered", "in-progress", "completed", "skipped"].includes(saved.status)) return { status: "", sceneIndex: 0 };
    return { status: saved.status, sceneIndex: Math.max(0, Number(saved.sceneIndex) || 0) };
  } catch {
    return { status: "", sceneIndex: 0 };
  }
}