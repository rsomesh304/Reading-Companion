import { motion as Motion } from "framer-motion";
import { MOTIF_IDS } from "./motifIds.js";

const VIEW = "0 0 360 640";

function coordinates(items, salt, count = 7) {
  const text = `${salt}|${items.join("|")}`;
  let seed = 13;
  for (const char of text) seed = (Math.imul(seed, 31) + char.charCodeAt(0)) >>> 0;
  const values = [];
  for (let index = 0; index < count; index++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    values.push([36 + seed % 288, 130 + (seed >>> 8) % 370]);
  }
  return values;
}

function Starfield({ accent, points, mood }) {
  const tempo = mood === "tense" ? 1.8 : mood === "joyful" ? 1.35 : ["sad", "calm", "reflective"].includes(mood) ? .62 : 1;
  return <g aria-hidden="true">{points.map(([x, y], index) => <Motion.circle key={index} cx={x} cy={y} r={index % 4 === 0 ? 2.4 : 1.5} fill={accent} initial={{ opacity: .25 }} animate={{ opacity: [.18, mood === "joyful" ? 1 : .85, .3], scale: [1, mood === "tense" ? 1.8 : 1.5, 1] }} transition={{ duration: (2.8 + index % 4) / tempo, delay: index * .13, repeat: Infinity, ease: "easeInOut" }} />)}</g>;
}

function MoodAtmosphere({ mood, accent, accent2 }) {
  if (mood === "tense") return <g>{[0, 1, 2].map((index) => <Motion.path key={index} d={`M${56 + index * 108} 110 L${85 + index * 70} 168 L${70 + index * 86} 198`} fill="none" stroke={accent} strokeWidth="2" animate={{ opacity: [.04, .75, .08] }} transition={{ duration: .8, delay: index * .22, repeat: Infinity, repeatDelay: 2.2 }} />)}</g>;
  if (mood === "joyful") return <g>{Array.from({ length: 18 }, (_, index) => <Motion.path key={index} d={`M${28 + index * 17} ${170 + index % 4 * 78} l0 -7 m-3 3.5 h6`} stroke={index % 2 ? accent : accent2} strokeWidth="2" strokeLinecap="round" animate={{ opacity: [.15, 1, .15], scale: [.65, 1.35, .65] }} transition={{ duration: 1.3 + index % 4 * .24, delay: index * .07, repeat: Infinity }} />)}</g>;
  if (mood === "sad") return <g>{Array.from({ length: 13 }, (_, index) => <Motion.path key={index} d={`M${32 + index * 25} ${120 + index % 5 * 60} q-8 15 0 28`} fill="none" stroke={index % 2 ? accent : accent2} strokeWidth="2" opacity=".45" animate={{ y: [0, 110], opacity: [.1, .55, 0] }} transition={{ duration: 5.5 + index % 4, delay: index * .27, repeat: Infinity, ease: "linear" }} />)}</g>;
  return <g>{[0, 1].map((index) => <Motion.circle key={index} cx="180" cy="330" r={150 + index * 62} fill="none" stroke={index ? accent2 : accent} strokeOpacity=".12" strokeWidth="1.5" animate={{ scale: [1, 1.08, 1], opacity: [.08, .25, .08] }} transition={{ duration: 9 + index * 3, repeat: Infinity, ease: "easeInOut" }} style={{ transformBox: "fill-box", transformOrigin: "center" }} />)}</g>;
}

function Constellation({ accent, accent2, points }) {
  return <g>{points.map(([x, y], index) => <g key={index}>
    {index > 0 && <Motion.path d={`M${points[index - 1][0]} ${points[index - 1][1]} Q ${(x + points[index - 1][0]) / 2 + 20} ${(y + points[index - 1][1]) / 2 - 34} ${x} ${y}`} fill="none" stroke={accent2} strokeWidth="1.6" strokeDasharray="5 8" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: .56 }} transition={{ delay: index * .2, duration: .8 }} />}
    <Motion.circle cx={x} cy={y} r={index === 2 ? 12 : 7} fill={index % 2 ? accent : accent2} className="motif-glow" animate={{ scale: [1, 1.32, 1], opacity: [.72, 1, .72] }} transition={{ duration: 2.4, delay: index * .18, repeat: Infinity }} />
  </g>)}</g>;
}

function Orbit({ accent, accent2, intensity }) {
  return <g>
    {[84, 126, 168].map((rx, index) => <ellipse key={rx} cx="180" cy="322" rx={rx} ry={rx * .43} fill="none" stroke={index % 2 ? accent2 : accent} strokeOpacity=".32" strokeWidth="1.3" transform={`rotate(${index * 42 - 34} 180 322)`} />)}
    <Motion.circle cx="180" cy="322" r="62" fill="url(#orb)" className="motif-glow" animate={{ scale: [1, 1 + intensity * .1, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
    {[0, 1, 2, 3].map((index) => <Motion.g key={index} animate={{ rotate: 360 }} transition={{ duration: 12 + index * 3, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: "180px 322px" }}>
      <circle cx="180" cy={322 - 84 - index * 19} r={index % 2 ? 9 : 13} fill={index % 2 ? accent2 : accent} className="motif-glow" />
    </Motion.g>)}
  </g>;
}

function PathJourney({ accent, accent2, points }) {
  const d = `M${points[0][0]} ${points[0][1]} C100 480 70 360 146 348 S235 310 ${points.at(-1)[0]} ${points.at(-1)[1]}`;
  return <g>
    <path d={d} fill="none" stroke={accent} strokeOpacity=".17" strokeWidth="19" strokeLinecap="round" />
    <Motion.path d={d} fill="none" stroke="url(#sweep)" strokeWidth="4" strokeLinecap="round" strokeDasharray="720" initial={{ strokeDashoffset: 720 }} animate={{ strokeDashoffset: 0 }} transition={{ duration: 3.2, ease: "easeInOut" }} />
    {points.slice(0, 5).map(([x, y], index) => <g key={index}><circle cx={x} cy={y} r="14" fill={accent2} opacity=".16" /><Motion.circle cx={x} cy={y} r="5" fill={accent2} animate={{ scale: [1, 1.6, 1] }} transition={{ duration: 2.5, delay: index * .28, repeat: Infinity }} /></g>)}
  </g>;
}

function ForkPaths({ accent, accent2 }) {
  return <g>
    <Motion.path d="M44 326 C120 326 142 328 180 326 C220 324 226 242 316 208" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.8 }} />
    <Motion.path d="M180 326 C222 330 232 418 316 474" fill="none" stroke={accent2} strokeWidth="3" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: .4, duration: 1.8 }} />
    <Motion.circle cx="180" cy="326" r="20" fill="url(#orb)" animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 2.3, repeat: Infinity }} />
    <circle cx="316" cy="208" r="10" fill={accent} /><circle cx="316" cy="474" r="10" fill={accent2} />
  </g>;
}

function RippleWaves({ accent, accent2, intensity }) {
  return <g>{[0, 1, 2, 3, 4].map((index) => <Motion.circle key={index} cx="180" cy="320" r="30" fill="none" stroke={index % 2 ? accent2 : accent} strokeWidth="2" initial={{ scale: .35, opacity: .8 }} animate={{ scale: 3.5 + intensity, opacity: 0 }} transition={{ duration: 3.2, delay: index * .62, repeat: Infinity, ease: "easeOut" }} style={{ transformBox: "fill-box", transformOrigin: "center" }} />)}<Motion.circle cx="180" cy="320" r="34" fill="url(#orb)" className="motif-glow" animate={{ scale: [1, 1.13, 1] }} transition={{ duration: 2.5, repeat: Infinity }} /></g>;
}

function Horizon({ accent, accent2, dusk = false }) {
  return <g>
    <circle cx="180" cy={dusk ? 416 : 350} r="116" fill="url(#orb)" opacity=".56" />
    <Motion.circle cx="180" cy={dusk ? 416 : 350} r="72" fill={accent} className="motif-glow" animate={{ y: dusk ? [0, 26] : [28, -18, 28], opacity: dusk ? [.8, .25] : [.55, 1, .55] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
    <path d="M0 430 Q90 386 180 430 T360 430 V640 H0Z" fill={accent2} opacity=".12" />
    <path d="M0 464 Q90 420 180 464 T360 464" fill="none" stroke={accent2} strokeOpacity=".5" strokeWidth="2" />
  </g>;
}

function StormClouds({ accent, accent2 }) {
  return <g>
    {[0, 1, 2].map((index) => <Motion.g key={index} animate={{ x: [index % 2 ? 14 : -14, index % 2 ? -14 : 14] }} transition={{ duration: 5 + index * 2, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }} opacity={.22 + index * .12}>
      <ellipse cx={96 + index * 78} cy={230 + index * 32} rx="104" ry="42" fill={index % 2 ? accent2 : accent} />
      <ellipse cx={136 + index * 54} cy={207 + index * 32} rx="52" ry="47" fill={index % 2 ? accent2 : accent} />
    </Motion.g>)}
    <Motion.path d="M204 274 L174 346 L207 338 L183 412 L247 316 L212 326Z" fill="#f8d47d" animate={{ opacity: [.1, 1, .15] }} transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 2 }} />
    <Motion.path d="M0 440 Q90 410 180 440 T360 440 V640 H0Z" fill={accent2} opacity=".12" />
  </g>;
}

function RainGlass({ accent, accent2, points }) {
  return <g>
    <circle cx="272" cy="186" r="74" fill={accent} opacity=".13" />
    {points.map(([x, y], index) => <Motion.path key={index} d={`M${x} ${y} C${x - 12} ${y + 22} ${x - 8} ${y + 34} ${x} ${y + 35} C${x + 10} ${y + 32} ${x + 11} ${y + 23} ${x} ${y}Z`} fill={index % 2 ? accent2 : accent} opacity=".55" animate={{ y: [0, 140], opacity: [.15, .72, 0] }} transition={{ duration: 4 + index % 3, delay: index * .25, repeat: Infinity, ease: "linear" }} />)}
  </g>;
}

function LightBeam({ accent, accent2 }) {
  return <g>
    {[0, 1, 2, 3, 4].map((index) => <Motion.path key={index} d={`M${150 + index * 14} 0 L${70 + index * 44} 470 L${104 + index * 44} 470 L${170 + index * 14} 0Z`} fill={index % 2 ? accent : accent2} opacity=".12" animate={{ opacity: [.04, .25, .06] }} transition={{ duration: 4 + index, delay: index * .25, repeat: Infinity }} />)}
    <Motion.circle cx="180" cy="316" r="86" fill="url(#orb)" animate={{ scale: [.8, 1.2, .8], opacity: [.5, 1, .5] }} transition={{ duration: 3.8, repeat: Infinity }} />
    <Motion.path d="M30 430 Q180 320 330 430" fill="none" stroke={accent2} strokeWidth="2" strokeDasharray="7 9" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2 }} />
  </g>;
}

function ChainBreak({ accent, accent2 }) {
  return <g fill="none" strokeWidth="13" strokeLinecap="round">
    <Motion.path d="M74 338 C52 280 100 238 152 270 L194 299" stroke={accent} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.8 }} />
    <Motion.path d="M286 338 C308 396 260 438 208 406 L166 377" stroke={accent2} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.8, delay: .4 }} />
    <Motion.path d="M172 308 L146 284 M190 370 L214 394" stroke="#fff0c3" strokeWidth="3" animate={{ opacity: [.1, .9, .1] }} transition={{ duration: 2, repeat: Infinity }} />
    <Motion.circle cx="180" cy="338" r="58" fill="url(#orb)" stroke="none" animate={{ scale: [.8, 1.2, .8] }} transition={{ duration: 2.5, repeat: Infinity }} />
  </g>;
}

function MirrorSplit({ accent, accent2 }) {
  return <g>
    <path d="M180 142 C76 168 72 386 180 470Z" fill={accent} opacity=".24" stroke={accent} strokeWidth="2" />
    <path d="M180 142 C284 168 288 386 180 470Z" fill={accent2} opacity=".2" stroke={accent2} strokeWidth="2" />
    <Motion.path d="M180 126 V492" stroke="#fff4d8" strokeOpacity=".7" strokeWidth="2" strokeDasharray="4 9" animate={{ opacity: [.25, .8, .25] }} transition={{ duration: 3, repeat: Infinity }} />
    <Motion.circle cx="180" cy="305" r="35" fill="url(#orb)" className="motif-glow" animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 2.8, repeat: Infinity }} />
  </g>;
}

function TimelineTicks({ accent, accent2, points }) {
  return <g>
    <Motion.path d="M42 336 C120 314 238 358 320 328" fill="none" stroke={accent} strokeWidth="4" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2 }} />
    {points.slice(0, 5).map(([x], index) => <g key={index}><path d={`M${x} 320 V${index % 2 ? 260 : 392}`} stroke={accent2} strokeOpacity=".52" strokeWidth="2" /><Motion.circle cx={x} cy="336" r="8" fill={index % 2 ? accent : accent2} animate={{ scale: [1, 1.35, 1] }} transition={{ duration: 2, delay: index * .3, repeat: Infinity }} /><circle cx={x} cy={index % 2 ? 254 : 399} r="3" fill="#fff2ce" opacity=".8" /></g>)}
  </g>;
}

function BalanceScale({ accent, accent2 }) {
  return <g>
    <path d="M180 222 V428 M128 430 H232 M120 280 H240" stroke={accent2} strokeWidth="5" strokeLinecap="round" />
    <Motion.g animate={{ rotate: [-8, 8, -8] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} style={{ transformOrigin: "180px 280px" }}>
      <path d="M120 280 L86 376 M120 280 L154 376 M240 280 L206 376 M240 280 L274 376" stroke={accent} strokeWidth="2" />
      <path d="M72 376 Q120 414 168 376Z M192 376 Q240 414 288 376Z" fill={accent} opacity=".36" stroke={accent} strokeWidth="2" />
      <Motion.circle cx="120" cy="360" r="22" fill="url(#orb)" animate={{ y: [0, -9, 0] }} transition={{ duration: 2.4, repeat: Infinity }} />
      <Motion.circle cx="240" cy="360" r="22" fill={accent2} opacity=".8" animate={{ y: [0, 8, 0] }} transition={{ duration: 2.4, repeat: Infinity }} />
    </Motion.g>
  </g>;
}

function CrowdDots({ accent, accent2, points }) {
  return <g>{points.concat(points.map(([x, y]) => [360 - x, y + 65])).map(([x, y], index) => <Motion.circle key={index} cx={x} cy={y} r={index === 4 ? 15 : 7} fill={index === 4 ? accent2 : accent} opacity={index === 4 ? 1 : .37} className={index === 4 ? "motif-glow" : ""} animate={index === 4 ? { scale: [1, 1.3, 1] } : { y: [0, -5, 0] }} transition={{ duration: 2.5 + index % 4, delay: index * .1, repeat: Infinity }} />)}</g>;
}

function BridgeBuild({ accent, accent2 }) {
  return <g>
    <path d="M22 426 H98 Q180 518 262 426 H338" fill="none" stroke={accent2} strokeOpacity=".28" strokeWidth="4" />
    {Array.from({ length: 9 }, (_, index) => <Motion.path key={index} d={`M${96 + index * 21} ${426 - Math.sin(index / 8 * Math.PI) * 82} V458`} stroke={index % 2 ? accent : accent2} strokeWidth="8" strokeLinecap="round" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: .88 }} transition={{ delay: index * .2, duration: .45 }} />)}
    <Motion.path d="M96 426 Q180 344 264 426" fill="none" stroke={accent} strokeWidth="4" strokeDasharray="4 8" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2.4 }} />
    <circle cx="180" cy="344" r="19" fill="url(#orb)" />
  </g>;
}

function ClockSpin({ accent, accent2, calendar = false }) {
  return <g>
    <circle cx="180" cy="320" r="114" fill="rgba(255,255,255,.035)" stroke={accent} strokeOpacity=".62" strokeWidth="3" />
    {Array.from({ length: calendar ? 12 : 24 }, (_, index) => <g key={index} transform={`rotate(${index * (calendar ? 30 : 15)} 180 320)`}><path d="M180 212 V226" stroke={accent2} strokeWidth={index % 2 ? 2 : 4} /><circle cx="180" cy="208" r="2.5" fill={accent} /></g>)}
    <Motion.g animate={{ rotate: 360 }} transition={{ duration: calendar ? 18 : 24, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: "180px 320px" }}>
      <path d="M180 320 V246 M180 320 L232 346" stroke="#fff1ca" strokeWidth="5" strokeLinecap="round" />
    </Motion.g>
    <Motion.circle cx="180" cy="320" r="14" fill={accent2} animate={{ scale: [1, 1.35, 1] }} transition={{ duration: 2.3, repeat: Infinity }} />
  </g>;
}

function MapRoute({ accent, accent2, points }) {
  return <g>
    <path d="M36 260 Q80 214 128 255 T215 248 Q280 206 324 265 V405 Q275 370 220 412 T122 404 Q74 435 36 396Z" fill={accent2} opacity=".14" stroke={accent2} strokeOpacity=".3" strokeWidth="2" />
    <path d="M54 338 C104 292 128 386 174 332 S258 278 310 354" fill="none" stroke={accent} strokeWidth="3" strokeDasharray="6 8" />
    <Motion.circle cx="54" cy="338" r="9" fill={accent2} animate={{ x: [0, 250], y: [0, 10, -42, 4, 16] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
    {points.slice(0, 3).map(([x, y], index) => <circle key={index} cx={x} cy={y} r="5" fill={accent} />)}
  </g>;
}

function DoorOpen({ accent, accent2 }) {
  return <g>
    <path d="M82 486 V176 Q180 120 278 176 V486Z" fill={accent2} opacity=".12" stroke={accent2} strokeWidth="3" />
    <Motion.path d="M112 466 V193 Q168 164 224 193 V466Z" fill="url(#orb)" stroke={accent} strokeWidth="3" animate={{ scaleX: [1, .72, 1], x: [0, 18, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} style={{ transformOrigin: "112px 320px" }} />
    <Motion.path d="M180 430 L180 262 M152 290 L180 260 L208 290" fill="none" stroke="#fff2c8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" animate={{ y: [6, -8, 6], opacity: [.4, 1, .4] }} transition={{ duration: 2.5, repeat: Infinity }} />
  </g>;
}

function SeedToTree({ accent, accent2, intensity }) {
  return <g>
    <Motion.path d="M180 472 C174 406 186 346 180 286 C177 244 150 216 130 192 M180 332 C210 294 240 278 266 268" fill="none" stroke={accent2} strokeWidth="8" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 3 }} />
    {[[130, 192], [266, 268], [178, 284], [146, 354], [218, 328]].map(([x, y], index) => <Motion.ellipse key={index} cx={x} cy={y} rx={27 + index % 2 * 8} ry="14" fill={index % 2 ? accent : accent2} opacity=".78" transform={`rotate(${index % 2 ? -32 : 32} ${x} ${y})`} initial={{ scale: .2, opacity: 0 }} animate={{ scale: 1, opacity: .8 }} transition={{ delay: .5 + index * .35, type: "spring", stiffness: 160, damping: 14 }} />)}
    <Motion.circle cx="180" cy="480" r="18" fill={accent} animate={{ scale: [1, 1 + intensity * .25, 1] }} transition={{ duration: 2.6, repeat: Infinity }} />
    <path d="M58 492 Q180 450 302 492" fill="none" stroke={accent} strokeOpacity=".35" strokeWidth="2" />
  </g>;
}

function HeartbeatLine({ accent, accent2 }) {
  return <g>
    <Motion.path d="M22 326 H98 L124 326 L146 270 L171 397 L204 230 L230 326 H338" fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="620" animate={{ strokeDashoffset: [620, 0, 0] }} transition={{ duration: 3.2, repeat: Infinity, repeatDelay: .4 }} />
    <circle cx="204" cy="230" r="58" fill="url(#orb)" opacity=".6" />
    <Motion.circle cx="204" cy="230" r="25" fill={accent2} className="motif-glow" animate={{ scale: [1, 1.22, 1] }} transition={{ duration: .9, repeat: Infinity }} />
  </g>;
}

function QuoteGlow({ accent, label }) {
  return <g>
    <Motion.rect x="32" y="248" width="296" height="150" rx="24" fill="rgba(255,255,255,.045)" stroke={accent} strokeOpacity=".38" initial={{ opacity: 0, scale: .92 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 130, damping: 18 }} />
    <Motion.path d="M58 278 H294" stroke={accent} strokeOpacity=".34" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: .25, duration: 1 }} />
    <Motion.text x="180" y="333" textAnchor="middle" fill="#fff1ce" fontFamily="Georgia,serif" fontSize="20" fontWeight="600" opacity=".92" animate={{ opacity: [.65, 1, .65] }} transition={{ duration: 3, repeat: Infinity }}>{(label || "A turning point").slice(0, 26)}</Motion.text>
    <Motion.path d="M58 368 H294" stroke={accent} strokeOpacity=".34" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: .5, duration: 1 }} />
  </g>;
}

function NameTags({ accent, accent2, items }) {
  const tags = items.length ? items : ["A new idea"];
  return <g>{tags.map((item, index) => {
    const y = 256 + index * 70, width = Math.min(220, Math.max(98, item.length * 11 + 36));
    return <Motion.g key={`${item}-${index}`} initial={{ opacity: 0, y: 18, scale: .9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: index * .35, type: "spring", stiffness: 140, damping: 16 }}>
      <rect x={180 - width / 2} y={y} width={width} height="42" rx="21" fill="rgba(240,248,255,.09)" stroke={index % 2 ? accent2 : accent} strokeOpacity=".72" />
      <circle cx={180 - width / 2 + 16} cy={y + 21} r="4" fill={index % 2 ? accent2 : accent} />
      <text x="180" y={y + 26} textAnchor="middle" fill="#f4f1e8" fontSize="13" fontFamily="sans-serif">{item.slice(0, 21)}</text>
    </Motion.g>;
  })}</g>;
}

function KnotUntie({ accent, accent2 }) {
  return <g>
    <Motion.path d="M72 332 C80 218 280 218 288 332 C296 446 64 446 72 332 C80 218 280 218 288 332" fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" initial={{ pathLength: 1 }} animate={{ d: ["M72 332 C80 218 280 218 288 332 C296 446 64 446 72 332 C80 218 280 218 288 332", "M72 332 C120 270 240 394 288 332"] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} />
    <Motion.circle cx="180" cy="332" r="36" fill="url(#orb)" animate={{ scale: [1, .72, 1] }} transition={{ duration: 4, repeat: Infinity }} />
    <Motion.path d="M180 278 V220 M160 242 L180 220 L200 242" fill="none" stroke={accent2} strokeWidth="3" animate={{ opacity: [.2, 1, .2], y: [8, -8, 8] }} transition={{ duration: 2.4, repeat: Infinity }} />
  </g>;
}

function MotifDrawing({ id, palette, label, items, intensity }) {
  const points = coordinates(items, `${id}:${label}`, 8);
  const props = { accent: palette.accent, accent2: palette.accent2, points, items, intensity, label };
  switch (id) {
    case "constellation": return <Constellation {...props} />;
    case "orbit": return <Orbit {...props} />;
    case "path_journey": return <PathJourney {...props} />;
    case "fork_paths": return <ForkPaths {...props} />;
    case "ripple_waves": return <RippleWaves {...props} />;
    case "rising_sun": return <Horizon {...props} />;
    case "falling_dusk": return <Horizon {...props} dusk />;
    case "storm_clouds": return <StormClouds {...props} />;
    case "rain_glass": return <RainGlass {...props} />;
    case "light_beam": return <LightBeam {...props} />;
    case "chain_break": return <ChainBreak {...props} />;
    case "knot_untie": return <KnotUntie {...props} />;
    case "mirror_split": return <MirrorSplit {...props} />;
    case "timeline_ticks": return <TimelineTicks {...props} />;
    case "balance_scale": return <BalanceScale {...props} />;
    case "crowd_dots": return <CrowdDots {...props} />;
    case "bridge_build": return <BridgeBuild {...props} />;
    case "clock_spin": return <ClockSpin {...props} />;
    case "calendar_flip": return <ClockSpin {...props} calendar />;
    case "map_route": return <MapRoute {...props} />;
    case "door_open": return <DoorOpen {...props} />;
    case "seed_to_tree": return <SeedToTree {...props} />;
    case "heartbeat_line": return <HeartbeatLine {...props} />;
    case "quote_glow": return <QuoteGlow {...props} />;
    case "name_tags": return <NameTags {...props} />;
    default: return <Constellation {...props} />;
  }
}

export default function MotifArtwork({ beat = {}, palette: inputPalette = {}, mood = "reflective" }) {
  const safePalette = {
    bg1: /^#[\da-f]{6}$/i.test(inputPalette.bg1 || "") ? inputPalette.bg1 : "#101b35",
    bg2: /^#[\da-f]{6}$/i.test(inputPalette.bg2 || "") ? inputPalette.bg2 : "#343d71",
    accent: /^#[\da-f]{6}$/i.test(inputPalette.accent || "") ? inputPalette.accent : "#e9c878",
    accent2: /^#[\da-f]{6}$/i.test(inputPalette.accent2 || "") ? inputPalette.accent2 : "#79d9ca",
  };
  const id = MOTIF_IDS.includes(beat.motif) ? beat.motif : "constellation";
  const paletteId = id.replaceAll("_", "-");
  const items = Array.isArray(beat.items) ? beat.items.filter((item) => typeof item === "string").slice(0, 3) : [];
  const points = coordinates(items, `${id}:${beat.label || ""}`, 14);
  const safeMood = ["calm", "tense", "sad", "joyful", "mysterious", "epic", "funny", "reflective"].includes(mood) ? mood : "reflective";
  const rawIntensity = Math.max(0, Math.min(1, Number(beat.intensity) || .45));
  const intensity = Math.max(0, Math.min(1, rawIntensity * (safeMood === "tense" ? 1.4 : safeMood === "joyful" ? 1.25 : ["sad", "calm", "reflective"].includes(safeMood) ? .72 : 1)));
  return <svg className={`st-motif st-motif-${paletteId} mood-${safeMood}`} viewBox={VIEW} preserveAspectRatio="xMidYMid slice" role="img" aria-label={beat.label || "Animated story motif"}>
    <defs>
      <linearGradient id="st-bg" x1="0" y1="0" x2="0.9" y2="1"><stop offset="0" stopColor={safePalette.bg1} /><stop offset="1" stopColor={safePalette.bg2} /></linearGradient>
      <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={safePalette.accent} /><stop offset=".52" stopColor="#fff2c9" /><stop offset="1" stopColor={safePalette.accent2} /></linearGradient>
      <radialGradient id="orb"><stop offset="0" stopColor="#fff4d2" /><stop offset=".34" stopColor={safePalette.accent} stopOpacity=".96" /><stop offset="1" stopColor={safePalette.accent2} stopOpacity=".08" /></radialGradient>
      <filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="12" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
    </defs>
    <rect width="360" height="640" fill="url(#st-bg)" />
    <circle cx="52" cy="128" r="100" fill={safePalette.accent2} opacity=".075" />
    <circle cx="310" cy="498" r="144" fill={safePalette.accent} opacity=".065" />
    <Starfield accent={safePalette.accent2} points={points} mood={safeMood} />
    <MoodAtmosphere mood={safeMood} accent={safePalette.accent} accent2={safePalette.accent2} />
    <g filter="url(#glow)"><MotifDrawing id={id} palette={safePalette} label={beat.label} items={items} intensity={intensity} /></g>
    <Motion.path className="st-light-sweep" d="M-80 460 Q120 340 440 250" fill="none" stroke="url(#sweep)" strokeWidth="1.5" opacity=".2" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: [.08, .35, .08] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
  </svg>;
}