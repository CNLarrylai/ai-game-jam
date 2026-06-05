import type { GeneratedGame } from "./generation";

/**
 * 🛟 离线兜底生成器（无 ANTHROPIC_API_KEY / 无网时使用）
 * ============================================
 * 用「关键词密度分类 → 机制匹配 → 模板装配」这套规则，把小说粗粒度地变成一个可玩剧本。
 * 它是生成层（lib/generation.ts 调真模型那条路）的轻量替身：
 * 同样走「识别 genre → 匹配 mechanic → 套世界圣经模板」的路由链，只是用规则而非 LLM。
 * 质量当然不如真模型，但保证本地演示永远有结果。
 */

/** 所有生成剧本通用的 GM 基本规则（与 lib/scenarios.ts 的 BASE_RULES 保持一致语气）。 */
const GM_RULES = `你是这个互动故事的「游戏主持人」(Game Master)。规则：
1. 用第二人称「你」称呼玩家，沉浸式地描写场景、NPC 和玩家行动的后果。
2. 每次回复控制在 2-4 段，结尾自然地把主动权交还玩家（一个处境、一个抉择、或一个开放问题）。
3. 玩家的行动可能成功也可能失败——让世界有真实因果，不要一味顺着玩家。
4. 绝不替玩家做决定，也不要跳出角色谈论"作为 AI"之类的话。
5. 全程使用中文，语气符合本剧本设定。`;

interface GenreProfile {
  genre: string;
  mechanic: string;
  emoji: string;
  /** 命中越多分越高的关键词 */
  keywords: string[];
  tagline: string;
  /** 世界观 + 机制玩法循环（会拼进 systemPrompt） */
  world: string;
  /** 开场白模板，title 为剧本名 */
  opening: (title: string) => string;
}

const PROFILES: GenreProfile[] = [
  {
    genre: "科幻生存",
    mechanic: "资源管理+抉择",
    emoji: "🚀",
    keywords: ["飞船", "星舰", "太空", "氧气", "辐射", "基地", "病毒", "末日", "废墟", "星球", "舱", "能源", "外星", "幸存", "补给"],
    tagline: "资源在耗尽，每个选择都有代价。",
    world: "这是一个硬核科幻生存故事。氧气、电力、补给都是稀缺资源，玩家的每个选择都在消耗它们。适时给出系统读数（如氧气/电力百分比）增强紧迫感；危机一波接一波，逼迫玩家做艰难取舍。",
    opening: (t) =>
      `警报的红光在舱壁上一明一灭。你扶着冰冷的舱壁站起来，耳边只有自己粗重的呼吸——《${t}》的世界已经不再安全。\n\n主屏幕跳出一行字：补给即将告罄。走廊尽头通向控制室，另一侧是储藏舱的方向。你先去哪？`,
  },
  {
    genre: "悬疑探案",
    mechanic: "线索推理",
    emoji: "🔍",
    keywords: ["凶手", "线索", "案件", "侦探", "谋杀", "尸体", "真相", "嫌疑", "密室", "血迹", "失踪", "警探", "推理", "证据", "命案"],
    tagline: "一桩疑案，真相藏在每个谎言之下。",
    world: "这是一个悬疑探案故事。玩家是被卷入案件的调查者。现场散落着线索、会说谎的 NPC、彼此矛盾的证词。逐步释放线索，不要一次倒出真相；让玩家通过盘问、勘查与推断自己拼出答案。",
    opening: (t) =>
      `雨水顺着屋檐砸在青石板上。你站在《${t}》案发现场的门口，空气里有一股说不清的气味，几个人影在屋内低声交谈，看见你都停了下来。\n\n桌上有一封没写完的信，地上有一道被擦过的痕迹。你先查看哪一个？`,
  },
  {
    genre: "武侠修仙",
    mechanic: "养成 RPG",
    emoji: "⚔️",
    keywords: ["江湖", "剑", "内力", "门派", "师父", "修炼", "真气", "境界", "灵气", "法宝", "武功", "侠", "丹", "宗门", "弟子"],
    tagline: "一步一境界，刀光里有你的道。",
    world: "这是一个武侠/修仙养成故事。玩家从微末起步，通过历练、际遇与抉择提升境界与名望。给出修为/声望等成长反馈；江湖有恩怨、有机缘，玩家的选择决定走正走邪、结友结仇。",
    opening: (t) =>
      `山道上风过松林。你背着一柄旧剑，站在《${t}》的世界里——名声未起，气血尚浅，可心里那点不甘已经按不住了。\n\n岔路一边通向喧闹的镇子，一边没入云雾深处的山门。你往哪边走？`,
  },
  {
    genre: "宫斗权谋",
    mechanic: "关系/社交策略",
    emoji: "👑",
    keywords: ["皇帝", "皇后", "妃", "朝廷", "宫", "太后", "大臣", "册封", "圣旨", "后宫", "联姻", "权势", "宦官", "储君", "党争"],
    tagline: "笑里藏刀，每句话都是一步棋。",
    world: "这是一个宫斗/权谋故事。玩家身处暗流涌动的权力场，每个 NPC 都有立场与算计。用关系与人心做资源：示好、结盟、试探、舍弃都有代价与回报。让玩家在一次次站队与权衡中改变自己的处境。",
    opening: (t) =>
      `宫灯次第亮起，长廊尽头传来脚步声。你立在《${t}》的深宫之中，知道今夜每一个眼神都不是偶然。\n\n一名内侍悄悄递来一张字条，而对面的贵人正含笑看着你。你是先接字条，还是先回那一笑？`,
  },
  {
    genre: "都市言情",
    mechanic: "恋爱养成分支",
    emoji: "💕",
    keywords: ["爱", "喜欢", "心动", "约会", "吻", "恋人", "暗恋", "告白", "男友", "女友", "心跳", "暧昧", "前任", "缘分"],
    tagline: "心动是开始，结局由你写。",
    world: "这是一个都市言情故事，核心是关系与情感的推进。NPC 有各自的性格与心结；玩家的言行影响好感与信任，通往不同的结局。让情感节奏有起伏，既有甜，也有误会与抉择。",
    opening: (t) =>
      `咖啡馆的玻璃上还挂着雨珠。你抬头，正撞上 ta 的目光——《${t}》的故事，好像就从这一刻被按下了开始键。\n\nta 似乎想说什么，又停住了。你是先开口打破沉默，还是等 ta 先迈出那一步？`,
  },
  {
    genre: "奇幻冒险",
    mechanic: "探索 roguelike",
    emoji: "🗺️",
    keywords: ["魔法", "精灵", "巨龙", "矮人", "王国", "骑士", "法师", "魔王", "冒险", "城堡", "咒语", "勇者", "魔兽", "封印", "圣物"],
    tagline: "未知的地图，未知的命运。",
    world: "这是一个奇幻冒险故事。世界广阔而危险，路上有未知的地图、随机的遭遇、可结盟也可背叛的同伴。鼓励玩家探索与冒险，给出选择的真实后果；宝藏与陷阱往往并存。",
    opening: (t) =>
      `晨雾还没散尽，你站在《${t}》大陆的岔路口，背包里只有半块干粮和一张残缺的地图。\n\n左边的小径通向冒着炊烟的村庄，右边是传说中没人活着回来的古林。你选哪条路？`,
  },
  {
    genre: "恐怖惊悚",
    mechanic: "生存恐怖+抉择",
    emoji: "🕯️",
    keywords: ["鬼", "恐惧", "黑暗", "诅咒", "尖叫", "亡灵", "坟", "幽灵", "惊悚", "午夜", "献祭", "怨", "邪", "阴森", "厉鬼"],
    tagline: "别回头，黑暗里有东西在看你。",
    world: "这是一个恐怖惊悚故事，靠暗示与氛围而非血腥。资源是你的理智、光源与勇气；越深入越危险。让恐惧逐步累积，给玩家'逃或探'的两难，错误的选择会带来真实而可怕的后果。",
    opening: (t) =>
      `手电的光晕在墙上抖动。你独自站在《${t}》里那扇虚掩的门前，身后的走廊深得像没有尽头，刚才那个声音……不像是风。\n\n门缝里透出极淡的微光。你是推门进去，还是先退回去找别的出路？`,
  },
  {
    genre: "市井江湖",
    mechanic: "经营+人情世故",
    emoji: "🍺",
    keywords: ["酒馆", "生意", "客人", "小镇", "老板", "买卖", "集市", "村", "旅店", "招待", "镖", "茶馆", "街坊", "掌柜"],
    tagline: "进门的客人，个个都带着故事。",
    world: "这是一个市井/江湖人情故事，温暖中带着江湖气。玩家经营一处营生，每个进门的人都带着自己的秘密。通过待客、对话、是否多管闲事，影响小镇命运与自己的生意。NPC 会还价、会撒谎、也会回报善意。",
    opening: (t) =>
      `炉火噼啪，外头风正紧。你刚擦完最后一只碗，《${t}》里这间小店的门吱呀一声被推开——一个浑身风尘的陌生人走了进来，目光在屋里扫了一圈，落在你身上。\n\nta 在角落坐下：『来点热的，再给我个待到天亮的理由。』你怎么招呼这位客人？`,
  },
];

/** 兜底用的默认画像（什么都没命中时） */
const DEFAULT_PROFILE: GenreProfile = PROFILES.find((p) => p.genre === "奇幻冒险")!;

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let i = haystack.indexOf(needle);
  while (i !== -1) {
    count++;
    i = haystack.indexOf(needle, i + needle.length);
  }
  return count;
}

/** 关键词密度分类：返回得分最高的画像（无信号时回退默认）。 */
function classify(text: string): GenreProfile {
  let best = DEFAULT_PROFILE;
  let bestScore = 0;
  for (const p of PROFILES) {
    const score = p.keywords.reduce(
      (sum, kw) => sum + countOccurrences(text, kw),
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}

/** 从小说文本/标题里取一个剧本名。 */
function deriveTitle(text: string, hintTitle: string | undefined, genre: string): string {
  const hint = hintTitle?.trim();
  if (hint) return hint.slice(0, 16);
  const firstLine = text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (firstLine) {
    // 取第一句（到标点为止），再截断
    const sentence = firstLine.split(/[。！？.!?，,]/)[0].trim();
    if (sentence.length >= 2) return sentence.slice(0, 16);
  }
  return `无名${genre}`;
}

/** 离线生成主入口：小说文本 → GeneratedGame（offline=true）。 */
export function offlineGenerate(
  novelText: string,
  hintTitle?: string,
): GeneratedGame {
  const text = novelText.replace(/\r\n/g, "\n");
  const profile = classify(text);
  const title = deriveTitle(text, hintTitle, profile.genre);

  // 取一小段原文作为「原著参考」，让 GM 保留原作气味
  const excerpt = text.trim().slice(0, 180).replace(/\s+/g, " ");

  const systemPrompt = `${GM_RULES}

【剧本：${title}】（${profile.genre} · ${profile.mechanic}）
${profile.world}

【原著气味参考】
${excerpt}……
（请延续上述原文的世界观、人物与氛围来主持，但不必照搬情节。）`;

  return {
    title,
    tagline: profile.tagline,
    emoji: profile.emoji,
    genre: profile.genre,
    mechanic: profile.mechanic,
    opening: profile.opening(title),
    systemPrompt,
    offline: true,
  };
}
