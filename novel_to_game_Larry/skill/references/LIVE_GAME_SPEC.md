# 直播间互动游戏数据契约（LIVE_GAME_SPEC）—— 生成层的总目标

**这是 novel→game 的最终产物**：一份 `GAME_DATA`，能直接驱动团队三个直播间游戏壳中的任意一个，让小说变成**可玩的、TikTok-Live 直播间形态**的互动游戏（**不是纯文字 chat**）。

> 三个壳共享同一个 `data.jsx` 数据家族（都源自 WASTELAND LIVE 框架），所以一份契约通吃。PoC 已验证：`public/pixel-poc/` 把这份数据注入像素壳即换皮。

## 直播间形态的硬性要求（"样式兼容直播间"指这些）
任何产出都必须保留这套**直播间灵魂**，否则就退化成普通单机游戏：
1. **70/30 布局**：左 70% 游戏画面，右 30% 直播评论区（顶部主播+在线数、评论流、底部输入框）。顶部常驻状态栏（天数 + 数值条 + 背包）。
2. **观众回路**（signature）：`SCENE_COMMENTS` 弹幕实时流 → AI 采纳"融入游戏世界"（公屏横幅+作者自见+评论高亮）→ 关键抉择/战斗显示实时投票条 → 📢 征集创意倒计时。
3. **数值条 HUD**：4 维资源横条 + 浮动数字（+绿上浮/−红下沉）。
4. **结算**：观众创意排行榜 + 旅程时间线 + 全场统计 + 分享卡。
5. **刷屏去重**：`SPAM_PHRASES` 重复弹幕合并为 ×N，不计采纳权重（反污染演示）。

## GAME_DATA 字段契约（生成这些；缺的字段壳会回退默认，但代入感字段尽量全）

```jsonc
{
  "OPENING": "开局弹窗文案 ≤120字，第一人称，交代此刻处境",
  "INIT_STATS": { "<资源1>":60, "<资源2>":50, "<资源3>":30, "<资源4>":30 },  // 4 维，键名见机制
  "ITEMS": {                       // 5~8 件，含 水/食物/医疗/武器/材料各≥1
    "<key>": { "id":"<key>","icon":"<emoji>","name":"中文名","kind":"consume|weapon|material|tool",
               "effect":{"<资源>":<int>}, "effText":"如 饱腹 +10", "qty":<初始数> }
  },
  "COMPANIONS_POOL": [             // 2~4 个可招募同伴(开局 COMPANIONS=[]，靠事件招募)
    { "id":"","name":"","av":"<emoji>","role":"职业","status":"健康|轻伤","detail":"一句背景",
      "hp":50-90,"mood":"情绪",
      "skill":{ "id":"","label":"技能名","icon":"<emoji>","effect":{"<资源>":<int>},
                "line":"使用后的叙事(体现戏剧功能,可带代价)","note":"恢复X·每天一次" },
      "ask":"「一句台词」" }
  ],
  "COMPANIONS": [],                // 开局同伴(通常空)
  "DESTINATIONS": [               // 3~4 个外出地点(贴小说世界观)
    { "id":"","icon":"<emoji>","name":"中文地名","danger":1-4,"reward":"中文收益",
      "ap":2-4,"confirm":"确定前往…？一句话" }
  ],
  "MAP_NPC": { "name":"","av":"<emoji>","line":"「开场」",
    "options":[ {"id":"trade","label":"交易","icon":"🔁","sub":""},
                {"id":"recruit","label":"招募","icon":"🤝","sub":""},
                {"id":"info","label":"询问情报","icon":"🗺️","sub":""},
                {"id":"leave","label":"离开","icon":"🚶","sub":""} ] },
  "HEX_TILES": [                  // 探索格(保持结构,主题化 label/title/desc)
    {"id":"c","x":0,"y":0,"type":"hero","label":"你"},
    {"id":"n","x":0,"y":-1,"type":"search","label":"","icon":"<emoji>","title":"","desc":""},
    {"id":"se","x":1,"y":0,"type":"npc","label":"?","icon":"❓"},
    {"id":"s","x":0,"y":1,"type":"battle","label":"!","icon":"⚠️","title":"","desc":""},
    // 其余 fog/empty 占位(可照默认 12 格布局)
  ],
  "SCENE_COMMENTS": {            // 🔑 直播间灵魂:分场景弹幕池(贴小说题材+观众脑洞)
    "home":[{"user":"","av":"<emoji>","text":"","mod":true?}...4],
    "organize":[...3], "destination":[...3],
    "explore":[...6]            // explore 要有"生成XX"这种观众创意弹幕(会被采纳生成内容)
  },
  "TIMELINE": [ {"day":"DAY 1","evt":"","src":"弹幕来源?"} ...5 ],   // 结算回放(可少)
  "LEADERBOARD": [...], "GLOBAL_STATS": [...], "WIN_RECAP": [...],   // 结算(缺则回退默认)
  "SPAM_PHRASES": ["重复刷屏短语"...], "SPAM_USERS": [{"user":"","av":""}...]
}
```

## 代入感三件套（我的 CSS 壳还要这三个，见各自 spec）
- `intro.json`（INTRO_SPEC）纯世界观开场 · `opening.json`（OPENING_SCENE_SPEC）开局对白演出+任务 · `dialogue.json`（DIALOGUE_SPEC）同伴互动。
- 像素壳暂未接这三个，先靠 `OPENING` + `SCENE_COMMENTS`；CSS 壳(WORLDS LIVE/最后的人)全接。

## 美术约束（决定能不能在像素壳渲染）
- **像素壳**：`ITEMS`/`COMPANIONS` 的 `icon` 只能用映射集 `💧🐟🥫🍗🔫🩹💊🔩🔧🔦🔋📻🗝️🪢🎒`（emoji→PNG 见壳内 `EMOJI_ICON`），否则回退 emoji、美术不统一 → **像素壳只接末世/生存类小说**。
- **CSS 壳**：emoji/CSS 渲染，任意题材都行，无 icon 约束。

## 资源轴随题材（INIT_STATS 的 4 个键）
| 题材 | 4 维资源（键名） |
|---|---|
| 末世瘟疫/丧尸 | sanity 精神 / health 健康 / hunger 饱腹 / thirst 口渴 |
| 入侵/逃亡(WotW) | life 生命 / supply 补给 / sanity 理智 / conceal 隐蔽 |
| 太空生存 | oxygen 氧气 / power 电力 / sanity 理智 / hull 船体 |
> 要能互相构成"真两难"。`effect`/`skill.effect` 的键必须用本游戏这 4 个。

## 收尾
产出整个 `GAME_DATA` 后：JSON.parse 通过；逐字段自检（ITEMS 五类齐、SCENE_COMMENTS 四场景、像素壳 icon 在允许集）；包成 `window.GAME_DATA = {...}` 即可注入壳（见 `public/pixel-poc/`）。
