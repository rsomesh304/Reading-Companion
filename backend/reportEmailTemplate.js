const SANS = "'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";
const MONO = "'SFMono-Regular',Consolas,Menlo,monospace";

const THEMES = {
  bug:     { label: "Bug",         emoji: "🐞", accent: "#FB7185", glow: "rgba(251,113,133,.50)", g1: "#8A1F45", g2: "#2E1065", descLabel: "What went wrong", extras: true },
  issue:   { label: "Issue",       emoji: "⚠️", accent: "#FBBF24", glow: "rgba(251,191,36,.42)",  g1: "#8A4B0F", g2: "#2E1065", descLabel: "What went wrong", extras: true },
  feature: { label: "New feature", emoji: "✨", accent: "#38BDF8", glow: "rgba(56,189,248,.45)",  g1: "#0E5C8A", g2: "#3B1A8F", descLabel: "The idea",        extras: false },
  enhance: { label: "Improvement", emoji: "🚀", accent: "#A78BFA", glow: "rgba(167,139,250,.50)", g1: "#6D2FD6", g2: "#1E3A8A", descLabel: "The idea",        extras: false },
};
const SEV_ORDER = ["low", "medium", "high", "blocking"];
const SEVERITY = {
  low:      { bg: "#052E1B", fg: "#34D399" },
  medium:   { bg: "#3A2A05", fg: "#FBBF24" },
  high:     { bg: "#3B1707", fg: "#FB923C" },
  blocking: { bg: "#3F0A14", fg: "#FB7185" },
};
const STAGES = ["Sent", "Seen", "In review", "Approved", "In progress", "Testing", "Done"];

const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nl2br = (v) => esc(v).replace(/\r?\n/g, "<br>");

function istStamp(iso) {
  let d = new Date(iso || Date.now());
  if (Number.isNaN(d.getTime())) d = new Date();
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function parseSteps(raw) {
  const t = String(raw || "").trim();
  if (!t) return [];
  const p = t.split(/(?:^|\s)\d+[.)]\s+/).map((s) => s.trim()).filter(Boolean);
  if (p.length > 1 || /^\d+[.)]/.test(t)) return p;
  return t.split(/\n+/).map((s) => s.trim()).filter(Boolean);
}

const chip = (text, bg, fg, border) =>
  `<span style="display:inline-block;padding:8px 13px;margin:0 6px 6px 0;border-radius:999px;background:${bg};color:${fg};border:1px solid ${border};font:700 11px/1 ${SANS};letter-spacing:1px;text-transform:uppercase;">${esc(text)}</span>`;
const label = (t, m = 14) =>
  `<div style="font:700 11px/1 ${SANS};letter-spacing:2.2px;text-transform:uppercase;color:#8B7FB8;margin:0 0 ${m}px;">${esc(t)}</div>`;
const gap = (h) => `<tr><td style="height:${h}px;line-height:${h}px;font-size:0;">&nbsp;</td></tr>`;
const card = (inner, cls = "") =>
  `<table role="presentation" class="rc-a ${cls}" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#150E29;background-image:linear-gradient(160deg,#1B1236,#120B24);border:1px solid #2E2350;border-radius:22px;"><tr><td style="padding:22px;">${inner}</td></tr></table>`;
const tile = (k, v, color, cls) =>
  `<div class="rc-a ${cls}" style="padding:18px 18px 16px;background-color:#150E29;background-image:linear-gradient(160deg,#1B1236,#120B24);border:1px solid #2E2350;border-radius:22px;"><div style="font:700 10px/1 ${SANS};letter-spacing:2px;text-transform:uppercase;color:#7C6FA8;margin-bottom:12px;">${esc(k)}</div><div style="font:700 30px/1 ${SERIF};color:${color};">${esc(v)}</div></div>`;

export function buildReportEmailSubject(report, ticket) {
  const t = THEMES[report.type] || THEMES.enhance;
  const sevOk = t.extras && SEV_ORDER.includes(String(report.severity || "").toLowerCase());
  return `${t.emoji} [${ticket}] ${t.label}${sevOk ? " · " + report.severity : ""}: ${String(report.title || "").trim().slice(0, 110)}`;
}

// cids: content-ids of screenshots attached inline (optional). dashboardUrl: optional CTA button link.
export function buildReportEmailHtml(report, ticket, imageCount, cids = [], dashboardUrl = "") {
  const t = THEMES[report.type] || THEMES.enhance;
  const sevKey = String(report.severity || "").toLowerCase();
  const sevIdx = SEV_ORDER.indexOf(sevKey);
  const sev = t.extras && sevIdx >= 0 ? SEVERITY[sevKey] : null;
  const raised = istStamp(report.createdAt);
  const reporter = String(report.reporter || "Reader");
  const initial = esc((reporter.trim()[0] || "R").toUpperCase());
  const steps = t.extras ? parseSteps(report.steps) : [];
  const d = report.device || {};
  const device = `${d.screen || "-"} · ${d.lang || "-"} · ${d.theme || "-"}${d.standalone ? " · installed app" : ""}`;
  const area = report.area || "-";
  const preheader = `${t.label} · ${area} · by ${reporter} — ${String(report.description || "").replace(/\s+/g, " ").slice(0, 90)}`;

  const hero = `<table role="presentation" class="rc-a" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${t.g2};background-image:radial-gradient(circle at 92% 6%,${t.glow} 0%,rgba(0,0,0,0) 46%),radial-gradient(circle at 4% 100%,rgba(124,58,237,.38) 0%,rgba(0,0,0,0) 48%),linear-gradient(135deg,${t.g1} 0%,${t.g2} 100%);border:1px solid rgba(255,255,255,.14);border-radius:30px;"><tr><td style="padding:28px 26px 26px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:9px;"><span class="rc-pulse" style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${t.accent};"></span></td><td valign="middle" style="font:800 11px/1 ${SANS};letter-spacing:2.6px;text-transform:uppercase;color:#F0E9FF;">New report</td></tr></table></td>
<td align="right" valign="middle"><span style="display:inline-block;padding:8px 12px;border-radius:12px;background:rgba(0,0,0,.30);border:1px solid rgba(255,255,255,.18);font:700 12px/1 ${MONO};letter-spacing:1.4px;color:#FFFFFF;">${esc(ticket)}</span></td>
</tr></table>
<div class="rc-float" style="width:68px;height:68px;margin:26px 0 18px;border-radius:50%;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.32);text-align:center;font-size:32px;line-height:68px;">${t.emoji}</div>
<div class="rc-title" style="font:700 32px/1.18 ${SERIF};color:#FFFFFF;margin:0 0 22px;">${esc(report.title)}</div>
<div>${chip(t.label, "rgba(255,255,255,.16)", "#FFFFFF", "rgba(255,255,255,.34)")}${chip(area, "rgba(0,0,0,.30)", "#EDE6FF", "rgba(255,255,255,.20)")}${sev ? chip(`${report.severity} severity`, sev.bg, sev.fg, sev.fg) : ""}</div>
</td></tr></table>`;

  const bento = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="50%" valign="top" style="padding-right:6px;">${tile("App version", "v" + (report.appVersion || "-"), "#FFFFFF", "rc-d2")}</td>
<td width="50%" valign="top" style="padding-left:6px;">${tile("Screenshots", String(imageCount), t.accent, "rc-d2")}</td>
</tr></table>`;

  const priority = sev
    ? `${gap(14)}<tr><td>${card(`
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td>${label("Priority", 0)}</td><td align="right" style="font:800 12px/1 ${SANS};letter-spacing:1px;text-transform:uppercase;color:${sev.fg};">${esc(report.severity)}</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;"><tr>${SEV_ORDER.map((k, i) => `<td style="padding:0 ${i < 3 ? 4 : 0}px 0 0;"><div style="height:10px;border-radius:99px;background:${i <= sevIdx ? SEVERITY[k].fg : "#2A2145"};"></div></td>`).join("")}</tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${SEV_ORDER.map((k, i) => `<td align="center" style="padding-top:9px;font:${i === sevIdx ? 800 : 500} 10px/1 ${SANS};letter-spacing:1px;text-transform:uppercase;color:${i === sevIdx ? SEVERITY[k].fg : "#5E5380"};">${k}</td>`).join("")}</tr></table>`, "rc-d3")}</td></tr>`
    : "";

  const status = card(`
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td>${label("Status", 0)}</td><td align="right" style="font:700 11px/1 ${SANS};color:#C4B5FD;">Stage 1 of 7 · Sent</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;"><tr>${STAGES.map((s, i) => `<td style="padding:0 ${i < 6 ? 4 : 0}px 0 0;"><div style="height:8px;border-radius:99px;${i === 0 ? `background-color:${t.accent};background-image:linear-gradient(90deg,${t.accent},#FFFFFF,${t.accent});background-size:200% 100%;animation:rcSlide2 2.4s linear infinite;` : "background:#2A2145;"}"></div></td>`).join("")}</tr></table>
<div style="margin-top:12px;font:400 11px/1.7 ${SANS};color:#6F6396;">${STAGES.join(" → ")}</div>`, "rc-d4");

  const reporterCard = card(`
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle" style="padding-right:14px;"><div style="width:50px;height:50px;border-radius:50%;background-color:#7C3AED;background-image:linear-gradient(135deg,${t.accent},#6D28D9);color:#FFFFFF;text-align:center;font:800 20px/50px ${SANS};">${initial}</div></td>
<td valign="middle"><div style="font:800 17px/1.2 ${SANS};color:#F5F1FF;">${esc(reporter)}</div><div style="font:400 12px/1.5 ${SANS};color:#8B7FB8;margin-top:4px;">Raised <span style="color:#D6CCFF;">${esc(raised)} IST</span></div></td>
</tr></table>
<div style="margin-top:16px;padding-top:14px;border-top:1px dashed #3A2D63;font:500 11px/1.6 ${MONO};color:#B9AEE0;">${esc(device)}</div>`, "rc-d3");

  const desc = card(`
<div style="font:700 64px/.55 ${SERIF};color:${t.accent};height:30px;">&ldquo;</div>
${label(t.descLabel, 12)}
<div style="font:400 16px/1.75 ${SANS};color:#EAE4FB;">${nl2br(report.description)}</div>`, "rc-d4");

  const stepsBlock = steps.length
    ? `${gap(14)}<tr><td>${card(label("Steps to reproduce", 16) + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${steps.map((s, i) => `<tr>
<td valign="top" width="40" align="center" style="background-image:linear-gradient(${t.accent},${t.accent});background-repeat:no-repeat;background-size:2px ${i === steps.length - 1 ? "0" : "100"}%;background-position:center top;"><div style="width:28px;height:28px;border-radius:50%;background:${t.accent};color:#12081F;text-align:center;font:800 13px/28px ${SANS};">${i + 1}</div></td>
<td valign="top" style="padding:3px 0 ${i === steps.length - 1 ? 0 : 18}px 12px;font:400 15px/1.55 ${SANS};color:#DCD4F2;">${esc(s)}</td></tr>`).join("")}</table>`, "rc-d5")}</td></tr>`
    : "";

  const frames = cids.length
    ? `<div style="margin-top:16px;">${cids.slice(0, 4).map((cid) => `<span style="display:inline-block;width:46%;max-width:168px;margin:0 10px 12px 0;vertical-align:top;border:5px solid #07040F;border-radius:26px;background:#07040F;overflow:hidden;box-shadow:0 0 0 1px #4A3A82,0 12px 28px rgba(0,0,0,.55);"><img src="cid:${esc(cid)}" alt="Screenshot" width="100%" style="display:block;width:100%;height:auto;border-radius:20px;"></span>`).join("")}</div>`
    : "";
  const shots = card(label("Screenshots", 12) + (imageCount > 0
    ? chip(`📎 ${imageCount} attached to this email`, "#1D1336", "#D6CCFF", "#4A3A82") + frames
    : `<span style="font:400 14px/1.5 ${SANS};color:#8B7FB8;">No screenshots were added.</span>`), "rc-d5");

  const cta = dashboardUrl
    ? `${gap(24)}<tr><td align="center"><table role="presentation" cellpadding="0" cellspacing="0" border="0" class="rc-a rc-d6"><tr><td style="border-radius:16px;background-color:#6D28D9;background-image:linear-gradient(135deg,#7C3AED,#4F46E5);"><a href="${esc(dashboardUrl)}" style="display:inline-block;padding:17px 34px;font:800 14px/1 ${SANS};color:#FFFFFF;text-decoration:none;border-radius:16px;letter-spacing:.4px;">Open report &#8599;</a></td></tr></table></td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<title>${esc(ticket)}</title>
<style>
@keyframes rcUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes rcPulse{0%{box-shadow:0 0 0 0 rgba(255,255,255,.6)}70%{box-shadow:0 0 0 10px rgba(255,255,255,0)}100%{box-shadow:0 0 0 0 rgba(255,255,255,0)}}
@keyframes rcSlide{0%{background-position:0% 50%}100%{background-position:300% 50%}}
@keyframes rcSlide2{0%{background-position:0% 50%}100%{background-position:200% 50%}}
@keyframes rcFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.rc-a{animation:rcUp .75s cubic-bezier(.2,.8,.2,1) both}
.rc-d2{animation-delay:.12s}.rc-d3{animation-delay:.2s}.rc-d4{animation-delay:.28s}.rc-d5{animation-delay:.36s}.rc-d6{animation-delay:.44s}
.rc-pulse{animation:rcPulse 1.8s infinite}
.rc-float{animation:rcFloat 3.4s ease-in-out infinite}
.rc-shimmer{background:linear-gradient(90deg,#7C3AED,#22D3EE,#F472B6,#FBBF24,#7C3AED)!important;background-size:300% 100%!important;animation:rcSlide 5s linear infinite}
@media (max-width:620px){.rc-wrap{width:100%!important}.rc-title{font-size:26px!important}}
</style></head>
<body style="margin:0;padding:0;background:#07040F;" bgcolor="#07040F">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#07040F;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#07040F" style="background:#07040F;"><tr><td align="center" style="padding:22px 10px;">
<table role="presentation" class="rc-wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
<tr><td class="rc-shimmer" style="height:5px;line-height:5px;font-size:0;border-radius:99px;background:#7C3AED;">&nbsp;</td></tr>${gap(14)}
<tr><td>${hero}</td></tr>${gap(14)}
<tr><td>${bento}</td></tr>${priority}${gap(14)}
<tr><td>${status}</td></tr>${gap(14)}
<tr><td>${reporterCard}</td></tr>${gap(14)}
<tr><td>${desc}</td></tr>${stepsBlock}${gap(14)}
<tr><td>${shots}</td></tr>${cta}
<tr><td align="center" style="padding:34px 20px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:10px;"><div style="width:30px;height:30px;border-radius:50%;background-color:#7C3AED;background-image:linear-gradient(135deg,#A78BFA,#6D28D9);color:#fff;text-align:center;font:800 11px/30px ${SANS};">RC</div></td><td valign="middle" style="font:400 12px/1.6 ${SANS};color:#6F6396;text-align:left;">Sent automatically by <span style="color:#A78BFA;font-weight:700;">Reading Companion</span><br>${esc(ticket)} · ${esc(raised)} IST</td></tr></table></td></tr>
</table></td></tr></table></body></html>`;
}