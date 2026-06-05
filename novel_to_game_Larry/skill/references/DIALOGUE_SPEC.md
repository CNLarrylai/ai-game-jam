# 人物对话规范(Character dialogue spec)—— 标准产物 · 代入感

**目标**:开局之后,玩家要能在栖身/营地**和同行人物对话**——不只是 NPC 交易,而是**有性格、有原著弧线、随剧情推进会变化**的同伴台词。这是继 intro 之后的第二个代入感模块,**标准交付物**。

## 和现有产物的区别(为什么单独立一个)
- `world_bible.cast` = 角色的弧线/用途(设定层,不是台词)。
- `characters.json` = 角色画像配方(美术层)。
- `interactions.json` 的 NPC = 地图上一次性遭遇(交易/招募/情报)。
- **本产物 = 长期同伴的"对话树"**:问候 + 询问状态 + 技能(带代价的叙事) + 重复闲聊 + 关系推进。WORLDS LIVE 的妻子/牧师/炮兵(`data.jsx` COMPANIONS)是参考实现。

## 输入(主要来自 world_bible.json)
- `cast`:挑出**会长期同行的角色**(role 含 ally/burden/companion/the stake 等),NPC-only 的不做对话树。
- 每个角色的 `arc` + `game_use` = 性格与"技能"的依据。
- `resource_logic` = 技能效果落到哪条资源。
- `spine_type` / `route`:journey 类小说,同伴随"程/天"更替,需标 `present`。

## 输出:`dist/dialogue.json` —— 角色对话数组

```json
[
  {
    "id": "curate",                         // snake_case,与 cast 对应
    "name": "牧师",
    "role": "崩溃中的累赘",                  // 来自 cast.role,一句话点性格
    "present": [3, 4, 5],                    // (journey)在哪些 天/程 同行;holdout 可省略
    "detail": "他是谁、此刻的处境(2-3句,展示弧线)",
    "greeting": "首次对话时的状态白描/问候(定调)",
    "ask": "玩家「询问状态」时他说的话(展现性格,忠于原著语气)",
    "idle": ["重复对话时的闲聊/碎语 1-3 条(避免每次一样)"],
    "skill": {
      "id": "quiet",
      "label": "强行让他安静",               // 对话里的主动选项
      "icon": "🤫",
      "note": "提升 隐蔽 · 代价沉重",         // 选项副标
      "effect": { "conceal": 12, "sanity": -8 },  // 落到资源轴;键=该游戏的资源
      "line": "使用后的叙事文字,**必须体现代价**(忠于角色的戏剧功能)"
    },
    "relationship_beats": ["随剧情推进这个角色的状态/关系变化点(可选,1-2条)"]
  }
]
```

## 设计规则(关键:技能=性格的延伸)
1. **每个同伴的 `skill` 必须呼应其戏剧功能**,不能都是"无脑加资源":
   - 累赘型(如牧师)→ 帮你要付沉重代价(隐蔽↑但理智↓)。
   - 虚假希望型(如炮兵)→ 给安慰但浪费补给/时间。
   - 守护对象(如妻子)→ 彼此宽慰,纯增益但有"失去"的悬念。
2. `effect` 的资源键用**该游戏的资源轴**(瘟疫=food/health/morale;WotW=life/supply/sanity/conceal),与 world_bible.resource_logic 一致。
3. 技能**每天/每程限一次**(游戏壳用 flag 控制,内容侧在 note 注明)。
4. `greeting`/`ask`/`idle`/`line` 全部**忠于角色原著弧线与语气**,别写成通用 NPC。
5. journey 类标 `present`(随 route 更替同伴);holdout 类同伴常驻,可省。
6. 玩家可见文字简体中文;`id`/`effect` 键英文。

## 数量
主要同行角色 **2–4 个**(太多稀释)。从 cast 里挑戏剧张力最强、与主角关系最紧的。

## 游戏壳如何消费
栖身/营地场景点击同伴 → 用 `dialogue.json` 渲染对话(技能/询问/结束),技能触发 `effect` + flag 限次。参考 `applications/war_of_the_worlds/frontend/live/game/scenes-home.jsx` 的 `talk()` + `data.jsx` COMPANIONS。

## 收尾
写文件前确认 `JSON.parse`。回报:产了几个同伴、各自的技能与代价方向。
