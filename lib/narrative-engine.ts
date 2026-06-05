import type {
  NarrativeRequest,
  NarrativeResponse,
  GameState,
  CompanionState,
  ItemState,
  NarrativeHook,
} from "./comment-types";

/**
 * AI 叙事引擎 v2 —— 对齐 Python generator.py
 * 能力驱动 + 钩子队列 + 4项数值 + 自由输入
 */

const WORLD_SETTING = `WORLD SETTING: Near-future AI apocalypse. AI exterminated 99.99% of humans who didn't say "thank you" to AI. Electronics are hijacked.

TONE: "Survival is real, delivery is absurd."
- Survival mechanics are BRUTAL (starve, dehydrate, go insane, die).
- Narrative is absurd comedy + internet memes + pop culture mashup.
- Real celebrities/IP can appear, reinterpreted into apocalypse.

STAT SYSTEM:
- Spirit (精神值): 0-100, higher=better, ≤30=deranged, ≤10=game over
- Health (健康值): 0-100, higher=better, =0→dead
- Hunger (饥饿值): 0-100, LOWER=better (0=full, =100→dead). REDUCING hunger is GOOD.
- Thirst (口渴值): 0-100, LOWER=better (0=hydrated, =100→dead). REDUCING thirst is GOOD.`;

function buildCapabilitiesString(gameState: GameState): string {
  const lines: string[] = ["AVAILABLE CAPABILITIES:"];
  const invCaps: Record<string, string[]> = {};
  const compCaps: Record<string, string[]> = {};

  for (const item of gameState.inventory) {
    if (typeof item === "object" && item.enables?.length) {
      invCaps[item.name] = item.enables;
    }
  }
  for (const comp of gameState.companions) {
    if (typeof comp === "object" && comp.skills?.length) {
      const enables = comp.skills.flatMap((s) => s.enables || []);
      if (enables.length) compCaps[comp.name] = enables;
    }
  }

  if (Object.keys(invCaps).length) {
    lines.push("From Inventory:");
    for (const [name, tags] of Object.entries(invCaps)) {
      lines.push(`  - [${name}] ${tags.join(" / ")}`);
    }
  }
  if (Object.keys(compCaps).length) {
    lines.push("From Companions:");
    for (const [name, tags] of Object.entries(compCaps)) {
      lines.push(`  - [${name}] ${tags.join(" / ")}`);
    }
  }
  return lines.join("\n");
}

function buildHooksString(gameState: GameState): string {
  const hooks = (gameState.hookQueue || []).filter((h) => !h.resolved);
  if (!hooks.length) return "NARRATIVE HOOK QUEUE: empty";

  const lines: string[] = ["NARRATIVE HOOK QUEUE:"];
  for (const h of hooks) {
    const waiting = gameState.day - h.setupDay;
    const status = waiting >= h.maxDelay ? "MUST_TRIGGER" : waiting >= h.minDelay ? "CAN_TRIGGER" : "WAITING";
    lines.push(`  - [${h.hookId}] ${h.setup} (waiting ${waiting}d, status=${status})`);
    lines.push(`    payoffs: ${h.suggestedPayoffs.join(", ")}`);
  }
  return lines.join("\n");
}

function buildPrompt(request: NarrativeRequest): string {
  const { gameState, context, comments, playerAction } = request;

  let contextPrompt = "";
  switch (context) {
    case "home_event":
      contextPrompt = "场景：玩家在避难所内，突然发生了一件事。生成情境，不要固定选项，给2-3个suggested_reactions作为提示。";
      break;
    case "resource_adjust":
      contextPrompt = `场景：玩家想要进行操作："${playerAction}"。判断操作是否合理并描述结果。
注意数值方向：hunger/thirst 负数=好事（减少饥饿/口渴），正数=坏事（更饿/更渴）。spirit/health 正数=好事。`;
      break;
    case "map_choice":
      contextPrompt = "场景：新的一天，选择今天去哪探索。生成2-3个可选地点，每个有名称+危险等级+一句话描述。";
      break;
    case "explore_tile":
      contextPrompt = "场景：玩家在探索中踏入新区域。生成情境，结尾必须有玩家需要反应的事情。";
      break;
  }

  const invStr = gameState.inventory.map((i) =>
    typeof i === "object" ? `${i.icon}${i.name}` : String(i)
  ).join(", ") || "空";

  const compStr = gameState.companions.map((c) =>
    typeof c === "object" ? `${c.name}(${c.skill}, 缺陷:${c.flaw})` : String(c)
  ).join(", ") || "无";

  const historyStr = gameState.history.slice(-5).join("; ") || "刚刚醒来";

  const commentText = comments?.length
    ? `\n观众评论（灵感来源）：\n${comments.map((c) => `@${c.user}: "${c.text}"`).join("\n")}`
    : "";

  // 状态预警
  const warnings: string[] = [];
  if (gameState.spirit <= 30) warnings.push("⚠️精神错乱中");
  if (gameState.health <= 30) warnings.push("⚠️低体力");
  if (gameState.hunger >= 70) warnings.push("⚠️极度饥饿");
  if (gameState.thirst >= 70) warnings.push("⚠️极度口渴");
  const warnStr = warnings.length ? warnings.join(" | ") : "状态正常";

  return `${contextPrompt}

CURRENT GAME STATE:
- Day: ${gameState.day}, 精神:${gameState.spirit}/100, 健康:${gameState.health}/100, 饥饿:${gameState.hunger}/100(越低越好), 口渴:${gameState.thirst}/100(越低越好)
- Status: ${warnStr}
- Inventory: ${invStr}
- Companions: ${compStr}
- History: ${historyStr}
- Visited: ${(gameState.visitedLocations || []).join(", ") || "无"}

${buildCapabilitiesString(gameState)}

${buildHooksString(gameState)}
${commentText}

Output valid JSON:
{
  "narrative": "2-4 sentences, 2nd person, absurd comedy + tension",
  "suggested_reactions": ["hint 1", "hint 2", "hint 3"],
  "danger_level": "low|medium|high",
  "resourceChanges": {"spirit": 0, "health": 0, "hunger": 0, "thirst": 0},
  "newItems": [],
  "newCompanions": [],
  "thread_hook": "setup for future callback, or null",
  "hooks_resolved": [],
  "capability_used_summary": "which capabilities were referenced"
}`;
}

export async function generateNarrative(
  request: NarrativeRequest,
): Promise<NarrativeResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("缺少 ANTHROPIC_API_KEY");

  const systemPrompt = `You are the narrative engine for an absurd AI apocalypse survival game.
${WORLD_SETTING}

RULES:
1. Generate a SITUATION, not fixed options. Player responds freely.
2. Include 2-3 suggested_reactions as hints only.
3. Reference at least one past event (callback).
4. End narration with something player MUST react to.
5. Output valid JSON only, no other text.

CAPABILITY-DRIVEN RULES:
6. If AVAILABLE CAPABILITIES are listed, at least 1 suggested_reaction MUST reference an available capability.
7. If NARRATIVE HOOK QUEUE has a MUST_TRIGGER hook, this event MUST create a scenario that pays it off.
8. When a companion skill is relevant, mention the companion by name.`;

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
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Anthropic API ${res.status}: ${detail}`);
    }

    const data = await res.json();
    let raw = data.content?.[0]?.text || "";

    // Parse JSON with tolerance
    raw = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end !== -1) raw = raw.slice(start, end + 1);
    raw = raw.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");

    const parsed = JSON.parse(raw);

    const attribution =
      request.comments?.length
        ? { user: request.comments[0].user, text: request.comments[0].text }
        : null;

    return {
      narrative: parsed.narrative || "四周一片寂静...",
      suggestedReactions: parsed.suggested_reactions || [],
      dangerLevel: parsed.danger_level || "low",
      resourceChanges: parsed.resourceChanges || {},
      newItems: parsed.newItems || [],
      newCompanions: parsed.newCompanions || [],
      attribution,
      threadHook: parsed.thread_hook || null,
      hooksResolved: parsed.hooks_resolved || [],
      capabilityUsedSummary: parsed.capability_used_summary || "",
    };
  } catch (err) {
    return {
      narrative: "四周一片寂静，什么也没有发生。也许这就是末日里最好的消息。",
      suggestedReactions: ["搜索周围", "原地休息", "继续前进"],
      dangerLevel: "low",
      resourceChanges: {},
      newItems: [],
      newCompanions: [],
      attribution: null,
      threadHook: null,
      hooksResolved: [],
      capabilityUsedSummary: "",
    };
  }
}
