# AI Game Jam — Project Context

## 项目概述
AI × 直播 × 游戏 Hackathon 项目。末日生存 Roguelike 游戏，主播在直播间操作，观众通过评论影响游戏内容（AI 识别评论并生成事件/道具/角色/场景）。

## 关键文档
- **Prompt 设计文档（飞书）**: https://bytedance.sg.larkoffice.com/docx/IlDUdOZvNo2x7wx1UrOlhWsEgOk
- **游戏框架文档（飞书）**: https://bytedance.larkoffice.com/wiki/V7RGwg4x5iu5MUkObGiccFconEf
- **Hackathon 项目文档**: https://bytedance.larkoffice.com/wiki/HJs0whKmGizO8CkjnTccKLUYnkb

## 目录结构

```
ai-game-jam/
├── app/                          # Next.js 前端（游戏界面）
│   ├── page.tsx                  # 首页：剧本选择
│   └── api/game/route.ts         # 后端：玩家行动 → AI → 流式返回
├── components/                   # React 组件
│   └── GameChat.tsx              # 游戏对话界面
├── lib/                          # 前端工具库
│   ├── ai.ts                     # AI Provider 抽象（Claude / Gemini）
│   ├── scenarios.ts              # 剧本库（3个内置剧本）
│   ├── types.ts                  # 共享类型
│   ├── comment-types.ts          # 评论 + 叙事引擎类型定义
│   ├── comment-intelligence.ts   # 评论分类（规则匹配版）
│   ├── narrative-engine.ts       # AI 叙事引擎
│   └── fallback-events/          # 硬编码兜底事件
├── comment_engine/               # 评论识别 + 剧情生成引擎（cheney）
│   ├── classifier.py             #   评论5类分类器
│   ├── comment_pool.py           #   30s窗口评论池
│   ├── generator.py              #   Claude API 4类内容生成
│   ├── game_state.py             #   游戏状态管理
│   └── game_loop.py              #   主循环（可替换输入/输出）
├── novel_to_game_Larry/          # 小说→游戏卡点 pipeline（Larry）
│   ├── data/                     #   小说原文 + 切章
│   ├── specs/                    #   提炼规范
│   ├── scripts/                  #   流水线脚本
│   ├── build/                    #   中间产物（卡点/互动层）
│   └── dist/                     #   成品（world_bible + map）
├── docs/
│   ├── comment-intelligence-design.md
│   └── event-matrix.md           # 事件矩阵：12场景×10人物×8事件类型
└── tests/
    └── fixtures/                 # 标准测试数据（所有窗口共享）
        └── game-state-day4.json  # Day 4 中期状态 fixture
```

## 游戏世界观
- 近未来 AI 末日，AI 定点清除了所有不对 AI 说"谢谢"的人类（99.99%）
- 像素风 / 暗色复古未来 / 暗黑幽默
- 7天生存周期，Day制推进
- 四项核心数值：HP❤️ / 饱腹🍞 / 理智🧠 / 物资📦

## 每日游戏循环（6阶段）
1. **在家突发事件** — 评论生成，被动触发，每日最多1次
2. **资源整理** — 玩家主动操作，评论不影响
3. **装备出门** — 选择携带物品，评论不影响
4. **选择地图** — 可由评论生成新地点，主播点击征集15s
5. **探索地图** — 5个行动点，每格翻开时采集评论生成内容
6. **回家休息** — 行动点用完或主动回家

## 评论引擎关键设计
- **30秒决策窗口**：每个决策点开窗30秒收集评论
- **5类分类**：EVENT / CHARACTER / ITEM / LOCATION / IRRELEVANT
- **世界观转译**：不兼容的评论不拒绝而是转译（激光枪→损坏的激光笔）
- **连贯性引擎**：每次生成注入完整历史 context，必须 callback 之前的伏笔
- **合码接口**：替换 comment_source 和 render_callback 即可接入真实直播间

## 能力驱动剧情系统（cheney 设计）

### 道具 enables + narrative_hooks
每个道具生成时自带能力标签和可触发场景：
- `enables`: ["ranged_combat", "signal_for_help"] — 系统级能力标签
- `narrative_hooks`: ["远距离对峙时可以威胁敌人"] — 具体场景描述

### 角色结构化 skills
每个同伴有结构化技能，含 type/enables/narrative_hooks，用于互补检查和剧情驱动。

### 连贯性引擎增强
每次生成前注入：
- **AVAILABLE CAPABILITIES** — 从 inventory + companions 自动构建的能力清单
- **NARRATIVE HOOK QUEUE** — 钩子队列，控制"获得道具/同伴后多久出现使用场景"
  - `min_delay` 内不触发（太快不自然）
  - `min_delay ~ max_delay` 之间概率触发
  - `>= max_delay` 强制触发

### 事件生成规则
- 至少1个选项必须使用已有能力
- 同伴技能被使用时，同伴主动发言（角色化台词）
- MUST_TRIGGER 的钩子必须在本次事件中兑现

## 协作规范

### 身份标识
- **cheney**: Prompt 设计 + 能力驱动系统 + 连贯性引擎 + 测试验证
- **Larry**: 小说→游戏卡点 pipeline
- 其他窗口在 commit 时注明自己的分工方向

### 协作原则
1. **单一数据源**: `tests/fixtures/` 下的 JSON 是标准测试状态，所有窗口从这里读
2. **分支隔离**: 各窗口用独立 feature 分支开发，避免冲突
3. **Prompt 同步**: 飞书文档是 prompt 设计的 source of truth，代码中的 prompt 从文档同步
4. **状态变更通知**: 修改共享类型时，需更新本文件并通知其他窗口

## 依赖
- Python 3.9+, anthropic SDK（comment_engine）
- Node.js（前端 + novel pipeline）
- Claude API key（generator.py / narrative-engine.ts 需要）
