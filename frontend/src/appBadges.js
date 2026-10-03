// Add future Settings-level notices to `settings`; Profile always shows the total beneath it.
export function computeBadges({ updateAvailable = false } = {}) {
  const settings = updateAvailable ? 1 : 0;
  return { settings, profile: settings };
}
