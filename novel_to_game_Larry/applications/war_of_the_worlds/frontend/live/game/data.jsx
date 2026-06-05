/* ============================================================
   data.jsx — WORLDS LIVE 静态内容（《世界大战》忠于原著改编）
   资源轴：生命 life / 补给 supply / 理智 sanity / 隐蔽 conceal
   隐蔽 = 不被火星人看见的程度，越高越安全（≤0 即被热射线发现）。
   导出到 window 供其它 babel 脚本使用。
   ============================================================ */

/* —— 弹幕：观众在看一场"火星入侵生存直播" —— */
const AMBIENT_COMMENTS = [
  { user: "煤气灯下", av: "🕯️", text: "别走大路！三脚机器人就盯着空地上的人", mod: true },
  { user: "泰晤士河水鬼", av: "🌊", text: "隐蔽快见底了 天亮前找个地窖躲起来" },
  { user: "怀表先生", av: "⏱️", text: "主播你老婆还在莱瑟黑德吧 快去接她啊" },
  { user: "红草观察员", av: "🟥", text: "那片红色的草……地球的植物不是这样的" },
  { user: "Z3RO", av: "🤖", text: "牧师又要崩溃了 哈哈哈他会害死你" },
  { user: "梅伯里旧邻", av: "🏚️", text: "我家储藏室还有罐头 可惜回不去了" },
  { user: "号角报记者", av: "📰", text: "号外！炮兵说要住进下水道重建人类文明" },
  { user: "黑烟里的猫", av: "🐈‍⬛", text: "黑烟是会沉的 往高处走" },
  { user: "雷霆之子号", av: "🚢", text: "海岸边有铁甲舰在掩护难民撤离！" },
  { user: "看不见的火", av: "🔥", text: "热射线一扫一条焦土线 千万别点火把" },
  { user: "牧师的良心", av: "⛪", text: "可怜的牧师……可他真的会引来火星人" },
  { user: "天文台老张", av: "🔭", text: "火星每个晚上发射一枚圆筒 一共十枚" },
  { user: "苟住就赢", av: "🛡️", text: "记住：这仗赢不了 活下去就是胜利" },
  { user: "压缩饼干", av: "🥫", text: "补给低了 翻翻废弃的屋子" },
  { user: "夜行者", av: "🌙", text: "白天别动 晚上贴着墙根走 隐蔽才保得住" },
  { user: "理智余额", av: "🧠", text: "主播深呼吸 别看那些尸体 理智要紧" },
  { user: "细菌教徒", av: "🦠", text: "撑住！火星人扛不住地球的细菌的（剧透）" },
  { user: "围观群众114", av: "🧍", text: "666 这沉浸感绝了" },
];

/* —— 物资 —— */
const ITEMS = {
  bread:    { id: "bread",    icon: "🍞", name: "干面包", kind: "consume", effect: { supply: 0, life: 8 },  effText: "生命 +8", qty: 2 },
  water:    { id: "water",    icon: "💧", name: "净水",   kind: "consume", effect: { life: 6 },             effText: "生命 +6", qty: 2 },
  brandy:   { id: "brandy",   icon: "🥃", name: "白兰地", kind: "consume", effect: { sanity: 14, conceal: -4 }, effText: "理智 +14 隐蔽 -4", qty: 0 },
  blanket:  { id: "blanket",  icon: "🧣", name: "毛毯",   kind: "tool",    effect: {},                      effText: "夜栖时被动保暖（理智）", qty: 0 },
  spade:    { id: "spade",    icon: "🛠️", name: "铁锹",   kind: "tool",    effect: {},                      effText: "可挖掘藏身处（隐蔽）", qty: 0 },
  scrap:    { id: "scrap",    icon: "🔩", name: "废铁",   kind: "material",effect: {},                      effText: "材料：交易/设障时消耗", qty: 1 },
  lamp:     { id: "lamp",     icon: "🪔", name: "提灯",   kind: "tool",    effect: {},                      effText: "照明但增加暴露（慎用）", qty: 0 },
};

const INIT_STATS = { life: 70, supply: 60, sanity: 64, conceal: 75 };

/* —— 同伴：队友互动的核心。忠于原著的"妻子/牧师/炮兵"三段 —— */
/* present 字段：该同伴在哪些 Day 出现在营地 */
const COMPANIONS = [
  { id: "wife", name: "妻子", av: "👰🏻", role: "你要守护的人", status: "惊惶", mood: "强作镇定", hp: 100,
    present: [1, 2],
    detail: "她还在沃金的家里。你必须赶在火星人扩散前，用借来的单马车把她送到莱瑟黑德的亲戚处。她是你撑下去的唯一理由。",
    skill: { id: "comfort", label: "彼此宽慰", icon: "🤍", effect: { sanity: 10 },
      line: "你握住她的手，低声说一切都会过去。短暂的人间温度让你重新站稳。理智 +10。", note: "恢复 理智 · 每天一次" },
    ask: "「我不怕，只要我们在一起。……可你听见远处那声音了吗？」——妻子" },

  { id: "curate", name: "牧师", av: "⛪", role: "崩溃中的累赘", status: "濒临失常", mood: "时而祈祷时而尖叫", hp: 60,
    present: [3, 4, 5],
    detail: "你和他一同被第五枚圆筒砸塌的废宅困住，紧挨着火星人的进食坑。他的信仰已被恐惧击碎——会突然嚎叫、抢夺最后的口粮，他的声音随时会把火星人引来。",
    skill: { id: "quiet", label: "强行让他安静", icon: "🤫", effect: { conceal: 12, sanity: -8 },
      line: "你死死捂住他的嘴，把他按在墙角。火星人的触手没有探进来——但你恨自己这双手。隐蔽 +12，理智 -8。", note: "提升 隐蔽 · 代价沉重" },
    ask: "「上帝为什么抛弃我们？这是末日审判！我们都是罪人——」（他的声音越来越大）——牧师" },

  { id: "gunner", name: "炮兵", av: "🪖", role: "贩卖虚假希望的人", status: "亢奋", mood: "宏图满胸", hp: 85,
    present: [6, 7],
    detail: "帕特尼山下幸存的士兵。他描绘着住进下水道、躲开火星人、重建人类文明的宏伟蓝图——听起来令人振奋。可你注意到，他只挖了几尺土，便整日空想、饮酒、打牌。",
    skill: { id: "dream", label: "听他描绘蓝图", icon: "🗺️", effect: { sanity: 12, supply: -8 },
      line: "他说得眉飞色舞，你几乎要相信人类还有明天。可一整夜过去，洞还是那个洞，口粮却少了。理智 +12，补给 -8。", note: "恢复 理智 · 但消耗补给（虚妄）" },
    ask: "「我们要往地下走，兄弟！让火星人占着地面，我们在它脚底下重建文明！……来喝一杯，明天再挖。」——炮兵" },
];

/* —— 目的地 = 路线的"程"（journey）。每次出门挑下一段路 —— */
const DESTINATIONS = [
  { id: "storeroom", icon: "🏚️", name: "梅伯里自家储藏室", danger: 2, reward: "补给 / 旧物", ap: 3,
    confirm: "确定折返梅伯里的家？那里还有储藏室，但火星人正从霍塞尔公地的坑里扩散开来。" },
  { id: "thames", icon: "🌊", name: "泰晤士河谷渡口", danger: 3, reward: "渡船 / 逃生路线", ap: 4,
    confirm: "确定前往泰晤士河谷？沿河也许能避开三脚机器人，但渡口挤满了惊慌的人群——人群会引来热射线。" },
  { id: "ruin", icon: "🧱", name: "哈利福德废宅", danger: 2, reward: "藏身处 / 但出不去", ap: 2, generated: true, by: "观众投票",
    confirm: "确定钻进哈利福德的半塌废宅？紧挨着第五枚圆筒的落点——是庇护，也可能是出不去的陷阱。" },
  { id: "deadlondon", icon: "🏛️", name: "死寂的伦敦", danger: 4, reward: "未知 / 终局", ap: 4, generated: true, by: "观众评论",
    confirm: "确定走进空无一人的伦敦？红草蔓生，街道死寂。没有人知道那里还剩下什么。" },
];

/* —— 地图上的难民 NPC —— */
const MAP_NPC = {
  name: "逃难的拾荒者", av: "🧳",
  line: "活人？这年头还能碰上活人。我有点吃的和一张往海岸去的路线图……你拿什么换？",
  options: [
    { id: "trade",  label: "交易",     icon: "🔁", sub: "用废铁换干面包" },
    { id: "share",  label: "分一点给他", icon: "🤲", sub: "补给 -，理智 +（人性）" },
    { id: "info",   label: "打听路线",   icon: "🗺️", sub: "问海岸撤离的方向" },
    { id: "avoid",  label: "绕开他",     icon: "🚶", sub: "不冒险接触" },
  ],
};

/* —— 六边形探索格 ——
   type: hero / fog / empty / search / npc / tripod(原 battle，改成"躲避") / weed(红草·理智) */
const HEX_TILES = [
  { id: "c",  x: 0,  y: 0,  type: "hero",   label: "你" },
  { id: "n",  x: 0,  y: -1, type: "search", label: "空屋", icon: "🏚️",
    title: "🏚️ 弃置的民居", desc: "门虚掩着，屋里没有人。橱柜也许还留着没被搜刮干净的食物——但翻找会发出声响。" },
  { id: "ne", x: 1,  y: -1, type: "fog" },
  { id: "se", x: 1,  y: 0,  type: "npc",    label: "?", icon: "❓" },
  { id: "s",  x: 0,  y: 1,  type: "tripod", label: "!", icon: "⚠️", generated: true, by: "纸鹤",
    title: "三脚机器人", desc: "一台百尺高的战斗机器迈过屋脊，钢索般的触手扫过街道。它的镜头还没转向你——热射线一旦亮起，逃无可逃。" },
  { id: "sw", x: -1, y: 1,  type: "fog" },
  { id: "w",  x: -1, y: 0,  type: "weed",   label: "红草", icon: "🟥",
    title: "🟥 蔓生的红草", desc: "火星带来的猩红藤蔓爬满了断墙与河岸，把熟悉的英格兰染成另一颗星球的颜色。看久了，人会发疯。" },
  { id: "nw", x: -1, y: -1, type: "fog" },
  { id: "nn", x: 0,  y: -2, type: "fog" },
  { id: "ss", x: 0,  y: 2,  type: "fog" },
  { id: "ww", x: -2, y: 0,  type: "fog" },
  { id: "ee", x: 2,  y: 0,  type: "fog" },
];

/* —— 结算用 —— */
const TIMELINE = [
  { day: "DAY 1", evt: "霍塞尔公地坠落圆筒，人群围观奇景", src: null },
  { day: "DAY 2", evt: "热射线初屠，你带妻子连夜逃往莱瑟黑德", src: "怀表先生：快去接她啊" },
  { day: "DAY 3", evt: "暴风雨夜单马车倾覆，与妻失散；钻进哈利福德废宅", src: "煤气灯下：别走大路" },
  { day: "DAY 4", evt: "第五枚圆筒砸塌废宅，与牧师困守火星人坑旁", src: "牧师的良心：可他真的会引来火星人" },
  { day: "DAY 5", evt: "牧师精神崩溃、嚎叫引敌，被触手拖走", src: "Z3RO：他会害死你" },
  { day: "DAY 6", evt: "走出废宅，独行进入红草蔓生的死寂伦敦", src: "红草观察员：地球的植物不是这样的" },
  { day: "DAY 7", evt: "火星人被地球细菌击倒，你活了下来", src: "细菌教徒：撑住！" },
];

const LEADERBOARD = [
  { medal: "🥇", title: "最佳向导", av: "🌙", name: "夜行者", count: "被采纳 7 次",
    detail: "贡献了'白天藏、夜里走'的隐蔽路线，多次替主播避开热射线。" },
  { medal: "🎨", title: "最强脑洞", av: "🕊️", name: "纸鹤", count: "影响力 MAX",
    detail: "「那台机器能躲过去吗」",
    shot: "→ 触发了'屏息潜行躲避三脚机器人'的隐蔽对峙，而非硬碰硬" },
  { medal: "🗳️", title: "最佳指挥", av: "🛡️", name: "苟住就赢", count: "正确决策 5 次",
    detail: "在投票里坚持'隐蔽优先、绝不点火把'，带队选中存活率最高的方向。" },
  { medal: "💀", title: "最强搅局", av: "🤖", name: "Z3RO", count: "制造危机 4 次",
    detail: "「让牧师喊出来！」——差点把火星人引进废宅。(趣味奖)" },
];

const GLOBAL_STATS = [
  { v: "1,898", k: "条弹幕\n影响了本场逃亡" },
  { v: "25", k: "个沿途据点 /\n7 段路线 / 3 位同伴" },
  { v: "DAY 5", k: "最揪心时刻\n废宅对峙 92条/分钟" },
];

const WIN_RECAP = [
  { icon: "🐎", cap: "连夜送妻去莱瑟黑德", src: "by 怀表先生" },
  { icon: "🤫", cap: "废宅里捂住牧师躲过触手", src: "by 苟住就赢" },
  { icon: "🌙", cap: "夜行避开三脚机器人", src: "by 夜行者" },
  { icon: "🦠", cap: "等到火星人被细菌击倒", src: "by 细菌教徒" },
];

/* —— 刷屏模拟（演示去重，不计采纳权重） —— */
const SPAM_PHRASES = [
  "快跑啊啊啊啊", "躲起来躲起来", "6666666666",
  "别开灯别开灯", "送老婆！送老婆！", "听炮兵的！听炮兵的！",
];
const SPAM_USERS = [
  { user: "路人A", av: "🫥" }, { user: "刷屏怪", av: "😵" }, { user: "复读机", av: "🦜" },
  { user: "围观群众", av: "🧑" }, { user: "1898", av: "🔢" }, { user: "echo", av: "📣" },
  { user: "跟风党", av: "🌀" }, { user: "弹幕侠", av: "🗯️" },
];

Object.assign(window, {
  AMBIENT_COMMENTS, ITEMS, INIT_STATS, COMPANIONS, DESTINATIONS, MAP_NPC, HEX_TILES,
  TIMELINE, LEADERBOARD, GLOBAL_STATS, WIN_RECAP, SPAM_PHRASES, SPAM_USERS,
});
