---
name: novel-to-game
description: >-
  Convert a full novel (e.g. a Project Gutenberg .txt) into a playable narrative
  survival/choice game. Covers the whole pipeline: clean + split into chapters,
  keyword-density map to locate high-tension chapters vs world-building, extract a
  reusable World Bible (setting, catastrophe phases, cast, and a stakes→game-resource
  mapping), distill per-chapter decision cards + a livestream audience-interaction
  layer, adapt into a game framework, and merge + validate. Use when the user wants to
  turn a book/novel into a game, apply the novel→game pipeline to a new book, build a
  World Bible from a text, or extract game cards/scenarios from a story.
---

# novel → game pipeline

把一整本小说转成"可玩的叙事选择/生存游戏"。**内容与美术、与具体游戏壳解耦**:先理解小说、抽出可复用底座,再按目标游戏框架填充。换书时流程不变,只换少量"按书适配"的旋钮。

## 输入 / 输出
- **输入**:一本小说的纯文本(常见来源 Project Gutenberg `.txt`)。
- **输出**:`world_bible.json`(全局底座)+ `map.json`(决策卡)+ `interactions.json`(直播互动层)+ `characters.json`(角色配方)+ 可选 `game-*.html`(可玩前端)。

## 七步流程

> 通用脚本在本技能 `scripts/`(`split.mjs` / `merge.mjs` / `rich-merge.mjs` / `build-gamedata.mjs` / `sim.cjs`);把它们**拷到工作目录**按下表改少量常量即可。详细方法论见 `references/METHODOLOGY.md`。

1. **摄取 + 切分**(`scripts/split.mjs`):去 Gutenberg 页眉/页脚(`*** START/END OF ***` 之间),按章节标记切分。⚠️ **章节标记按书不同**(`CHAPTER I.` / `I.` 独行 / `BOOK ONE`+罗马数字 / `LETTER I` / `* * *`),改 `split.mjs` 的正则。**务必单独捕获序言/引子**(常含最浓世界观,易被漏切)。
2. **密度图**(同上):用一组**题材关键词**统计每章命中密度 = "玩法金矿 vs 世界观铺垫"探测器。⚠️ **关键词集按题材换**(瘟疫:plague/death/famine…;入侵:martian/heat-ray/flee/panic…;悬疑:clue/murder/alibi…)。
3. **世界圣经**(schema 见 `references/WORLDBIBLE.md` → 产 `world_bible.json`):派扫描 agent 通读**低密度开篇**+全书略读,**只回报世界观素材 + 候选卡点张力评分,不写卡**;主控合成唯一 `world_bible.json`。关键字段:`catastrophe.progression_phases`(灾难阶段=逐章提炼的"全局背景")、`resource_logic`(小说关切→游戏资源的**跨书桥梁**)、`cast`/`setup_to_preserve`/`signature_quotes`。
4. **资源模型**:选 3–4 个概括题材核心张力的资源轴(末世瘟疫=食物/健康/士气[+幸存者];太空=氧气/电力/理智;入侵=安全/补给/理智…),要能互相构成"真两难"。
5. **逐章挖卡**(`references/SPEC.md` 契约 → `out/<章>.json`):**密度加权**——高密度章厚挖 2–4 卡,低密度只取全卷最强少数(张力评分≥3)。并行 fan-out:一章一 agent。
6. **厚提炼:直播互动层**(`references/SPEC2.md` → 每章 +beats/cast/places/stockpile + 轻量互动点 poll/predict/react/micro_choice/lore)。
7. **合并 + 校验**(`scripts/merge.mjs` / `rich-merge.mjs`):契约合规、node id 全局唯一、`next` 无悬空;按阅读顺序拼 `map.json` + `interactions.json`。`scripts/sim.cjs` 多策略模拟调平衡(死亡率别 0%/100%)。

## 卡点输出契约(前端只认这个,换书不变)
```
node:   { id, title, desc, generated:true, icon, choices[2-3] }
choice: { id, label, hint, costs:[{res∈资源集, d:int}], risk:bool,
          outcome:{emoji,title,body}, next:"" | 下一卡id, effects:[string] }
```
规则:每卡 2–3 真两难、无明显最优;代价落资源集;**每卡≥1 个 `risk:true`**(精确 costs/outcome 选后揭晓,hint 留白);`effects` 记因果。

## 换书时:换什么 / 不换什么
| 不变(流程/工具/契约) | 按书替换 |
|---|---|
| 七步流程、`merge`/`sim` 校验、卡点契约、World Bible / SPEC / SPEC2 schema | 章节切分正则 + 序言捕获 |
| "密度加权挖卡""张力评分选卡" | 题材关键词集 |
| | 资源三/四元组 |
| | `world_bible.json` 的填充 + 每密度档挖卡阈值 |

## 进阶(可选)
- **游戏框架适配**:`references/GAME_FRAMEWORK.md`(直播间布局 + 4维资源 + 观众回路 + 结算)。把 `map/interactions/characters` 映射进任意游戏壳。
- **角色生成**:`references/ART_STYLE.md` §8(参数化木刻头像配方:body×skin×hair×accessory×emblem×role)。
- **真·AI 观众回路**:`references/INTEGRATION_comment-engine.md`(评论→分类→生成 事件/道具/NPC,离线兜底 + 契约)。

## 已踩的坑(先看)
1. 序言/引子被漏切——单独捕获。
2. "每个选项都要有 outcome"——子 agent 易误解为只 risk 才有;SPEC 要显式强调,合并校验逮。
3. risk 选项老绑"+某资源"——玩家会摸规律,需在 SPEC 加约束。
4. `type:module` 下 `.js` 被当 ESM——gamedata/engine 用 `window` 导出,Node 侧用 `vm` 提供 window 加载(见 `sim.cjs`)。
5. 任何 UI 改动后扫固定/绝对定位元素有无**重合**;工具栏优先 in-flow 而非 absolute。
6. **CRLF**:Gutenberg 文件常是 CRLF;凡 `split("\n")` + `^…$` 锚点的章头正则必失配(章数=0)。切分前先 `replace(/\r\n/g,"\n")` 归一。
7. **TOC 误切**:带目录的书,`CHAPTER`/`BOOK` 标记会在正文前的目录里重复;从正文卷分隔符之后才开始扫描,并用 TOC 缩进/破折号差异排除。
8. **密度≠张力**:密度只筛"铺垫 vs 动作",对情感/道德张力会漏报(如 curate 之死、伦敦大逃亡 密度垫底却是核心抉择章)。步骤 3 的张力评分必须兜底,别纯按密度砍低分章。

## v2 能力:骨架 / 住所 / 路线 / POI(把"基地+探索"通用化)
"固定基地+探索"只适合困守型小说。世界圣经增产:`spine_type`(journey/holdout/social/investigation)+ `dwelling`(**可移动住所**:马车/营寨/房车/船,有耐久/容量/暴露度,会受损更换)+ `route`(章节聚成"程")+ `poi_bank`(沿途据点 = 策展 + AI 槽)。游戏壳据 `spine_type` 换地图隐喻;**固定基地 = 不移动的 dwelling(holdout 特例)**。探索/物资改为"沿途 POI 际遇",观众弹幕生成 POI 内容(接 comment_engine)。详见 references/GAME_FRAMEWORK.md §E、references/WORLDBIBLE.md「新增字段」。
