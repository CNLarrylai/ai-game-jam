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
  zombie: ['丧尸', '僵尸', 'zombie', '尸潮', '感染者'],
  airdrop: ['空投', '补给', 'airdrop', '物资掉落'],
  blackout: ['停电', '断电', '黑暗', 'blackout'],
  ai_patrol: ['AI巡逻', '机器人来了', '扫描', '警报'],
  earthquake: ['地震', '塌了', '坍塌'],
  rain: ['下雨', '暴风雨', 'rain', 'storm'],
};

// Patterns that indicate noise (not actionable)
const NOISE_PATTERNS = [
  /^(哈哈|lol|666|加油|厉害|牛|gg|好看|好玩|主播)/i,
  /^(往|去|走)(左|右|上|下|东|南|西|北)/,
  /^[!?。，、！？😂🤣\s]+$/,
  /^.{0,2}$/,
  /^(你们|能不能|别吵|为什么)/,  // meta-arguing, not actionable
];

// Patterns for creative/actionable comments
const ACTION_PATTERNS: { pattern: RegExp; type: ActionableComment["type"] }[] =
  [
    // Location creation
    {
      pattern: /(去|探索|前往|生成).*(家|超市|工厂|白宫|火星|图书馆|医院|餐厅|学校)/,
      type: "event_create",
    },
    // Character appearance
    {
      pattern: /(出现|遇到|看到|来了).*(人|猫|马斯克|甄嬛|厨师|特朗普|仙女|帅哥|邻居|幸存者)/,
      type: "npc_create",
    },
    // Item generation
    {
      pattern: /(捡到|获得|给|掉落|生成).*(枪|罐头|水|药|钥匙|食物|武器|背包)/,
      type: "item_summon",
    },
    // Environmental
    {
      pattern: /(丧尸|AI|机器人|地震|停电|爆炸|着火)/,
      type: "environment",
    },
    // Meta/demand (viewers demanding things)
    {
      pattern: /^(生成|来个|要|让|给).{2,}/,
      type: "event_create",
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
