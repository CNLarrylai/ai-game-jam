import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/comment — 注入一条评论到缓冲区
 * GET  /api/comment — 查看当前缓冲区内容
 *
 * 内存缓冲区，生产环境应替换为 Redis 等持久化方案。
 */

// In-memory comment buffer
let commentBuffer: { user: string; text: string; timestamp: number }[] = [];

export async function POST(req: NextRequest) {
  const { user, text } = await req.json();
  if (!text) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  commentBuffer.push({
    user: user || "Anonymous",
    text,
    timestamp: Date.now(),
  });

  // Keep buffer manageable
  if (commentBuffer.length > 100) commentBuffer = commentBuffer.slice(-50);

  return NextResponse.json({ ok: true, bufferSize: commentBuffer.length });
}

export async function GET() {
  return NextResponse.json({
    comments: commentBuffer,
    count: commentBuffer.length,
  });
}

// drainBuffer moved to avoid Next.js Route export validation error
// Use DELETE method to drain instead
export async function DELETE() {
  const drained = [...commentBuffer];
  commentBuffer = [];
  return NextResponse.json({ comments: drained, count: drained.length });
}
