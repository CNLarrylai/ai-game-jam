# AI 末日互动游戏 — 多窗口协作指南

## 项目概况
- **方向**: AI × TikTok LIVE × Roguelike 末日生存游戏
- **核心机制**: 观众评论 → AI 分类 → 触发剧情/道具/角色/场景生成 → 世界观校验 + 连贯性引擎
- **技术栈**: Next.js 15 + TypeScript + Tailwind + Claude API
- **世界观**: AI 统治世界的近未来末日，玩家以天为单位探索求生，像素风

## 关键文档
- **Prompt 设计文档（飞书）**: https://bytedance.sg.larkoffice.com/docx/IlDUdOZvNo2x7wx1UrOlhWsEgOk
- **游戏框架文档（飞书）**: https://bytedance.larkoffice.com/wiki/V7RGwg4x5iu5MUkObGiccFconEf
- **Hackathon 项目文档**: https://bytedance.larkoffice.com/wiki/HJs0whKmGizO8CkjnTccKLUYnkb

## 代码架构

```
ai-game-jam/
├── app/                          # Next.js 页面
│   ├── page.tsx                  # 首页：剧本选择
│   └── api/game/route.ts         # 后端：玩家行动 → AI → 流式返回
├── components/
│   └── GameChat.tsx              # 游戏对话界面
├── lib/
│   ├── ai.ts                     # AI Provider 抽象（Claude / Gemini）
│   ├── scenarios.ts              # 剧本库（3个内置剧本）
│   ├── types.ts                  # 共享类型
│   ├── comment-types.ts          # 评论 + 叙事引擎类型定义
│   ├── comment-intelligence.ts   # 评论分类（当前为规则匹配，待升级为 AI 分类）
│   ├── narrative-engine.ts       # AI 叙事引擎（待升级：能力驱动 + 钩子队列）
│   └── fallback-events/          # 硬编码兜底事件
│       ├── home-events.ts        # 15个家中突发事件
│       ├── explore-events.ts     # 30个探索事件
│       ├── map-choices.ts        # 5组地图选择
│       └── resource-actions.ts   # 10个资源操作
├── docs/
│   ├── comment-intelligence-design.md
│   └── event-matrix.md           # 事件矩阵：12场景×10人物×8事件类型
└── tests/
    └── fixtures/                 # 标准测试数据（所有窗口共享）
        └── game-state-day4.json  # Day 4 中期状态 fixture
```

## 每日游戏循环（6阶段）
1. **在家突发事件** — 评论生成，被动触发，每日最多1次
2. **资源整理** — 玩家主动操作，评论不影响
3. **装备出门** — 选择携带物品，评论不影响
4. **选择地图** — 可由评论生成新地点，主播点击征集15s
5. **探索地图** — 5个行动点，每格翻开时采集评论生成内容
6. **回家休息** — 行动点用完或主动回家

## 能力驱动剧情系统（核心机制）

### 道具 enables + narrative_hooks
每个道具生成时自带能力标签和可触发场景：
- `enables`: ["ranged_combat", "signal_for_help"] — 系统级能力标签
- `narrative_hooks`: ["远距离对峙时可以威胁敌人"] — 具体场景描述

### 角色结构化 skills
每个同伴有结构化技能，含 type/enables/narrative_hooks，用于互补检查和剧情驱动。

### 连贯性引擎
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

## 多窗口协作规范

### 身份标识
- **cheney**: Prompt 设计 + 能力驱动系统 + 连贯性引擎 + 测试验证
- 其他窗口在 commit 时注明自己的分工方向

### 协作原则
1. **单一数据源**: `tests/fixtures/` 下的 JSON 是标准测试状态，所有窗口从这里读
2. **分支隔离**: 各窗口用独立 feature 分支开发，避免冲突
3. **Prompt 同步**: 飞书文档是 prompt 设计的 source of truth，代码中的 prompt 从文档同步
4. **状态变更通知**: 修改 `comment-types.ts` 等共享类型时，需更新本文件并通知其他窗口

### 当前待办
- [ ] 将飞书文档中的新 prompt（能力驱动版）同步到 `lib/narrative-engine.ts`
- [ ] 升级 `comment-types.ts`：GameState 加入 capabilities / hookQueue 字段
- [ ] 升级 `comment-intelligence.ts`：从规则匹配升级为 AI 分类（5类意图）
- [ ] 编写端到端测试：模拟 Day 1-3 完整循环，验证钩子触发和能力积累
- [ ] 前端 UI：评论采集窗口 + 能力面板 + 钩子状态显示
