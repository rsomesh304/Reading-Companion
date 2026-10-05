function compact(text) {
  return String(text || "").toLowerCase().normalize("NFKD").replace(/[^a-z]/g, "");
}

function distance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[b.length];
}

// Only used after an explicitly invited speaking attempt; this is a rough ASR comparison, not a pronunciation score.
export function findApproxSpokenVariant(term, transcript) {
  const expected = compact(term);
  const words = String(transcript || "").toLowerCase().match(/[a-z]+/g) || [];
  if (expected.length < 6 || !words.length) return "";
  let best = { text: "", score: Infinity };
  const expectedWords = String(term || "").trim().split(/\s+/).length;
  for (let size = Math.max(1, expectedWords - 1); size <= expectedWords + 1; size += 1) {
    for (let start = 0; start + size <= words.length; start += 1) {
      const phrase = words.slice(start, start + size).join(" ");
      const observed = compact(phrase);
      if (!observed || observed === expected) continue;
      const edits = distance(expected, observed);
      const ratio = edits / Math.max(expected.length, observed.length);
      if (edits >= 1 && edits <= 2 && ratio <= 0.28 && ratio < best.score) best = { text: phrase, score: ratio };
    }
  }
  return best.text;
}
