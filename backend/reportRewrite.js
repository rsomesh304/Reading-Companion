const PREAMBLE = /^(?:here(?:'s| is)|sure|certainly|the (?:improved|revised|rewritten|corrected)|improved|revised|rewritten|corrected)[^\n]*?:\s*$/i;
const REFUSAL = /^(?:i(?:'m| am) (?:sorry|unable|not able)|sorry|i (?:can(?:'|’)?t|cannot|can not|don(?:'|’)?t have|won(?:'|’)?t))\b/i;

export function cleanRewrite(output, original) {
  let lines = String(output || "").trim().split(/\r?\n/);
  while (lines.length && (!lines[0].trim() || PREAMBLE.test(lines[0].trim()))) lines.shift();
  let text = lines.join("\n").trim().replace(/^(?:description|steps)\s*:\s*/i, "").replace(/^(["“])([\s\S]*)(["”])$/, "$2").trim();
  if (!text) return null;
  const source = String(original || "").trim();
  if (REFUSAL.test(text) && !REFUSAL.test(source)) return null;
  if (text.length < source.length * 0.4 || text.length > source.length * 2 + 80) return null;
  return text;
}

function itemCount(text) {
  const numbered = String(text).match(/(?:^|\s)\d+[.)]?\s+(?=[A-Za-z])/g);
  return numbered ? numbered.length : String(text).split(/\n+/).filter(Boolean).length;
}

// A rewrite must not add or drop steps.
export function stepsPreserved(original, rewritten) {
  return itemCount(original) === itemCount(rewritten);
}
