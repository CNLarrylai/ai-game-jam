/* ============================================================
   data.jsx — static game content for WASTELAND LIVE
   exported to window for other babel scripts
   ============================================================ */

// Ambient comments that auto-stream into the chat to feel alive.
const AMBIENT_COMMENTS = [
  { user: "夜行猫", av: "🐱", text: "主播加油！这局一定能活下来" },
  { user: "K", av: "🦊", text: "饱腹有点低了 先吃东西吧" },
  { user: "废土老兵", av: "🪖", text: "门外那个声音不对劲，别开门", mod: true },
  { user: "椰奶", av: "🥥", text: "敲门的会不会是同伴回来了？" },
  { user: "Z3RO", av: "🤖", text: "理智要崩了 哈哈哈哈" },
  { user: "小满", av: "🌙", text: "好紧张啊这剧情" },
  { user: "电子幽灵", av: "👻", text: "把绷带留着 后面战斗要用" },
  { user: "番茄罐头", av: "🥫", text: "我投开门！万一是补给呢" },
  { user: "雾", av: "🌫️", text: "废弃医院应该有药 去那边" },
  { user: "阿七", av: "🎲", text: "666 这AI生成的太离谱了" },
  { user: "Luna", av: "🌟", text: "招募那个NPC！她看着很强" },
  { user: "锈铁", av: "⚙️", text: "陷阱布起来 苟住" },
  { user: "甜筒", av: "🍦", text: "主播声音好好听" },
  { user: "深蓝", av: "🐟", text: "Day3了 进度好快" },
  { user: "脉冲", av: "📡", text: "投闪避！硬刚会死" },
  { user: "纸鹤", av: "🕊️", text: "那只机械狗能驯服吗" },
  { user: "嗝", av: "🫧", text: "进来看看 弹幕护体" },
  { user: "老猫不睡", av: "😼", text: "物资只剩一半了 省着点" },
];

// Items in the shelter / pack
const ITEMS = {
  can:    { id: "can",    icon: "🥫", name: "罐头",     kind: "consume", effect: { hunger: 30 }, effText: "饱腹 +30", qty: 3 },
  bandage:{ id: "bandage",icon: "🩹", name: "绷带",     kind: "consume", effect: { hp: 25 },     effText: "HP +25",  qty: 1 },
  water:  { id: "water",  icon: "💧", name: "净水",     kind: "consume", effect: { hunger: 12, sanity: 8 }, effText: "饱腹 +12 理智 +8", qty: 2 },
  pills:  { id: "pills",  icon: "💊", name: "镇静剂",   kind: "consume", effect: { sanity: 30 }, effText: "理智 +30", qty: 1 },
  flashlight:{ id:"flashlight", icon:"🔦", name:"军用手电筒", kind: "tool", effect:{}, effText:"被动：探索时多揭开 1 格视野", qty: 1 },
  scrap:  { id: "scrap",  icon: "🔩", name: "废铁",     kind: "material", effect: {}, effText: "材料：交易 / 设置陷阱时消耗", qty: 2 },
};

const COMPANIONS = [
  { id: "rin", name: "凛", av: "👩‍🔧", role: "机械师", status: "健康",
    detail: "前避难所工程师。能修理装备、破解电子锁。受伤时战斗力下降。", hp: 80, mood: "冷静",
    skill: { id: "fix", label: "检修装备", icon: "🔧", effect: { sanity: 8 },
      line: "凛检修了你的护甲与门锁，机械的咔哒声让人安心。理智 +8。", note: "恢复 理智 · 每天一次" },
    ask: "「装备还能修，就是零件不够。出门记得帮我留意废铁。」" },
  { id: "doc", name: "老K", av: "🧓", role: "军医", status: "轻伤",
    detail: "退役军医，擅长急救与药品识别。腿部旧伤，长途移动消耗更多行动点。", hp: 55, mood: "疲惫",
    skill: { id: "heal", label: "应急治疗", icon: "🩹", effect: { hp: 14 },
      line: "老K为你清创、上药、注射消炎针。伤口不再渗血。HP +14。", note: "恢复 HP · 每天一次" },
    ask: "「药品快见底了，真正的重伤我也救不回来。省着点用。」" },
];

// Destinations for 选择目的地
const DESTINATIONS = [
  { id: "hospital", icon: "🏥", name: "废弃医院", danger: 3, reward: "药品 / 绷带",
    ap: 3, generated: true, by: "雾",
    confirm: "确定前往废弃医院？据点深处疑似有机械守卫。" },
  { id: "market", icon: "🏪", name: "塌陷超市", danger: 2, reward: "食物 / 净水", ap: 2,
    confirm: "确定前往塌陷超市？结构不稳，可能坍塌。" },
  { id: "station", icon: "📻", name: "广播电台", danger: 4, reward: "情报 / 信号枪", ap: 4,
    confirm: "确定前往广播电台？高处暴露，危险等级高。" },
  { id: "tunnel", icon: "🚇", name: "地铁隧道", danger: 3, reward: "通道线索", ap: 3,
    confirm: "确定前往地铁隧道？黑暗中有未知生物的声音。" },
];

// NPC for map encounter
const MAP_NPC = {
  name: "拾荒者 老鸦", av: "🧑‍🦲",
  line: "活人？真稀奇。我这儿有罐头和子弹……你拿什么换？",
  options: [
    { id: "trade", label: "交易", icon: "🔁", sub: "用废铁换罐头" },
    { id: "recruit", label: "招募", icon: "🤝", sub: "邀请加入队伍" },
    { id: "info", label: "询问情报", icon: "🗺️", sub: "打听逃离通道" },
    { id: "leave", label: "离开", icon: "🚶", sub: "不冒险" },
  ],
};

// Hex tiles laid out by axial-ish pixel coords (col,row offsets)
// type: hero / fog / empty / search / npc / battle / generated(loot)
const HEX_TILES = [
  { id: "c",  x: 0,  y: 0,  type: "hero",   label: "你" },
  { id: "n",  x: 0,  y: -1, type: "search", label: "药房", icon: "🏥",
    title: "🏥 废弃药房", desc: "货架翻倒，几个药盒散落在地。深处有金属反光。" },
  { id: "ne", x: 1,  y: -1, type: "fog" },
  { id: "se", x: 1,  y: 0,  type: "npc",    label: "?", icon: "❓" },
  { id: "s",  x: 0,  y: 1,  type: "battle", label: "!", icon: "⚠️", generated: true, by: "纸鹤",
    title: "机械守卫", desc: "一只生锈的机械犬挡住了去路，红色光学镜锁定了你。" },
  { id: "sw", x: -1, y: 1,  type: "fog" },
  { id: "w",  x: -1, y: 0,  type: "empty" },
  { id: "nw", x: -1, y: -1, type: "fog" },
  // outer ring (all fog initially)
  { id: "nn", x: 0,  y: -2, type: "fog" },
  { id: "ss", x: 0,  y: 2,  type: "fog" },
  { id: "ww", x: -2, y: 0,  type: "fog" },
  { id: "ee", x: 2,  y: 0,  type: "fog" },
];

// Settlement data
const TIMELINE = [
  { day: "DAY 1", evt: "在废弃避难所醒来，清点初始物资", src: null },
  { day: "DAY 2", evt: "敲门事件——选择开门，迎入幸存者「凛」", src: "番茄罐头：我投开门！万一是补给呢" },
  { day: "DAY 3", evt: "突袭废弃医院，遭遇 AI 生成的机械守卫 Boss", src: "纸鹤：那只机械狗能驯服吗" },
  { day: "DAY 4", evt: "拾荒者老鸦提供逃离通道情报", src: "雾：废弃医院应该有药 去那边" },
  { day: "DAY 5", evt: "暴风雪降临，物资告急，理智逼近崩溃", src: "脉冲：投闪避！硬刚会死" },
];

const LEADERBOARD = [
  { medal: "🥇", title: "最佳创意官", av: "🌫️", name: "雾", count: "被采纳 7 次",
    detail: "贡献了医院、药房、逃离通道等关键地点设定。" },
  { medal: "🎨", title: "最强脑洞", av: "🕊️", name: "纸鹤", count: "影响力 MAX",
    detail: "「那只机械狗能驯服吗」",
    shot: "→ AI 生成了 Boss「机械守卫」，并开放了驯服分支" },
  { medal: "🗳️", title: "最佳指挥", av: "📡", name: "脉冲", count: "正确决策 5 次",
    detail: "在投票决策中多次带领队伍选中存活率最高的方向。" },
  { medal: "💀", title: "最强搅局", av: "🤖", name: "Z3RO", count: "制造危机 4 次",
    detail: "「把它放出来！」——召唤了暴风雪与第二只守卫。(趣味奖)" },
];

const GLOBAL_STATS = [
  { v: "1,284", k: "条评论\n影响了本场游戏" },
  { v: "37", k: "个 AI 生成事件 /\n12 物品 / 5 角色" },
  { v: "Day 3", k: "最活跃时刻\nBoss战 86条/分钟" },
];

const WIN_RECAP = [
  { icon: "🚪", cap: "开门迎入幸存者凛", src: "by 番茄罐头" },
  { icon: "🤖", cap: "驯服机械守卫", src: "by 纸鹤" },
  { icon: "📻", cap: "破译电台信号", src: "by 雾" },
  { icon: "🌅", cap: "找到逃离通道", src: "by 脉冲" },
];

/* spam-burst simulation — identical content the AI will merge/dedupe */
const SPAM_PHRASES = [
  "开门！开门！开门！",
  "机械狗机械狗机械狗",
  "6666666666",
  "主播快跑啊啊啊啊",
  "沉默！沉默！沉默！",
  "招募她招募她招募她",
];
const SPAM_USERS = [
  { user: "路人A", av: "🫥" }, { user: "刷屏怪", av: "😵" }, { user: "复读机", av: "🦜" },
  { user: "围观群众", av: "🧑" }, { user: "666", av: "🔢" }, { user: "echo", av: "📣" },
  { user: "跟风党", av: "🌀" }, { user: "弹幕侠", av: "🗯️" },
];

Object.assign(window, {
  AMBIENT_COMMENTS, ITEMS, COMPANIONS, DESTINATIONS, MAP_NPC, HEX_TILES,
  TIMELINE, LEADERBOARD, GLOBAL_STATS, WIN_RECAP, SPAM_PHRASES, SPAM_USERS,
});
