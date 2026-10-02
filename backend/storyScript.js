import { MOTIF_IDS, validateStoryScript } from "./validateScript.js";

const THEMES = [
  { id: "philosophy", match: /meaning|choice|belief|truth|mind|self|purpose|freedom|courage|wisdom|fear|philosoph|thought|idea|principle/i, mood: "reflective", palette: ["#101b35", "#343d71", "#e9c878", "#79d9ca"] },
  { id: "conflict", match: /war|battle|fight|army|weapon|danger|threat|conflict|attack|soldier|enemy|violence/i, mood: "tense", palette: ["#211824", "#58303d", "#eea454", "#c96957"] },
  { id: "love", match: /love|heart|together|friend|family|care|miss|marry|relationship|kindness|affection/i, mood: "joyful", palette: ["#281932", "#563454", "#f0a4a6", "#efcb78"] },
  { id: "nature", match: /river|rain|forest|tree|sea|mountain|earth|flower|sun|wind|bird|garden|sky/i, mood: "calm", palette: ["#102d32", "#31574e", "#d9ca79", "#83d0ac"] },
  { id: "loss", match: /death|loss|grief|sorrow|leave|lonely|tears|memory|regret|sadness|goodbye/i, mood: "sad", palette: ["#172238", "#39475f", "#a6b2c4", "#8bb5ca"] },
  { id: "wonder", match: /discover|journey|travel|unknown|mystery|secret|strange|world|adventure|question/i, mood: "mysterious", palette: ["#101d38", "#284b64", "#e8c777", "#87d8e0"] },
];

function hashText(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getTheme(source) {
  const text = `${source.chapterTitle} ${source.summary}`;
  return THEMES.find((theme) => theme.match.test(text)) || {
    id: "general", mood: "warm", palette: ["#162238", "#344c65", "#e5bd76", "#72cfc5"],
  };
}

function storyPalette(theme, seed) {
  return theme.palette.map((hex, colorIndex) => {
    const base = hex.slice(1).match(/.{2}/g).map((channel) => parseInt(channel, 16));
    const salt = (seed >>> ((colorIndex * 7) % 24)) ^ Math.imul(colorIndex + 3, 2654435761);
    const channels = base.map((value, channelIndex) => {
      const shift = ((salt >>> (channelIndex * 5)) & 63) - 31;
      return Math.max(0, Math.min(255, value + shift));
    });
    return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
  });
}

function storyClosingLine(source) {
  return source.mode === "new_chapter"
    ? "अब अगला अध्याय शुरू होने वाला है।"
    : "बस, पिछली बार हम यहीं तक पहुँचे थे।";
}

function orientOpening(narration, source) {
  if (/^(पिछली बार|पिछली दफ़ा|पिछली दफा|last time|pichhli baar)/i.test(narration.trim())) return narration;
  const chapter = source.chapterTitle ? `\"${source.chapterTitle}\" में ` : "";
  return `पिछली बार हम ${chapter}यहीं तक पहुँचे थे। ${narration}`;
}

function sequenceFor(source, count, seed) {
  const theme = getTheme(source).id;
  const openings = {
    philosophy: ["mirror_split", "balance_scale", "orbit", "fork_paths"],
    conflict: ["storm_clouds", "heartbeat_line", "crowd_dots", "chain_break"],
    love: ["orbit", "bridge_build", "name_tags", "ripple_waves"],
    nature: ["rising_sun", "seed_to_tree", "rain_glass", "map_route"],
    loss: ["falling_dusk", "rain_glass", "mirror_split", "heartbeat_line"],
    wonder: ["map_route", "door_open", "path_journey", "clock_spin"],
    general: ["constellation", "path_journey", "ripple_waves", "orbit"],
  };
  const firstOptions = openings[theme] || openings.general;
  let state = seed;
  const motifs = [];
  for (let index = 0; index < Math.max(1, count); index++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const options = index === 0 ? firstOptions : MOTIF_IDS;
    let motif = options[Math.floor((state / 0x100000000) * options.length)];
    if (motif === motifs[index - 1]) motif = MOTIF_IDS[(MOTIF_IDS.indexOf(motif) + 1) % MOTIF_IDS.length];
    motifs.push(motif || MOTIF_IDS[index % MOTIF_IDS.length]);
  }
  return motifs;
}

export function normalizeStorySource(input = {}) {
  const mode = input.mode === "new_chapter" ? "new_chapter" : "continue";
  const summary = typeof input.summary === "string" ? input.summary.trim().slice(0, 6000) : "";
  const maximumConfidence = summary.length < 150 ? 0.4 : 1;
  const requestedConfidence = Number.isFinite(input.confidence) ? Math.min(1, Math.max(0, input.confidence)) : maximumConfidence;
  const list = (value, limit, maxLength) => (Array.isArray(value) ? value : [])
    .filter((item) => typeof item === "string")
    .map((item) => item.trim().slice(0, maxLength))
    .filter(Boolean)
    .slice(-limit);
  return {
    mode,
    chapterNumber: Number.isInteger(Number(input.chapterNumber)) && Number(input.chapterNumber) > 0 ? Number(input.chapterNumber) : null,
    chapterTitle: typeof input.chapterTitle === "string" ? input.chapterTitle.trim().slice(0, 160) : "",
    summary,
    chapterNotes: list(input.chapterNotes, 10, 500),
    priorChapterSummaries: list(input.priorChapterSummaries, 3, 1200),
    confidence: Math.min(maximumConfidence, requestedConfidence),
  };
}

export function personalizeStoryScript(script, source) {
  const seed = hashText(`${source.chapterNumber}|${source.chapterTitle}|${source.summary}`);
  const theme = getTheme(source);
  const motifs = sequenceFor(source, script.beats.length, seed);
  const palette = storyPalette(theme, seed);
  return {
    ...script,
    mood: theme.mood,
    palette: { bg1: palette[0], bg2: palette[1], accent: palette[2], accent2: palette[3] },
    beats: script.beats.map((beat, index) => ({
      ...beat,
      narration: index === 0 ? orientOpening(beat.narration, source) : beat.narration,
      motif: motifs[index],
      items: beat.items.filter((item) => source.summary.toLocaleLowerCase().includes(item.toLocaleLowerCase())).slice(0, 3),
      label: beat.label && source.summary.toLocaleLowerCase().includes(beat.label.toLocaleLowerCase()) ? beat.label : null,
      transition: ["crossfade", "dip_to_black", "light_wipe"].includes(beat.transition) ? beat.transition : "crossfade",
      intensity: Math.max(0, Math.min(1, Number(beat.intensity) || 0.45)),
    })),
    closing_line: storyClosingLine(source),
  };
}

export function createFallbackStoryScript(source) {
  const sentences = source.summary.match(/[^.!?]+[.!?]?/g)?.map((part) => part.trim()).filter(Boolean) || [source.summary];
  const seed = hashText(`${source.chapterNumber}|${source.chapterTitle}|${source.summary}`);
  const count = Math.min(8, Math.max(1, sentences.length));
  const motifs = sequenceFor(source, count, seed);
  const theme = getTheme(source);
  const palette = storyPalette(theme, seed);
  return {
    title: source.chapterTitle || `Chapter ${source.chapterNumber || ""}`.trim(),
    mood: theme.mood,
    palette: { bg1: palette[0], bg2: palette[1], accent: palette[2], accent2: palette[3] },
    beats: sentences.slice(0, count).map((narration, index) => ({
      narration: (index === 0 ? orientOpening(narration, source) : narration).slice(0, 1200),
      motif: motifs[index],
      label: null,
      items: [],
      intensity: 0.35 + ((seed >>> (index % 16)) & 7) / 20,
      transition: index === count - 1 ? "dip_to_black" : "crossfade",
    })),
    closing_line: storyClosingLine(source),
  };
}

export { validateStoryScript };