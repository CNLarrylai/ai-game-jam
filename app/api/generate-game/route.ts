import { spawn } from "child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/generate-game  body: { novelText: string }
 * 小说 → 叙事抉择游戏 GAME（《最后的人》同款玩法：逐幕剧情 + 道德/生存抉择卡）。
 * 不写文件:返回 game(window.GAME 结构),前端存 localStorage,last-man 壳按 ?id 读取。
 * 引擎:有 ANTHROPIC_API_KEY → Anthropic API;否则本机 claude -p。
 */

const SPEC = `你是「小说→叙事抉择游戏」适配引擎。把一段末世/生存小说改造成一个木刻风叙事抉择游戏（玩法类似《最后的人》）：玩家逐幕经历小说的关键剧情，每一幕面对一个艰难的道德/生存抉择，选择消耗资源、并揭晓后果。这样小说的剧情、人物、两难才真正"长进游戏里"。

【风格】严肃、文学、忠于原著，像末日文学。绝不要网络梗/名人玩笑/无厘头。
【只输出一个合法 JSON 对象】不要解释、不要 markdown 围栏。字符串内引号一律用中文「」（不要英文双引号），不要尾随逗号、不要注释、字符串不换行。

结构（GAME）：
{
 "meta": { "title": "小说改编名≤12字", "subtitle": "一句副标题", "source": "原著名" },
 "res_def": [ {"id":"food","ic":"🥫","label":"Food","cn":"中文名"}, {"id":"health","ic":"💊","label":"Health","cn":"中文名"}, {"id":"morale","ic":"🔥","label":"Morale","cn":"中文名"} ]  （⚠️ id 必须严格是 food/health/morale 三个不可改——引擎结局判定依赖它们；只把 cn 改成贴小说的中文名，如 食物/口粮、健康/体力、士气/人心/意志）,
 "start_res": { "food":8, "health":9, "morale":8 },
 "worldLines": [ {"t":"开场白描≤20字","cls":""} ]  （恰 4 句；最后两句 cls 可用 "accent2"、"accent"）,
 "crew": [ {"key":"英文","name":"中文名","tag":"身份≤8字","line":["≤10字","≤10字"],"rim":"#b33831","silTop":"#3a4466"} ]  （2 个，取自小说人物）,
 "campaign": [ "卡id1","卡id2","卡id3","卡id4","卡id5" ]  （5 个卡 id）,
 "nodes": {
   "<卡id>": { "id":"<卡id>", "title":"幕标题≤8字", "desc":"场景≤40字，点出抉择处境", "icon":"emoji", "generated":true,
     "choices": [ {"id":"英文","label":"选择≤16字","hint":"暗示≤14字","costs":[{"res":"food/health/morale","d":整数}],"risk":true或false,"outcome":{"emoji":"emoji","title":"≤8字","body":"后果≤40字"},"next":"","effects":["≤14字"]} ]
   }  （每卡恰 2 个选择，无明显最优；每卡至少 1 个 "risk":true；next 一律 ""）
 },
 "codex": { "<人物中文名>": {"tag":"身份≤8字","body":"背景≤20字"} }  （2 个关键人物）
}

要点：① 5 卡 = 小说开端到结局 5 个关键剧情节点，真实场景 + 真两难。② costs 的 res 只能 food/health/morale。③ next 全 ""。④ 资源经济能死人也能通关。⑤ **严格遵守上面的字数上限，整体务必精炼**（输出过长会被截断）。`;

function parseGame(raw: string) {
  const s = String(raw).trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a === -1 || b === -1 || b <= a) throw new Error("未找到 JSON");
  const body = s.slice(a, b + 1);
  const repaired = body.replace(/^\s*\/\/.*$/gm, "").replace(/,(\s*[}\]])/g, "$1")
    .replace(/\}(\s*)\{/g, "},$1{").replace(/\](\s*)\[/g, "],$1[");
  let o: any;
  try { o = JSON.parse(body); } catch { o = JSON.parse(repaired); }
  if (!o.nodes || !o.campaign || !o.res_def) throw new Error("GAME 缺关键字段(nodes/campaign/res_def)");
  // 结构兜底(engine/UI 需要,LLM 不必产)
  o.interactions = [];
  o.nodeChapter = o.nodeChapter || {};
  o.generated = o.generated || { _about: "novel→game", items: [], npcs: [], events: [] };
  o.aliases = o.aliases || {};
  o.codex = o.codex || {};
  o.meta = o.meta || { title: "末世", subtitle: "", source: "" };
  (o.crew || []).forEach((c: any) => { if (!c.rim) c.rim = "#b33831"; if (!c.silTop) c.silTop = "#3a4466"; });
  // 只保留 campaign 里存在的节点;过滤无效 campaign id
  o.campaign = (o.campaign || []).filter((id: string) => o.nodes[id]);
  if (!o.campaign.length) o.campaign = Object.keys(o.nodes);
  return o;
}

async function apiRaw(novelText: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY!;
  const model = process.env.GENERATE_MODEL || "claude-haiku-4-5-20251001";
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 44000);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 3200, system: SPEC, messages: [{ role: "user", content: `小说原文（节选，据此提炼世界观/剧情/人物/抉择）：\n"""\n${String(novelText).slice(0, 4500)}\n"""` }] }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 160)}`);
    const data = await res.json();
    return (data?.content?.map((c: any) => c.text || "").join("")) || "";
  } finally { clearTimeout(t); }
}

function agentRaw(novelText: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const model = process.env.AGENT_MODEL || "claude-opus-4-7";
    const child = spawn("claude", ["-p", "--model", model, "--dangerously-skip-permissions"], { stdio: ["pipe", "pipe", "pipe"] });
    let out = "", err = "";
    const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("生成超时")); }, 170000);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => { clearTimeout(timer); reject(e); });
    child.on("close", (code) => { clearTimeout(timer); code === 0 ? resolve(out) : reject(new Error(`agent ${code}: ${err.slice(0, 160)}`)); });
    child.stdin.write(`${SPEC}\n\n---\n小说原文：\n"""\n${String(novelText).slice(0, 8000)}\n"""`);
    child.stdin.end();
  });
}

async function generate(novelText: string, attempts = 2): Promise<any> {
  const useApi = !!process.env.ANTHROPIC_API_KEY;
  let last = "";
  for (let i = 0; i < attempts; i++) {
    try { return parseGame(useApi ? await apiRaw(novelText) : await agentRaw(novelText)); }
    catch (e) { last = (e as Error).message; if (/超时|API \d|agent \d/.test(last) && i === attempts - 1) throw e; }
  }
  throw new Error(`生成 ${attempts} 次仍未得到合法数据（${last}）`);
}

export async function POST(req: Request) {
  try {
    const { novelText } = (await req.json()) as { novelText?: string };
    if (!novelText || novelText.trim().length < 150) {
      return new Response("小说内容太短了，至少需要 150 字。", { status: 400 });
    }
    const game = await generate(novelText);
    const id = `pg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    return Response.json({
      id,
      playUrl: `/games/last-man/index.html?id=${id}`,
      gameData: game, // 前端存 localStorage('wl_game_'+id)，last-man 壳读为 window.GAME
      summary: {
        title: game.meta?.title || "",
        opening: (game.worldLines || []).map((w: any) => w.t).join(" "),
        scenes: (game.campaign || []).map((cid: string) => game.nodes[cid]?.title).filter(Boolean),
        crew: (game.crew || []).map((c: any) => c.name),
      },
    });
  } catch (err) {
    return new Response(`生成失败：${(err as Error).message}`, { status: 500 });
  }
}
