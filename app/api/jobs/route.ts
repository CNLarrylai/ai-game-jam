import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/jobs
 * body: { novelText: string, title?: string }
 * 把"小说→游戏"任务写进 jobs/pending/<jobId>.json，交给后台 worker 处理。
 * 返回 { jobId }，前端轮询 GET /api/jobs/<jobId> 取结果。
 */
export async function POST(req: Request) {
  try {
    const { novelText, title } = (await req.json()) as {
      novelText?: string;
      title?: string;
    };
    if (!novelText || novelText.trim().length < 200) {
      return new Response("小说内容太短了，至少需要 200 字。", { status: 400 });
    }

    const jobId = `gen-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const dir = path.join(process.cwd(), "jobs", "pending");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, `${jobId}.json`),
      JSON.stringify({ jobId, title: title || "", novelText, createdAt: new Date().toISOString() }, null, 2),
    );

    return Response.json({ jobId });
  } catch (err) {
    return new Response(`提交失败：${(err as Error).message}`, { status: 500 });
  }
}
