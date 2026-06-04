import { NextRequest } from "next/server";
import { streamChat } from "@/lib/ai";
import { getScenario } from "@/lib/scenarios";
import type { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/game
 * body: { scenarioId: string, messages: ChatMessage[] }
 * 返回：纯文本流（AI 主持人对玩家最新行动的回应，逐字吐出）
 */
export async function POST(req: NextRequest) {
  try {
    const { scenarioId, messages } = (await req.json()) as {
      scenarioId: string;
      messages: ChatMessage[];
    };

    const scenario = getScenario(scenarioId);
    if (!scenario) {
      return new Response("未知的剧本 id", { status: 400 });
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response("messages 不能为空", { status: 400 });
    }

    const aiStream = await streamChat(scenario.systemPrompt, messages);

    const encoder = new TextEncoder();
    const out = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = aiStream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(encoder.encode(value));
          }
        } catch (err) {
          controller.enqueue(
            encoder.encode(`\n\n[系统] 生成中断：${(err as Error).message}`),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(out, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-cache",
      },
    });
  } catch (err) {
    return new Response(`服务器错误：${(err as Error).message}`, {
      status: 500,
    });
  }
}
