import { useEffect, useMemo, useState } from "react";
import { Bell, Bot, Clock3, Cloud, Cpu, Database, FileText, Flag, Globe, GitBranch, GitMerge, HardDrive, Mail, Radio, Rocket, Server, Shield, ShieldCheck, Smartphone, Sparkles, Triangle, Zap, Megaphone, MessageSquareText, Workflow } from "lucide-react";
import { buildDiagramLayout } from "./diagramLayout.js";

// One icon family (Lucide) for every service in every diagram.
const ICONS = { Bell, Bot, Clock3, Cloud, Cpu, Database, FileText, Flag, Globe, GitBranch, GitMerge, HardDrive, Mail, Radio, Rocket, Server, Shield, ShieldCheck, Smartphone, Sparkles, Triangle, Zap, Megaphone, MessageSquareText, Workflow };

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

function Node({ n, on, text }) {
  const Icon = ICONS[n.icon];
  return (
    <g className={`dg-node${on ? " on" : ""}`}>
      <rect x={n.x} y={n.y} width={n.w} height={n.h} rx="10" />
      {Icon && (
        <>
          <rect className="dg-ico" x={n.x + 8} y={n.y + n.h / 2 - 12} width="24" height="24" rx="7" />
          <Icon x={n.x + 12} y={n.y + n.h / 2 - 8} width={16} height={16} strokeWidth={2} />
        </>
      )}
      <text x={text.textX} y={text.topY} textAnchor={text.textAnchor} className="dg-label" style={{ fontSize: `${text.labelFontSize}px` }}>
        {text.labelLines.map((line, index) => (
          <tspan key={line} x={text.textX} dy={index === 0 ? 0 : text.labelFontSize + 1}>{line}</tspan>
        ))}
      </text>
      {text.subLines.length > 0 && (
        <text
          x={text.textX}
          y={text.topY + text.labelLines.length * text.labelFontSize + 3}
          textAnchor={text.textAnchor}
          className="dg-sub"
          style={{ fontSize: `${text.subFontSize}px` }}
        >
          {text.subLines.map((line, index) => (
            <tspan key={line} x={text.textX} dy={index === 0 ? 0 : text.subFontSize + 1}>{line}</tspan>
          ))}
        </text>
      )}
    </g>
  );
}

export function Diagram({ id, spec, active = [], animate = true }) {
  const reduced = useReducedMotion();
  const layout = useMemo(() => buildDiagramLayout(spec), [spec]);
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
      {layout.edgeLayouts.map(({ edge, path, label }, i) => {
        const lit = active.length ? active.includes(edge.from) && active.includes(edge.to) : false;
        const tagClass = edge.tag === "miss" ? "miss" : edge.tag === "hit" ? "hit" : "";
        return (
          <g key={`${edge.from}-${edge.to}-${i}`} className={`dg-edge${lit ? " on" : ""}${edge.dashed ? " dashed" : ""}`}>
            <path d={path} markerEnd={`url(#${lit ? markerOn : marker})`} />
            {animate && !reduced && (lit || (!active.length && edge.flow)) && (
              <circle r="3.2" className="dg-packet"><animateMotion dur={`${Math.max(1.4, 1.15 + path.length / 180)}s`} repeatCount="indefinite" path={path} begin={`${(i % 4) * 0.35}s`} /></circle>
            )}
            {label && (
              <g className={`dg-tag ${tagClass}`} transform={`translate(${label.x},${label.y})`}>
                <rect x={-label.width / 2} y={-label.height / 2} width={label.width} height={label.height} rx="9" />
                <text y="3.4" textAnchor="middle">{label.text}</text>
              </g>
            )}
          </g>
        );
      })}
      {layout.nodeLayouts.map(({ node, text }) => <Node key={node.id} n={node} text={text} on={active.includes(node.id)} />)}
    </svg>
  );
}
