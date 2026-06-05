import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/gamestate — 主播端上传最新游戏状态快照
 * GET  /api/gamestate — 观众端拉取最新状态
 *
 * 内存存储，生产环境应替换为 Redis 等持久化方案。
 */

// In-memory game state (latest snapshot from host)
let latestState: any = null;

export async function POST(req: NextRequest) {
  latestState = await req.json();
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json(latestState || { status: "waiting" });
}
