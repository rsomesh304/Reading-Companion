import { motion as Motion } from "framer-motion";
import { BookOpen, Check, ChevronLeft, Copy, Gem, Languages, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import "./AboutScreen.css";
import DeveloperCard from "./DeveloperCard.jsx";
import { notify } from "./notify.js";
import { APP_VERSION } from "./version.js";

// Contact targets are only used when a button is tapped and are never rendered.
const CONTACT = {
  linkedin: "https://www.linkedin.com/in/soumyaranjan-rout-b16145185/",
  github: "https://github.com/soumyaranjan-1083",
  email: "soumyaranjan.rout1083@gmail.com",
};

const WHY = [
  "Reading in English can feel like walking with a stone in your shoe. One hard word, and you leave the book to open a dictionary. The flow breaks, and often the book stays closed.",
  "Not everyone has a friend beside them who can explain that word in their own language. Reading Companion is built to be that friend, for Hindi and Odia speakers who want to read English books.",
];

const PRINCIPLES = [
  { Icon: Languages, t: "Your language, your pace", d: "Meanings in Hindi and Odia, with real examples, never a lecture." },
  { Icon: BookOpen, t: "The book stays open", d: "Ask out loud, get the answer, keep reading. No tabs, no typing." },
  { Icon: Gem, t: "What you read, you keep", d: "Words, gems and preferences are saved, so reading adds up." },
  { Icon: ShieldCheck, t: "Your data stays with you", d: "Everything lives on your device. Export or delete it any time." },
];

const BUILT_WITH = ["React", "Vite", "Gemini Live", "Framer Motion", "Web Audio", "Supabase"];

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23a11.5 11.5 0 0 1 3.003-.404c1.018.005 2.045.138 3.003.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .321.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function openExternal(url) {
  window.open(url, "_blank", "noopener,noreferrer");
}

async function copyEmail() {
  try {
    await navigator.clipboard.writeText(CONTACT.email);
  } catch {
    const field = document.createElement("textarea");
    field.value = CONTACT.email;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    try { document.execCommand("copy"); } finally { document.body.removeChild(field); }
  }
  notify("Email copied", "success", 2400);
}

function Reveal({ children, delay = 0, className = "" }) {
  return (
    <Motion.div className={className} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.45, delay, ease: "easeOut" }}>
      {children}
    </Motion.div>
  );
}

function Section({ eyebrow, title, children }) {
  return (
    <section className="ab2-section">
      <Reveal className="ab2-head"><span>{eyebrow}</span><h2>{title}</h2></Reveal>
      {children}
    </section>
  );
}

export function AboutScreen({ nav }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    await copyEmail();
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  return (
    <div className="screen st-screen ab2">
      <div className="aurora-bg" />
      <header className="screen-header st-head">
        <button className="st-back" onClick={nav.goBack} aria-label="Back"><ChevronLeft size={20} /></button>
        <div className="header-left"><h1>About</h1><p className="eyebrow">Reading Companion</p></div>
      </header>

      <div className="ab2-hero">
        <Motion.div className="ab2-mark" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 160, damping: 14 }}>
          <span className="ab2-orbit" aria-hidden="true" />
          <BookOpen size={30} />
        </Motion.div>
        <h2>Reading Companion</h2>
        <p>A friend who reads with you.</p>
        <div className="ab2-pills"><span>Version {APP_VERSION}</span><span>Made with care in India</span></div>
      </div>

      <Section eyebrow="Why it exists" title="One hard word shouldn't close the book">
        {WHY.map((text, index) => <Reveal key={index} delay={index * 0.08} className="ab2-quote"><p>{text}</p></Reveal>)}
      </Section>

      <Section eyebrow="Who it is for" title="Readers, in their own language">
        <Reveal className="ab2-chips">
          {["Students", "Working people", "Book lovers", "Hindi", "Odia"].map((chip) => <span key={chip}>{chip}</span>)}
        </Reveal>
        <Reveal><p className="ab2-body">People whose first language is Hindi or Odia and who want to enjoy English books without feeling stuck.</p></Reveal>
      </Section>

      <Section eyebrow="What we believe" title="Four small promises">
        <div className="ab2-grid">
          {PRINCIPLES.map(({ Icon, t, d }, index) => (
            <Reveal key={t} delay={index * 0.07} className="ab2-card">
              <span className="ab2-card-ic"><Icon size={18} /></span>
              <b>{t}</b>
              <span>{d}</span>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section eyebrow="The developer" title="Built by one person, with AI">
        <Reveal><DeveloperCard /></Reveal>
        <Reveal className="ab2-contact">
          <div className="ab2-contact-row">
            <button type="button" className="ab2-btn" onClick={() => openExternal(CONTACT.linkedin)}><LinkedInIcon /> LinkedIn</button>
            <button type="button" className="ab2-btn" onClick={() => { window.location.href = `mailto:${CONTACT.email}`; }}><Mail size={18} /> Email</button>
            <button type="button" className="ab2-btn" onClick={() => openExternal(CONTACT.github)}><GitHubIcon /> GitHub</button>
          </div>
          <button type="button" className="ab2-copy" onClick={onCopy}>
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Email copied" : "Copy email"}
          </button>
          <p className="ab2-note"><Sparkles size={13} /> The GitHub account is dedicated to projects built with AI.</p>
        </Reveal>
      </Section>

      <Section eyebrow="Built with" title="Tools behind the scenes">
        <Reveal className="ab2-chips">{BUILT_WITH.map((tool) => <span key={tool}>{tool}</span>)}</Reveal>
      </Section>

      <p className="ab2-foot">Thank you for reading.</p>
    </div>
  );
}
