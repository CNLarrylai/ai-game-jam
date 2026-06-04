# 接入 cheney 的 comment_engine(《最后的人》retune)— 接口契约

目标:用 cheney 的真·AI 评论管线(classifier → comment_pool → scorer → generator(Claude)→ world_filter)替换 game-v2 里"模拟观众采纳",让观众评论**真生成 事件/道具/NPC/地点**,但内容调成《最后的人》的瘟疫文学悲剧腔。

> 环境注:本机无 Python、无 API key → 先做**前端这一侧 + 离线兜底**,按本契约对接 cheney 的真引擎(或带 key 的服务)后即变真。

## 1. 架构(我们这侧 = 前端 game-v2;他那侧 = comment_engine)
```
game-v2(浏览器) --HTTP--> bridge 服务(跑 cheney 的 GameLoop) --Claude--> 生成JSON --> game-v2 渲染
                         (cheney 设计的 comment_source / render_callback 接口)
```
- cheney 的 `GameLoop(comment_source, render_callback)` 已为合码留口:`comment_source` = 我们的评论(玩家输入 + AudienceSim);`render_callback` = 回传生成结果给前端。
- 桥接服务:cheney 跑 Python(他有 Python+key);我们前端用 HTTP 调它。**本机无法跑 Python**,故我们先用**离线兜底**(下 §4)。

## 2. 请求 / 响应契约(建议,需与 cheney 确认)
**前端 → 引擎(征集结束时,一次采纳)**
```jsonc
POST /generate
{
  "world": "the_last_man",                 // 切世界观/基调(他默认 ai_comedy)
  "category": "EVENT|CHARACTER|ITEM|LOCATION", // 可空 → 引擎自分类
  "comment": "明天去废弃工厂找药",          // 被采纳的评论(玩家或 AudienceSim)
  "username": "老王",
  "context": "<当前 game_state 摘要 + 当前幕/地点 + 已遇见人物>"
}
```
**引擎 → 前端**(沿用 cheney 的 generator 输出 schema,字段不变,只是 world 决定语气)
```jsonc
// EVENT
{ "narration":"…", "item_gained":{...}|null, "item_lost":null,
  "companion_gained":{"name","skill","flaw","daily_cost","passive_effect"}|null,
  "new_map_unlocked":null, "source_display":"灵感来源 @老王" }
// ITEM { "name","icon","description","effect":{spirit,health,hunger,thirst},"side_effect","source_display" }
// CHARACTER { "name","appearance_prompt","skill","flaw","source_display" }
// LOCATION { "name","map_description","grid":[{"position","type","content_hint"}],"source_display" }
```

## 3. 数值映射(他的 4 维 → 我们的资源)
| cheney(spirit↑好/health↑好/hunger↓好/thirst↓好) | 我们(food/health/morale/survivors) |
|---|---|
| `spirit` | `morale`(同向) |
| `health` | `health`(同向) |
| `hunger`(越低越好) | `food`(取反:hunger+ → food−) |
| `thirst`(越低越好) | 并入 `food`(取反,与 hunger 合并)或暂忽略 |
| (无) | `survivors` 仍是我们独立层,不由生成影响 |

转换函数(前端 bridge 里实现):`food_delta = -(hunger_delta + thirst_delta)`;`morale_delta = spirit_delta`;`health_delta = health_delta`。

## 4. 离线兜底(本机无 Python/key 时,demo 仍能演"评论生成内容")
- 前端 `generate()` 先试 HTTP 引擎;失败 → 用一份**《最后的人》预调内容池** `dist/generated_pool.json`(我按他 schema 预生成:若干事件/道具/NPC,瘟疫文学腔,标注"灵感来源 @用户")。
- 采纳一条评论 → 关键词粗分类 → 从池里取一条匹配内容渲染(像真生成),并按 §3 映射应用数值。
- 真引擎就绪后,把 `generate()` 的 HTTP 分支打开即切换为真 AI,无需改 UI。

## 5. 世界观 retune(给 cheney 的生成器一个 the_last_man profile)
- 基调:由"荒诞喜剧 + 名人 IP"→ "克制、挽歌、文学末世"。道具是粮/药/船/火/书而非搞笑物;NPC 是难民/病者/疯先生而非名人;side_effect 改为"代价/隐患"。
- 世界事实:瘟疫全球大流行、南逃之旅(英→法→瑞→意→罗马)、你是最后的人。可由 `context` 注入 + 一份 the_last_man 的 system/world prompt(我提供)。

## 6. 待办 / 与 cheney 对齐
- [ ] 确认 HTTP 契约(或他直接给一个可调用的 JS/HTTP 端点)。
- [ ] 他的 generator 支持 `world` 参数(切 prompt profile);我提供 the_last_man 的 4 类生成 prompt 重调稿。
- [ ] 前端:`generate()` + 离线池 + 把 adoptOne 从"+1资源"升级为"渲染真生成内容(事件/道具/NPC)"。
