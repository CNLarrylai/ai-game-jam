// build-gamedata.mjs — compile dist/* + build/rich/* into frontend/game/gamedata.js
// Run: node scripts/build-gamedata.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const rd = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

const prologue = rd("dist/prologue_cards.json");
const map = rd("dist/map.json");
const interactions = rd("dist/interactions.json");

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
const CHAPTERS = [...ROMAN.slice(0, 9).map((r) => `V2-C${r}`), ...ROMAN.slice(0, 10).map((r) => `V3-C${r}`)];

// node -> chapter, and first-node (anchor) per chapter, from the rich files
const nodeChapter = {};
const anchors = [];
for (const ch of CHAPTERS) {
  const doc = rd(`build/rich/${ch}.json`);
  (doc.nodes || []).forEach((n) => { nodeChapter[n.id] = ch; });
  if (doc.nodes && doc.nodes[0]) anchors.push(doc.nodes[0].id);
}
prologue.forEach((n) => { nodeChapter[n.id] = "PROLOGUE"; });

// node registry (prologue + all map nodes)
const nodes = {};
[...prologue, ...map].forEach((n) => { nodes[n.id] = n; });

// campaign = prologue (in order) + one anchor per chapter (in order)
const campaign = [...prologue.map((n) => n.id), ...anchors];

// opening (reused from the validated cold-open)
const worldLines = [
  { t: "瘟疫从东方蔓延而来,越过了海峡。", cls: "" },
  { t: "英格兰的城市,一座接一座沉默。", cls: "" },
  { t: "你带着最后的亲人,退守温莎的高墙之内。", cls: "accent2" },
  { t: "粮食、药,还有人心,正一天天见底。", cls: "accent" },
];
const crew = [
  { key: "idris", name: "伊德丽丝", tag: "你的妻子", line: ["她的眼里,只剩下", "孩子的安危。"],
    recipe: { id: "idris", lit: true, body: "mid", skin: "light", hair: "long", hairColor: "darkbrown", accessory: "none", facial: "none", emblem: "none", role: "none", suspense: false } },
  { key: "clara", name: "克拉拉", tag: "雷蒙德的遗女", line: ["她还不懂,为什么", "大人都不再说话。"],
    recipe: { id: "clara", lit: true, body: "small", skin: "light", hair: "long", hairColor: "brown", accessory: "none", facial: "none", emblem: "none", role: "none", suspense: false } },
  { key: "adrian", name: "阿德里安", tag: "病弱的挚友", line: ["他咳嗽的样子,", "你不敢多看。"], suspense: true,
    recipe: { id: "adrian", lit: true, body: "tall", skin: "porcelain", hair: "short", hairColor: "darkbrown", accessory: "none", facial: "none", emblem: "none", role: "none", suspense: true } },
];

// 人物图鉴:身份 + 背景 + 关系网(供正文人名点击查看)。bust 用 CSS 木刻剪影配方。
const codex = {
  "莱昂内尔": { tag: "你 · 牧羊人出身的叙事者", bg: "本作主角。出身贫寒的牧羊少年,因友谊与婚姻跻身温莎核心。你将一路见证所有人的离去。", rel: [["伊德丽丝", "妻子"], ["佩迪塔", "姐姐"], ["阿德里安", "挚友"]], bust: { rim: "oklch(0.6 0.05 250 / 0.4)", silTop: "oklch(0.26 0.02 245)" } },
  "伊德丽丝": { tag: "你的妻子 · 退位国王之女", bg: "阿德里安的妹妹。曾在雪夜逃婚、反抗母亲的强嫁,与你结为夫妻。如今一心护着孩子。", rel: [["莱昂内尔", "丈夫"], ["阿德里安", "兄长"], ["温莎伯爵夫人", "母亲"]], bust: { rim: "oklch(0.66 0.07 70 / 0.45)", silTop: "oklch(0.3 0.025 70)", detail: "pony" } },
  "阿德里安": { tag: "温莎伯爵 · 病弱的理想主义者", bg: "退位国王之子。体弱多病却心怀天下,瘟疫中挺身组织救助。你最深的挚友。", rel: [["伊德丽丝", "妹妹"], ["莱昂内尔", "挚友"], ["温莎伯爵夫人", "母亲"]], bust: { rim: "oklch(0.6 0.06 200 / 0.4)", silTop: "oklch(0.22 0.02 240)", detail: "hood", suspense: true } },
  "雷蒙德": { tag: "护国公 · 希腊战争英雄", bg: "魅力非凡、野心勃勃的领袖,曾在王冠与爱情间反复。佩迪塔的丈夫、克拉拉的父亲;最终独自冲入疫城,殉身于一声爆炸。", rel: [["佩迪塔", "妻子"], ["克拉拉", "女儿"], ["伊娃德妮", "旧日情人"]], bust: { rim: "oklch(0.62 0.08 40 / 0.45)", silTop: "oklch(0.28 0.03 50)" } },
  "佩迪塔": { tag: "莱昂内尔之姐 · 雷蒙德之妻", bg: "骄傲而隐忍的女子。深爱雷蒙德,却因他的背叛以假面婚姻自苦,最终殉夫。", rel: [["莱昂内尔", "弟弟"], ["雷蒙德", "丈夫"], ["克拉拉", "女儿"]], bust: { rim: "oklch(0.62 0.06 20 / 0.4)", silTop: "oklch(0.27 0.02 30)", detail: "pony" } },
  "克拉拉": { tag: "雷蒙德与佩迪塔之女", bg: "早熟沉静的孩子,被瘟疫夺走了童年,被你们一路带着流亡。", rel: [["雷蒙德", "父亲"], ["佩迪塔", "母亲"]], bust: { rim: "oklch(0.6 0.06 30 / 0.5)", silTop: "oklch(0.27 0.02 55)", detail: "cross" } },
  "温莎伯爵夫人": { tag: "退位的王后 · 冷酷恋权", bg: "奥地利公主、末代王后。一心复辟王权,曾下药逼伊德丽丝改嫁。旧秩序最后的执念。", rel: [["阿德里安", "儿子"], ["伊德丽丝", "女儿"]], bust: { rim: "oklch(0.5 0.02 250 / 0.4)", silTop: "oklch(0.24 0.015 250)", detail: "pony" } },
  "伊娃德妮": { tag: "没落的希腊贵族", bg: "因战争破产、流落英国的骄傲女子。暗恋雷蒙德,宁可饿死也拒绝施舍,最终在战场上以临终诅咒重现。", rel: [["雷蒙德", "所爱之人"]], bust: { rim: "oklch(0.58 0.07 60 / 0.4)", silTop: "oklch(0.26 0.03 60)", detail: "pony" } },
  "露西": { tag: "被困的难民之女", bg: "第三卷中向你求救的女子,与瘫痪的老母被弃在路上——一次'救与不救'的考验。", rel: [], bust: { rim: "oklch(0.6 0.05 90 / 0.4)", silTop: "oklch(0.26 0.02 90)", detail: "pony" } },
};
const aliases = { "维尼": "莱昂内尔", "莱昂内尔·维尼": "莱昂内尔", "莱昂纳尔": "莱昂内尔" };

const GAME = {
  meta: { title: "最后的人", subtitle: "末日生存 · 互动叙事", source: "Mary Shelley, The Last Man (1826)" },
  start_res: { food: 8, health: 9, morale: 8 },
  res_def: [
    { id: "food", ic: "🥫", label: "Food", cn: "食物" },
    { id: "health", ic: "💊", label: "Health", cn: "健康" },
    { id: "morale", ic: "🔥", label: "Morale", cn: "士气" },
  ],
  worldLines, crew, campaign, nodes, interactions, nodeChapter, codex, aliases,
};

mkdirSync(join(ROOT, "frontend", "game"), { recursive: true });
const js =
  "/* AUTO-GENERATED by scripts/build-gamedata.mjs — do not edit by hand */\n" +
  "(function(){\n  var GAME = " + JSON.stringify(GAME) + ";\n" +
  "  if (typeof module !== 'undefined' && module.exports) module.exports = GAME;\n" +
  "  if (typeof window !== 'undefined') window.GAME = GAME;\n})();\n";
writeFileSync(join(ROOT, "frontend", "game", "gamedata.js"), js);

console.log(`gamedata.js written.`);
console.log(`  nodes: ${Object.keys(nodes).length} | campaign: ${campaign.length} | interactions: ${interactions.length}`);
console.log(`  campaign order:`);
campaign.forEach((id, i) => console.log(`   ${String(i + 1).padStart(2)}. [${(nodeChapter[id] || "?").padEnd(8)}] ${nodes[id] ? nodes[id].title : "MISSING " + id}`));
