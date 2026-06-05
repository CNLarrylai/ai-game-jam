# pixel-poc — 小说→像素生存游戏（数据驱动 PoC）

证明：**任意末世/生存小说 → 自动生成数据 → 填充改写第三位成员的像素直播间游戏壳**。

> 这是 PoC，**不改原游戏** `public/wasteland/`——这里是它的一份数据驱动拷贝。
> 美术（80 个像素资源）复用 `public/assets/`（相对路径 `../assets` 自动解析）。

## 它怎么工作
```
小说原文 → claude -p(agent) → GAME_DATA(JSON) → custom-data.js(window.GAME_DATA)
   → index.html 在 babel 脚本前同步注入 → game/data.jsx 读 window.GAME_DATA 换皮
   → 同一套像素游戏壳，内容全变成小说的
```
- `game/data.jsx` 改为数据驱动：每个字段 `_GD.X || <内置默认>`，缺失则回退 AI 统治世界默认，游戏照常跑。
- `custom-data.js` = 当前注入的小说数据（本例：**丧尸末世**，加油站/便利店/社区医院/地铁站、林医生护士、卷刃猎刀、丧尸弹幕）。删掉它游戏就回到默认 AI 题材。

## GAME_DATA 契约（生成层要产的）
`{ OPENING, INIT_STATS{sanity,health,hunger,thirst}, ITEMS{}, DESTINATIONS[], COMPANIONS_POOL[], MAP_NPC{}, SCENE_COMMENTS{home,organize,destination,explore} }`
缺的字段（HEX_TILES/TIMELINE/LEADERBOARD…）自动回退默认。

**美术约束（保证像素图渲染）**：物品 icon 只能用 `💧🐟🥫🍗🔫🩹💊🔩🔧🔦🔋📻🗝️🪢🎒`（emoji→PNG 映射见 data.jsx 的 EMOJI_ICON）。题材限**末世/生存类**——其余题材 art-bridge 回退 emoji，美术不统一。

## 复现/换一本小说
1. 把小说喂给 `claude -p`（prompt 契约见上 / 当时用的在 `gen-prompt.txt`）。
2. 产出的 JSON 包成 `window.GAME_DATA = {...};` 写进 `custom-data.js`。
3. 刷新 `index.html` 即换皮。

## 下一步（Stage A 全量）
- 让 worker 直接产 GAME_DATA（现在是手动跑 claude -p）。
- 门户/导入接上：选「像素直播间」范本 → 生成 → 玩。
- 把契约沉淀进 `novel-to-game` 技能（PIXEL_GAME_DATA_SPEC）。
- 和 art 终端协调：把数据驱动能力并回他们的原游戏（而非长期维护拷贝）。
