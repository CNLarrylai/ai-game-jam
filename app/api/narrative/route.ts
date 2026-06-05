import { NextRequest, NextResponse } from "next/server";
import { processComments } from "@/lib/comment-intelligence";
import { generateNarrative } from "@/lib/narrative-engine";
import type { NarrativeRequest, GameState } from "@/lib/comment-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/narrative
 * body: { gameState, context, playerAction?, rawComments? }
 * 返回：NarrativeResponse JSON（叙事 + 选项 + 资源变化）
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      gameState: GameState;
      context: NarrativeRequest["context"];
      playerAction?: string;
      rawComments?: { user: string; text: string; timestamp: number }[];
    };

    // Process comments if provided
    let processedComments = undefined;
    if (body.rawComments && body.rawComments.length > 0) {
      const processed = processComments(body.rawComments);
      processedComments = processed.actionable;
    }

    const result = await generateNarrative({
      gameState: body.gameState,
      context: body.context,
      comments: processedComments,
      playerAction: body.playerAction,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: `生成失败: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
