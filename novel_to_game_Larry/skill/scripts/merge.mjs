// merge.mjs — Step 7: stitch per-chapter node files into dist/map.json and validate.
// Run from anywhere: `node scripts/merge.mjs`.
//   reads  build/cards/<id>.json  (+ optional dist/prologue_cards.json for link-checking)
//   writes dist/map.json
// Validates: contract conformance, global id uniqueness, next-pointer integrity.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CARDS = join(ROOT, "build", "cards");

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
const ORDER = [
  ...ROMAN.slice(0, 9).map((r) => `V2-C${r}`),
  ...ROMAN.slice(0, 10).map((r) => `V3-C${r}`),
];

const RES = new Set(["food", "health", "morale"]);
const problems = [];
const map = [];
const perChapter = [];

for (const id of ORDER) {
  const path = join(CARDS, `${id}.json`);
  if (!existsSync(path)) { problems.push(`MISSING FILE: build/cards/${id}.json`); continue; }
  let nodes;
  try { nodes = JSON.parse(readFileSync(path, "utf8")); }
  catch (e) { problems.push(`${id}: JSON parse error — ${e.message}`); continue; }
  if (!Array.isArray(nodes)) { problems.push(`${id}: not an array`); continue; }
  perChapter.push({ id, count: nodes.length, titles: nodes.map((n) => n.title) });
  for (const n of nodes) map.push({ __chapter: id, ...n });
}

for (const n of map) {
  const where = `${n.__chapter}/${n.id}`;
  for (const f of ["id", "title", "desc", "generated", "icon", "choices"]) if (!(f in n)) problems.push(`${where}: node missing "${f}"`);
  if (n.generated !== true) problems.push(`${where}: generated !== true`);
  if (!Array.isArray(n.choices) || n.choices.length < 2 || n.choices.length > 3) problems.push(`${where}: choices count ${n.choices?.length}`);
  if (Array.isArray(n.choices) && !n.choices.some((c) => c.risk === true)) problems.push(`${where}: no risk:true choice`);
  for (const c of n.choices || []) {
    for (const f of ["id", "label", "hint", "costs", "risk", "outcome", "next", "effects"]) if (!(f in c)) problems.push(`${where}/${c.id}: choice missing "${f}"`);
    for (const k of ["emoji", "title", "body"]) if (!c.outcome || !(k in c.outcome)) problems.push(`${where}/${c.id}: outcome missing "${k}"`);
    for (const cost of c.costs || []) {
      if (!RES.has(cost.res)) problems.push(`${where}/${c.id}: bad res "${cost.res}"`);
      if (!Number.isInteger(cost.d)) problems.push(`${where}/${c.id}: non-int d`);
    }
  }
}

const seen = new Map();
for (const n of map) {
  if (seen.has(n.id)) problems.push(`DUPLICATE node id "${n.id}" (${seen.get(n.id)} & ${n.__chapter})`);
  else seen.set(n.id, n.__chapter);
}

// next-pointer integrity (count prologue ids as valid targets if present)
const ids = new Set(map.map((n) => n.id));
const proPath = join(ROOT, "dist", "prologue_cards.json");
if (existsSync(proPath)) for (const n of JSON.parse(readFileSync(proPath, "utf8"))) ids.add(n.id);
let dangling = 0;
for (const n of map) for (const c of n.choices || []) if (c.next && !ids.has(c.next)) { dangling++; problems.push(`DANGLING next: ${n.__chapter}/${n.id}/${c.id} -> "${c.next}"`); }

writeFileSync(join(ROOT, "dist", "map.json"), JSON.stringify(map.map(({ __chapter, ...n }) => n), null, 2));

console.log("Chapter breakdown:");
for (const c of perChapter) console.log(`  ${c.id.padEnd(8)} ${c.count} node(s)  — ${c.titles.join("  |  ")}`);
console.log(`\nChapters: ${perChapter.length}/${ORDER.length}   Total nodes: ${map.length}   Dangling next: ${dangling}`);
console.log(problems.length ? `\n❌ ${problems.length} problem(s):\n  ` + problems.join("\n  ") : "\n✅ Full map is contract-valid, ids unique, no dangling next. Wrote dist/map.json");
