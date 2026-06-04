# 模块3:小说 → 末日生存叙事游戏 · 内容引擎

把一整本小说,通过 AI 流水线,转成可玩的"叙事选择游戏"卡点 + 直播互动层。
当前实例:玛丽·雪莱《最后的人》(*The Last Man*, 1826,公共领域,末世瘟疫题材)。

---

## 它做什么

```
小说全文 ──► 切分+密度筛 ──► 世界圣经(底座) ──► 逐章挖卡(密度加权) ──► 厚提炼(直播互动层) ──► 合并校验 ──► 成品
pg18247.txt    chapters.json    world_bible.json    build/cards/*.json       build/rich/*.json        dist/map.json
```

- **世界圣经**:贯穿全局、整个游戏复用的底座(设定、灾难阶段、资源映射、人物、基调、金句)。一份。
- **卡点(node)**:具体的"幸存者两难"抉择,玩家在 食物🥫 / 健康💊 / 士气🔥 三资源间取舍。很多。
- **直播互动层**:在卡点之外,给观众的高频钩子(投票/押注/刷屏/小抉择/金句口播)。

---

## 目录结构

```
module3/
├── README.md                  ← 本文件(索引)
├── package.json               ← npm 脚本:split / merge / gamify
├── data/                      ← 源文件 + 中间产物
│   ├── pg18247.txt            ·   小说原文(已清洗页眉页脚)
│   ├── chapters.json          ·   切章 + 每章关键词密度
│   └── selected.json          ·   密度最高的章(MVP 用)
├── specs/                     ← 提炼规范(引擎/子 agent 吃这个)
│   ├── SPEC.md                ·   逐章挖卡规范(卡点契约)
│   ├── SPEC2.md               ·   厚提炼规范(直播互动层)
│   └── WORLDBIBLE.md          ·   世界圣经 schema(可复用)
├── scripts/                   ← 流水线脚本(Node, ESM)
│   ├── split.mjs              ·   步骤1-2:切分 + 密度筛
│   ├── merge.mjs              ·   步骤7:合并 + 全量契约校验
│   └── gamify.mjs             ·   步骤5(API 引擎,需 ANTHROPIC_API_KEY)
├── build/                     ← 逐章中间产物
│   ├── cards/                 ·   每章卡点(19 章 × json)
│   └── rich/                  ·   厚提炼(直播互动层,样板 V2-CVIII)
├── dist/                      ← 成品(下游前端/直播端消费)
│   ├── world_bible.json       ·   全局底座
│   ├── map.json               ·   主线:第二三卷 19 章 × 38 卡点
│   └── prologue_cards.json    ·   第一卷 3 张过桥卡(已缝入主线)
└── docs/
    └── METHODOLOGY.md         ← 可复用方法论(换任何小说照走)
```

---

## 怎么跑

```bash
npm install                 # 装 @anthropic-ai/sdk(gamify 才需要)
npm run split               # 切章 + 密度筛 → data/
npm run merge               # 合并 build/cards/*.json → dist/map.json 并校验
npm run gamify              # (可选)用 Claude API 提炼 selected 章;需 ANTHROPIC_API_KEY
```

**两种提炼引擎,输出同一契约:**
- **API 引擎** `scripts/gamify.mjs`(`claude-opus-4-8` + structured outputs);批量扩展时省事。
- **In-harness 引擎**:由 Claude 子 agent 读 spec + 章节直接产出(无需 API key);当前 38 卡点即此法所出。

---

## 卡点输出契约(前端只认这个)

```jsonc
{
  "id": "refugees_at_windsor", "title": "门外的逃难者",
  "desc": "情境 2-3 句", "generated": true, "icon": "🚪",
  "choices": [{
    "id": "shelter", "label": "收留他们", "hint": "选前的模糊暗示",
    "costs": [{"res":"food","d":-2},{"res":"morale","d":2}],
    "risk": true,
    "outcome": {"emoji":"🤝","title":"你敞开了门","body":"选后揭晓的后果"},
    "next": "outbreak_in_camp", "effects": []
  }]
}
```
规则:每卡 2-3 真两难选项;代价落在 food/health/morale;**每卡至少一个 `risk:true`**(精确 costs/outcome 选后揭晓);`effects` 记因果。

---

## 当前进度

| 部分 | 状态 |
|---|---|
| 切分 + 密度筛(30 章) | ✅ |
| 世界圣经 `dist/world_bible.json` | ✅ |
| 主线卡点:第二三卷 19 章 × 38 卡点 `dist/map.json` | ✅ 全量校验通过 |
| 第一卷过桥卡 3 张 `dist/prologue_cards.json` | ✅ 已缝入主线 |
| 直播互动层 `build/rich/` | 🟡 样板 1 章(V2-CVIII),待铺开 19 章 |
| effects 升级成真资源传导 | ⬜ 待做 |
| 补 Introduction(女巫洞穴框架) | ⬜ 待做 |

方法论与复用蓝本见 [`docs/METHODOLOGY.md`](docs/METHODOLOGY.md)。
