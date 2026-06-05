# 评论智能 + 叙事引擎模块设计文档

## 概述

- **项目**：AI Game Jam 黑客松
- **主题**：在AI统治的世界存活100天
- **世界观**：AI定点清除了所有不对AI说"谢谢"的人类（99.99%），幸存者在废墟中求生。黑色幽默 + 末日生存。电子产品即武器。
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

## 游戏状态：四维数值

| 数值 | 中文名 | 方向 | 说明 |
|------|--------|------|------|
| sanity | 精神值 | 正向（越高越好） | 精神崩溃=游戏结束 |
| health | 健康值 | 正向（越高越好） | 生命值归零=死亡 |
| hunger | 饥饿值 | **反向（0=饱，100=饿死）** | 数值越低状态越好 |
| thirst | 口渴值 | **反向（0=不渴，100=渴死）** | 数值越低状态越好 |

**初始物品**：矿泉水x3, 鲱鱼罐头x2

> 注意：hunger和thirst采用反向设计，0代表最佳状态，数值随时间自然增长，需要消耗食物/水来降低。

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
| 事件创造 | "去白宫" "生成火星地点" | -> NarrativeEngine生成事件 |
| 物品召唤 | "主播捡到一把冲锋枪" | -> NarrativeEngine生成物品事件 |
| NPC创造 | "出现一个秦始皇" "有一个光头邻居" | -> NarrativeEngine生成NPC事件 |
| 环境变化 | "丧尸来了" x5 / "AI巡逻" x3 | -> 集体意志触发环境事件 |
| 噪音 | "666" "哈哈哈" "加油" "你们能不能说点有用的" | -> 过滤，不触发 |

### API

```typescript
processComments(raw: RawComment[]): ProcessedComments
checkCollectiveWill(envKeywords, threshold): string | null
```

---

## 评论分类示例（来自真实直播间观察）

以下展示真实观众评论及其分类结果：

### 创意事件（event_create / npc_create / item_summon）
| 评论 | 分类 | 说明 |
|------|------|------|
| "看到一只猫" | npc_create | 创造角色 |
| "猫会说话" | event_create | 修饰已有角色，触发事件 |
| "出现一个秦始皇" | npc_create | 历史人物乱入，黑色幽默 |
| "特朗普从天而降" | npc_create | 名人出现 |
| "拐角遇到马斯克" | npc_create | 名人NPC |
| "出现甄嬛" | npc_create | 影视人物 |
| "主播捡到一把冲锋枪" | item_summon | 武器获取 |
| "有一只鬼出现" | npc_create | 超自然角色 |

### 地点建议（event_create）
| 评论 | 分类 | 说明 |
|------|------|------|
| "主播应该去看看零食区" | event_create | 场景内导航 |
| "去白宫" | event_create | 新地点 |
| "去泰勒斯威夫特家" | event_create | 名人相关地点 |
| "生成火星地点" | event_create | 极端地点，系统需转译 |

### NPC/角色交互
| 评论 | 分类 | 说明 |
|------|------|------|
| "有一个光头邻居" | npc_create | 创造NPC |
| "光头邻居请求收留" | event_create | 驱动NPC行为 |
| "生成一个厨子" | npc_create | 直接要求生成 |

### 噪音（过滤）
| 评论 | 分类 | 说明 |
|------|------|------|
| "666" | noise | 纯表情/数字 |
| "哈哈哈" | noise | 纯笑声 |
| "猫咪万岁" | noise | 太短且无可执行内容 |
| "你们能不能说点有用的" | noise | meta吐槽，不可执行 |

### 元评论/争论（过滤）
| 评论 | 分类 | 说明 |
|------|------|------|
| "不要马斯克！" | noise | 反对性元评论 |
| "就要马斯克！" | noise | 支持性元评论（但不创造内容） |
| "你们在玩宫接龙吗？" | noise | 元评论吐槽 |

---

## 模块2：NarrativeEngine

**文件**：`lib/narrative-engine.ts`

### 功能

调Claude API生成结构化游戏事件。

### 输入

```typescript
{
  gameState: { day, sanity, health, hunger, thirst, companions, inventory, karma, history },
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
  resourceChanges: {},       // 资源变化（sanity/health/hunger/thirst）
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

- 游戏状态（位置/精神值/健康值/饥饿值/口渴值）
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

AI统治了世界。AI定点清除了所有不对AI说"谢谢"的人类（99.99%被消灭）。幸存者在废墟中求生。玩家是最后的幸存者之一，目标是存活100天。

- **基调**：黑色幽默 + 荒诞 + 末日生存
- **环境**：废弃工厂、大型超市、白宫、火星（观众创造）等
- **威胁**：AI巡逻机器人、电子设备（即武器）、丧尸、资源枯竭、变异生物
- **目标**：存活100天
- **资源**：精神值(sanity)、健康值(health)、饥饿值(hunger, 反向)、口渴值(thirst, 反向)
- **初始物品**：矿泉水x3, 鲱鱼罐头x2
- **关键地点**：废弃工厂, 大型超市, 王金鑫家, 白宫
