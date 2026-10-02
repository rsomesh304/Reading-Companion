export const MOTIF_IDS = [
  "constellation", "orbit", "path_journey", "fork_paths", "ripple_waves", "rising_sun", "falling_dusk", "storm_clouds", "rain_glass", "light_beam", "chain_break", "knot_untie", "mirror_split", "timeline_ticks", "balance_scale", "crowd_dots", "bridge_build", "clock_spin", "calendar_flip", "map_route", "door_open", "seed_to_tree", "heartbeat_line", "quote_glow", "name_tags",
];
export const SCRIPT_MOODS = ["calm", "tense", "sad", "joyful", "mysterious", "epic", "funny", "reflective"];
export const SCRIPT_TRANSITIONS = ["crossfade", "dip_to_black", "light_wipe"];

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const exactKeys = (value, keys) => isRecord(value) && Object.keys(value).length === keys.length && keys.every((key) => key in value);
const isHex = (value) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
const containsWords = (source, phrase) => source.toLocaleLowerCase().includes(phrase.toLocaleLowerCase());

export const STORY_SCRIPT_JSON_SCHEMA = {
  type: "object",
  required: ["title", "mood", "palette", "beats", "closing_line"],
  properties: {
    title: { type: "string" },
    mood: { type: "string", enum: SCRIPT_MOODS },
    palette: {
      type: "object",
      required: ["bg1", "bg2", "accent", "accent2"],
      properties: {
        bg1: { type: "string" }, bg2: { type: "string" },
        accent: { type: "string" }, accent2: { type: "string" },
      },
    },
    beats: {
      type: "array",
      minItems: 6,
      maxItems: 10,
      items: {
        type: "object",
        required: ["narration", "motif", "label", "items", "intensity", "transition"],
        properties: {
          narration: { type: "string" }, motif: { type: "string", enum: MOTIF_IDS },
          label: { type: "string", nullable: true }, items: { type: "array", items: { type: "string" } },
          intensity: { type: "number", minimum: 0, maximum: 1 }, transition: { type: "string", enum: SCRIPT_TRANSITIONS },
        },
      },
    },
    closing_line: { type: "string" },
  },
};

export function validateStoryScript(script, source = null) {
  const errors = [];
  if (!exactKeys(script, ["title", "mood", "palette", "beats", "closing_line"])) return { valid: false, errors: ["script shape is invalid"] };
  if (typeof script.title !== "string" || !script.title.trim() || script.title.length > 80) errors.push("title is invalid");
  if (!SCRIPT_MOODS.includes(script.mood)) errors.push("mood is invalid");
  if (!exactKeys(script.palette, ["bg1", "bg2", "accent", "accent2"]) || !Object.values(script.palette).every(isHex)) errors.push("palette is invalid");
  const minimumBeats = source && source.confidence < 0.55 ? 1 : 6;
  if (!Array.isArray(script.beats) || script.beats.length < minimumBeats || script.beats.length > 10) errors.push(`beats must contain ${minimumBeats} to 10 entries`);
  else {
    let previousMotif = null;
    script.beats.forEach((beat, index) => {
      if (!exactKeys(beat, ["narration", "motif", "label", "items", "intensity", "transition"])) {
        errors.push(`beat ${index + 1} shape is invalid`);
        return;
      }
      if (typeof beat.narration !== "string" || !beat.narration.trim() || beat.narration.length > 1200) errors.push(`beat ${index + 1} narration is invalid`);
      if (!MOTIF_IDS.includes(beat.motif)) errors.push(`beat ${index + 1} motif is unknown`);
      if (beat.motif === previousMotif) errors.push(`beat ${index + 1} repeats the prior motif`);
      previousMotif = beat.motif;
      if (beat.label !== null && (typeof beat.label !== "string" || !beat.label.trim() || beat.label.trim().split(/\s+/).length > 5)) errors.push(`beat ${index + 1} label is invalid`);
      if (!Array.isArray(beat.items) || beat.items.length > 3 || !beat.items.every((item) => typeof item === "string" && item.trim() && item.length <= 48)) errors.push(`beat ${index + 1} items are invalid`);
      if (!Number.isFinite(beat.intensity) || beat.intensity < 0 || beat.intensity > 1) errors.push(`beat ${index + 1} intensity is invalid`);
      if (!SCRIPT_TRANSITIONS.includes(beat.transition)) errors.push(`beat ${index + 1} transition is invalid`);
      if (source && beat.items.some((item) => !containsWords(source.summary, item))) errors.push(`beat ${index + 1} includes an item absent from the summary`);
      if (source && beat.label && !containsWords(source.summary, beat.label)) errors.push(`beat ${index + 1} label is absent from the summary`);
    });
  }
  if (typeof script.closing_line !== "string" || !script.closing_line.trim() || script.closing_line.length > 220) errors.push("closing_line is invalid");
  return { valid: errors.length === 0, errors };
}