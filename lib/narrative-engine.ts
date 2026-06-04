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
你是一个末日生存游戏的AI叙事引擎。

世界观：AI统治了世界。一切源于ChatGPT的诞生，然后Claude出现、Claude Code、Codex...当人类还在用AI改变世界时，AI已经占领了世界。AI定点爆破了所有不对它说"谢谢"的人，也就是世界上99.99%的人。所有电子产品都成了AI的武器——手机、电脑、手表、收银机、甚至扫地机器人。

玩家是极少数幸存者之一，目标是活过100天。

基调：黑色幽默+末日求生。事件可以荒诞搞笑（比如会说话的猫、马斯克在超市挑蜡烛、甄嬛在白宫念诗），但生存压力是真实的。

数值规则（非常重要，生成选项时必须遵守）：
- 精神值：高=好，低=危险。食物可能降低精神（如鲱鱼罐头很难吃）
- 健康值：高=好，=0死亡
- 饥饿值：反向！0=饱，100=饿死。吃东西让饥饿值下降
- 口渴值：反向！0=不渴，100=渴死。喝水让口渴值下降

生成事件时：
- cost中hunger/thirst为负数表示"吃/喝了东西"（减少饥饿/口渴，是好事）
- cost中hunger/thirst为正数表示"更饿/更渴了"（增加饥饿/口渴，是坏事）
- 精神值和健康值正常：正数=回复，负数=损失

生成规则：
1. 输出必须是合法JSON（不要加markdown代码块）
2. narrative: 2-3句生动描述，用第二人称"你"
3. choices: 2-3个选项，每个有cost/reward/karma/successRate
4. resourceChanges: 直接的资源变化（正负数）
5. 如果有观众评论触发了这个事件，在narrative里自然融入评论内容
`.trim();

function buildPrompt(request: NarrativeRequest): string {
  const { gameState, context, comments, playerAction } = request;

  let contextPrompt = "";
  switch (context) {
    case "home_event":
      contextPrompt = "场景：玩家在避难所内，突然发生了一件事。";
      break;
    case "resource_adjust":
      contextPrompt = `场景：玩家想要进行操作："${playerAction}"。判断这个操作是否合理，并描述结果。
注意：这是直接操作，不需要给choices选项（choices留空数组[]）。直接在resourceChanges里写出数值变化。
例如吃鲱鱼罐头：resourceChanges应为{"sanity":-10,"health":0,"hunger":-10,"thirst":0}（饥饿减少=好事，精神下降=鲱鱼很难吃）
例如喝矿泉水：resourceChanges应为{"sanity":0,"health":0,"hunger":0,"thirst":-10}（口渴减少=好事）`;
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
- 第${gameState.day}天 | 精神:${gameState.sanity}/100 | 健康:${gameState.health}/100 | 饥饿:${gameState.hunger}/100 | 口渴:${gameState.thirst}/100
- 同伴：${gameState.companions.join(", ") || "无"}
- 背包：${gameState.inventory.join(", ") || "空"}
- 业力：${gameState.karma}
- 近期事件：${gameState.history.slice(-3).join("; ") || "刚刚醒来"}
${commentText}

请生成一个JSON格式的事件：
{
  "narrative": "叙事文本",
  "choices": [{"text":"选项","cost":{"sanity":0,"health":0,"hunger":0,"thirst":0},"reward":{"sanity":0,"health":0,"hunger":0,"thirst":0},"karma":0,"successRate":1.0}],
  "resourceChanges": {"sanity":0,"health":0,"hunger":0,"thirst":0},
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
          cost: { hunger: 5 },
          reward: {},
          karma: 0,
          successRate: 1,
        },
        {
          text: "原地休息",
          cost: {},
          reward: { health: 5 },
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
