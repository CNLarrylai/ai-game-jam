import type {
  RawComment,
  ProcessedComments,
  ActionableComment,
} from "./comment-types";

/**
 * 评论分类模块 —— 纯规则匹配，不调用 AI
 * ============================================
 * 把原始弹幕分成三类：可触发事件的、环境关键词、噪音。
 * 速度优先，保证每个 tick 周期内能处理完全部评论。
 */

// Environment keywords that trigger collective will effects
const ENVIRONMENT_KEYWORDS: Record<string, string[]> = {
  storm: ["暴风雨", "下雨", "storm", "rain", "雷暴"],
  fire: ["火灾", "着火", "fire", "野火", "纵火"],
  night: ["天黑", "夜晚", "night", "黑夜", "日落"],
  blessing: ["祝福", "保佑", "blessing", "好运", "庇护"],
  zombie: ["丧尸", "僵尸", "zombie", "尸潮", "感染者"],
  airdrop: ["空投", "补给", "airdrop", "物资", "救援"],
};

// Patterns that indicate noise (not actionable)
const NOISE_PATTERNS = [
  /^(哈哈|lol|666|加油|厉害|牛|gg|好看|好玩)/i,
  /^(往|去|走)(左|右|上|下|东|南|西|北)/,
  /^[!?。，、！？\s]+$/,
  /^.{0,2}$/, // too short
];

// Patterns for creative/actionable comments
const ACTION_PATTERNS: { pattern: RegExp; type: ActionableComment["type"] }[] =
  [
    {
      pattern:
        /(前面|前方|迷雾里|出现|遇到|发现).*(人|老人|商人|怪物|建筑|车|房子|医院|超市)/,
      type: "event_create",
    },
    {
      pattern:
        /(给他|掉落|出现|找到|捡到).*(枪|剑|刀|药|食物|水|钥匙|地图|工具)/,
      type: "item_summon",
    },
    {
      pattern:
        /(来了?|出现|遇到).*(人|同伴|幸存者|士兵|医生|小孩|老人|狗)/,
      type: "npc_create",
    },
    {
      pattern: /(暴风雨|下雨|着火|天黑|丧尸|空投|地震)/,
      type: "environment",
    },
  ];

export function processComments(raw: RawComment[]): ProcessedComments {
  const actionable: ActionableComment[] = [];
  const envKeywords: Record<string, number> = {};
  let ignoredCount = 0;

  for (const comment of raw) {
    // Check noise
    if (NOISE_PATTERNS.some((p) => p.test(comment.text))) {
      ignoredCount++;
      continue;
    }

    // Check environment keywords
    for (const [key, keywords] of Object.entries(ENVIRONMENT_KEYWORDS)) {
      if (keywords.some((kw) => comment.text.includes(kw))) {
        envKeywords[key] = (envKeywords[key] || 0) + 1;
      }
    }

    // Check actionable patterns
    let matched = false;
    for (const { pattern, type } of ACTION_PATTERNS) {
      if (pattern.test(comment.text)) {
        actionable.push({
          user: comment.user,
          text: comment.text,
          type,
          confidence: 0.8,
        });
        matched = true;
        break;
      }
    }

    // Long creative comments without pattern match still get included with lower confidence
    if (!matched && comment.text.length > 8) {
      actionable.push({
        user: comment.user,
        text: comment.text,
        type: "event_create",
        confidence: 0.4,
      });
    } else if (!matched) {
      ignoredCount++;
    }
  }

  // Sort by confidence, pick best
  actionable.sort((a, b) => b.confidence - a.confidence);
  const bestComment = actionable.length > 0 ? actionable[0] : null;

  return { actionable, bestComment, environmentKeywords: envKeywords, ignoredCount };
}

/** Check if collective will threshold is met */
export function checkCollectiveWill(
  envKeywords: Record<string, number>,
  threshold = 3,
): string | null {
  for (const [key, count] of Object.entries(envKeywords)) {
    if (count >= threshold) return key;
  }
  return null;
}
