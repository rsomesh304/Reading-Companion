import {
    BookOpen, Brain, Bug, Camera, Cloud, Download, Flame, Gem, Home, Languages, Library, Link2, Maximize2, MessageSquareText, Mic,
    Palette, PenLine, PhoneOff, Play, RefreshCw, ScanText, Search, Send, Shuffle, Trash2, TrendingUp, User, Volume2,
} from "lucide-react";
import { useEffect, useState } from "react";

function useCycle(length, ms) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIndex((current) => (current + 1) % length), ms);
    return () => clearInterval(id);
  }, [length, ms]);
  return index;
}

const DOCK = [
  { id: "mic", Icon: Mic, label: "Mic", text: "Mute or unmute yourself. A red Muted chip appears." },
  { id: "camera", Icon: Camera, label: "Camera", text: "Open or close the live camera on your book page." },
  { id: "snap", Icon: ScanText, label: "Snapshot", text: "Share one still photo of the page." },
  { id: "chat", Icon: MessageSquareText, label: "Transcript", text: "Read the conversation. Re-sync fixes off-topic replies." },
  { id: "ghost", label: "Ghost", text: "Ghost mode: ideas through the author's themes." },
  { id: "end", Icon: PhoneOff, label: "End", text: "Say goodnight and end the session." },
];

function CycleDemo({ items, children }) {
  const active = useCycle(items.length, 2200);
  return (
    <>
      {children}
      <div className="hd-dock">
        {items.map(({ id, Icon, label }, index) => (
          <span key={id} className={`hd-dock-btn ${id} ${active === index ? "on" : ""}`}>
            {Icon ? <Icon size={17} /> : <span className="hd-switch"><i /></span>}
            <small>{label}</small>
          </span>
        ))}
      </div>
      <p key={active} className="hd-caption"><b>{items[active].label}.</b> {items[active].text}</p>
    </>
  );
}

const DockDemo = () => <CycleDemo items={DOCK} />;

const TABS = [
  { id: "home", Icon: Home, label: "Home", text: "Your streak, stats and charts." },
  { id: "library", Icon: Library, label: "Library", text: "Your books. Start reading from here." },
  { id: "gems", Icon: Gem, label: "Gems", text: "Quotes you saved while reading." },
  { id: "memory", Icon: Brain, label: "Memory", text: "Preferences and the Mind Map." },
  { id: "profile", Icon: User, label: "Profile", text: "Avatar, companion, Account, Settings and Help." },
];
const LIBRARY = [
  { id: "tile", Icon: BookOpen, label: "Book tile", text: "Tap it to open the chapters. The ring shows chapters done." },
  { id: "author", Icon: PenLine, label: "Author", text: "See or edit the author's name, bio and photo." },
  { id: "play", Icon: Play, label: "Play", text: "Open the recap, then Start Reading." },
  { id: "delete", Icon: Trash2, label: "Delete", text: "Removes the book after a confirmation." },
];
const VOCAB = [
  { id: "ask", Icon: Mic, label: "Ask", text: "Ask the companion what a word means while reading." },
  { id: "save", Icon: Download, label: "Save", text: "Say yes and the word is saved to the chapter." },
  { id: "detail", Icon: Languages, label: "Details", text: "Open a word for context, Hindi or Odia meaning, synonyms and antonyms." },
  { id: "say", Icon: Volume2, label: "Hear it", text: "The speaker plays the pronunciation." },
];
const HOME = [
  { id: "streak", Icon: Flame, label: "Streak", text: "Consecutive days you read, with a 7-day bar." },
  { id: "cards", Icon: BookOpen, label: "Stats", text: "Books, words learned, words this week and gems saved." },
  { id: "growth", Icon: TrendingUp, label: "Growth", text: "Vocabulary growth: pick 7D to 90D and tap a day." },
  { id: "continue", Icon: Play, label: "Continue", text: "Tap a recent book to resume reading." },
];
const GEMS = [
  { id: "search", Icon: Search, label: "Search", text: "Find quotes or books, or filter with book chips." },
  { id: "gem", Icon: Gem, label: "Open", text: "Open a gem to generate an illustration and see its real-life application." },
  { id: "save", Icon: Download, label: "Export", text: "Download a shareable card of the quote." },
  { id: "delete", Icon: Trash2, label: "Delete", text: "Remove a gem after confirming." },
];
const SETTINGS = [
  { id: "voice", Icon: Volume2, label: "Voice", text: "Pick the companion voice and preview it." },
  { id: "theme", Icon: Palette, label: "Theme", text: "Switch between light and dark." },
  { id: "cloud", Icon: Cloud, label: "Account", text: "Sync your data to the cloud, or Sync now." },
  { id: "backup", Icon: Download, label: "Backup", text: "Export or restore a JSON backup." },
];
const REPORT = [
  { id: "type", Icon: Bug, label: "Category", text: "Choose Bug, Issue, New feature or Improvement." },
  { id: "improve", Icon: PenLine, label: "Improve", text: "Improve with AI cleans your text. Undo or Keep mine anytime." },
  { id: "shots", Icon: Camera, label: "Shots", text: "Attach up to four screenshots." },
  { id: "send", Icon: Send, label: "Submit", text: "Send it, then follow its status in Your reports." },
];
const MAP_CONTROLS = [
  { id: "book", Icon: BookOpen, label: "Book", text: "A book cover is one Library book. Tap it to list its gems." },
  { id: "gem", Icon: Gem, label: "Gem", text: "A crystal is a saved quote. Tap it for its real-life application." },
  { id: "echo", Icon: Link2, label: "Echoes", text: "Dotted bridges link the same idea across books. Toggle them on or off." },
  { id: "shuffle", Icon: Shuffle, label: "Surprise", text: "Jump to a random gem and rediscover it." },
  { id: "fit", Icon: Maximize2, label: "Recenter", text: "Fit the whole map on screen." },
  { id: "rebuild", Icon: RefreshCw, label: "Rebuild", text: "Recompute the connections from your gems." },
];

function MindMapDemo() {
  return (
    <CycleDemo items={MAP_CONTROLS}>
      <svg className="hd-map" viewBox="0 0 240 110" role="presentation">
        <line className="hd-echo" x1="60" y1="55" x2="180" y2="55" />
        {[60, 180].map((cx, book) => (
          <g key={cx}>
            <circle className="hd-orbit" cx={cx} cy="55" r="34" />
            <g>
              <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} 55`} to={`${book ? -360 : 360} ${cx} 55`} dur={book ? "14s" : "10s"} repeatCount="indefinite" />
              {[0, 120, 240].map((deg) => (
                <rect key={deg} className="hd-gem" x={cx - 4} y="17" width="8" height="8" rx="2" transform={`rotate(${deg} ${cx} 55)`} />
              ))}
            </g>
            <rect className="hd-book" x={cx - 9} y="43" width="18" height="24" rx="3" />
          </g>
        ))}
      </svg>
    </CycleDemo>
  );
}

function GhostDemo() {
  const on = useCycle(2, 3400) === 1;
  return (
    <>
      <div className={`hd-ghost ${on ? "on" : ""}`}>
        <div className="hd-orb">
          {on && [0, 1, 2, 3, 4, 5].map((n) => <i key={n} style={{ "--x": `${(n - 2.5) * 13}px`, animationDelay: `${n * 0.35}s` }} />)}
        </div>
        <span className="hd-switch big"><i /></span>
      </div>
      <p key={String(on)} className="hd-caption">
        {on ? <><b>Ghost ON.</b> Violet and gold orb. Explanations lean on the author's themes. It never pretends to be the author.</>
          : <><b>Ghost OFF.</b> Your usual warm companion voice.</>}
      </p>
    </>
  );
}

function CameraDemo() {
  const active = useCycle(2, 3600);
  return (
    <>
      <div className="hd-camera">
        <div className={`hd-phone ${active === 0 ? "on" : ""}`}>
          <div className="hd-page"><i /><i /><i /><i /></div>
          <span className="hd-scan" />
          <em>Live camera</em>
        </div>
        <div className={`hd-phone ${active === 1 ? "on" : ""}`}>
          <div className="hd-page"><i /><i /><i /><i /></div>
          <span className="hd-flash" />
          <em>Snapshot</em>
        </div>
      </div>
      <p key={active} className="hd-caption">
        {active === 0 ? <><b>Live camera.</b> About one sharp frame per second from the rear camera. Adjust camera enlarges the preview.</>
          : <><b>Snapshot.</b> One fixed photo with a Page chip. Next page replaces it. Dark photos are rejected.</>}
      </p>
    </>
  );
}

function ProgressDemo() {
  const total = 6;
  const current = 2 + useCycle(4, 1700);
  return (
    <>
      <div className="hd-progress">
        <b className="hd-badge">{current}</b>
        <div className="hd-path">
          {Array.from({ length: total }, (_, index) => index + 1).map((number) => (
            <span key={number} className={`hd-node ${number < current ? "done" : number === current ? "current" : ""}`}>
              <i>{number}</i>
            </span>
          ))}
        </div>
      </div>
      <p className="hd-caption"><b>Chapter {current} of {total}.</b> Filled = finished, glowing = you are here, hollow = coming up.</p>
    </>
  );
}

const DEMOS = {
  dock: DockDemo,
  ghost: GhostDemo,
  camera: CameraDemo,
  progress: ProgressDemo,
  mindmap: MindMapDemo,
  tabs: () => <CycleDemo items={TABS} />,
  library: () => <CycleDemo items={LIBRARY} />,
  vocab: () => <CycleDemo items={VOCAB} />,
  home: () => <CycleDemo items={HOME} />,
  gems: () => <CycleDemo items={GEMS} />,
  settings: () => <CycleDemo items={SETTINGS} />,
  report: () => <CycleDemo items={REPORT} />,
};

export default function HelpDemo({ kind }) {
  const Demo = DEMOS[kind];
  return Demo ? <div className="help-demo" aria-hidden="true"><Demo /></div> : null;
}
