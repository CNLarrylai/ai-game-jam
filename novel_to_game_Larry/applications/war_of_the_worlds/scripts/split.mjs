// split.mjs — Step 1+2: strip Gutenberg, split by BOOK + chapter, keyword-density filter.
// Adapted for "The War of the Worlds" (H.G. Wells, Gutenberg #36).
// Run from anywhere: `node scripts/split.mjs`. Paths resolve relative to project root.
//   reads  data/pg36.txt
//   writes data/chapters.json (epigraph + all chapters + density), data/selected.json (top pick)
//
// ── ADAPTATION KNOBS (vs skill template) ───────────────────────────────────────
// 1. Chapter markup differs: this book has NO "CHAPTER I." lines. Instead chapters
//    are a bare roman-numeral-with-period on its own line (`I.`) whose TITLE sits on
//    the very next non-blank line. Books are separated by `BOOK ONE` / `BOOK TWO`
//    lines (each followed by a title line). IDs become B1-C1 … B2-C10.
// 2. Preamble: the Kepler epigraph (the "But who shall dwell in these worlds…" quote)
//    sits before BOOK ONE and is captured separately as id "epigraph" so it is not
//    dropped (skill pitfall #1: never lose the prologue/epigraph).
// 3. Keyword set swapped to the Martian-invasion genre (see KEYWORDS below).
// 4. The Gutenberg Table of Contents (lines whose roman header has a LEADING space,
//    e.g. " I. THE EVE…") is skipped: we only start scanning after the BODY `BOOK ONE`
//    divider, and body chapter headers have no leading space.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "data", "pg36.txt");

// Martian-invasion keyword set (swapped from the plague set in the skill template).
const KEYWORDS = [
  "martian", "martians", "heat-ray", "heat", "ray", "cylinder", "cylinders",
  "tripod", "tripods", "machine", "fighting-machine", "smoke", "black",
  "flee", "fled", "flight", "panic", "fire", "burn", "burning", "destroy",
  "destruction", "dead", "death", "die", "dying", "killed", "kill",
  "red", "weed", "escape", "escaped", "blood", "terror", "fear",
  "explosion", "ruin", "ruins", "crater", "pit", "refugee", "exodus",
];
const KW_RE = new RegExp(`\\b(${KEYWORDS.join("|")})\\w*`, "gi");

const ROMAN = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10,
  XI: 11, XII: 12, XIII: 13, XIV: 14, XV: 15, XVI: 16, XVII: 17,
};

function stripGutenberg(raw) {
  const start = raw.indexOf("*** START OF THE PROJECT GUTENBERG");
  const end = raw.indexOf("*** END OF THE PROJECT GUTENBERG");
  let body = raw.slice(start, end);
  body = body.slice(body.indexOf("\n") + 1);
  return body;
}

// Capture the Kepler epigraph: the quote block before the body BOOK ONE divider.
function extractEpigraph(body) {
  const lines = body.split("\n");
  const bookOneIdx = lines.findIndex((l) => l.trim() === "BOOK ONE");
  if (bookOneIdx < 0) return "";
  const head = lines.slice(0, bookOneIdx).join("\n");
  const qStart = head.indexOf("But who shall dwell");
  if (qStart < 0) return "";
  const tail = head.indexOf("Melancholy_)");
  return head.slice(qStart, tail >= 0 ? tail + "Melancholy_)".length : head.length).trim();
}

function splitChapters(body) {
  // Normalise CRLF -> LF so `$`-anchored header tests are not foiled by a trailing \r.
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  // Start scanning at the body BOOK ONE divider so the TOC is never matched.
  const startIdx = lines.findIndex((l) => l.trim() === "BOOK ONE");

  // A body chapter header is a line that is EXACTLY a roman numeral + period,
  // with no leading whitespace, e.g. "I." or "XVII.".
  const isHeader = (l) => /^[IVXLC]+\.$/.test(l);
  const isBook = (l) => l.trim() === "BOOK ONE" || l.trim() === "BOOK TWO";

  const marks = [];
  let book = 0;
  for (let i = startIdx; i < lines.length; i++) {
    const l = lines[i];
    if (isBook(l)) { book = l.trim() === "BOOK ONE" ? 1 : 2; continue; }
    if (book && isHeader(l)) {
      const numeral = l.replace(".", "");
      // title = next non-blank line
      let t = i + 1;
      while (t < lines.length && lines[t].trim() === "") t++;
      const title = lines[t] ? lines[t].trim().replace(/\.$/, "") : "";
      marks.push({ book, numeral, title, lineStart: t + 1, charLine: i });
    }
  }

  const chapters = [];
  for (let i = 0; i < marks.length; i++) {
    const m = marks[i];
    const endLine = i + 1 < marks.length ? marks[i + 1].charLine : lines.length;
    const text = lines.slice(m.lineStart, endLine).join("\n").trim();
    chapters.push({
      id: `B${m.book}-C${ROMAN[m.numeral]}`,
      book: m.book,
      numeral: m.numeral,
      chapterNum: ROMAN[m.numeral] ?? 0,
      title: m.title,
      text,
    });
  }
  return chapters;
}

function score(text) {
  const words = (text.match(/\b[\w-]+\b/g) || []).length;
  const hits = (text.match(KW_RE) || []).length;
  return { words, hits, density: words ? +((hits / words) * 1000).toFixed(2) : 0 };
}

const raw = readFileSync(SRC, "utf8");
const body = stripGutenberg(raw);

const epigraphText = extractEpigraph(body);
const epigraph = {
  id: "epigraph",
  book: 0,
  numeral: "",
  chapterNum: 0,
  title: "KEPLER EPIGRAPH",
  text: epigraphText,
  ...score(epigraphText),
};

const chapters = splitChapters(body).map((c) => ({ ...c, ...score(c.text) }));
const all = [epigraph, ...chapters];
writeFileSync(join(ROOT, "data", "chapters.json"), JSON.stringify(all, null, 2));

const book1 = chapters.filter((c) => c.book === 1).length;
const book2 = chapters.filter((c) => c.book === 2).length;
console.log(`\nParsed ${chapters.length} chapters (Book One: ${book1}, Book Two: ${book2}) + epigraph (${epigraph.words} words).\n`);

const ranked = [...chapters].sort((a, b) => b.density - a.density);
console.log("Rank  Chapter   Words   KW-hits  Density(/1k)  Title");
ranked.forEach((c, i) =>
  console.log(
    `${String(i + 1).padEnd(4)}  ${c.id.padEnd(8)}  ${String(c.words).padStart(6)}  ${String(c.hits).padStart(7)}  ${String(c.density).padStart(12)}  ${c.title}`
  ));

const top = ranked[0];
writeFileSync(join(ROOT, "data", "selected.json"), JSON.stringify(top, null, 2));
console.log(`\n>> Top chapter: ${top.id} "${top.title}" (density ${top.density}/1k). Wrote data/chapters.json + data/selected.json.`);
