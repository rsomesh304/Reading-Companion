const ROUNDING = 7;
const TAG_HEIGHT = 18;
const LABEL_FONT_SIZES = [11, 10.5, 10, 9.5, 9, 8.5];
const SUB_FONT_SIZES = [8.5, 8, 7.5, 7];

const charWidth = (fontSize) => fontSize * 0.56;
const subWidth = (fontSize) => fontSize * 0.54;

export const anchor = (box, side) => ({
  t: [box.x + box.w / 2, box.y],
  b: [box.x + box.w / 2, box.y + box.h],
  l: [box.x, box.y + box.h / 2],
  r: [box.x + box.w, box.y + box.h / 2],
}[side]);

export function autoSides(a, b) {
  const ac = [a.x + a.w / 2, a.y + a.h / 2];
  const bc = [b.x + b.w / 2, b.y + b.h / 2];
  if (b.y >= a.y + a.h - 1) return ["b", "t"];
  if (b.y + b.h <= a.y + 1) return ["t", "b"];
  return bc[0] > ac[0] ? ["r", "l"] : ["l", "r"];
}

export function points(edge, a, b) {
  const [fromSide, toSide] = edge.sides ? edge.sides.split("") : autoSides(a, b);
  const p1 = anchor(a, fromSide);
  const p2 = anchor(b, toSide);
  if (edge.via) return [p1, ...edge.via, p2];
  const vertical = (side) => side === "t" || side === "b";
  if (vertical(fromSide) && vertical(toSide)) {
    if (Math.abs(p1[0] - p2[0]) < 1) return [p1, p2];
    const midY = edge.bend ?? (p1[1] + p2[1]) / 2;
    return [p1, [p1[0], midY], [p2[0], midY], p2];
  }
  if (!vertical(fromSide) && !vertical(toSide)) {
    if (Math.abs(p1[1] - p2[1]) < 1) return [p1, p2];
    const midX = edge.bend ?? (p1[0] + p2[0]) / 2;
    return [p1, [midX, p1[1]], [midX, p2[1]], p2];
  }
  return vertical(fromSide) ? [p1, [p1[0], p2[1]], p2] : [p1, [p2[0], p1[1]], p2];
}

export function toPath(polyline) {
  let d = `M${polyline[0][0]},${polyline[0][1]}`;
  for (let i = 1; i < polyline.length - 1; i += 1) {
    const [px, py] = polyline[i - 1];
    const [cx, cy] = polyline[i];
    const [nx, ny] = polyline[i + 1];
    const radius = Math.min(
      ROUNDING,
      Math.hypot(cx - px, cy - py) / 2,
      Math.hypot(nx - cx, ny - cy) / 2,
    );
    const u1 = [Math.sign(cx - px), Math.sign(cy - py)];
    const u2 = [Math.sign(nx - cx), Math.sign(ny - cy)];
    d += ` L${cx - u1[0] * radius},${cy - u1[1] * radius} Q${cx},${cy} ${cx + u2[0] * radius},${cy + u2[1] * radius}`;
  }
  const last = polyline[polyline.length - 1];
  return `${d} L${last[0]},${last[1]}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function splitToken(token, maxChars) {
  if (token.length <= maxChars) return [token];
  const parts = [];
  for (let i = 0; i < token.length; i += maxChars) parts.push(token.slice(i, i + maxChars));
  return parts;
}

function tokenize(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((token) => token.split(/(?<=[/-])/).filter(Boolean));
}

function wrapText(text, width, fontSize, maxLines) {
  const maxChars = Math.max(3, Math.floor(width / charWidth(fontSize)));
  const tokens = tokenize(text).flatMap((token) => splitToken(token, maxChars));
  const lines = [];
  let current = "";
  let overflow = false;
  const joinToken = (line, token) => (line && !line.endsWith("/") && !line.endsWith("-") ? `${line} ${token}` : `${line}${token}`);
  for (const token of tokens) {
    const candidate = current ? joinToken(current, token) : token;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = token;
    if (lines.length === maxLines) {
      overflow = true;
      break;
    }
  }
  if (!overflow && current) lines.push(current);
  if (lines.length > maxLines) {
    overflow = true;
    lines.length = maxLines;
  }
  return { lines: lines.slice(0, maxLines), overflow };
}

function measureLine(text, fontSize, narrow = false) {
  return Math.max(0, String(text || "").length) * (narrow ? subWidth(fontSize) : charWidth(fontSize));
}

export function layoutNodeText(node) {
  const hasIcon = Boolean(node.icon);
  const availableWidth = node.w - (hasIcon ? 48 : 16);
  const labelMaxLines = node.sub ? 2 : 3;
  const subMaxLines = 2;
  let best = null;

  for (const labelFontSize of LABEL_FONT_SIZES) {
    const labelWrap = wrapText(node.label, availableWidth, labelFontSize, labelMaxLines);
    if (labelWrap.overflow) continue;
    for (const subFontSize of SUB_FONT_SIZES) {
      const subWrap = node.sub ? wrapText(node.sub, availableWidth, subFontSize, subMaxLines) : { lines: [], overflow: false };
      if (subWrap.overflow) continue;
      const labelLines = labelWrap.lines;
      const subLines = subWrap.lines;
      const labelHeight = labelLines.length * labelFontSize;
      const subHeight = subLines.length ? subLines.length * subFontSize + 3 : 0;
      const totalHeight = labelHeight + subHeight;
      if (totalHeight <= node.h - 12) {
        best = { labelFontSize, subFontSize, labelLines, subLines };
        break;
      }
    }
    if (best) break;
  }

  if (!best) {
    const labelFontSize = LABEL_FONT_SIZES[LABEL_FONT_SIZES.length - 1];
    const subFontSize = SUB_FONT_SIZES[SUB_FONT_SIZES.length - 1];
    best = {
      labelFontSize,
      subFontSize,
      labelLines: wrapText(node.label, availableWidth, labelFontSize, labelMaxLines).lines,
      subLines: node.sub ? wrapText(node.sub, availableWidth, subFontSize, subMaxLines).lines : [],
    };
  }

  const totalHeight =
    best.labelLines.length * best.labelFontSize +
    (best.subLines.length ? best.subLines.length * best.subFontSize + 3 : 0);

  return {
    ...best,
    availableWidth,
    textX: hasIcon ? node.x + 36 : node.x + node.w / 2,
    textAnchor: hasIcon ? "start" : "middle",
    topY: node.y + (node.h - totalHeight) / 2 + best.labelFontSize - 1,
  };
}

export function measureTag(text) {
  const content = String(text || "").trim();
  const width = Math.max(34, measureLine(content, 8, true) + 16);
  return { text: content, width, height: TAG_HEIGHT };
}

export function rectsIntersect(a, b, gap = 0) {
  return !(
    a.x + a.w + gap <= b.x ||
    b.x + b.w + gap <= a.x ||
    a.y + a.h + gap <= b.y ||
    b.y + b.h + gap <= a.y
  );
}

function areaOutside(rect, spec) {
  const overflowLeft = Math.max(0, 8 - rect.x);
  const overflowTop = Math.max(0, 8 - rect.y);
  const overflowRight = Math.max(0, rect.x + rect.w - (spec.w - 8));
  const overflowBottom = Math.max(0, rect.y + rect.h - (spec.h - 8));
  return overflowLeft + overflowTop + overflowRight + overflowBottom;
}

function edgeCandidates(polyline) {
  const candidates = [];
  for (let i = 0; i < polyline.length - 1; i += 1) {
    const a = polyline[i];
    const b = polyline[i + 1];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len < 1) continue;
    const nx = len ? -dy / len : 0;
    const ny = len ? dx / len : 0;
    for (const ratio of len < 24 ? [0.5] : [0.5, 0.34, 0.66]) {
      const baseX = a[0] + dx * ratio;
      const baseY = a[1] + dy * ratio;
      for (const offset of [20, -20, 28, -28, 14, -14, 34, -34, 42, -42, 50, -50, 62, -62, 76, -76, 92, -92, 0]) {
        candidates.push({
          x: baseX + nx * offset,
          y: baseY + ny * offset,
          offset: Math.abs(offset),
        });
      }
    }
  }
  return candidates;
}

export function placeEdgeLabel(spec, polyline, text, obstacles = []) {
  const tag = measureTag(text);
  const candidates = edgeCandidates(polyline);
  if (!candidates.length) {
    const fallback = {
      x: clamp(polyline[0][0], tag.width / 2 + 8, spec.w - tag.width / 2 - 8),
      y: clamp(polyline[0][1], tag.height / 2 + 8, spec.h - tag.height / 2 - 8),
    };
    return {
      ...tag,
      x: fallback.x,
      y: fallback.y,
      rect: { x: fallback.x - tag.width / 2, y: fallback.y - tag.height / 2, w: tag.width, h: tag.height },
    };
  }

  let winner = null;
  let winnerScore = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const x = clamp(candidate.x, tag.width / 2 + 8, spec.w - tag.width / 2 - 8);
    const y = clamp(candidate.y, tag.height / 2 + 8, spec.h - tag.height / 2 - 8);
    const rect = { x: x - tag.width / 2, y: y - tag.height / 2, w: tag.width, h: tag.height };
    let overlaps = 0;
    let overlapPenalty = 0;
    for (const obstacle of obstacles) {
      if (rectsIntersect(rect, obstacle, 3)) {
        overlaps += 1;
        overlapPenalty += 10;
      }
    }
    const edgePenalty = areaOutside(rect, spec) * 6;
    const score = overlaps * 1000 + overlapPenalty + candidate.offset + edgePenalty;
    if (score < winnerScore) {
      winnerScore = score;
      winner = { ...tag, x, y, rect };
    }
  }
  return winner;
}

export function buildDiagramLayout(spec) {
  const boxes = Object.fromEntries([...(spec.groups || []), ...spec.nodes].map((box) => [box.id, box]));
  const nodeLayouts = spec.nodes.map((node) => ({
    node,
    text: layoutNodeText(node),
    rect: { x: node.x, y: node.y, w: node.w, h: node.h },
  }));
  const obstacles = [
    ...nodeLayouts.map((entry) => entry.rect),
    ...(spec.groups || []).map((group) => ({ x: group.x + 8, y: group.y + 4, w: Math.max(72, group.label.length * 5.3), h: 16 })),
  ];
  const edgeLayouts = [];
  const placedTags = [];
  for (const edge of spec.edges) {
    const polyline = points(edge, boxes[edge.from], boxes[edge.to]);
    const label = edge.label ? placeEdgeLabel(spec, polyline, edge.label, [...obstacles, ...placedTags]) : null;
    if (label) placedTags.push(label.rect);
    edgeLayouts.push({
      edge,
      polyline,
      path: toPath(polyline),
      label,
    });
  }
  return { nodeLayouts, edgeLayouts };
}

export function nodeTextFits(node) {
  const layout = layoutNodeText(node);
  return layout.labelLines.every((line) => measureLine(line, layout.labelFontSize) <= layout.availableWidth + 0.5)
    && layout.subLines.every((line) => measureLine(line, layout.subFontSize, true) <= layout.availableWidth + 0.5);
}
