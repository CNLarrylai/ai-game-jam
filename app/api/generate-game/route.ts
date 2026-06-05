import { promises as fs } from "fs";
import { spawn } from "child_process";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/generate-game
 * body: { novelText: string }
 * 小说 → claude -p 生成 GAME_DATA(直播间像素生存游戏数据) → 写一个可玩实例到
 * public/games/generated/<id>/ (index.html + custom-data.js,脚本绝对引用共享壳
 * /games/pixel-player/game/)。返回 { id, playUrl, summary }。
 * 仅本机 claude CLI 可用时跑(订阅,无需 key)。开发模式(next dev)下运行时写入即可访问。
 */

const SPEC = `你是「小说→像素生存游戏数据」适配引擎。下面给你一段末世/生存小说，把它改造成一个像素直播间生存游戏的数据配置（GAME_DATA）。游戏机制固定（逐日生存、四维数值、出门探索、观众弹幕生成内容），你只负责用小说的世界观/物资/地点/人物/语气**填充改写**数据。

【四维数值】sanity 精神 / health 健康 / hunger 饱腹 / thirst 口渴。
【美术约束】物品 icon 只能从这组 emoji 选（否则像素图渲染不出）：💧 🐟 🥫 🍗 🔫 🩹 💊 🔩 🔧 🔦 🔋 📻 🗝️ 🪢 🎒。

只输出一个 JSON 对象（GAME_DATA），不要解释、不要 markdown 围栏。字段与形状严格如下：
{
 "OPENING": "开局弹窗文案，≤120字，第一人称，交代这个末世此刻的处境",
 "INIT_STATS": { "sanity":60, "health":50, "hunger":30, "thirst":30 },
 "ITEMS": { "<键>": { "id":"<键>", "icon":"<允许的emoji>", "name":"中文名", "kind":"consume|weapon|material", "effect":{"<资源>":<整数>}, "effText":"如 饱腹 +10", "qty":<初始数量> } （5~7 件，含至少：一种水、一种食物、一种医疗、一种武器、一种材料） },
 "DESTINATIONS": [ { "id":"英文", "icon":"<地点emoji>", "name":"中文地点名", "danger":1-4, "reward":"中文收益", "ap":2-4, "confirm":"确定前往…？一句话" } （3~4 个，贴小说世界观） ],
 "COMPANIONS_POOL": [ { "id":"英文","name":"中文名","av":"<人物emoji>","role":"职业","status":"健康|轻伤","detail":"一句背景","hp":50-90,"mood":"情绪","skill":{"id":"英文","label":"技能名","icon":"🔧","effect":{"<资源>":<整数>},"line":"使用后的叙事","note":"恢复X·每天一次"},"ask":"「一句台词」" } （2 个） ],
 "MAP_NPC": { "name":"中文名","av":"<emoji>","line":"「一句开场」","options":[{"id":"trade","label":"交易","icon":"🔁","sub":"说明"},{"id":"recruit","label":"招募","icon":"🤝","sub":"说明"},{"id":"info","label":"询问情报","icon":"🗺️","sub":"说明"},{"id":"leave","label":"离开","icon":"🚶","sub":"说明"}] },
 "SCENE_COMMENTS": { "home":[{"user":"昵称","av":"emoji","text":"弹幕"}...4条], "organize":[...3条], "destination":[...3条], "explore":[...6条，要有'生成XX'这种观众脑洞，贴小说题材] }
}`;

function buildPrompt(novelText: string) {
  const clean = String(novelText).replace(/\r\n/g, "\n").trim().slice(0, 12000);
  return `${SPEC}\n\n---\n小说原文：\n"""\n${clean}\n"""`;
}

function parseGameData(raw: string) {
  let s = String(raw).trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a === -1 || b === -1 || b <= a) throw new Error("未找到 JSON");
  const o = JSON.parse(s.slice(a, b + 1));
  if (!o.ITEMS || !o.DESTINATIONS || !o.SCENE_COMMENTS) throw new Error("GAME_DATA 缺关键字段");
  if (!o.COMPANIONS) o.COMPANIONS = [];
  return o;
}

function agentGenerate(novelText: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const model = process.env.AGENT_MODEL || "claude-opus-4-7";
    const child = spawn("claude", ["-p", "--model", model, "--dangerously-skip-permissions"], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let out = "", err = "";
    const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("生成超时(180s)")); }, 180000);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => { clearTimeout(timer); reject(e); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(`agent 退出码 ${code}: ${err.slice(0, 160)}`));
      try { resolve(parseGameData(out)); } catch (e) { reject(new Error(`解析失败: ${(e as Error).message}`)); }
    });
    child.stdin.write(buildPrompt(novelText));
    child.stdin.end();
  });
}

const SHELL = "/games/pixel-player/game";
const JSX = ["data", "art-bridge", "chrome", "effects", "scenes-home", "scenes-out", "scenes-end", "api-bridge", "audience-bot", "app"];

function indexHtml(title: string) {
  const scripts = JSX.map((f) => `<script type="text/babel" src="${SHELL}/${f}.jsx"></script>`).join("\n");
  return `<!DOCTYPE html><html lang="zh-CN"><head>
<meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title} · 直播间生存</title>
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="${SHELL}/game.css" />
</head><body>
<div id="stage"><div id="frame"><div id="root"></div></div></div>
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" crossorigin="anonymous"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" crossorigin="anonymous"></script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" crossorigin="anonymous"></script>
<script src="custom-data.js"></script>
${scripts}
<script>
function fitStage(){var f=document.getElementById('frame');if(!f)return;var w=innerWidth,h=innerHeight;if(!w||!h)return;var s=Math.min(w/1920,h/1080);if(s>0)f.style.transform='scale('+s+')';}
addEventListener('resize',fitStage);addEventListener('load',fitStage);var st=document.getElementById('stage');if(window.ResizeObserver&&st)new ResizeObserver(fitStage).observe(st);requestAnimationFrame(fitStage);fitStage();
</script>
</body></html>`;
}

export async function POST(req: Request) {
  try {
    const { novelText } = (await req.json()) as { novelText?: string };
    if (!novelText || novelText.trim().length < 150) {
      return new Response("小说内容太短了，至少需要 150 字。", { status: 400 });
    }

    const data = await agentGenerate(novelText);

    const id = `pg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const dir = path.join(process.cwd(), "public", "games", "generated", id);
    await fs.mkdir(dir, { recursive: true });
    const title = (data.OPENING || "末世生存").slice(0, 10);
    await fs.writeFile(path.join(dir, "custom-data.js"),
      `/* 由小说经 claude -p 生成 · ${new Date().toISOString()} */\nwindow.GAME_DATA = ${JSON.stringify(data, null, 2)};\n`);
    await fs.writeFile(path.join(dir, "index.html"), indexHtml(title));

    return Response.json({
      id,
      playUrl: `/games/generated/${id}/index.html`,
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
