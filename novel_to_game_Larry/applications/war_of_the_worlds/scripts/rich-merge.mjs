// rich-merge.mjs — validate build/rich/* and emit dist/map.json + dist/interactions.json
// Run: node scripts/rich-merge.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RICH = join(ROOT, "build", "rich");
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
const ORDER = [...ROMAN.slice(0, 9).map((r) => `V2-C${r}`), ...ROMAN.slice(0, 10).map((r) => `V3-C${r}`)];
const RES = new Set(["food", "health", "morale"]);
const ITYPES = new Set(["poll", "predict", "react", "micro_choice", "lore"]);

const problems = [];
const allNodes = [];
const allInteractions = [];
const perChapter = [];

for (const id of ORDER) {
  const path = join(RICH, `${id}.json`);
  if (!existsSync(path)) { problems.push(`MISSING build/rich/${id}.json`); continue; }
  let doc;
  try { doc = JSON.parse(readFileSync(path, "utf8")); }
  catch (e) { problems.push(`${id}: JSON parse error — ${e.message}`); continue; }
  const nodes = doc.nodes || [];
  const inter = doc.interactions || [];
  const nodeIds = new Set(nodes.map((n) => n.id));
  const typeCount = {};
  inter.forEach((it) => { typeCount[it.type] = (typeCount[it.type] || 0) + 1; });
  perChapter.push({ id, nodes: nodes.length, inter: inter.length, types: typeCount });

  // node contract
  for (const n of nodes) {
    const w = `${id}/${n.id}`;
    for (const f of ["id", "title", "desc", "generated", "icon", "choices"]) if (!(f in n)) problems.push(`${w}: node missing ${f}`);
    if (n.generated !== true) problems.push(`${w}: generated!=true`);
    if (!Array.isArray(n.choices) || n.choices.length < 2 || n.choices.length > 3) problems.push(`${w}: choices ${n.choices?.length}`);
    if (Array.isArray(n.choices) && !n.choices.some((c) => c.risk === true)) problems.push(`${w}: no risk choice`);
    for (const c of n.choices || []) {
      for (const f of ["id", "label", "hint", "costs", "risk", "outcome", "next", "effects"]) if (!(f in c)) problems.push(`${w}/${c.id}: missing ${f}`);
      for (const k of ["emoji", "title", "body"]) if (!c.outcome || !(k in c.outcome)) problems.push(`${w}/${c.id}: outcome.${k}`);
      for (const cost of c.costs || []) { if (!RES.has(cost.res)) problems.push(`${w}/${c.id}: res ${cost.res}`); if (!Number.isInteger(cost.d)) problems.push(`${w}/${c.id}: d`); }
    }
    allNodes.push({ __ch: id, ...n });
  }

  // interaction schema
  let hasPredictToRisk = false;
  for (const it of inter) {
    const w = `${id}/${it.id || "?"}`;
    if (!ITYPES.has(it.type)) problems.push(`${w}: bad type ${it.type}`);
    if (!it.id || !it.prompt) problems.push(`${w}: missing id/prompt`);
    if (it.type === "poll" && (!Array.isArray(it.options) || it.options.length < 2)) problems.push(`${w}: poll options`);
    if (it.type === "predict") {
      if (!Array.isArray(it.options) || it.options.length < 2) problems.push(`${w}: predict options`);
      if (!it.setup_node) problems.push(`${w}: predict missing setup_node`);
      else if (!nodeIds.has(it.setup_node)) problems.push(`${w}: predict setup_node "${it.setup_node}" not in chapter`);
      else { const tgt = nodes.find((n) => n.id === it.setup_node); if (tgt && tgt.choices.some((c) => c.risk === true)) hasPredictToRisk = true; }
    }
    if (it.type === "react" && !it.mood) problems.push(`${w}: react missing mood`);
    if (it.type === "micro_choice") {
      if (!Array.isArray(it.options) || it.options.length < 2) problems.push(`${w}: micro options`);
      for (const o of it.options || []) {
        if (!o.label) problems.push(`${w}: micro option label`);
        if (o.effect) { if (!RES.has(o.effect.res)) problems.push(`${w}: micro res ${o.effect.res}`); if (![-1, 0, 1].includes(o.effect.d)) problems.push(`${w}: micro d=${o.effect.d} (need ±1)`); }
      }
    }
    if (it.type === "lore" && !it.quote) problems.push(`${w}: lore missing quote`);
    allInteractions.push({ chapter: id, ...it });
  }
  const typeKinds = Object.keys(typeCount).length;
  if (inter.length < 6) problems.push(`${id}: only ${inter.length} interactions (<6)`);
  if (typeKinds < 3) problems.push(`${id}: only ${typeKinds} interaction types (<3)`);
  if (!hasPredictToRisk) problems.push(`${id}: no predict linked to a risk node`);
}

// global node id uniqueness
const seen = new Map();
for (const n of allNodes) { if (seen.has(n.id)) problems.push(`DUP node id "${n.id}" (${seen.get(n.id)} & ${n.__ch})`); else seen.set(n.id, n.__ch); }

// next integrity (against expanded set + prologue)
const ids = new Set(allNodes.map((n) => n.id));
const proPath = join(ROOT, "dist", "prologue_cards.json");
if (existsSync(proPath)) for (const n of JSON.parse(readFileSync(proPath, "utf8"))) ids.add(n.id);
let dangling = 0;
for (const n of allNodes) for (const c of n.choices || []) if (c.next && !ids.has(c.next)) { dangling++; problems.push(`DANGLING next ${n.__ch}/${n.id}/${c.id} -> ${c.next}`); }

// emit
writeFileSync(join(ROOT, "dist", "map.json"), JSON.stringify(allNodes.map(({ __ch, ...n }) => n), null, 2));
writeFileSync(join(ROOT, "dist", "interactions.json"), JSON.stringify(allInteractions, null, 2));

// report
console.log("Chapter        Nodes  Inter  Types");
for (const c of perChapter) console.log(`  ${c.id.padEnd(10)} ${String(c.nodes).padStart(4)}   ${String(c.inter).padStart(4)}   ${Object.entries(c.types).map(([k, v]) => k + ":" + v).join(" ")}`);
const totN = allNodes.length, totI = allInteractions.length;
const byType = {}; allInteractions.forEach((i) => byType[i.type] = (byType[i.type] || 0) + 1);
console.log(`\nChapters ${perChapter.length}/19   Nodes ${totN}   Interactions ${totI}  (${Object.entries(byType).map(([k, v]) => k + ":" + v).join(", ")})   Dangling next ${dangling}`);
console.log(problems.length ? `\n❌ ${problems.length} problem(s):\n  ` + problems.slice(0, 60).join("\n  ") + (problems.length > 60 ? `\n  …(+${problems.length - 60} more)` : "") : "\n✅ Rich layer valid. Wrote dist/map.json (expanded) + dist/interactions.json");
