import { getAllScenarios } from "@/lib/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/scenarios
 * 返回合并三来源（内置 / 仓库 / GitHub）的剧本索引。
 * 列表只回元数据（不含 systemPrompt，省流量）；要完整剧本走播放流程。
 * query: ?github=0 跳过运行时 GitHub 拉取。
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const skipGithub = url.searchParams.get("github") === "0";

  const all = await getAllScenarios({ github: !skipGithub });
  const index = all.map(({ systemPrompt: _omit, ...meta }) => meta);

  const bySource = index.reduce<Record<string, number>>((acc, s) => {
    acc[s.source] = (acc[s.source] || 0) + 1;
    return acc;
  }, {});

  return Response.json({ count: index.length, bySource, scenarios: index });
}
