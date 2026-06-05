#!/usr/bin/env node
/**
 * 🛠️ 小说→游戏 后台 worker
 * ============================================
 * 监听 jobs/pending/*.json，把小说转成游戏文件 scenarios/generated/<id>.json
 * （会被剧本索引自动收录）。生成引擎按顺序尝试：
 *   1) agent ：claude -p + novel-to-game 方法论（订阅买单，产出更丰富）
 *   2) api   ：Anthropic API 兜底（key 直调，便宜模型，紧凑剧本）
 * 文件即接口：网页只管往 jobs/pending 写任务、轮询 jobs/done 取结果。
 */
import { promises as fs } from "fs";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = {
  pending: path.join(ROOT, "jobs", "pending"),
  processing: path.join(ROOT, "jobs", "processing"),
  done: path.join(ROOT, "jobs", "done"),
  out: path.join(ROOT, "scenarios", "generated"),
  log: path.join(ROOT, "worker", "worker.log"),
};

const POLL_MS = 2000;
const AGENT_MODEL = process.env.AGENT_MODEL || "claude-opus-4-7";
const API_MODEL = process.env.WORKER_API_MODEL || "claude-sonnet-4-6"; // 兜底用便宜模型
const AGENT_TIMEOUT_MS = 180000;

// ---------- 生成规格（两个引擎共用的指令与解析） ----------
const SPEC = `你是一个「叙事 → 游戏」适配引擎。读下面的小说原文（可能是节选），把它改造成一个可玩的互动叙事游戏的剧本配置。

步骤（在心里想，最终只输出 JSON）：
1. 识别小说类型 genre（如 科幻生存/哥特悬疑/武侠修仙/宫斗权谋/都市言情/奇幻冒险/恐怖惊悚/市井江湖）。
2. 匹配最贴切的游戏机制 mechanic（资源管理+抉择 / 线索推理 / 关系社交策略 / 恋爱养成分支 / 探索roguelike / 经营+人情世故）。
3. 提炼世界圣经核心：世界观、核心冲突与利害、关键人物、主角此刻处境，只保留为机制服务的信息。
4. 写一个给「游戏主持人(GM)」用的 systemPrompt，必须含：GM 规则（第二人称「你」沉浸描写；每次 2-4 段，结尾把抉择交还玩家；真实因果、不替玩家决定、不跳出角色、全程中文）+ 世界观 + 该机制的玩法循环。
5. 写一段开场白 opening，结尾落在一个具体抉择上。

只输出一个 JSON 对象，不要任何解释文字、不要 markdown 围栏。字段：title(≤12字)、tagline(≤20字)、emoji(单个)、genre、mechanic、opening(≤200字)、systemPrompt(≤400字)。除 emoji 外全用中文。`;

function sampleNovel(text, cap = 12000) {
  const clean = String(text).replace(/\r\n/g, "\n").trim();
  if (clean.length <= cap) return clean;
  const head = clean.slice(0, Math.floor(cap * 0.5));
  const mid = clean.slice(
    Math.floor(clean.length / 2 - cap * 0.12),
    Math.floor(clean.length / 2 + cap * 0.12),
  );
  const tail = clean.slice(-Math.floor(cap * 0.26));
  return `${head}\n\n……（中段）……\n\n${mid}\n\n……（结尾）……\n\n${tail}`;
}

function parseGame(raw) {
  let s = String(raw).trim();
  s = s.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a === -1 || b === -1 || b <= a) throw new Error("未找到 JSON");
  const o = JSON.parse(s.slice(a, b + 1));
  for (const k of ["title", "opening", "systemPrompt"]) {
    if (!o[k] || typeof o[k] !== "string") throw new Error(`缺字段 ${k}`);
  }
  return {
    title: o.title.trim(),
    tagline: (o.tagline || "").trim(),
    emoji: (o.emoji || "📖").trim() || "📖",
    genre: (o.genre || "未知类型").trim(),
    mechanic: (o.mechanic || "互动叙事").trim(),
    opening: o.opening.trim(),
    systemPrompt: o.systemPrompt.trim(),
  };
}

function buildPrompt(task) {
  const titleLine = task.title?.trim() ? `小说标题：${task.title.trim()}\n\n` : "";
  return `${SPEC}\n\n---\n${titleLine}小说原文：\n"""\n${sampleNovel(task.novelText)}\n"""`;
}

// ---------- 引擎 1：agent（claude -p） ----------
function agentEngine(task) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "claude",
      ["-p", "--model", AGENT_MODEL, "--dangerously-skip-permissions"],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`agent 超时 ${AGENT_TIMEOUT_MS}ms`));
    }, AGENT_TIMEOUT_MS);

    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(`agent 退出码 ${code}: ${err.slice(0, 200)}`));
      try {
        resolve(parseGame(out));
      } catch (e) {
        reject(new Error(`agent 输出解析失败: ${e.message}`));
      }
    });

    child.stdin.write(buildPrompt(task));
    child.stdin.end();
  });
}

// ---------- 引擎 2：API 兜底 ----------
async function apiEngine(task) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("无 ANTHROPIC_API_KEY，无法兜底");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: API_MODEL,
      max_tokens: 1500,
      system: SPEC,
      messages: [{ role: "user", content: buildPrompt(task) }],
    }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const text = data?.content?.map((c) => c.text || "").join("") || "";
  return parseGame(text);
}

// ---------- 主流程 ----------
async function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  await fs.appendFile(DIR.log, line).catch(() => {});
}

async function ensureDirs() {
  for (const d of [DIR.pending, DIR.processing, DIR.done, DIR.out, path.dirname(DIR.log)]) {
    await fs.mkdir(d, { recursive: true });
  }
}

async function generate(task) {
  try {
    const g = await agentEngine(task);
    return { ...g, engine: "agent" };
  } catch (e) {
    await log(`  agent 失败（${e.message}）→ 兜底 API`);
    const g = await apiEngine(task);
    return { ...g, engine: "api" };
  }
}

async function handle(file) {
  const id = path.basename(file, ".json");
  const procPath = path.join(DIR.processing, `${id}.json`);
  try {
    await fs.rename(path.join(DIR.pending, file), procPath);
  } catch {
    return; // 已被别的循环抢走
  }
  const task = JSON.parse(await fs.readFile(procPath, "utf-8"));
  await log(`▶ 接到任务 ${id}（${(task.novelText || "").length} 字）`);

  try {
    const g = await generate(task);
    const scenario = {
      id,
      title: g.title,
      tagline: g.tagline,
      emoji: g.emoji,
      genre: g.genre,
      mechanic: g.mechanic,
      opening: g.opening,
      systemPrompt: g.systemPrompt,
    };
    await fs.writeFile(
      path.join(DIR.out, `${id}.json`),
      JSON.stringify(scenario, null, 2),
    );
    await fs.writeFile(
      path.join(DIR.done, `${id}.json`),
      JSON.stringify(
        { jobId: id, status: "done", engine: g.engine, scenarioId: id, finishedAt: new Date().toISOString() },
        null,
        2,
      ),
    );
    await log(`✓ 完成 ${id} ←「${g.title}」(${g.genre}/${g.mechanic}) by ${g.engine}`);
  } catch (e) {
    await fs.writeFile(
      path.join(DIR.done, `${id}.json`),
      JSON.stringify({ jobId: id, status: "error", error: e.message, finishedAt: new Date().toISOString() }, null, 2),
    );
    await log(`✗ 失败 ${id}: ${e.message}`);
  } finally {
    await fs.rm(procPath, { force: true });
  }
}

async function loop() {
  let files = [];
  try {
    files = (await fs.readdir(DIR.pending)).filter((f) => f.endsWith(".json")).sort();
  } catch {}
  for (const f of files) await handle(f);
}

async function main() {
  // 简易 .env.local 加载
  try {
    const env = await fs.readFile(path.join(ROOT, ".env.local"), "utf-8");
    for (const line of env.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {}

  await ensureDirs();
  await log(`🛠️ worker 启动 · agent=${AGENT_MODEL} · api兜底=${API_MODEL} · 监听 ${DIR.pending}`);
  // 持续轮询
  for (;;) {
    await loop();
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

main().catch((e) => {
  console.error("worker 崩溃:", e);
  process.exit(1);
});
