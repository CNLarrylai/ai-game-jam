import { spawn } from "child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/generate-game
 * body: { novelText: string, shell?: "pixel" | "woodcut" }
 * 小说 → 生成 GAME_DATA(直播间生存游戏数据)。不写文件:直接返回 gameData,
 * 由前端存 localStorage,游戏壳按 ?id 读取(serverless 友好)。
 * 引擎:有 ANTHROPIC_API_KEY → Anthropic API(线上/Vercel);否则本机 claude -p 订阅。
 */

const SPEC = `你是「小说→直播间生存游戏数据」适配引擎。读下面的末世/生存小说，把它改造成一个直播间生存游戏的数据配置（GAME_DATA）。游戏机制固定（逐日生存、四维数值、出门探索、观众弹幕生成内容），你用小说的世界观/物资/地点/人物/语气**填充改写**数据。

【风格——重要】严肃、文学、克制，像玛丽·雪莱《最后的人》那种末日文学：弹幕与事件要贴情境（恐惧、求生、人性挣扎、对逝去文明的追忆），有代入感。**绝不要网络梗、名人玩笑（马斯克/甄嬛之类）、无厘头、刷屏梗**。宁可肃穆，不要油滑。

【四维数值（键名必须严格用这四个）】hp 健康 / hunger 饱腹 / sanity 精神 / supply 水分。effect/skill.effect 的键只能是 hp/hunger/sanity/supply（用错键无效果）。正向=补充：食物→hunger+，水→supply+，医疗→hp+，安神→sanity+；代价用负数。
【美术约束】物品 icon 只能从这组 emoji 选：💧 🐟 🥫 🍗 🔫 🩹 💊 🔩 🔧 🔦 🔋 📻 🗝️ 🪢 🎒。

【严格 JSON】只输出一个合法 JSON 对象，不要解释、不要 markdown 围栏。字符串内若要引号一律用中文「」（不要英文双引号），不要尾随逗号、不要注释、字符串不换行。字段与形状：
{
 "OPENING": "开局弹窗文案 ≤120字，第一人称，肃穆地交代此刻处境",
 "INIT_STATS": { "hp":50, "hunger":70, "sanity":60, "supply":70 },
 "ITEMS": { "<键>": { "id":"<键>", "icon":"<允许的emoji>", "name":"中文名", "kind":"consume|weapon|material", "effect":{"<资源>":<整数>}, "effText":"如 饱腹 +10", "qty":<初始数量> } （5~7 件，含水/食物/医疗/武器/材料各≥1） },
 "DESTINATIONS": [ { "id":"英文", "icon":"<地点emoji>", "name":"中文地点名", "danger":1-4, "reward":"中文收益", "ap":2-4, "confirm":"确定前往…？一句话" } （3~4 个，贴小说世界观） ],
 "COMPANIONS_POOL": [ { "id":"英文","name":"中文名","av":"<人物emoji>","role":"职业","status":"健康|轻伤","detail":"一句背景","hp":50-90,"mood":"情绪","skill":{"id":"英文","label":"技能名","icon":"🔧","effect":{"<资源>":<整数>},"line":"使用后的叙事","note":"恢复X·每天一次"},"ask":"「一句台词」" } （2 个） ],
 "MAP_NPC": { "name":"中文名","av":"<emoji>","line":"「一句开场」","options":[{"id":"trade","label":"交易","icon":"🔁","sub":"说明"},{"id":"recruit","label":"招募","icon":"🤝","sub":"说明"},{"id":"info","label":"询问情报","icon":"🗺️","sub":"说明"},{"id":"leave","label":"离开","icon":"🚶","sub":"说明"}] },
 "SCENE_COMMENTS": { "home":[{"user":"昵称","av":"emoji","text":"弹幕"}...4条], "organize":[...3条], "destination":[...3条], "explore":[...6条，含「生成XX」这种观众创意弹幕，但要贴小说题材、克制不刷梗] }
}`;

function buildPrompt(novelText: string) {
  const clean = String(novelText).replace(/\r\n/g, "\n").trim().slice(0, 12000);
  return `${SPEC}\n\n---\n小说原文：\n"""\n${clean}\n"""`;
}

function parseGameData(raw: string) {
  const s = String(raw).trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a === -1 || b === -1 || b <= a) throw new Error("未找到 JSON");
  const body = s.slice(a, b + 1);
  const repaired = body
    .replace(/^\s*\/\/.*$/gm, "")        // 行注释
    .replace(/,(\s*[}\]])/g, "$1")        // 尾随逗号
    .replace(/\}(\s*)\{/g, "},$1{")       // 数组中对象间漏逗号 }{ → },{
    .replace(/\](\s*)\[/g, "],$1[")       // ][ → ],[
    .replace(/"(\s*\n\s*)"/g, '",$1"');   // 相邻字符串元素漏逗号
  let o: any;
  try { o = JSON.parse(body); } catch { o = JSON.parse(repaired); }
  if (!o.ITEMS || !o.DESTINATIONS || !o.SCENE_COMMENTS) throw new Error("GAME_DATA 缺关键字段");
  if (!o.COMPANIONS) o.COMPANIONS = [];
  return o;
}

// 引擎 A：Anthropic API（线上，需 key）。输入精简 + 单次超时,保证落在 Vercel 60s 内
async function apiRaw(novelText: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY!;
  // Haiku 快(~10s级),稳进 Vercel 60s 函数上限;结构化提取质量足够
  const model = process.env.GENERATE_MODEL || "claude-haiku-4-5-20251001";
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 45000);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 3200, system: SPEC, messages: [{ role: "user", content: `小说原文（节选，据此提炼世界观/物资/地点/人物即可）：\n"""\n${String(novelText).slice(0, 5000)}\n"""` }] }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 160)}`);
    const data = await res.json();
    return (data?.content?.map((c: any) => c.text || "").join("")) || "";
  } finally {
    clearTimeout(t);
  }
}

// 引擎 B：本机 claude -p 订阅（无 key 时）
function agentRaw(novelText: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const model = process.env.AGENT_MODEL || "claude-opus-4-7";
    const child = spawn("claude", ["-p", "--model", model, "--dangerously-skip-permissions"], { stdio: ["pipe", "pipe", "pipe"] });
    let out = "", err = "";
    const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("生成超时")); }, 170000);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => { clearTimeout(timer); reject(e); });
    child.on("close", (code) => { clearTimeout(timer); code === 0 ? resolve(out) : reject(new Error(`agent 退出码 ${code}: ${err.slice(0, 160)}`)); });
    child.stdin.write(buildPrompt(novelText));
    child.stdin.end();
  });
}

async function generate(novelText: string, attempts = 2): Promise<any> {
  const useApi = !!process.env.ANTHROPIC_API_KEY;
  let last = "";
  for (let i = 0; i < attempts; i++) {
    try {
      const raw = useApi ? await apiRaw(novelText) : await agentRaw(novelText);
      return parseGameData(raw);
    } catch (e) {
      last = (e as Error).message;
      if (/超时|启动|退出码|API \d/.test(last) && i === attempts - 1) throw e;
    }
  }
  throw new Error(`生成 ${attempts} 次仍未得到合法数据（${last}）`);
}

export async function POST(req: Request) {
  try {
    const { novelText, shell: shellRaw } = (await req.json()) as { novelText?: string; shell?: string };
    const shell = shellRaw === "woodcut" ? "woodcut" : "pixel";
    if (!novelText || novelText.trim().length < 150) {
      return new Response("小说内容太短了，至少需要 150 字。", { status: 400 });
    }

    const data = await generate(novelText);
    const id = `pg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    return Response.json({
      id,
      playUrl: `/games/${shell}-player/index.html?id=${id}`,
      gameData: data, // 前端存 localStorage('wl_game_'+id)
      summary: {
        opening: data.OPENING || "",
        items: Object.values(data.ITEMS || {}).map((i: any) => `${i.icon}${i.name}`),
        destinations: (data.DESTINATIONS || []).map((d: any) => `${d.icon}${d.name}`),
        companions: (data.COMPANIONS_POOL || []).map((c: any) => `${c.av}${c.name}`),
      },
    });
  } catch (err) {
    return new Response(`生成失败：${(err as Error).message}`, { status: 500 });
  }
}
