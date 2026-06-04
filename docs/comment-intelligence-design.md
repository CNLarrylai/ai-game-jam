# 评论智能 + 叙事引擎模块设计文档

## 概述

- **项目**：AI Game Jam 黑客松
- **主题**：末日求生（AI统治世界后的人类生存）
- **负责人**：陈昕
- **模块定位**：评论识别 -> 事件生成 -> 叙事引擎，作为独立模块被游戏主循环调用

---

## 在游戏中的角色

游戏以"天"为单位推进，每天6个阶段。本模块负责其中4个阶段的AI逻辑：

| 阶段 | 本模块职责 | 输入 | 输出 |
|------|-----------|------|------|
| 1.在家突发事件 | 从评论识别事件+AI生成 | 评论流+游戏状态 | 事件(叙事+选项+资源影响) |
| 2.资源调整 | 玩家自由操作结果判定 | 玩家指令+状态 | 结果判定 |
| 4.选择地图 | 生成可选探索地点 | 评论+进度 | 2-3个地点选项 |
| 5.探索地图 | 生成每格内容 | 位置+历史+评论 | 格子事件 |

---

## 模块架构

```
                    +---------------------+
  直播间评论流 ---> | CommentIntelligence | ---> 分类后的可执行评论
                    +---------------------+
                              |
                              v
                    +---------------------+
  游戏状态+历史 --> |  NarrativeEngine    | ---> 结构化事件JSON
                    +---------------------+
                              |
                              v
                    +---------------------+
  WebSocket ------> |    LiveDemo         | ---> 主播端+观众端同步
                    +---------------------+
```

---

## 模块1：CommentIntelligence

**文件**：`lib/comment-intelligence.ts`

### 功能

纯规则引擎（不调AI），对原始评论做分类过滤。

### 评论分类

| 类型 | 示例 | 处理 |
|------|------|------|
| 事件创造 | "前面有个废弃医院" | -> NarrativeEngine生成事件 |
| 物品召唤 | "给他一把枪" | -> NarrativeEngine生成物品事件 |
| NPC创造 | "遇到一个幸存者" | -> NarrativeEngine生成NPC事件 |
| 环境变化 | "丧尸来了" x5 | -> 集体意志触发环境事件 |
| 噪音 | "加油" "666" "往左走" | -> 过滤，不触发 |

### API

```typescript
processComments(raw: RawComment[]): ProcessedComments
checkCollectiveWill(envKeywords, threshold): string | null
```

---

## 模块2：NarrativeEngine

**文件**：`lib/narrative-engine.ts`

### 功能

调Claude API生成结构化游戏事件。

### 输入

```typescript
{
  gameState: { day, hp, food, morale, companions, inventory, karma, history },
  context: 'home_event' | 'resource_adjust' | 'map_choice' | 'explore_tile',
  comments?: ActionableComment[],
  playerAction?: string
}
```

### 输出

```typescript
{
  narrative: string,         // 叙事文本
  choices: Choice[],         // 2-3个选项(cost/reward/karma/successRate)
  resourceChanges: {},       // 资源变化
  newItems: string[],        // 新物品
  newCompanions: string[],   // 新同伴
  attribution: {user, text}, // 评论归属
  divineType: string | null  // 神圣干预类型
}
```

### 不同context的生成策略

- **home_event**：偏随机，由评论驱动，戏剧性强
- **resource_adjust**：逻辑判定为主，判断玩家操作是否合理
- **map_choice**：生成2-3个地点选项，基于进度递增难度
- **explore_tile**：连贯叙事，考虑历史事件，3轮对话内结束

---

## 模块3：LiveDemo（直播基建）

### 架构

```
主播浏览器 <--WebSocket--> Node.js Server <--WebSocket--> 观众浏览器[]
                                 ^
                          POST /api/comment
```

### 页面

| URL | 用途 |
|-----|------|
| `/` | 主播端（完整游戏） |
| `/live` | 观众端（只读画面+评论输入） |
| `/admin` | 管理后台 |

### 同步内容

- 游戏状态（位置/资源/血量）
- 事件弹窗（标题/描述/选项/结果）
- 评论弹幕
- 神圣干预popup

---

## API接口清单

| 接口 | 方法 | 用途 |
|------|------|------|
| `/api/comment` | POST | 注入评论 |
| `/api/comment` | GET | 获取评论缓冲区 |
| `/api/narrative` | POST | 生成叙事事件 |
| `/api/gamestate` | POST | 广播游戏状态 |
| `/api/gamestate` | GET | 获取最新状态（观众端轮询） |

---

## 文件清单

| 文件 | 类型 | 说明 |
|------|------|------|
| `lib/comment-types.ts` | 类型定义 | 所有接口类型 |
| `lib/comment-intelligence.ts` | 纯逻辑 | 评论分类过滤 |
| `lib/narrative-engine.ts` | AI调用 | 叙事生成 |
| `app/api/comment/route.ts` | API | 评论注入/获取 |
| `app/api/narrative/route.ts` | API | 叙事生成接口 |
| `app/api/gamestate/route.ts` | API | 状态同步 |

---

## 其他人如何调用

```typescript
// 游戏主循环（别人写）调用本模块：

// 1. 获取并处理评论
const res = await fetch('/api/comment');
const { comments } = await res.json();
const processed = processComments(comments);

// 2. 生成事件
const event = await fetch('/api/narrative', {
  method: 'POST',
  body: JSON.stringify({
    gameState: currentState,
    context: 'explore_tile',
    rawComments: comments
  })
}).then(r => r.json());

// 3. 展示事件（别人的UI模块负责）
GameUI.showEvent(event);
```

---

## 末日求生世界观（给AI的prompt基础）

AI统治了世界。人类在废墟中求生。玩家是一名幸存者。

- **环境**：废弃城市、荒野、地下避难所
- **威胁**：AI巡逻机器人、资源枯竭、恶劣天气、其他幸存者（可能友好也可能敌对）
- **目标**：存活足够长时间 / 找到安全区 / 与AI谈判
- **资源**：HP(生命)、Food(食物)、Morale(士气)
- **业力系统**：善恶选择影响NPC态度和事件走向
