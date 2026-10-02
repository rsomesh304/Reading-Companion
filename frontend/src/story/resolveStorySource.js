const EMPTY_SOURCE = {
  mode: "empty",
  chapterNumber: null,
  chapterTitle: "",
  summary: "",
  startPage: null,
  endPage: null,
  priorChapterSummaries: [],
  confidence: 0,
};

function normalizeChapter(number, chapter) {
  if (!chapter || typeof chapter !== "object") return null;
  const chapterNumber = Number(chapter.number ?? number);
  if (!Number.isInteger(chapterNumber) || chapterNumber < 1) return null;
  return {
    ...chapter,
    number: chapterNumber,
    title: typeof chapter.title === "string" && chapter.title.trim() ? chapter.title.trim() : `Chapter ${chapterNumber}`,
    summary: typeof chapter.summary === "string" ? chapter.summary.trim() : "",
  };
}

function createSource(mode, chapter, priorChapterSummaries = []) {
  return {
    mode,
    chapterNumber: chapter.number,
    chapterTitle: chapter.title,
    summary: chapter.summary,
    startPage: chapter.startPage ?? null,
    endPage: chapter.endPage ?? null,
    priorChapterSummaries,
    confidence: chapter.summary.length >= 150 ? 1 : 0.4,
  };
}

export function resolveStorySource(book) {
  if (!book?.chapters || typeof book.chapters !== "object") return { ...EMPTY_SOURCE };

  const chapters = Object.entries(book.chapters)
    .map(([number, chapter]) => normalizeChapter(number, chapter))
    .filter(Boolean)
    .sort((a, b) => a.number - b.number);
  const currentNumber = Number(book.currentChapterNumber);
  const current = chapters.find((chapter) => chapter.number === currentNumber);
  if (!current) return { ...EMPTY_SOURCE };

  if (current.summary) {
    return createSource("continue", current, chapters
      .filter((chapter) => chapter.number < current.number && chapter.summary)
      .slice(-3)
      .map((chapter) => chapter.summary));
  }

  const previous = chapters.find((chapter) => chapter.number === current.number - 1);
  if (!current.summary && previous?.summary) {
    return createSource("new_chapter", previous, chapters
      .filter((chapter) => chapter.number < previous.number && chapter.summary)
      .slice(-3)
      .map((chapter) => chapter.summary));
  }

  return {
    ...EMPTY_SOURCE,
    chapterNumber: current.number,
    chapterTitle: current.title,
    startPage: current.startPage ?? null,
    endPage: current.endPage ?? null,
  };
}