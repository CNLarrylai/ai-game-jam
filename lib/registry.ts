import { promises as fs } from "fs";
import path from "path";
import { scenarios as builtin } from "./scenarios";
import type { Scenario } from "./types";

/**
 * 🗂️ 剧本注册表（Scenario Registry）
 * ============================================
 * 对应架构里的「机制/剧本注册表」那层：把剧本从"写死在代码里"抽象成"可被索引的多来源目录"。
 * 三个来源，后者按 id 覆盖前者（github > repo > builtin）：
 *   - builtin：lib/scenarios.ts 里硬编码的内置剧本（随构建发布）
 *   - repo   ：仓库内 scenarios/index.json（提交即入库，构建/部署后生效）—— 团队共建
 *   - github ：运行时从 GitHub 拉 scenarios/index.json（提交即可见，无需重新部署）—— 动态新增
 * 用户在 /create 现场生成的剧本是第四种来源（generated，客户端临时态），不在此索引内。
 */

export type ScenarioSource = "builtin" | "repo" | "github" | "generated";

export interface IndexedScenario extends Scenario {
  source: ScenarioSource;
  /** 可选的题材/机制标注（仓库/GitHub 来源可带，内置不一定有） */
  genre?: string;
  mechanic?: string;
}

function isValidScenario(s: unknown): s is Scenario {
  const o = s as Record<string, unknown>;
  return (
    !!o &&
    typeof o.id === "string" &&
    typeof o.title === "string" &&
    typeof o.opening === "string" &&
    typeof o.systemPrompt === "string"
  );
}

/** 来源 1：仓库内 scenarios/index.json（构建/部署期那份） */
async function readRepoScenarios(): Promise<Scenario[]> {
  try {
    const p = path.join(process.cwd(), "scenarios", "index.json");
    const raw = await fs.readFile(p, "utf-8");
    const data = JSON.parse(raw);
    const arr = Array.isArray(data?.scenarios) ? data.scenarios : [];
    return arr.filter(isValidScenario);
  } catch {
    return [];
  }
}

/** 来源 3：后台 worker 现场生成的剧本（scenarios/generated/*.json，每个文件一个剧本） */
async function readGeneratedScenarios(): Promise<Scenario[]> {
  try {
    const dir = path.join(process.cwd(), "scenarios", "generated");
    const files = await fs.readdir(dir);
    const out: Scenario[] = [];
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      try {
        const obj = JSON.parse(await fs.readFile(path.join(dir, f), "utf-8"));
        if (isValidScenario(obj)) out.push(obj);
      } catch {
        /* 跳过坏文件 */
      }
    }
    return out;
  } catch {
    return [];
  }
}

const GH_REPO = process.env.SCENARIO_REPO || "CNLarrylai/ai-game-jam";
const GH_REF = process.env.SCENARIO_REF || "main";
const GH_TIMEOUT_MS = 2500;

/** 来源 2：运行时从 GitHub 拉 scenarios/index.json（动态新增的剧本即时可见） */
async function fetchGithubScenarios(): Promise<Scenario[]> {
  const url = `https://raw.githubusercontent.com/${GH_REPO}/${GH_REF}/scenarios/index.json`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), GH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      // 缓存 5 分钟，避免每次渲染都打 GitHub；新增剧本最迟 5 分钟内可见
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const arr = Array.isArray(data?.scenarios) ? data.scenarios : [];
    return arr.filter(isValidScenario);
  } catch {
    // 网络失败 / 超时 / 文件不存在 → 静默降级，不影响内置与仓库来源
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/** 按 id 合并去重，后面的组覆盖前面的组 */
function mergeById(...groups: IndexedScenario[][]): IndexedScenario[] {
  const map = new Map<string, IndexedScenario>();
  for (const group of groups) {
    for (const s of group) map.set(s.id, s);
  }
  return [...map.values()];
}

/**
 * 取全部已索引剧本（合并三来源）。
 * @param opts.github 传 false 可跳过运行时 GitHub 拉取（离线/想快时用）
 */
export async function getAllScenarios(opts?: {
  github?: boolean;
}): Promise<IndexedScenario[]> {
  const tag =
    (source: ScenarioSource) =>
    (s: Scenario): IndexedScenario => ({ ...(s as IndexedScenario), source });

  const repo = (await readRepoScenarios()).map(tag("repo"));
  const generated = (await readGeneratedScenarios()).map(tag("generated"));
  const github =
    opts?.github === false ? [] : (await fetchGithubScenarios()).map(tag("github"));

  return mergeById(builtin.map(tag("builtin")), repo, github, generated);
}

/** 按 id 解析一个剧本（跨来源）。 */
export async function getScenarioById(
  id: string,
): Promise<IndexedScenario | undefined> {
  return (await getAllScenarios()).find((s) => s.id === id);
}
