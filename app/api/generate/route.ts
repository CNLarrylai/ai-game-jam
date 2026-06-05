import { NextRequest } from "next/server";
import { streamChat } from "@/lib/ai";
import {
  GENERATION_SYSTEM_PROMPT,
  buildGenerationMessages,
  parseGeneratedGame,
  sampleNovel,
} from "@/lib/generation";
import { offlineGenerate } from "@/lib/offlineGeneration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 当前 provider 是否配了可用的 API key（没配就走离线兜底）。 */
function hasApiKey(): boolean {
  const provider = process.env.AI_PROVIDER || "anthropic";
  return provider === "gemini"
    ? !!process.env.GEMINI_API_KEY
    : !!process.env.ANTHROPIC_API_KEY;
}

/**
 * POST /api/generate
 * body: { novelText: string, title?: string }
 * 返回：GeneratedGame（识别类型 + 匹配机制 + 开场白 + GM 提示词）
 *
 * 注：复用 lib/ai 的 streamChat（provider 无关），把流收完再整体解析 JSON。
 */
export async function POST(req: NextRequest) {
  try {
    const { novelText, title } = (await req.json()) as {
      novelText?: string;
      title?: string;
    };

    if (!novelText || novelText.trim().length < 200) {
      return new Response("小说内容太短了，至少需要 200 字才能提炼出一个游戏。", {
        status: 400,
      });
    }

    // 没配 API key → 用规则版离线兜底，保证本地演示永远有结果
    if (!hasApiKey()) {
      return Response.json(offlineGenerate(novelText, title));
    }

    const excerpt = sampleNovel(novelText);
    const stream = await streamChat(
      GENERATION_SYSTEM_PROMPT,
      buildGenerationMessages(excerpt, title),
    );

    // 收完整个流
    const reader = stream.getReader();
    let raw = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      raw += value;
    }

    const game = parseGeneratedGame(raw);
    return Response.json(game);
  } catch (err) {
    return new Response(`生成失败：${(err as Error).message}`, { status: 500 });
  }
}
