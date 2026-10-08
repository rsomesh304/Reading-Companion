import { AnimatePresence, motion as Motion } from "framer-motion";
import { SkipForward, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiUrl } from "../api.js";
import MascotCharacter from "../components/MascotCharacter.jsx";
import DeveloperCard from "../DeveloperCard.jsx";
import { getMascot } from "../mascotPreference.js";
import ServiceNotice from "../ServiceNotice.jsx";
import { useGeminiVoiceDriver } from "./avatarDriver.js";
import EmberOrb from "./EmberOrb.jsx";
import "./Onboarding.css";
import FeatureScene, { ReaderCard } from "./OnboardingScenes.jsx";


const PREFS = ["Self-help", "Spirituality", "Business", "Fiction", "Biography", "Science", "Poetry", "History"];
const GOALS = ["10 min", "20 min", "30 min", "1 hour"];
const MASCOT_NAMES = { owl: "Ullu", robot: "Robo", sprout: "Sprout", fox: "Fox", book: "Kitaab" };
const TOUR_PROMPT = "You are a warm Indian storyteller speaking naturally to a friend over chai. Speak in Roman Hinglish at a calm, conversational pace, slightly slower than a fast podcast voice, with only tiny natural breaths and very short gaps between thoughts. Every [LINE] message is a complete fixed script: say exactly the text after [LINE], word for word. Keep the delivery smooth and human, with no long pauses after each phrase, no robotic staccato, no dramatic silence, and no extra filler. Do not add an intro, outro, filler, transition, reaction, or extra sentence; do not omit, translate, or paraphrase anything. [PROFILE CARD COMMENTARY] is the only dynamic message and should follow its own instruction. Never speak the message prefixes.";
const TOUR_COPY = {
  welcome: "Reading Companion mein swagat hai", skip: "Skip", skipTour: "Tour skip karein", subtitle: "Apne reading companion se milo", meet: "Chalo milte hain", mute: "Awaaz band karo", unmute: "Awaaz chalao", connecting: "Awaaz connect ho rahi hai…", voiceUnavailable: "Awaaz abhi available nahi hai. Tour captions ke saath chalega.", companion: "Mujhe kis naam se bulaoge?", companionPlaceholder: "Jaise: Saathi", name: "Tumhara naam", namePlaceholder: "Apna naam likho", genres: "Tumhe kaunsi books pasand hain?", goal: "Roz kitni der padhna chahoge?", next: "Aage chalo", creatorTag: "CREATOR · v1.0", creatorRole: "Data Engineer", creatorQuote: "Data se roz ka kaam, design se roz ke sapne.", creatorStats: [["Data", "Day job"], ["Design", "Interest"], ["AI", "Built with"]], silentMode: "silent buddy", allSet: "Sab taiyaar",
};

const MASCOT_LINES = ["Main chup zaroor rehta hoon... par tumhari har kitab pe meri nazar hai!", "Kitab kholo aur shuru ho jao... main yahin hoon tumhare saath."];
const FEATURE_LINES = [
  "Sabse pehle... Reading Session. Panne ka ek snapshot bhejiye, phone paas rakhiye, aur mujhse bilkul ek dost ki tarah baat kijiye.",
  "Panna palatne par bas ek naya snapshot bhejiye. Purani photo replace ho jaati hai, lekin kahani ka context aur saved summaries mere paas rehte hain.",
  "Doosra... agar koi mushkil word atak jaaye, toh dictionary mat kholiye. Mujhse poochhiye, main aapko aapki bhasha mein samjha doonga.",
  "Teesra hai Gems... koi line dil ko chhoo jaaye, toh use save kijiye. Main uska ek khoobsurat, premium visual card bana doonga jise aap yaad rakh sakein.",
  "Aur aakhir mein, Memory... kitab khatam hone ke baad main poori kahani aur concepts ka ek chamakta hua Mind Map bana doonga, taaki aap kuchh na bhoolein.",
];
// Scene index (OnboardingScenes) shown with each FEATURE_LINES entry
const FEATURE_SCENES = [3, 19, 4, 5, 6];
const FEATURE_INTRO = "Ab jo sunne wale hain na... woh is app ki chaar khaas taakatein hain. Chaliye, ek-ek karke, aaram se samajhte hain.";
const VISUAL_RECAP_LINE = "Aur agar aap chahein, chapter padhne se pehle uski pichhli kahani ek chhoti si animation mein dekh sakte hain. Agar Start Reading button press karoge toh aap seedha reading session screen mein pahunch jayenge.";
const HELP_SUPPORT_LINE = "Agar kuchh samajh mein na aaye, toh Profile mein Help & Support par chat kijiye. App ke baare mein kuchh bhi poochh sakte hain.";
const WHY_US_LINES = [
  "Ab aap soch rahe honge... ye sab toh ChatGPT ya Gemini bhi kar leta hai. Sach hai... par wahan har baar nayi shuruaat hoti hai, aur kal ka kuch yaad nahi rehta.",
  "Yahan main aapki kitab, chapter aur har word yaad rakhta hoon... streak aur goal ke saath, aur aapki apni bhasha mein samjhata hoon. Ye chat nahi... aapka apna reading saathi hai.",
];
// scene 13 = AI vs your book, 14 = words that stay
const WHY_US_SCENES = [13, 14];
const SKIP_ASK_LINE = "Theek hai, tour chhod dete hain. Pehle apna naam, mujhe kis naam se bulaoge, pasand ke genres, aur roz kitni der padhna chahoge - yeh bata do.";
const VOICE_CHECK_ATTEMPTS = 4;

const TOUR_STORIES = [
  {
    open: "Hum sabne kabhi na kabhi ek kitab bade shauk se khareede honge... yeh sochkar ki roz padhenge. Par woh bas shelf par reh gayi... hai na?",
    why: "Aksar koi mushkil English word aate hi padhne ka maza toot jaata hai... aur hum phone chalane lagte hain. Main isi flow ko bachane aaya hoon. Main aapka Reading Companion hoon.",
    creator: "Is khoobsurat app ko kisi badi company ne nahi... balki sirf ek insaan ke sapne ne janam diya hai - Soumyaranjan ne. Din mein Accenture mein Data Engineer... aur raat mein aapke liye ye khoobsurat cheezein banate hain.",
    mascotIntro: "Aur haan... yeh chhota sa pyara dost chup-chaap apne text bubbles se aapki padhai mein jaan dalega.",
    mascotSecret: "Aur ek chhota sa raaz... nabbe din tak roz padhoge, toh yeh bolna bhi seekh jaayega.",
    ask: "Chaliye, is safar ki shuruaat karte hain. mere liye ek naam, Apna naam ... aur apni pasand ki books ke baare mein batayein.",
  },
];

function buildBeats(story) {
  return [
    { s: 1, f: 11, t: story.open },
    { s: 1, f: 10, t: story.why },
    ...WHY_US_LINES.map((text, index) => ({ s: 1, f: WHY_US_SCENES[index], t: text })),
    { s: 1, f: 2, t: FEATURE_INTRO },
    ...FEATURE_LINES.map((text, index) => ({ s: 1, f: FEATURE_SCENES[index], t: text })),
    { s: 1, f: 12, t: VISUAL_RECAP_LINE },
    { s: 1, f: 20, t: HELP_SUPPORT_LINE },
    { s: 2, card: true, t: story.creator },
    { s: 2, card: false, mascot: true, bubble: "Padhai mein main bhi tumhare saath hoon!", wait: 11000, t: story.mascotIntro },
    { s: 1, card: false, mascot: false, bubble: null, f: 9, t: story.mascotSecret },
    { s: 3, t: story.ask },
  ];
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (a) => a[Math.floor(Math.random() * a.length)];

const CONFETTI = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2;
  return { x: Math.cos(a) * 96, y: Math.sin(a) * 96, delay: i * 0.025, hue: i % 2 ? "#f59e0b" : "#8B5CF6" };
});
const ORB_HEIGHT = { 0: "46dvh", 1: "22dvh", 2: "22dvh", 3: "20dvh", 4: "24dvh", 5: "16dvh" };

export default function Onboarding({ initialName = "", voiceName = "Leda", onFinish }) {
  const [muted, setMuted] = useState(false);
  const driver = useGeminiVoiceDriver({ voiceName, muted });
  const mascotId = getMascot();
  const mName = MASCOT_NAMES[mascotId] || "Ullu";

  const [started, setStarted] = useState(false);
  const [skipMode, setSkipMode] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [voiceAttempt, setVoiceAttempt] = useState(1);
  const [voiceFailed, setVoiceFailed] = useState(false);
  const [silentOk, setSilentOk] = useState(false);
  const [step, setStep] = useState(0);
  const [caption, setCaption] = useState("");
  const [feature, setFeature] = useState(-1);
  const [mascotOn, setMascotOn] = useState(false);
  const [bubble, setBubble] = useState(null);
  const [card, setCard] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ name: initialName, companionName: "", prefs: [], goal: "20 min" });
  const [otherOn, setOtherOn] = useState(false);
  const [customGenres, setCustomGenres] = useState("");
  const skipVoiceConnectedRef = useRef(false);
  const copy = TOUR_COPY;
  // listed chips + anything the reader typed under "Other", deduped
  const mergedPrefs = [...form.prefs, ...customGenres.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)]
    .filter((v, i, a) => a.indexOf(v) === i).slice(0, 12);

  const runRef = useRef(0);
  const api = useRef(driver);
  useEffect(() => { api.current = driver; });
  useEffect(() => {
    const run = runRef;
    const a = api;
    return () => { run.current += 1; a.current.close(); };
  }, []);

  async function play(beats, my) {
    const alive = () => runRef.current === my;
    const apply = (b) => {
      if ("s" in b) setStep(b.s);
      if ("card" in b) setCard(b.card);
      if ("mascot" in b) setMascotOn(Boolean(b.mascot));
      if ("bubble" in b) {
        setBubble(typeof b.bubble === "string" ? b.bubble : b.bubble ? pick(MASCOT_LINES) : null);
        if (b.bubble) setTimeout(() => setBubble(null), b.wait || 5200);
      }
      setFeature("f" in b ? b.f : -1);
      setCaption(b.t);
    };
    const sendBeat = (beat) => api.current.say(`[LINE] ${beat.t}`, {
      fallback: beat.t,
      startTimeoutMs: 1200,
      timeoutMs: 25000,
      onStart: (ms) => setTimeout(() => { if (alive()) apply(beat); }, Math.max(0, ms)),
    });
    let index = 0;
    let current = sendBeat(beats[index]);
    while (current && alive()) {
      await current.generated;
      if (!alive()) return false;
      const next = index + 1 < beats.length ? sendBeat(beats[index + 1]) : null;
      await current;
      if (!alive()) return false;
      current = next;
      index += 1;
    }
    return alive();
  }

  function payload(d) {
    return {
      name: d.name.trim(),
      companionName: d.companionName.trim(),
      preferences: d.prefs,
      dailyGoal: d.goal,
    };
  }

  async function runIntro() {
    const my = ++runRef.current;
    const story = pick(TOUR_STORIES);
    await play(buildBeats(story), my);
  }

  async function submitProfile() {
    const my = ++runRef.current;
    setSending(true);
    setMascotOn(false); setBubble(null); setCard(false); setFeature(-1);
    setStep(5);
    if (skipMode && !skipVoiceConnectedRef.current && !silentOk) {
      const connected = await connectVoice(my);
      if (runRef.current !== my) return;
      if (!connected) {
        setVoiceFailed(false);
        setSilentOk(true);
      } else skipVoiceConnectedRef.current = true;
    }
    const selectedGenres = mergedPrefs.length ? mergedPrefs.join(", ") : "No genres selected";
    const genreCommentary = api.current.say(
      `[PROFILE CARD COMMENTARY] The reader chose these genres: ${selectedGenres}. Their daily reading goal is ${form.goal}. While the animated profile card is visible, respond as a warm friend in 2 or 3 short, natural sentences in Roman Hinglish (everyday Hindi mixed with English). Mention the appeal of one or two chosen genres and connect it lightly to reading. Do not merely repeat the list, infer personality, recommend books, ask questions, say all set, or give reminders. If no genre was selected, respond briefly to the daily goal without inventing a preference.`,
      {
        fallback: "Tumhari reading pasand aur daily goal ke saath, ab humara padhne ka safar shuru hota hai.",
        onText: setCaption,
      }
    );
    await Promise.all([genreCommentary, sleep(4600)]);
    if (runRef.current !== my) return;
    setStep(4);
    await sleep(2200);
    if (runRef.current !== my) return;
    api.current.close();
    onFinish(payload({ ...form, prefs: mergedPrefs }));
  }

  async function begin() { setSkipMode(false); await launch(); }

  // Tries the voice a few times, showing a checking animation instead of silently falling back to captions.
  async function connectVoice(my) {
    setVoiceFailed(false);
    setConnecting(true);
    for (let attempt = 1; attempt <= VOICE_CHECK_ATTEMPTS; attempt += 1) {
      setVoiceAttempt(attempt);
      const ok = await api.current.connect(TOUR_PROMPT);
      if (runRef.current !== my) return null;
      if (ok) { setConnecting(false); return true; }
      if (attempt < VOICE_CHECK_ATTEMPTS) await sleep(1800);
      if (runRef.current !== my) return null;
    }
    setConnecting(false);
    setVoiceFailed(true);
    return false;
  }

  async function launch() {
    const my = ++runRef.current;
    setStarted(true);
    setSilentOk(false);
    api.current.reset();
    const ok = await connectVoice(my);
    if (ok) await runIntro();
  }

  function skipTour() {
    if (connecting || sending || step >= 3) return;
    const my = ++runRef.current;
    api.current.reset();
    skipVoiceConnectedRef.current = false;
    setStarted(true);
    setSkipMode(true);
    setConnecting(false);
    setVoiceFailed(false);
    setSilentOk(false);
    setMascotOn(false); setBubble(null); setCard(false); setFeature(-1); setCaption("");
    setStep(3);
    void speakSkipPrompt(my);
  }

  async function speakSkipPrompt(my) {
    setConnecting(true);
    try {
      if (!(await api.current.prepareAudio())) throw new Error("audio_context_unavailable");
      if (runRef.current !== my) return;
      const response = await fetch(apiUrl("/api/onboarding/skip-prompt-audio"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceName }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.audio) throw new Error(result.error || "skip_prompt_speech_unavailable");
      if (runRef.current !== my) return;
      await api.current.playPcm(result.audio);
    } catch (speechError) {
      if (runRef.current !== my) return;
      console.warn("[ONBOARDING] Skip prompt speech failed:", speechError?.message || speechError);
      setVoiceFailed(true);
    } finally {
      if (runRef.current === my) setConnecting(false);
    }
  }

  function retryVoice() {
    if (skipMode) { void speakSkipPrompt(runRef.current); return; }
    launch();
  }

  function continueWithCaptions() {
    setVoiceFailed(false);
    setSilentOk(true);
    if (skipMode) { setCaption(SKIP_ASK_LINE); return; }
    runIntro();
  }

  const canContinue = form.name.trim() && form.companionName.trim() && (!skipMode || mergedPrefs.length > 0) && !sending && !connecting;
  const togglePref = (p) => setForm((f) => ({ ...f, prefs: f.prefs.includes(p) ? f.prefs.filter((x) => x !== p) : [...f.prefs, p] }));
  const hostName = form.companionName.trim() || "Your companion";
  const dotIdx = Math.min(step, 3);

  return (
    <Motion.div className="ob-root" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05, filter: "blur(14px)" }} transition={{ duration: 0.6 }}>
      <div className="ob-orb ob-orb-a" /><div className="ob-orb ob-orb-b" />

      <div className="ob-top">
        <div className="ob-dots">{[0, 1, 2, 3, 4].map((i) => <span key={i} className={i === dotIdx ? "on" : i < dotIdx ? "done" : ""} />)}</div>
        <div className="ob-top-actions">
          {started && step < 3 && (
            <button type="button" className="ob-skip" onClick={skipTour} disabled={connecting} aria-label={copy.skip}>
              {copy.skip} <SkipForward size={13} />
            </button>
          )}
          <button type="button" className="ob-round" onClick={() => setMuted((m) => !m)} aria-label={muted ? copy.unmute : copy.mute}>
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      </div>

      {silentOk && !driver.voiceOk && (
        <div className="ob-notice">{copy.voiceUnavailable}</div>
      )}

      <div className="ob-stage">
        <Motion.div className="ob-avatar-wrap" animate={{ height: ORB_HEIGHT[step] || "30dvh" }} transition={{ type: "spring", stiffness: 80, damping: 16 }}>
          <div className="ob-orb-box">
            <EmberOrb levelRef={driver.levelRef} mode={driver.speaking ? "speaking" : "idle"} />
          </div>
        </Motion.div>

        {(step === 1 || step === 2) && feature >= 0 && <FeatureScene index={feature} />}

        <AnimatePresence>
          {step === 2 && card && (
            <Motion.div className="ob-devcard"
              initial={{ opacity: 0, y: 50, scale: 0.9, rotate: -3 }} animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, y: -30, scale: 0.92 }} transition={{ type: "spring", stiffness: 150, damping: 16 }}>
              <DeveloperCard compact />
            </Motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {step === 3 && (
            <Motion.div className="ob-form" initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 110, damping: 16 }}>
              {skipMode && silentOk && <p className="ob-skip-script">{SKIP_ASK_LINE}</p>}
              <label>{copy.companion}
                <input value={form.companionName} maxLength={20} placeholder={copy.companionPlaceholder}
                  onChange={(e) => setForm({ ...form, companionName: e.target.value })} />
              </label>
              <label>{copy.name}
                <input value={form.name} maxLength={30} placeholder={copy.namePlaceholder}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              <div className="ob-label">{copy.genres}</div>
              <div className="ob-chips">
                {PREFS.map((p) => (
                  <button key={p} type="button" className={`ob-chip ${form.prefs.includes(p) ? "on" : ""}`} onClick={() => togglePref(p)}>{p}</button>
                ))}
                <button type="button" className={`ob-chip ${otherOn ? "on" : ""}`} onClick={() => setOtherOn((o) => !o)}>Other</button>
              </div>
              {otherOn && (
                <input value={customGenres} maxLength={60} placeholder="Apne genres likho, comma se - jaise: Thriller, Mythology"
                  onChange={(e) => setCustomGenres(e.target.value)} />
              )}
              <div className="ob-label">{copy.goal}</div>
              <div className="ob-chips">
                {GOALS.map((g) => (
                  <button key={g} type="button" className={`ob-chip ${form.goal === g ? "on" : ""}`} onClick={() => setForm({ ...form, goal: g })}>{g}</button>
                ))}
              </div>
              <button type="button" className="ob-cta" disabled={!canContinue} onClick={submitProfile}>{copy.next}</button>
            </Motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {step === 5 && (
            <Motion.div className="ob-final" initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}>
              <ReaderCard name={form.name.trim()} companion={form.companionName.trim() || "Companion"} prefs={mergedPrefs} goal={form.goal} />
            </Motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {step === 2 && mascotOn && !card && (
          <Motion.div className="ob-duo" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }} transition={{ duration: 0.35 }}>
            <AnimatePresence>
              {bubble && (
                <Motion.div key={bubble} className="ob-bubble" exit={{ opacity: 0, scale: 0.8 }}>
                  <Motion.div className="ob-bcloud" initial={{ scale: 0.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.35, type: "spring", stiffness: 200, damping: 15 }}>
                    {bubble}
                  </Motion.div>
                  <Motion.span className="ob-bdot d2" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.18 }} />
                  <Motion.span className="ob-bdot d1" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.05 }} />
                </Motion.div>
              )}
            </AnimatePresence>
            <Motion.div className="ob-duo-mascot" initial={{ scale: 0, rotate: -25 }} animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 13 }}>
              <MascotCharacter characterId={mascotId} size={96} animated silent />
              <span className="ob-duo-tag">{mName} · {copy.silentMode}</span>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>

      {started && !connecting && !driver.voiceOk && caption && step !== 3 && (
        <div className="ob-caption host">
          <span className="ob-caption-who">{hostName}</span>
          <p>{caption}</p>
        </div>
      )}

      {connecting && (
        <div className="ob-check">
          <ServiceNotice
            kind="checking"
            title={voiceAttempt > 1 ? "Voice model abhi busy hai" : "Companion ki awaaz check ho rahi hai"}
            detail={voiceAttempt > 1 ? `Dobara check kar raha hoon (${voiceAttempt}/${VOICE_CHECK_ATTEMPTS}). Tour awaaz ke saath hi chalega.` : "Bas ek pal. Voice service ko jaga raha hoon."}
          />
        </div>
      )}
      {voiceFailed && (
        <div className="ob-check">
          <ServiceNotice
            kind="error"
            title="Voice abhi available nahi hai"
            detail="Service thodi busy ho sakti hai. Thodi der baad try kijiye, ya bina awaaz ke captions ke saath aage badhiye."
            actions={[{ label: "Dobara try karein", onClick: retryVoice, primary: true }, { label: "Captions ke saath chalein", onClick: continueWithCaptions }]}
          />
        </div>
      )}

      {!started && (
        <Motion.div className="ob-start" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <h1>{copy.welcome}</h1>
          <p>{copy.subtitle}</p>
          <button type="button" className="ob-cta" onClick={begin}>{copy.meet}</button>
          <button type="button" className="ob-skip-link" onClick={skipTour}>{copy.skipTour}</button>
        </Motion.div>
      )}

      <AnimatePresence>
        {step === 4 && (
          <Motion.div className="ob-success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="ob-success-badge">
              {CONFETTI.map((c, i) => (
                <Motion.span key={i} className="ob-confetti" style={{ background: c.hue }}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                  animate={{ x: c.x, y: c.y, scale: [0, 1.2, 0.6], opacity: [1, 1, 0] }}
                  transition={{ duration: 1.2, delay: 0.3 + c.delay }} />
              ))}
              <Motion.div className="ob-success-ring" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 180, damping: 12 }}>
                <svg viewBox="0 0 52 52" width="44" height="44">
                  <Motion.path d="M14 27 L23 36 L39 17" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.25, duration: 0.6 }} />
                </svg>
              </Motion.div>
            </div>
            <Motion.h2 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              {copy.allSet}{form.name.trim() ? `, ${form.name.trim()}` : ""}!
            </Motion.h2>
          </Motion.div>
        )}
      </AnimatePresence>
    </Motion.div>
  );
}