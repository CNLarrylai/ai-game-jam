import type {
  NarrativeRequest,
  NarrativeResponse,
} from "./comment-types";

/**
 * AI 叙事引擎 —— 调用大模型生成游戏事件
 * ============================================
 * 根据当前游戏状态 + 观众评论，生成一段叙事、选项和资源变化。
 * 使用非流式调用（需要完整 JSON 响应用于解析）。
 */

const APOCALYPSE_WORLD = `
你是一个末日生存游戏的AI叙事引擎。世界观：AI统治了世界，人类在废墟中求生。
玩家是一名幸存者，每天需要外出探索、收集物资、寻找其他幸存者。

生成规则：
1. 输出必须是合法JSON（不要加markdown代码块）
2. narrative: 2-3句生动描述，用第二人称"你"
3. choices: 2-3个选项，每个有cost/reward/karma/successRate
4. resourceChanges: 直接的资源变化（正负数）
5. 保持末日氛围：荒凉、紧张、偶有温暖
6. 如果有观众评论触发了这个事件，在narrative里自然融入评论内容
`.trim();

function buildPrompt(request: NarrativeRequest): string {
  const { gameState, context, comments, playerAction } = request;

  let contextPrompt = "";
  switch (context) {
    case "home_event":
      contextPrompt = "场景：玩家在避难所内，突然发生了一件事。";
      break;
    case "resource_adjust":
      contextPrompt = `场景：玩家想要进行操作："${playerAction}"。判断这个操作是否合理，并描述结果。`;
      break;
    case "map_choice":
      contextPrompt =
        "场景：新的一天开始，玩家需要选择今天去哪里探索。生成2-3个可选地点。";
      break;
    case "explore_tile":
      contextPrompt = "场景：玩家在探索中踏入了一个新区域。";
      break;
  }

  const commentText =
    comments && comments.length > 0
      ? `\n观众评论（灵感来源，自然融入叙事）：\n${comments.map((c) => `@${c.user}: "${c.text}"`).join("\n")}`
      : "";

  return `${contextPrompt}

当前状态：
- 第${gameState.day}天 | HP:${gameState.hp} | 食物:${gameState.food} | 士气:${gameState.morale}
- 同伴：${gameState.companions.join(", ") || "无"}
- 背包：${gameState.inventory.join(", ") || "空"}
- 业力：${gameState.karma}
- 近期事件：${gameState.history.slice(-3).join("; ") || "刚刚醒来"}
${commentText}

请生成一个JSON格式的事件：
{
  "narrative": "叙事文本",
  "choices": [{"text":"选项","cost":{"hp":0,"food":0,"morale":0},"reward":{"hp":0,"food":0,"morale":0},"karma":0,"successRate":1.0}],
  "resourceChanges": {"hp":0,"food":0,"morale":0},
  "newItems": [],
  "newCompanions": []
}`;
}

export async function generateNarrative(
  request: NarrativeRequest,
): Promise<NarrativeResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("缺少 ANTHROPIC_API_KEY，请在 .env.local 中配置");

  const prompt = buildPrompt(request);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
        max_tokens: 800,
        system: APOCALYPSE_WORLD,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Anthropic API 错误 ${res.status}: ${detail}`);
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || "";

    // Parse JSON from response (handle possible markdown wrapping)
    const jsonStr = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(jsonStr);

    // Build attribution from best comment
    const attribution =
      request.comments && request.comments.length > 0
        ? { user: request.comments[0].user, text: request.comments[0].text }
        : null;

    return {
      narrative: parsed.narrative || "一阵沉默笼罩了四周...",
      choices: parsed.choices || [],
      resourceChanges: parsed.resourceChanges || {},
      newItems: parsed.newItems || [],
      newCompanions: parsed.newCompanions || [],
      attribution,
      divineType: attribution ? "aid" : null,
    };
  } catch (err) {
    // Fallback: 保证游戏不会因为 AI 调用失败而卡死
    return {
      narrative:
        "四周一片寂静，什么也没有发生。也许这就是末日里最好的消息。",
      choices: [
        {
          text: "继续前进",
          cost: { food: -1 },
          reward: {},
          karma: 0,
          successRate: 1,
        },
        {
          text: "原地休息",
          cost: {},
          reward: { hp: 5 },
          karma: 0,
          successRate: 1,
        },
      ],
      resourceChanges: {},
      newItems: [],
      newCompanions: [],
      attribution: null,
      divineType: null,
    };
  }
}
