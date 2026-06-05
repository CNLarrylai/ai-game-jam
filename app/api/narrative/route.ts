import { NextRequest, NextResponse } from "next/server";
import { processComments } from "@/lib/comment-intelligence";
import { generateNarrative } from "@/lib/narrative-engine";
import type { GameState } from "@/lib/comment-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/narrative
 * body: { gameState, context, playerAction?, rawComments? }
 * 返回：NarrativeResponse JSON（叙事 + suggested_reactions + 资源变化 + 钩子状态）
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    let processedComments = undefined;
    if (body.rawComments?.length) {
      const processed = processComments(body.rawComments);
      processedComments = processed.actionable;
    }

    // 兼容旧版字段名（sanity→spirit, hp→health）
    const gs = body.gameState || {};
    const gameState: GameState = {
      day: gs.day || 1,
      spirit: gs.spirit ?? gs.sanity ?? 60,
      health: gs.health ?? gs.hp ?? 50,
      hunger: gs.hunger ?? 30,
      thirst: gs.thirst ?? 30,
      actionPoints: gs.actionPoints ?? 5,
      companions: gs.companions || [],
      inventory: gs.inventory || [],
      karma: gs.karma || 0,
      history: gs.history || [],
      visitedLocations: gs.visitedLocations || [],
      unresolvedThreads: gs.unresolvedThreads || [],
      hookQueue: gs.hookQueue || [],
      availableMaps: gs.availableMaps || [],
    };

    const result = await generateNarrative({
      gameState,
      context: body.context || "home_event",
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
