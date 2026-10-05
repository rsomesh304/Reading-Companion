export const HELP_TOUR_STORAGE_KEY = "rc_help_tour_v1";

export const HELP_TOUR_SCENES = [
  {
    id: "welcome",
    title: "A reading buddy, right beside you",
    hinglish: "Reading Companion aapka voice-first reading buddy hai. Apni book padho, aur saath-saath baat karo.",
    english: "Reading Companion is your voice-first reading buddy. Read your own book and talk about it as you go.",
    visual: "welcome",
    tags: ["Your book", "Your companion"],
  },
  {
    id: "library",
    title: "Start with your book",
    hinglish: "Library mein **Add book** chuno, title likho, phir **Start**. Aapki reading wahi se khul jaati hai.",
    english: "In Library, choose **Add book**, enter the title, then tap **Start**. Your reading opens right away.",
    visual: "library",
    tags: ["Library", "Add book", "Start"],
  },
  {
    id: "session",
    title: "Read and talk naturally",
    hinglish: "**Start Reading** ke baad companion se bolo. **Mic**, **Camera**, **Page snapshot** aur **Transcript** neeche milte hain. Shaant jagah mein awaaz aur saaf sunai deti hai.",
    english: "Tap **Start Reading** and talk to your companion. Find **Mic**, **Camera**, **Page snapshot**, and **Transcript** below. A quiet place helps it hear you clearly.",
    visual: "session",
    tags: ["Mic", "Camera", "Page snapshot", "Transcript"],
  },
  {
    id: "words",
    title: "Make new words stick",
    hinglish: "Kisi word ka meaning pucho. Samajh aaye toh **yes** bolo; word us chapter ke **Vocabulary** mein save ho jayega.",
    english: "Ask what a word means. If the explanation helps, say **yes** and it is saved in that chapter’s **Vocabulary**.",
    visual: "words",
    tags: ["Ask a word", "Vocabulary"],
  },
  {
    id: "gems",
    title: "Keep the lines you love",
    hinglish: "Quote save karna ho toh bolo **save this quote**. Woh **Gems** mein illustration aur uski real-life application ke saath milta hai.",
    english: "Say **save this quote** to keep a line. Find it in **Gems**, with an illustration and a real-life application.",
    visual: "gems",
    tags: ["Save this quote", "Gems"],
  },
  {
    id: "chapters",
    title: "See how far you have come",
    hinglish: "Book ke chapters aur status dekho. **Journey Timeline** aapke padhe hue chapters ko ek story ki tarah dikhata hai.",
    english: "Check each chapter and its status. **Journey Timeline** turns the chapters you have read into a visual story.",
    visual: "chapters",
    tags: ["Chapters", "Journey Timeline"],
  },
  {
    id: "home",
    title: "Small steps add up",
    hinglish: "**Home** par streak, daily numbers aur charts se apni reading progress ek nazar mein dekho.",
    english: "On **Home**, your streak, daily numbers, and charts give you a quick view of your reading progress.",
    visual: "home",
    tags: ["Home", "Streak", "Progress"],
  },
  {
    id: "memory",
    title: "Your ideas find each other",
    hinglish: "**Memory** aapki batayi preferences yaad rakhta hai. **Mind Map** alag books ke milte-julte ideas ko jodta hai.",
    english: "**Memory** keeps preferences you choose to share. **Mind Map** connects related ideas across different books.",
    visual: "memory",
    tags: ["Memory", "Mind Map"],
  },
  {
    id: "profile",
    title: "Make the app feel like yours",
    hinglish: "**Profile** mein companion chuno, **Settings** badlo, **Report an issue** bhejo, ya **Help & guide** se kuch bhi pucho.",
    english: "In **Profile**, choose your companion, change **Settings**, **Report an issue**, or ask anything in **Help & guide**.",
    visual: "profile",
    tags: ["Profile", "Settings", "Help & guide"],
  },
  {
    id: "ready",
    title: "You are ready",
    hinglish: "Bas ek book chuno, aur apni pace par padhna shuru karo. Main yahin hoon.",
    english: "Choose a book and start at your own pace. I’m right here when you need me.",
    visual: "ready",
    tags: ["Ready when you are"],
  },
];

const NEW_READER_PATTERNS = [
  /\b(?:i am new|i'm new|im new|new here|new user|first time|first-time|never used (?:this|the) app|new to (?:this|the) app)\b/,
  /\b(?:pehli baar|pahli baar|main naya hoon|mai naya hoon|main nayi hoon|mai nayi hoon)\b/,
];

const TOUR_OFFER_PATTERNS = [
  /\b(?:where do i start|what is this app|how (?:do i|to) use (?:this|the) app|how does this app work|help me get started|i am confused|i'm confused|im confused)\b/,
  /\b(?:kuchh? samajh(?: mein)? nahi aa raha|kaise use karte hain|kaise use kar(?:u|un)|shuru kaise kar(?:u|un)|kahan se shuru kar(?:u|un)|app kaise use hota)\b/,
];

export function detectNewReaderIntent(value) {
  const question = String(value || "").normalize("NFKC").toLowerCase().replace(/[’]/g, "'").replace(/[?!.,]/g, " ").replace(/\s+/g, " ").trim();
  if (!question) return "none";
  if (/\b(?:take|start|show|replay|continue)\b.{0,16}\btour\b|\btour\b/.test(question)) return "start";
  if (NEW_READER_PATTERNS.some((pattern) => pattern.test(question))) return "start";
  if (TOUR_OFFER_PATTERNS.some((pattern) => pattern.test(question))) return "offer";
  return "none";
}
