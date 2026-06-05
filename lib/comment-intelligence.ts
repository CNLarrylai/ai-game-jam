import type {
  RawComment,
  ProcessedComments,
  ActionableComment,
} from "./comment-types";

/**
 * 评论分类模块 v2 —— 对齐 Python classifier.py 关键词库
 * 纯规则匹配，不调用 AI。速度优先。
 */

// ============================================================
// 关键词库（与 Python classifier.py 同步）
// ============================================================

const EVENT_KEYWORDS = new Set([
  "敲门", "爆炸", "枪声", "尖叫", "警报", "地震", "坍塌", "停电",
  "着火", "淹水", "暴风雪", "信号", "广播", "敲击", "脚步声",
  "knock", "explosion", "scream", "alarm", "earthquake", "fire",
  "flood", "storm", "signal", "broadcast", "footstep", "collapse",
  "突然", "发现", "听到", "看到", "闯入", "入侵", "袭击",
  "suddenly", "heard", "found", "attacked", "invaded",
  "下雨", "下雪", "起雾", "刮风", "打雷", "天黑",
  "rain", "snow", "fog", "wind", "thunder", "dark",
]);

const CHARACTER_KEYWORDS = new Set([
  "老兵", "小孩", "医生", "科学家", "商人", "流浪汉", "士兵",
  "黑客", "幸存者", "老人", "女孩", "男人", "女人", "机器人",
  "robot", "soldier", "doctor", "scientist", "hacker", "survivor",
  "trader", "merchant", "child", "veteran", "old man", "stranger",
  "老头", "大叔", "少年", "大妈", "护士", "工程师", "机械师", "修理工",
  "狗", "猫", "机械狗", "变异", "怪物",
  "dog", "cat", "mechanical", "mutant", "creature", "monster",
  // 名人/IP
  "马斯克", "甄嬛", "特朗普", "厨师", "仙女", "帅哥",
]);

const ITEM_KEYWORDS = new Set([
  "枪", "刀", "剑", "弩", "棍", "斧", "弓",
  "gun", "knife", "sword", "axe", "bow", "weapon",
  "手电筒", "绳子", "钥匙", "地图", "指南针", "收音机", "对讲机",
  "flashlight", "rope", "key", "map", "compass", "radio", "walkie",
  "罐头", "水", "食物", "药品", "绷带", "电池", "汽油", "弹药",
  "can", "water", "food", "medicine", "bandage", "battery", "fuel", "ammo",
  "背包", "防毒面具", "防弹衣", "头盔",
  "backpack", "gas mask", "armor", "helmet",
  "宝箱", "箱子", "保险柜", "抽屉",
  "chest", "box", "safe", "drawer",
  "手雷", "炸弹", "弹弓",
  "grenade", "bomb", "slingshot",
]);

const LOCATION_KEYWORDS = new Set([
  "超市", "工厂", "医院", "学校", "停车场", "教堂", "地铁站",
  "仓库", "军营", "实验室", "图书馆", "加油站", "屋顶", "地下室",
  "暗门", "密道", "隧道", "桥", "河", "山", "森林", "废墟",
  "supermarket", "factory", "hospital", "school", "parking", "church",
  "subway", "warehouse", "military", "lab", "library", "gas station",
  "rooftop", "basement", "tunnel", "bridge", "river", "mountain", "forest",
  "ruins", "shelter", "bunker",
  // 名人/IP 场所
  "白宫", "火星", "餐厅",
]);

// Environment keywords for collective will
const ENVIRONMENT_KEYWORDS: Record<string, string[]> = {
  zombie: ["丧尸", "僵尸", "zombie", "尸潮", "感染者"],
  airdrop: ["空投", "补给", "airdrop", "物资掉落"],
  blackout: ["停电", "断电", "黑暗", "blackout"],
  ai_patrol: ["AI巡逻", "机器人来了", "扫描", "警报"],
  earthquake: ["地震", "塌了", "坍塌"],
  rain: ["下雨", "暴风雨", "rain", "storm"],
};

const NOISE_PATTERNS = [
  /^(哈哈|lol|666|加油|厉害|牛|gg|好看|好玩|主播)/i,
  /^(往|去|走)(左|右|上|下|东|南|西|北)/,
  /^[!?。，、！？😂🤣\s]+$/,
  /^.{0,2}$/,
  /^(你们|能不能|别吵|为什么)/,
];

// Semantic boost patterns
const SEMANTIC_PATTERNS: { pattern: RegExp; category: string; boost: number }[] = [
  { pattern: /(来个|出现|遇到|碰到|招募).{0,5}(人|兵|医|孩|狗|猫|机器)/, category: "CHARACTER", boost: 2 },
  { pattern: /(找到|捡到|地上有|获得|给他|拿到|有个|里有)/, category: "ITEM", boost: 1.5 },
  { pattern: /(去|前往|探索|进入).{0,5}/, category: "LOCATION", boost: 2 },
  { pattern: /(突然|听到|有人|发生|出现了)/, category: "EVENT", boost: 1.5 },
  { pattern: /^(生成|来个|要|让|给).{2,}/, category: "EVENT", boost: 1 },
];

// ============================================================
// 分类器
// ============================================================

export function processComments(raw: RawComment[]): ProcessedComments {
  const actionable: ActionableComment[] = [];
  const envKeywords: Record<string, number> = {};
  let ignoredCount = 0;

  for (const comment of raw) {
    const text = comment.text.trim().toLowerCase();

    // Noise filter
    if (NOISE_PATTERNS.some((p) => p.test(text))) {
      ignoredCount++;
      continue;
    }

    // Environment keywords
    for (const [key, keywords] of Object.entries(ENVIRONMENT_KEYWORDS)) {
      if (keywords.some((kw) => text.includes(kw))) {
        envKeywords[key] = (envKeywords[key] || 0) + 1;
      }
    }

    // Keyword scoring (aligned with Python classifier)
    const scores: Record<string, number> = { EVENT: 0, CHARACTER: 0, ITEM: 0, LOCATION: 0 };
    const matches: Record<string, string[]> = { EVENT: [], CHARACTER: [], ITEM: [], LOCATION: [] };

    for (const kw of EVENT_KEYWORDS) {
      if (text.includes(kw)) { scores.EVENT++; matches.EVENT.push(kw); }
    }
    for (const kw of CHARACTER_KEYWORDS) {
      if (text.includes(kw)) { scores.CHARACTER++; matches.CHARACTER.push(kw); }
    }
    for (const kw of ITEM_KEYWORDS) {
      if (text.includes(kw)) { scores.ITEM++; matches.ITEM.push(kw); }
    }
    for (const kw of LOCATION_KEYWORDS) {
      if (text.includes(kw)) { scores.LOCATION++; matches.LOCATION.push(kw); }
    }

    // Semantic boost
    for (const { pattern, category, boost } of SEMANTIC_PATTERNS) {
      if (pattern.test(text) && scores[category] !== undefined) {
        scores[category] += boost;
      }
    }

    // CHARACTER > ITEM disambiguation
    if (scores.CHARACTER > 0 && scores.ITEM > 0) {
      if (/[的|拿着|带着|持着|穿着|戴着]/.test(text)) {
        scores.CHARACTER += 1.5;
      }
    }

    // Pick best
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) {
      if (text.length > 8) {
        actionable.push({ user: comment.user, text: comment.text, type: "event_create", confidence: 0.4 });
      } else {
        ignoredCount++;
      }
      continue;
    }

    const bestCat = Object.entries(scores).reduce((a, b) => b[1] > a[1] ? b : a)[0];
    const confidence = Math.min(0.95, 0.5 + maxScore * 0.15);

    const typeMap: Record<string, ActionableComment["type"]> = {
      EVENT: "event_create",
      CHARACTER: "npc_create",
      ITEM: "item_summon",
      LOCATION: "location_create",
    };

    actionable.push({
      user: comment.user,
      text: comment.text,
      type: typeMap[bestCat] || "event_create",
      confidence,
    });
  }

  actionable.sort((a, b) => b.confidence - a.confidence);
  const bestComment = actionable.length > 0 ? actionable[0] : null;

  return { actionable, bestComment, environmentKeywords: envKeywords, ignoredCount };
}

export function checkCollectiveWill(
  envKeywords: Record<string, number>,
  threshold = 3,
): string | null {
  for (const [key, count] of Object.entries(envKeywords)) {
    if (count >= threshold) return key;
  }
  return null;
}
