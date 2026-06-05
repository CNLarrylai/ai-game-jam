import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/jobs/<id>
 * 查任务状态。worker 完成后 jobs/done/<id>.json 出现：
 *   - done  → 连同生成的剧本(scenarios/generated/<id>.json)一起返回
 *   - error → 返回错误
 *   - 还没出现 → pending
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const safe = path.basename(id); // 防目录穿越
  const donePath = path.join(process.cwd(), "jobs", "done", `${safe}.json`);

  try {
    const done = JSON.parse(await fs.readFile(donePath, "utf-8"));
    if (done.status === "done") {
      const scenarioPath = path.join(process.cwd(), "scenarios", "generated", `${safe}.json`);
      const scenario = JSON.parse(await fs.readFile(scenarioPath, "utf-8"));
      return Response.json({ status: "done", engine: done.engine, scenario });
    }
    return Response.json({ status: "error", error: done.error || "生成失败" });
  } catch {
    // jobs/done 里还没有 → 仍在排队 / 处理中
    return Response.json({ status: "pending" });
  }
}
