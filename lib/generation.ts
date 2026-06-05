import type { ChatMessage, Scenario } from "./types";

/**
 * 📖 → 🎮  小说转游戏：生成层
 * ============================================
 * 这一层对应整体架构里的「Router 匹配器 + Adapter 绑定层」：
 *   小说原文 → 识别类型(genre) → 匹配机制(mechanic) → 提炼世界圣经 → 产出可玩剧本
 * 产物 GeneratedGame 比 Scenario 多了 genre / mechanic 两个字段，
 * 纯粹是为了在界面上把"路由过程"展示给用户看（识别到什么类型、匹配了什么机制）。
 */

export interface GeneratedGame {
  /** 剧本名 */
  title: string;
  /** 一句话简介 */
  tagline: string;
  /** 单个 emoji 封面 */
  emoji: string;
  /** 识别出的小说类型，如「科幻生存」「哥特悬疑」 */
  genre: string;
  /** 匹配到的游戏机制，如「资源管理+抉择」「线索推理」 */
  mechanic: string;
  /** 开场白 */
  opening: string;
  /** 给游戏主持人(GM)用的系统提示词 */
  systemPrompt: string;
  /** 是否由离线兜底引擎（规则版，非真模型）生成 */
  offline?: boolean;
}

/** 生成层的系统提示词：把一段小说改造成一份可玩的剧本配置。 */
export const GENERATION_SYSTEM_PROMPT = `
你是一个「叙事 → 游戏」适配引擎。给你一段小说原文（可能是节选），把它改造成一个可玩的互动叙事游戏的「剧本配置」。

按以下步骤思考，但最终只输出 JSON：
1. 识别小说类型（genre），如：科幻生存、哥特悬疑、武侠修仙、宫斗权谋、都市言情、奇幻冒险、历史战争、恐怖惊悚……用简短中文短语。
2. 从下面的「机制目录」里，挑一个最贴切的游戏机制（mechanic）：
   - 资源管理+抉择（生存压力，如末日/星舰：氧气/食物/士气等资源在每次选择中消耗）
   - 线索推理（探案/悬疑：收集线索、识破谎言、还原真相）
   - 关系/社交策略（权谋/宫斗：经营立场与人物关系，二选一都有代价）
   - 恋爱养成分支（言情：好感线推进与多结局）
   - 探索 roguelike（冒险/奇幻：未知地图与随机遭遇）
   - 经营+人情世故（市井/江湖：待人接物影响命运与生意）
3. 提炼「世界圣经」核心：世界观设定、核心冲突与利害(stakes)、关键人物、主角此刻的处境。只保留为这套机制服务的信息，其余舍弃。
4. 整合成一个给「游戏主持人(GM)」用的 systemPrompt，必须包含：
   - GM 基本规则：用第二人称「你」沉浸描写；每次回复 2-4 段，结尾把主动权交还玩家（一个处境/一个抉择/一个开放问题）；让世界有真实因果、不一味顺着玩家；绝不替玩家做决定；不跳出角色谈论「作为 AI」；全程中文。
   - 这个剧本的世界观，以及所匹配机制的玩法循环（如生存类适时给出资源读数、推理类逐步释放线索）。
5. 写一段开场白 opening：把玩家拉进故事的此刻，结尾落在一个具体处境或抉择上。

输出要求（严格遵守）：
- 只输出一个 JSON 对象，不要任何解释文字，不要 markdown 代码块围栏。
- 字段：title(剧本名,≤12字)、tagline(一句话简介,≤20字)、emoji(单个最贴切的 emoji)、genre、mechanic、opening(≤180字)、systemPrompt(≤300字)。
- 除 emoji 外全部用中文。
`.trim();

/** 组装发给生成引擎的对话（单轮：把小说节选交给它）。 */
export function buildGenerationMessages(
  novelText: string,
  hintTitle?: string,
): ChatMessage[] {
  const titleLine = hintTitle?.trim()
    ? `小说标题（参考）：${hintTitle.trim()}\n\n`
    : "";
  return [
    {
      role: "user",
      content: `${titleLine}下面是小说原文（可能是节选），请据此生成剧本配置 JSON：\n\n"""\n${novelText}\n"""`,
    },
  ];
}

/**
 * 采样小说文本：太长时取「头 + 中 + 尾」三段，既控制成本，
 * 又能让模型同时看到开端设定、中段冲突和结局走向（粗粒度的张力覆盖）。
 */
export function sampleNovel(text: string, cap = 9000): string {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (clean.length <= cap) return clean;
  const head = clean.slice(0, Math.floor(cap * 0.5));
  const mid = clean.slice(
    Math.floor(clean.length / 2 - cap * 0.12),
    Math.floor(clean.length / 2 + cap * 0.12),
  );
  const tail = clean.slice(-Math.floor(cap * 0.26));
  return `${head}\n\n……（中段）……\n\n${mid}\n\n……（结尾）……\n\n${tail}`;
}

/** 从模型返回的文本里抽出 JSON 并校验，得到 GeneratedGame。 */
export function parseGeneratedGame(raw: string): GeneratedGame {
  let s = raw.trim();
  // 去掉可能的 ```json ... ``` 围栏
  s = s.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  // 截取第一个 { 到最后一个 }
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("模型未返回有效的 JSON（可能内容被截断，建议精简小说节选后重试）");
  }
  let obj: Partial<GeneratedGame>;
  try {
    obj = JSON.parse(s.slice(start, end + 1));
  } catch {
    throw new Error("生成结果解析失败（JSON 不完整），请重试");
  }

  const required: (keyof GeneratedGame)[] = ["title", "opening", "systemPrompt"];
  for (const k of required) {
    if (!obj[k] || typeof obj[k] !== "string") {
      throw new Error(`生成结果缺少必要字段：${k}`);
    }
  }

  return {
    title: obj.title!.trim(),
    tagline: (obj.tagline || "").trim(),
    emoji: (obj.emoji || "📖").trim() || "📖",
    genre: (obj.genre || "未知类型").trim(),
    mechanic: (obj.mechanic || "互动叙事").trim(),
    opening: obj.opening!.trim(),
    systemPrompt: obj.systemPrompt!.trim(),
  };
}

/** 把生成产物转成游戏可直接使用的 Scenario（带一个临时 id）。 */
export function toScenario(g: GeneratedGame): Scenario {
  return {
    id: `custom-${Date.now().toString(36)}`,
    title: g.title,
    tagline: g.tagline,
    emoji: g.emoji,
    opening: g.opening,
    systemPrompt: g.systemPrompt,
  };
}
