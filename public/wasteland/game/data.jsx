/* ============================================================
   data.jsx — static game content for WASTELAND LIVE
   exported to window for other babel scripts
   ============================================================ */

// Ambient comments — by scene, picked based on current game state
const SCENE_COMMENTS = {
  home: [
    { user: "椰奶", av: "🥥", text: "门口有声音 要不要去看看" },
    { user: "废土老兵", av: "🪖", text: "门外那个声音不对劲 别开门", mod: true },
    { user: "番茄罐头", av: "🥫", text: "我投开门！万一是补给呢" },
    { user: "K", av: "🦊", text: "先吃点东西再出门吧" },
    { user: "Z3RO", av: "🤖", text: "先整理下物资" },
    { user: "甜筒", av: "🍦", text: "这避难所还挺温馨的" },
    { user: "小满", av: "🌙", text: "今天去哪探索？" },
    { user: "电子幽灵", av: "👻", text: "出门前记得带水" },
    { user: "老猫不睡", av: "😼", text: "物资不多了 省着点" },
    { user: "Luna", av: "🌟", text: "有没有什么能吃的" },
  ],
  organize: [
    { user: "K", av: "🦊", text: "饱腹有点低 先吃东西吧" },
    { user: "电子幽灵", av: "👻", text: "把绷带留着 后面可能要用" },
    { user: "锈铁", av: "⚙️", text: "废铁可以做陷阱 别扔" },
    { user: "老猫不睡", av: "😼", text: "鲱鱼罐头虽然难吃但能活命" },
    { user: "番茄罐头", av: "🥫", text: "先喝水吧 渴死了比饿死更快" },
    { user: "小满", av: "🌙", text: "带够物资再出门" },
  ],
  destination: [
    { user: "雾", av: "🌫️", text: "去超市看看 应该有吃的" },
    { user: "Luna", av: "🌟", text: "废弃工厂可能有零件" },
    { user: "纸鹤", av: "🕊️", text: "听说白宫有战时储备粮" },
    { user: "深蓝", av: "🐟", text: "去近的地方 别浪费行动点" },
    { user: "脉冲", av: "📡", text: "危险等级高的地方收获也多" },
    { user: "Z3RO", av: "🤖", text: "去王金鑫家看看" },
    { user: "椰奶", av: "🥥", text: "生成一个泡面工厂！" },
    { user: "废土老兵", av: "🪖", text: "别去太远 回不来就完了", mod: true },
  ],
  explore: [
    { user: "椰奶", av: "🥥", text: "看到一只猫" },
    { user: "脉冲", av: "📡", text: "猫会说话" },
    { user: "深蓝", av: "🐟", text: "拐角遇到马斯克" },
    { user: "雾", av: "🌫️", text: "有一只鬼出现" },
    { user: "甜筒", av: "🍦", text: "出现甄嬛" },
    { user: "Luna", av: "🌟", text: "主播捡到一把冲锋枪" },
    { user: "纸鹤", av: "🕊️", text: "有人问玩家玩不玩TikTok" },
    { user: "电子幽灵", av: "👻", text: "有AI说要反清复明" },
    { user: "老猫不睡", av: "😼", text: "这地方好像有人来过" },
    { user: "番茄罐头", av: "🥫", text: "小心有AI巡逻" },
    { user: "锈铁", av: "⚙️", text: "光头邻居敲门" },
    { user: "废土老兵", av: "🪖", text: "行动点不多了 注意节省", mod: true },
    { user: "Z3RO", av: "🤖", text: "生成一个厨子给主播做饭" },
    { user: "小满", av: "🌙", text: "这猫还怪好的" },
    { user: "阿七", av: "🎲", text: "666" },
    { user: "嗝", av: "🫧", text: "哈哈哈哈哈" },
  ],
};
// Helper: pick comment for current scene
function getSceneComment(scene) {
  var pool = SCENE_COMMENTS[scene] || SCENE_COMMENTS.home;
  return pool[Math.floor(Math.random() * pool.length)];
}
// Keep AMBIENT_COMMENTS for backward compat (fallback)
const AMBIENT_COMMENTS = SCENE_COMMENTS.home.concat(SCENE_COMMENTS.explore);

// Items in the shelter / pack
const ITEMS = {
  water: { id: "water", icon: "💧", name: "矿泉水", kind: "consume", effect: { supply: 10 }, effText: "水分 +10", qty: 3 },
  herring: { id: "herring", icon: "🐟", name: "鲱鱼罐头", kind: "consume", effect: { hunger: 10, sanity: -10 }, effText: "饱腹 +10 精神 -10", qty: 2 },
  catcan: { id: "catcan", icon: "🐱", name: "猫咪罐头", kind: "consume", effect: { hunger: 15 }, effText: "饱腹 +15", qty: 0 },
  gun: { id: "gun", icon: "🔫", name: "冲锋枪", kind: "weapon", effect: {}, effText: "在家不可使用，出门可携带", qty: 0 },
  bandage: { id: "bandage", icon: "🩹", name: "绷带", kind: "consume", effect: { hp: 20 }, effText: "健康 +20", qty: 0 },
  pills: { id: "pills", icon: "💊", name: "镇静剂", kind: "consume", effect: { sanity: 25 }, effText: "精神 +25", qty: 0 },
  scrap: { id: "scrap", icon: "🔩", name: "废铁", kind: "material", effect: {}, effText: "材料：交易时消耗", qty: 0 },
};

const INIT_STATS = { sanity: 60, health: 50, hunger: 30, thirst: 30 };

const COMPANIONS_POOL = [
  { id: "rin", name: "凛", av: "👩‍🔧", role: "机械师", status: "健康",
    detail: "前避难所工程师。能修理装备、破解电子锁。受伤时战斗力下降。", hp: 80, mood: "冷静",
    skill: { id: "fix", label: "检修装备", icon: "🔧", effect: { sanity: 8 },
      line: "凛检修了你的护甲与门锁，机械的咔哒声让人安心。理智 +8。", note: "恢复 理智 · 每天一次" },
    ask: "「装备还能修，就是零件不够。出门记得帮我留意废铁。」" },
  { id: "doc", name: "老K", av: "🧓", role: "军医", status: "轻伤",
    detail: "退役军医，擅长急救与药品识别。腿部旧伤，长途移动消耗更多行动点。", hp: 55, mood: "疲惫",
    skill: { id: "heal", label: "应急治疗", icon: "🩹", effect: { hp: 14 },
      line: "老K为你清创、上药、注射消炎针。伤口不再渗血。健康 +14。", note: "恢复 健康 · 每天一次" },
    ask: "「药品快见底了，真正的重伤我也救不回来。省着点用。」" },
];
// Day 1: no companions. They get recruited through events.
const COMPANIONS = [];

// Destinations for 选择目的地
const DESTINATIONS = [
  { id: "factory", icon: "🏭", name: "废弃工厂", danger: 2, reward: "废铁 / 零件", ap: 3, confirm: "确定前往废弃工厂？里面的机器可能还在运转..." },
  { id: "market", icon: "🏪", name: "大型超市", danger: 3, reward: "食物 / 日用品", ap: 3, confirm: "确定前往大型超市？里面有各种智能产品，危机重重！" },
  { id: "wjx", icon: "🏠", name: "王金鑫家", danger: 1, reward: "未知", ap: 2, confirm: "确定前往王金鑫家？你不知道王金鑫是谁，但家里一般有物资。" },
  { id: "whitehouse", icon: "🏛️", name: "白宫", danger: 4, reward: "武器 / 战时储备", ap: 4, confirm: "确定前往白宫？路途遥远且危险重重。" },
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
  { id: "s",  x: 0,  y: 1,  type: "battle", label: "!", icon: "⚠️",
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
  AMBIENT_COMMENTS, ITEMS, INIT_STATS, COMPANIONS, DESTINATIONS, MAP_NPC, HEX_TILES,
  TIMELINE, LEADERBOARD, GLOBAL_STATS, WIN_RECAP, SPAM_PHRASES, SPAM_USERS,
});
