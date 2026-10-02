export const MOTIF_IDS = [
  "constellation", "orbit", "path_journey", "fork_paths", "ripple_waves", "rising_sun", "falling_dusk", "storm_clouds", "rain_glass", "light_beam", "chain_break", "knot_untie", "mirror_split", "timeline_ticks", "balance_scale", "crowd_dots", "bridge_build", "clock_spin", "calendar_flip", "map_route", "door_open", "seed_to_tree", "heartbeat_line", "quote_glow", "name_tags",
];

export function resolveMotifId(id) {
  return MOTIF_IDS.includes(id) ? id : "constellation";
}