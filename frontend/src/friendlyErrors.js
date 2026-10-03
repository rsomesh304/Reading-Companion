// Turns technical connection states and errors into short, human messages.
// kind: "checking" shows the animated checker, "error" a calm warning, null = nothing to show.

const HIDDEN = /^(connected|thinking|saying goodnight|session ending|checking in)/i;

export function describeLiveStatus(status) {
  const text = String(status || "").trim();
  if (!text || HIDDEN.test(text)) return null;

  if (/mic error/i.test(text)) {
    return {
      kind: "error", code: "mic",
      title: "Microphone nahi mil raha",
      detail: "Browser ya phone settings mein is app ko mic ki permission dijiye, phir session dobara shuru kijiye.",
    };
  }
  if (/camera error/i.test(text)) {
    return {
      kind: "error", code: "camera",
      title: "Camera shuru nahi ho paya",
      detail: "Camera ki permission allow kijiye, ya camera ke bajay Snapshot se page share kijiye.",
    };
  }
  if (/backup model/i.test(text)) {
    return {
      kind: "checking", code: "model",
      title: "Voice model abhi busy hai",
      detail: "Doosra model check kar raha hoon. Bas ek pal.",
    };
  }
  if (/another key/i.test(text)) {
    return {
      kind: "checking", code: "capacity",
      title: "Voice service par bheed hai",
      detail: "Ek free route dhoondh raha hoon. Aapko kuch karna nahi hai.",
    };
  }
  if (/voice service busy/i.test(text)) {
    return {
      kind: "error", code: "lost",
      title: "Voice service abhi bahut busy hai",
      detail: "Thodi der baad session dobara shuru kijiye. Aapka progress save hai.",
    };
  }
  if (/error:|connection problem|tap end/i.test(text)) {
    return {
      kind: "error", code: "lost",
      title: "Connection toot gaya",
      detail: "Internet check kijiye. Agar theek hai, toh End dabaakar session dobara shuru kijiye. Aapka progress save hai.",
    };
  }
  if (/closed|reconnect|resum/i.test(text)) {
    return {
      kind: "checking", code: "reconnecting",
      title: "Connection wapas jod raha hoon",
      detail: "Aapki baat save hai. Bas ek pal.",
    };
  }
  if (/connecting|starting/i.test(text)) {
    return {
      kind: "checking", code: "connecting",
      title: "Companion ko jaga raha hoon",
      detail: "Voice service check ho rahi hai.",
    };
  }
  return null;
}

// Maps a thrown error to a user-facing sentence. Never exposes raw technical text.
export function friendlyErrorMessage(error, fallback = "Kuch gadbad ho gayi. Thodi der baad dobara try kijiye.") {
  const message = String(error?.message || error || "").toLowerCase();
  if (!message) return fallback;
  if (/failed to fetch|networkerror|network request|load failed|offline|timeout|timed out|abort/.test(message)) {
    return "Internet connection kamzor lag raha hai. Check karke dobara try kijiye.";
  }
  if (/429|quota|exhausted|rate.?limit|too many|all_keys_unavailable/.test(message)) {
    return "Voice service abhi bahut busy hai. Thodi der mein dobara try kijiye.";
  }
  if (/502|503|504|bad gateway|unavailable|server/.test(message)) {
    return "Server abhi jaag raha hai. Ek-do minute baad dobara try kijiye.";
  }
  if (/notallowed|permission|denied/.test(message)) {
    return "Permission nahi mili. Settings mein allow karke dobara try kijiye.";
  }
  if (/notfound|devicesnotfound|no.*(camera|microphone)/.test(message)) {
    return "Is device par camera ya mic nahi mila.";
  }
  return fallback;
}
