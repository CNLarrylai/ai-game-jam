# 开场代入规范(Intro / cold-open spec)—— 小说无关 · 标准产物

**目标**:每一本小说转成游戏后,**必须**产出一个开场 intro 模块,在玩家进入游戏 UI 之前先铺垫世界观,建立代入感。这是 world_bible 之后、与卡点平行的一个**标准交付物**(不是可选)。

## 为什么必须有
游戏一上来直接甩进"Day 1 + 数值条"会丢失代入感——玩家不知道自己是谁、世界发生了什么、为什么要挣扎。intro 用 4–6 拍把 world_bible 里已经提炼好的"灾难前→灾难来→你的处境"讲给玩家,最后一拍顺手做**玩法引导**。WORLDS LIVE 的 `scenes-intro.jsx` 是参考实现。

## 输入(全部来自 world_bible.json,不另读原文)
- `catastrophe.progression_phases`(阶段 0→4)= intro 的叙事主线
- `setup_to_preserve` = 第一拍"将被摧毁的寻常"的具体料
- `genre_mapping` + `resource_logic` = 玩家处境 + 玩法引导
- `cast` 里 `role:"the stake"/"protagonist"` = "你是谁、为谁而逃"
- `signature_quotes` = 可点缀的金句
- `setting.era` / `locations` = 每拍的时间地点 chip

## 输出:`dist/intro.json` —— 一个有序数组(beats)

```json
[
  {
    "id": "calm",                          // snake_case
    "art": "🔭",                            // 单个 emoji(木刻插画占位)
    "tag": "1894 · 仲夏 · 沃金",            // 时间/地点 chip(来自 setting)
    "title": "灾难之前",                    // 这一拍的标题
    "lines": ["将被摧毁的寻常生活……", "灾难此刻还只是远方的传闻。"]  // 1–2 句沉浸白描,可含 <b>强调</b>
  }
]
```

## ⚠️ intro 只交代背景与世界观,**不含玩法引导**
intro 是"电影开场字幕",纯叙事——交代灾难前的常态、灾难如何降临、世界变成了什么。
**不要**在 intro 里讲资源/操作/通关条件——那属于「开局对白演出」(`OPENING_SCENE_SPEC.md`,落到当天任务)与游戏内上下文提示。intro 干净,玩家才入戏。

## 标准拍序(4–5 拍,按 world_bible 映射)
| 拍 | 内容 | 取自 |
|---|---|---|
| 1 常态 | 灾前寻常 + 玩家珍视的现状(将被夺走) | `progression_phases[0]` + `setup_to_preserve` |
| 2 远兆 | 灾难的第一个征兆,尚不切身 | `progression_phases[1]` |
| 3 爆发 | 本土爆发,秩序崩塌的第一击 | `progression_phases[2]` |
| 4 黄昏 | 全面崩塌/大流亡——世界已是另一副模样 | `progression_phases[3]` |

> 首拍=常态固定;末拍=灾难全貌(不是玩法)。中间可按灾难标志性中段增删 1 拍。

## 设计规则
1. **4–5 拍**,每拍 1–2 句,简短克制,有代入感。忠于原著,别另编。**纯叙事,不带任何 UI/操作说明。**
2. 每拍一个 emoji 作"木刻插画";时间地点 chip 来自 setting。
3. 玩家可见文字简体中文;`id` 英文 snake_case。
4. 交互(由游戏壳实现,内容侧不管):空格/回车/点击推进、可跳过、**重开跳过不重看**。

## 游戏壳如何消费
游戏初始 scene = `intro`,读 `intro.json` 逐拍渲染,末拍 onStart → **进入第 1 天的开局对白演出**(见 OPENING_SCENE_SPEC)→ 再进 home。参考 `applications/war_of_the_worlds/frontend/live/game/scenes-intro.jsx`(已改为读 `data/intro.json`)。

## 收尾
写文件前确认 `JSON.parse` 通过。回报:产了几拍、首拍/末拍标题。
