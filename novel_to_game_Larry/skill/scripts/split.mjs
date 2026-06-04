// split.mjs — Step 1+2: strip Gutenberg, split by chapter, keyword-density filter.
// Run from anywhere: `node scripts/split.mjs`. Paths resolve relative to project root.
//   reads  data/pg18247.txt
//   writes data/chapters.json (all chapters + density), data/selected.json (top pick)

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "data", "pg18247.txt");

// End-of-world keyword set (swap per genre when reusing on another novel).
const KEYWORDS = [
  "plague", "pestilence", "death", "dead", "die", "dying", "died",
  "famine", "flee", "fled", "flight", "danger", "sick", "disease",
  "infect", "contagion", "escape", "corpse", "grave", "perish",
  "despair", "fear", "dread", "doom",
];
const KW_RE = new RegExp(`\\b(${KEYWORDS.join("|")})\\w*`, "gi");
const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12 };

function stripGutenberg(raw) {
  const start = raw.indexOf("*** START OF THE PROJECT GUTENBERG");
  const end = raw.indexOf("*** END OF THE PROJECT GUTENBERG");
  let body = raw.slice(start, end);
  body = body.slice(body.indexOf("\n") + 1);
  return body;
}

function splitChapters(body) {
  const re = /^CHAPTER\s+([IVXLC]+)\.\s*$/gm;
  const marks = [];
  let m;
  while ((m = re.exec(body)) !== null) marks.push({ numeral: m[1], idx: m.index, after: re.lastIndex });

  const chapters = [];
  let volume = 1, prevNum = 0;
  for (let i = 0; i < marks.length; i++) {
    const num = ROMAN[marks[i].numeral] ?? 0;
    if (num === 1 && prevNum !== 0) volume += 1;
    prevNum = num;
    const text = body.slice(marks[i].after, i + 1 < marks.length ? marks[i + 1].idx : body.length).trim();
    chapters.push({ id: `V${volume}-C${marks[i].numeral}`, volume, numeral: marks[i].numeral, chapterNum: num, text });
  }
  return chapters;
}

function score(text) {
  const words = (text.match(/\b\w+\b/g) || []).length;
  const hits = (text.match(KW_RE) || []).length;
  return { words, hits, density: words ? +((hits / words) * 1000).toFixed(2) : 0 };
}

const raw = readFileSync(SRC, "utf8");
const chapters = splitChapters(stripGutenberg(raw)).map((c) => ({ ...c, ...score(c.text) }));
writeFileSync(join(ROOT, "data", "chapters.json"), JSON.stringify(chapters, null, 2));

const ranked = [...chapters].sort((a, b) => b.density - a.density);
console.log(`\nParsed ${chapters.length} chapters across ${Math.max(...chapters.map((c) => c.volume))} volumes.\n`);
console.log("Rank  Chapter   Words   KW-hits  Density(/1k)");
ranked.forEach((c, i) =>
  console.log(`${String(i + 1).padEnd(4)}  ${c.id.padEnd(8)}  ${String(c.words).padStart(6)}  ${String(c.hits).padStart(7)}  ${String(c.density).padStart(12)}`));

const top = ranked[0];
writeFileSync(join(ROOT, "data", "selected.json"), JSON.stringify(top, null, 2));
console.log(`\n>> Top chapter: ${top.id} (density ${top.density}/1k). Wrote data/chapters.json + data/selected.json.`);
