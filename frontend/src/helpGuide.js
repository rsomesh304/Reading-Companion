// Source of truth for the Help chat; the backend loads this file to ground AI answers.
// `screen` maps to an app route, `demo` to an animation in HelpDemos.jsx.
export const HELP_GUIDE = [
  {
    id: "app-overview",
    title: "App overview",
    keywords: ["overview", "app", "navigation", "bottom", "tabs", "sections", "screens", "what can", "features", "home"],
    screen: "dashboard",
    demo: "tabs",
    content: "The bottom bar has Home, Library, Gems, Memory and Profile. Home shows your progress. Library holds your books and starts reading sessions. Gems keeps saved quotes. Memory holds preferences and the mind map. Profile has your avatar, companion, Account, Settings, Help & guide, Report an issue and About. The reading session is a full-screen voice screen opened from a book.",
  },
  {
    id: "start-reading",
    title: "Start a reading session",
    keywords: ["start", "begin", "reading", "read", "session", "recap", "continue", "resume", "start reading", "skip"],
    screen: "library",
    content: "Open Library and tap a book's Play button, or tap a book under Continue reading on Home. A recap card shows the chapter summary with three buttons: Skip (close), Hear the story (a narrated animation, only when a summary exists) and Start Reading, which opens the voice session. Adding a new book from Library with Add book starts a session straight away.",
  },
  {
    id: "add-book",
    title: "Add a book",
    keywords: ["add book", "new book", "add", "create", "title", "start a new book", "first book"],
    screen: "library",
    content: "In Library tap Add book (plus icon). The Start a new book card asks for the book title. Type it and tap Start (or press Enter) to create the book and open its reading session. Cancel closes the card.",
  },
  {
    id: "library",
    title: "Library and book tiles",
    keywords: ["library", "book tile", "books", "shelf", "delete book", "remove book", "progress ring", "last read", "cover"],
    screen: "library",
    demo: "library",
    content: "Library shows each book as a tile with a coloured cover, a progress ring (chapters done), and the last read time. Each tile has an Author button, a Play button that opens the recap and a Delete (bin) button that asks for confirmation before permanently removing the book, its chapters and vocabulary. Tap the tile itself to open its chapters.",
  },
  {
    id: "author",
    title: "Author details and photo",
    keywords: ["author", "writer", "photo", "portrait", "bio", "biography", "find photo", "edit author"],
    screen: "library",
    content: "Tap Author on a book tile. You can see the author's name, bio and photo. Find photo online searches for a portrait (Look up again retries). Edit lets you change the author name and a short bio, then Save. The companion can also set the author for you by voice.",
  },
  {
    id: "chapters",
    title: "Chapters and Journey Timeline",
    keywords: ["chapter", "chapters", "chapter grid", "journey", "timeline", "status", "completed", "current", "in progress", "locked", "pages"],
    screen: "library",
    content: "Tapping a book opens its chapter grid with two tabs. Chapters shows one card per chapter with its number, pages, a status (Completed, Current, In Progress or Not Started), and counts of gems and words. Journey Timeline shows an animated vertical story of every chapter read so far with summaries. Tap a chapter card to open its details.",
  },
  {
    id: "chapter-detail",
    title: "Chapter details, summary and vocabulary",
    keywords: ["chapter detail", "summary", "vocabulary tab", "rename chapter", "pencil", "hear the story", "word card", "hindi", "odia", "listen", "synonyms", "antonyms", "context", "analysis"],
    screen: "library",
    content: "A chapter has a Summary tab and a Vocabulary tab. Tap the pencil next to the title to rename it. Summaries build up automatically as you read. Hear the story plays the narrated animation. Vocabulary lists saved words with meaning, example and a Practiced tag. Tap a word for details: Context (the book sentence, Hindi or Odia translation) and Analysis (pronunciation speaker, meanings, synonyms, antonyms, example).",
  },
  {
    id: "story-recap",
    title: "Story theatre (Hear the story)",
    keywords: ["story", "theatre", "recap", "animation", "narration", "captions", "pause", "restart", "hear the story", "film"],
    screen: "library",
    content: "Hear the story plays an animated, narrated retelling of your chapter summary. Controls: Play, Pause, Restart, Captions (subtitles on or off), Mute and Close. If the chapter has no summary yet it closes and asks you to read a little first. It only uses what your companion has saved about the chapter.",
  },
  {
    id: "session-overview",
    title: "Reading screen overview",
    keywords: ["reading screen", "session", "reading session", "screen", "orb", "layout", "buttons", "everything", "overview", "controls", "dock"],
    screen: "library",
    demo: "dock",
    content: "The reading screen is a voice conversation with your companion. Top: the chapter progress card with book title, chapter path, timer and connection status. Centre: a glowing orb that pulses when you or the companion talk, with chips for words and gems saved this session, Page number and Muted. Bottom dock, left to right: Mic, Camera, Page snapshot, Transcript, Ghost switch, End session. Bottom left: your mascot, which opens the list of things done in this session.",
  },
  {
    id: "session-buttons",
    title: "Reading screen buttons",
    keywords: ["button", "buttons", "dock", "icons", "what does", "mic", "camera", "snapshot", "transcript", "ghost", "end", "all buttons"],
    screen: "library",
    demo: "dock",
    content: "Dock buttons: 1) Mic mutes or unmutes you; muted shows a red chip. 2) Camera opens or closes the live camera on your book page. 3) Page snapshot shares one still photo of a page. 4) Transcript opens the conversation with a Re-sync button. 5) Ghost switch turns Author's Ghost Mode on or off. 6) End session (red phone) says goodnight and closes the session. The mascot button lists everything saved in the session.",
  },
  {
    id: "session-mic",
    title: "Microphone and talking",
    keywords: ["mic", "microphone", "mute", "unmute", "muted", "talk", "speak", "listening", "voice", "hear me", "permission"],
    screen: "library",
    demo: "dock",
    content: "Just talk naturally; the companion listens through the mic. Tap the Mic button to mute or unmute; while muted a red Muted chip shows and the companion cannot hear you. If the mic is blocked, allow microphone permission in your browser or phone settings and start the session again.",
  },
  {
    id: "ghost-mode",
    title: "Author's Ghost Mode",
    keywords: ["ghost", "ghost mode", "author", "persona", "author's ghost", "switch", "toggle", "channeling", "writer style", "imaginative"],
    screen: "library",
    demo: "ghost",
    content: "Ghost mode is the Ghost switch in the reading dock. When ON, the orb turns violet and gold with floating stardust, a toast says Channeling the Author's Persona, and the companion explains ideas through the author's known themes and broad perspective. It stays your friendly companion, does not pretend to literally be the author, invent memories or fabricate quotes, and stays grounded in your book. Switch it OFF to return to the normal voice. Set the author name in Library first for best results.",
  },
  {
    id: "camera-options",
    title: "Camera options: live camera vs page snapshot",
    keywords: ["camera", "live camera", "snapshot", "photo", "page", "adjust camera", "restore compact", "next page", "rear camera", "dark", "blurry", "scan", "picture", "options", "difference"],
    screen: "library",
    demo: "camera",
    content: "Two ways to show a page. Live camera (Camera button): opens the rear camera and sends about one sharp frame per second so the companion can read what you point at. Adjust camera enlarges the preview and Restore compact shrinks it. Page snapshot (scan icon): take or choose one still photo; the companion treats it as a fixed page, shows a Page number chip, and a Next page button replaces it. Dark photos are rejected and blurry ones get a warning. Opening the live camera clears a snapshot and a snapshot closes the live camera. You can also say open camera or close camera.",
  },
  {
    id: "session-snapshot",
    title: "Page snapshot",
    keywords: ["snapshot", "still photo", "scan text", "next page", "page number", "photo of page", "upload page", "take photo"],
    screen: "library",
    demo: "camera",
    content: "Tap the scan icon in the dock to take or pick a photo of the page. The companion confirms in one short line that it can see it, then answers questions about words and lines on that page. Tap Next page on the small preview when you move on. Tap the preview to enlarge it. The photo is resent every 15 seconds so the companion keeps it in mind. A dark photo is rejected; retake it in better light.",
  },
  {
    id: "session-transcript",
    title: "Transcript and Re-sync",
    keywords: ["transcript", "conversation", "chat history", "re-sync", "resync", "off-topic", "wrong answer", "drift", "reply"],
    screen: "library",
    demo: "dock",
    content: "The Transcript button opens a drawer with your recent conversation (You and Companion). If the companion goes off-topic, tap Reply off-topic? Re-sync. It apologises, restarts from your book and chapter, and quietly saves a note for the developer. Tap Transcript again to close the drawer.",
  },
  {
    id: "session-progress",
    title: "Chapter progress card (top of reading screen)",
    keywords: ["progress", "chapter progress", "path", "top", "card", "timer", "live", "status", "connecting", "reconnecting", "offline", "chapter number", "done"],
    screen: "library",
    demo: "progress",
    content: "The card at the top shows your book title, a chapter badge with the current chapter number, text like Chapter 3 of 12 with the percent done, and the session timer. Below is a chapter path: finished chapters are filled, the current chapter glows, and upcoming ones are hollow; long books show a window around your current chapter. The status says Live, Getting ready, Reconnecting or Offline.",
  },
  {
    id: "session-activity",
    title: "Mascot and Done in this session",
    keywords: ["mascot", "activity", "done in this session", "saved", "feed", "bubble", "count", "actions"],
    screen: "library",
    content: "Your mascot sits at the bottom left of the reading screen. When the companion quietly saves a word, gem, summary or chapter change, a short bubble appears. Tap the mascot to open Done in this session, a timestamped list of everything saved. The badge on the mascot shows how many actions happened.",
  },
  {
    id: "session-end",
    title: "Ending a session",
    keywords: ["end", "end session", "stop", "finish", "goodnight", "good night", "quit", "leave", "silence", "auto end", "inactive"],
    screen: "library",
    demo: "dock",
    content: "Tap the red phone button, or say end session or good night. The companion says a short goodnight and the session closes within a few seconds, then your summary and preferences are saved in the background. If you are silent for about 4 minutes the companion checks in, and after about 45 more seconds of silence the session ends by itself.",
  },
  {
    id: "voice-commands",
    title: "What you can ask the companion to do",
    keywords: ["voice", "command", "commands", "ask", "say", "tell", "companion", "can do", "capabilities", "next chapter", "rename", "pages", "outline", "complete chapter", "list saved"],
    screen: "library",
    content: "You can ask by voice to: explain a word or phrase; save a word to vocabulary (it asks you to confirm); save a quote as a Gem (say save this line); remember a preference (say remember this); move to the next or another chapter; rename a chapter; set chapter page numbers or an outline; mark a chapter complete; set the book's author; list saved items; delete a word, gem, memory or chapter (always with a confirmation card); and open or close the camera.",
  },
  {
    id: "vocabulary",
    title: "Save and review vocabulary",
    keywords: ["vocabulary", "word", "words", "save word", "meaning", "definition", "log", "learned", "practice", "pronunciation", "recall"],
    screen: "dashboard",
    demo: "vocab",
    content: "While reading, ask what a word means. The companion explains it in context and asks if you want to save it; say yes to save, or no to skip. Saved words attach to the book and chapter with meaning, example, Hindi and Odia meanings, synonyms and antonyms. Every few saves it may invite you to use the word in a sentence, with no grading. See them in Chapter details, Vocabulary tab. Words learned counts appear on Home and Profile.",
  },
  {
    id: "dashboard",
    title: "Home dashboard",
    keywords: ["home", "dashboard", "streak", "stats", "words learned", "this week", "gems saved", "books", "kpi", "greeting"],
    screen: "dashboard",
    demo: "home",
    content: "Home greets you by name and shows your streak (flame ring with a 7-day bar), and four cards: Books, Words learned, Words this week (with the trend against last week) and Gems saved. Tap the mascot for a line. Below are the weekly recall card, vocabulary growth chart, overall progress ring, gems this week, words by book, book progress and Continue reading.",
  },
  {
    id: "dashboard-charts",
    title: "Home charts and Continue reading",
    keywords: ["chart", "growth", "7d", "14d", "30d", "90d", "overall progress", "words by book", "rings", "continue reading", "progress list", "gems this week"],
    screen: "dashboard",
    content: "Vocabulary growth shows words per day; pick 7D, 14D, 30D or 90D and tap the chart for an exact day. Overall progress is the percent of chapters done. Gems this week has seven bars, one per day. Words by book shows concentric rings for your top books; tap a legend to focus one. Book progress lists recent books with completion. Continue reading shows your latest books; tap one to open its recap and resume.",
  },
  {
    id: "recall-card",
    title: "Weekly recall card",
    keywords: ["recall", "revisit", "revisit these", "yaad tha", "hint", "agli baar", "review words", "remember words", "spaced"],
    screen: "dashboard",
    content: "Revisit these appears on Home only when saved words are due: saved over a day ago, recalled fewer than twice and not reviewed recently. It shows one word with its book and chapter. Tap Yaad tha if you remembered it, or Hint dekhein to reveal the meaning and then Agli baar if you want to see it again later. The X closes the card. It is a gentle reminder, not a test.",
  },
  {
    id: "streak",
    title: "Streak",
    keywords: ["streak", "flame", "daily", "days", "consecutive", "7-day", "lose streak", "active"],
    screen: "dashboard",
    content: "Your streak counts consecutive days you were active in a reading session. The Home flame shows the number and a Monday-to-Sunday bar, and Profile shows it as a chip. Read a little each day to keep it going. Reaching 7 days completes the weekly goal.",
  },
  {
    id: "gems",
    title: "Gems (saved quotes)",
    keywords: ["gem", "gems", "quote", "quotes", "save quote", "highlight", "search", "filter", "delete gem", "download", "share"],
    screen: "gems",
    demo: "gems",
    content: "Gems keeps quotes you saved. While reading, say save this line and the companion stores the quote with its book and chapter. On the Gems tab, search quotes or books, filter with book chips, tap the download icon to export a shareable card, or tap the bin to delete a gem. Tap a gem to open it.",
  },
  {
    id: "gem-detail",
    title: "Gem detail and illustration",
    keywords: ["gem detail", "illustration", "generate", "style", "ghibli", "charcoal", "silhouette", "white ink", "regenerate", "real-life application", "takeaway", "sketch"],
    screen: "gems",
    content: "A gem page shows the quote poster, book, author and chapter. Generate illustration lets you pick a style: Lo-fi Ghibli, Charcoal Sketch, Cinematic Silhouette or White Ink Sketch (one is marked Suggested). Regenerate makes a new picture and Retry appears if it fails. Real-life application shows how to use the idea, with a situation, steps, an example and why it matters.",
  },
  {
    id: "memory",
    title: "Memory: preferences and mind map",
    keywords: ["memory", "preferences", "remember", "edit memory", "delete memory", "pencil", "tabs", "saved preferences"],
    screen: "memory",
    demo: "mindmap",
    content: "Memory has two tabs. Preferences lists things you asked the companion to remember; use the pencil to edit, the check or X to save or cancel, and the bin to delete with confirmation. Mind Map (also called Cognitive Constellation) is an interactive map of your books and saved gems that connects ideas across books.",
  },
  {
    id: "mind-map",
    title: "Mind Map (Cognitive Constellation)",
    keywords: ["mind map", "mindmap", "map", "constellation", "cognitive", "echo", "echoes", "connections", "connected", "orbit", "crystal", "surprise", "shuffle", "recenter", "rebuild", "themes", "link", "links", "graph", "ideas", "zoom"],
    screen: "memory",
    demo: "mindmap",
    content: "Mind Map is the second tab in Memory, titled Cognitive Constellation, and shows how your saved ideas connect across books. A header line counts your books, gems and echoes. Book cover = one Library book. Crystal = a saved gem, which orbits its own book in chapter order. Echo = a dotted bridge between gems from different books that carry the same idea even when the wording differs; it can show shared themes and a Why connected note. Tap a book chip at the top to fly to that book. Tap a book to open a sheet listing its saved gems. Tap a gem to see its quote, book and chapter, the Real-life application (situation, steps, example, why it matters) and Echoes in other books, each tappable. Buttons: Shuffle (Surprise me) jumps to a random gem to bring back forgotten ones; Echoes toggles the dotted bridges on or off; Recenter fits the whole map on screen. In the header, Rebuild connections (refresh icon) recomputes the echoes and the Info button explains the map. Drag the sheet down, tap empty space or tap the X to close it. Pinch or scroll to zoom. The map needs saved gems; with none it shows a demo. Gems come from saying save this line in a reading session.",
  },
  {
    id: "profile",
    title: "Profile, avatar and companion",
    keywords: ["profile", "avatar", "photo", "name", "mascot", "companion", "owl", "robot", "sprout", "fox", "book", "change photo", "remove photo", "icon"],
    screen: "profile",
    content: "Profile has your photo (camera button to upload, Remove photo to clear) or six icon avatars, your editable name, streak chip and four stat boxes (Streak, Books, Words, Gems). Your companion section lets you pick Owl, Robot, Sprout, Fox or Book as your reading mascot. Tiles below open Account, Settings, Help & guide, Report an issue and About.",
  },
  {
    id: "account-sync",
    title: "Account and cloud sync",
    keywords: ["account", "sync", "cloud", "google", "sign in", "sign out", "sync now", "backup", "devices", "login", "email"],
    screen: "account",
    content: "Profile, Account shows your connected Google email and the cloud snapshot status (Up to date, Syncing now or Needs attention). Books, gems, preferences and reading progress sync automatically when they change. Tap Sync now to push immediately. Sign out disconnects this device; your cloud snapshot stays with your account.",
  },
  {
    id: "settings",
    title: "Settings",
    keywords: ["settings", "theme", "dark", "light", "voice", "companion voice", "goal", "daily goal", "name", "companion name", "preview voice"],
    screen: "settings",
    demo: "settings",
    content: "Profile, Settings: edit your name and Companion's name, pick a Daily reading goal (10 min, 20 min, 30 min, 1 hour), choose Light or Dark theme, and choose the Companion voice (Leda, Aoede, Kore, Despina, Erinome, Sulafat, Achernar, Charon, Orus) with Preview this voice. A new voice applies from your next session.",
  },
  {
    id: "settings-data",
    title: "Backup, restore, storage and delete data",
    keywords: ["export", "backup", "restore", "json", "storage", "clear", "delete all", "delete my data", "privacy", "conversation history", "preferences", "reset"],
    screen: "settings",
    content: "In Settings: Storage used shows what this device holds. Clear conversation history removes saved recaps, Clear saved preferences empties Memory preferences, and Delete all gems removes every gem. Export backup downloads one JSON file; Restore loads a backup file and reloads the app. Delete all my data permanently erases books, gems, memory and profile after a confirmation. Privacy: your data stays on this device and in your account; voice, camera frames and page photos go to Google Gemini only during a session.",
  },
  {
    id: "updates",
    title: "App updates and release notes",
    keywords: ["update", "updates", "version", "release notes", "what's new", "check for updates", "new version", "update now", "badge", "major update", "ui enhancement", "new chapter", "signature update", "release type", "release types", "label", "labels", "version history", "release history", "types of updates"],
    screen: "settings",
    content: "Settings, Check for updates looks for a new version; a red dot on Settings and Profile means one is ready. Update available lists what is new, with Update now to install. Version & release notes shows the history of changes, and each release card carries a label for its kind: Major update (a big release with many changes), UI enhancement (a visual polish release), A new chapter (a landmark 2.x release that opens a new era of the app) and Signature update (a standout feature, shown with a special animated card). Tap a card to see exactly what changed in it. New kinds of labels may appear in future releases.",
  },
  {
    id: "report-issue",
    title: "Report an issue or idea",
    keywords: ["report", "bug", "issue", "problem", "idea", "feature", "feedback", "improve with ai", "screenshot", "undo", "redo", "steps", "severity", "your reports", "status", "stage", "stages", "timeline", "status timeline", "queued", "seen", "approved", "testing", "rejected", "report status", "fixed in"],
    screen: "report",
    demo: "report",
    content: "Profile, Report an issue. Raise an issue: choose a category (Bug, Issue, New feature, Improvement), where it happened, how serious (for bugs and issues), a title, details, optional steps and up to four screenshots, then Submit. Improve with AI shows a cleaner version of your text; Use suggestion applies it and Keep mine ignores it, and Undo or Redo switches between the two on your device. Only the text you submit is sent. Your reports lists your reports, filterable by type, with a status from Sent through Seen, In review, Approved, In progress and Testing to Done; refresh to update. Stages in order: Queued (saved on your device until it can be sent), Sent (reached the developer), Seen (the developer opened it), In review (being checked), Approved (accepted to be worked on), In progress (a fix is being built), Testing (the fix is being verified) and Done (finished; it may show the version it shipped in as a tappable link to that release in Release History). Rejected means it will not be taken forward, and the developer may leave a short note on a stage. Steps not reached yet stay grey.",
  },
  {
    id: "help-privacy",
    title: "Help chat and privacy",
    keywords: ["help", "privacy", "data", "sent", "send", "question", "chat", "ai", "support", "guide", "private"],
    screen: "profile",
    content: "Help & guide answers questions about the app. For AI answers it sends only your question, up to four recent messages and a small matching part of this guide. It never sends your books, words, gems, account details or reading history. If AI is busy, matching guide topics are shown instead. Help is in Profile.",
  },
  {
    id: "onboarding",
    title: "Welcome tour and first setup",
    keywords: ["tour", "welcome", "onboarding", "skip tour", "first time", "setup", "intro", "genres", "goal", "tutorial"],
    screen: "profile",
    content: "On first launch a voice-narrated welcome tour explains the app with animations, then asks your name, what to call your companion, favourite genres and a daily goal. Skip tour plays a short voice line and goes straight to the form. If voice is unavailable the tour continues with captions.",
  },
  {
    id: "troubleshooting",
    title: "Problems: offline, mic or camera not working, errors",
    keywords: ["error", "not working", "offline", "connection", "busy", "mic error", "camera error", "permission", "reconnecting", "problem", "fix", "internet", "lost"],
    screen: "report",
    content: "Reading needs internet; an offline screen appears if the connection drops. Status Reconnecting resolves by itself; if it stays Offline tap End session and start again. Voice service busy means try again in a moment. For mic or camera errors, allow permission in the browser or phone settings. If a reply goes off-topic use Re-sync in the transcript. For anything else use Report an issue.",
  },
  {
    id: "about",
    title: "About",
    keywords: ["about", "why", "developer", "creator", "built", "who made"],
    screen: "profile",
    content: "Profile, About explains why Reading Companion exists: a friend for readers who get stuck on difficult English, saving what you read so reading adds up. It also introduces the developer.",
  },
];

const STOP_WORDS = new Set(["about", "after", "all", "and", "any", "are", "can", "does", "for", "from", "have", "how", "into", "its", "need", "not", "the", "this", "that", "what", "when", "where", "which", "with", "you", "your", "please", "tell", "show", "work", "works"]);

function stem(word) {
  return word.length > 4 ? word.replace(/(ing|ed|es|s)$/, "") : word;
}

function tokens(text) {
  return (String(text || "").toLowerCase().match(/[a-z0-9]+/g) || []).filter((word) => word.length > 2 && !STOP_WORDS.has(word)).map(stem);
}

const INDEX = HELP_GUIDE.map((entry) => ({
  entry,
  keywordTokens: new Set(tokens(entry.keywords.join(" "))),
  titleTokens: new Set(tokens(entry.title)),
  contentTokens: new Set(tokens(entry.content)),
}));

export function findRelevantHelp(query, limit = 3) {
  const queryTokens = new Set(tokens(query));
  const normalizedQuery = String(query || "").toLowerCase();
  return INDEX.map(({ entry, keywordTokens, titleTokens, contentTokens }) => {
    let score = 0;
    if (queryTokens.has("ghost") && entry.id === "ghost-mode") score += 6;
    if (entry.id === "session-buttons" && !queryTokens.has("ghost") && /\b(button|buttons|control|controls|dock)\b/.test(normalizedQuery)) score += 6;
    for (const word of queryTokens) {
      if (keywordTokens.has(word)) score += 3;
      if (titleTokens.has(word)) score += 2;
      if (contentTokens.has(word)) score += 0.5;
    }
    for (const keyword of entry.keywords) if (keyword.includes(" ") && normalizedQuery.includes(keyword)) score += 4;
    return { ...entry, score };
  }).filter((entry) => entry.score > 0).sort((left, right) => right.score - left.score).slice(0, limit);
}

export function getRelevantHelp(query) {
  return findRelevantHelp(query, 1)[0] || null;
}

const SHORT_ANSWERS = {
  "camera-options": "1. **Camera** keeps a live view of the page and refreshes about once a second. Use it while you move around the book.\n2. **Page snapshot** sends one still photo. Use **Next page** to replace it; choose snapshot when you want the companion to stay focused on one page.",
  "session-buttons": "1. **Mic** mutes or unmutes you. **Camera** shares a live page view; **Page snapshot** shares one still photo.\n2. **Transcript** shows the conversation and its **Re-sync** action. **Ghost** explains ideas through the author's themes. The red **End session** button says goodnight and closes reading.",
  "ghost-mode": "1. Turn on **Ghost** in the reading dock to hear ideas explained through the author's themes and perspective, alongside your book.\n2. Set the author in **Library** first for the best results; switch Ghost off any time to return to your usual companion. It does not impersonate the author or invent quotes.",
};

export function buildShortHelpAnswer(topic) {
  if (!topic) return "I couldn't find a reliable answer in the guide. Try Browse topics or Report an issue.";
  if (topic.id === "save-items") return "1. Ask what a word means, then say yes to save it in the chapter's **Vocabulary**.\n2. Say **save this line** for a quote; saved quotes appear in **Gems**.";
  if (SHORT_ANSWERS[topic.id]) return SHORT_ANSWERS[topic.id];
  const sentences = topic.content.match(/[^.!?]+[.!?]?/g)?.map((part) => part.trim()).filter(Boolean) || [topic.content];
  return sentences.slice(0, 2).map((sentence, index) => `${index + 1}. ${sentence}`).join("\n");
}
