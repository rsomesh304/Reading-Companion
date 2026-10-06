import { useEffect, useMemo, useState } from "react";
import { Bell, Bot, Clock3, Cloud, Cpu, Database, FileText, Flag, Globe, GitBranch, GitMerge, HardDrive, Mail, Radio, Rocket, Server, Shield, ShieldCheck, Smartphone, Sparkles, Triangle, Zap, Megaphone, MessageSquareText, Workflow } from "lucide-react";

// One icon family (Lucide) for every service in every diagram.
const ICONS = { Bell, Bot, Clock3, Cloud, Cpu, Database, FileText, Flag, Globe, GitBranch, GitMerge, HardDrive, Mail, Radio, Rocket, Server, Shield, ShieldCheck, Smartphone, Sparkles, Triangle, Zap, Megaphone, MessageSquareText, Workflow };
const R = 7;

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return undefined;
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

const anchor = (box, side) => ({ t: [box.x + box.w / 2, box.y], b: [box.x + box.w / 2, box.y + box.h], l: [box.x, box.y + box.h / 2], r: [box.x + box.w, box.y + box.h / 2] }[side]);

function autoSides(a, b) {
  const ac = [a.x + a.w / 2, a.y + a.h / 2];
  const bc = [b.x + b.w / 2, b.y + b.h / 2];
  if (b.y >= a.y + a.h - 1) return ["b", "t"];
  if (b.y + b.h <= a.y + 1) return ["t", "b"];
  return bc[0] > ac[0] ? ["r", "l"] : ["l", "r"];
}

function points(edge, a, b) {
  const [fs, ts] = edge.sides ? edge.sides.split("") : autoSides(a, b);
  const p1 = anchor(a, fs);
  const p2 = anchor(b, ts);
  if (edge.via) return [p1, ...edge.via, p2];
  const vert = (s) => s === "t" || s === "b";
  if (vert(fs) && vert(ts)) {
    if (Math.abs(p1[0] - p2[0]) < 1) return [p1, p2];
    const my = edge.bend ?? (p1[1] + p2[1]) / 2;
    return [p1, [p1[0], my], [p2[0], my], p2];
  }
  if (!vert(fs) && !vert(ts)) {
    if (Math.abs(p1[1] - p2[1]) < 1) return [p1, p2];
    const mx = edge.bend ?? (p1[0] + p2[0]) / 2;
    return [p1, [mx, p1[1]], [mx, p2[1]], p2];
  }
  return vert(fs) ? [p1, [p1[0], p2[1]], p2] : [p1, [p2[0], p1[1]], p2];
}

// Polyline with softly rounded corners.
function toPath(pts) {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i += 1) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const [nx, ny] = pts[i + 1];
    const r = Math.min(R, Math.hypot(cx - px, cy - py) / 2, Math.hypot(nx - cx, ny - cy) / 2);
    const u1 = [Math.sign(cx - px), Math.sign(cy - py)];
    const u2 = [Math.sign(nx - cx), Math.sign(ny - cy)];
    d += ` L${cx - u1[0] * r},${cy - u1[1] * r} Q${cx},${cy} ${cx + u2[0] * r},${cy + u2[1] * r}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L${last[0]},${last[1]}`;
}

function labelSpot(pts) {
  let best = [pts[0], pts[1]];
  let len = 0;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    if (l > len) { len = l; best = [pts[i], pts[i + 1]]; }
  }
  return [(best[0][0] + best[1][0]) / 2, (best[0][1] + best[1][1]) / 2];
}

function Node({ n, on }) {
  const Icon = ICONS[n.icon];
  const tx = Icon ? n.x + 36 : n.x + n.w / 2;
  const anchorMode = Icon ? "start" : "middle";
  return (
    <g className={`dg-node${on ? " on" : ""}`}>
      <rect x={n.x} y={n.y} width={n.w} height={n.h} rx="10" />
      {Icon && (
        <>
          <rect className="dg-ico" x={n.x + 8} y={n.y + n.h / 2 - 12} width="24" height="24" rx="7" />
          <Icon x={n.x + 12} y={n.y + n.h / 2 - 8} width={16} height={16} strokeWidth={2} />
        </>
      )}
      <text x={tx} y={n.y + n.h / 2 - (n.sub ? 2 : -4)} textAnchor={anchorMode} className="dg-label">{n.label}</text>
      {n.sub && <text x={tx} y={n.y + n.h / 2 + 11} textAnchor={anchorMode} className="dg-sub">{n.sub}</text>}
    </g>
  );
}

export function Diagram({ id, spec, active = [], animate = true }) {
  const reduced = useReducedMotion();
  const boxes = useMemo(() => Object.fromEntries([...(spec.groups || []), ...spec.nodes].map((b) => [b.id, b])), [spec]);
  const marker = `dg-arrow-${id}`;
  const markerOn = `dg-arrow-on-${id}`;
  return (
    <svg className="dg" viewBox={`0 0 ${spec.w} ${spec.h}`} role="img" aria-label={spec.title || "Diagram"}>
      <defs>
        <marker id={marker} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0.8 L7,4 L0,7.2 Z" className="dg-head" /></marker>
        <marker id={markerOn} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0.8 L7,4 L0,7.2 Z" className="dg-head on" /></marker>
      </defs>
      {(spec.groups || []).map((g) => (
        <g key={g.id} className="dg-group">
          <rect x={g.x} y={g.y} width={g.w} height={g.h} rx="14" />
          <text x={g.x + 12} y={g.y + 15} className="dg-gl">{g.label}</text>
        </g>
      ))}
      {spec.edges.map((e, i) => {
        const a = boxes[e.from];
        const b = boxes[e.to];
        const pts = points(e, a, b);
        const d = toPath(pts);
        const lit = active.length ? active.includes(e.from) && active.includes(e.to) : false;
        const [lx, ly] = labelSpot(pts);
        const tagClass = e.tag === "miss" ? "miss" : e.tag === "hit" ? "hit" : "";
        const text = e.label || "";
        const w = text.length * 5.1 + 12;
        return (
          <g key={i} className={`dg-edge${lit ? " on" : ""}${e.dashed ? " dashed" : ""}`}>
            <path d={d} markerEnd={`url(#${lit ? markerOn : marker})`} />
            {animate && !reduced && (lit || (!active.length && e.flow)) && (
              <circle r="3.2" className="dg-packet"><animateMotion dur={`${Math.max(1.4, pts.length * 0.7)}s`} repeatCount="indefinite" path={d} begin={`${(i % 4) * 0.35}s`} /></circle>
            )}
            {text && (
              <g className={`dg-tag ${tagClass}`} transform={`translate(${lx},${ly})`}>
                <rect x={-w / 2} y="-8" width={w} height="16" rx="8" />
                <text y="3.4" textAnchor="middle">{text}</text>
              </g>
            )}
          </g>
        );
      })}
      {spec.nodes.map((n) => <Node key={n.id} n={n} on={active.includes(n.id)} />)}
    </svg>
  );
}
