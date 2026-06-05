# 机制 / 壳 路由器（SHELL_ROUTER）—— 小说该做成哪个游戏

理解小说后、生成 GAME_DATA 前，先决策两件事：**① 选机制 ② 选壳**。这一步决定"小说→游戏"的形态。

## 第一步：识别题材 → 选机制（mechanic）
| 小说题材 | 机制 | 4 维资源 |
|---|---|---|
| 末世/丧尸/瘟疫/废土 | 资源管理+抉择（生存） | 精神/健康/饱腹/口渴 |
| 入侵/灾难/逃亡 | 资源管理+抉择（隐蔽生存） | 生命/补给/理智/隐蔽 |
| 太空/星舰 | 资源管理+抉择（密闭生存） | 氧气/电力/理智/船体 |
| 探案/悬疑 | 线索推理 | （线索/理智/时间/信任） |
| 权谋/宫斗 | 关系社交策略 | （声望/盟友/把柄/危机） |
| 江湖/市井 | 经营+人情世故 | （银钱/名声/人情/安危） |

> 三个**现成壳目前都是"资源管理+生存"机制**。推理/权谋/经营机制壳尚未实现 → 这类小说当前**先退化为文字冒险**(systemPrompt+GameChat)，或硬套生存壳(不推荐)。**Demo 用生存类小说最稳。**

## 第二步：选壳（三个团队成员做好的直播间壳，任选其一）
| 壳 | 路径 | 美术 | 适配题材 | icon 约束 | 代入感层 |
|---|---|---|---|---|---|
| **像素 · AI生存** | `public/wasteland/`（PoC 数据驱动版 `public/pixel-poc/`） | 真像素美术(80资源)+可行走+双端 | **仅末世/生存/废土**（都市感最佳） | 有（emoji 须在映射集，见 LIVE_GAME_SPEC） | OPENING + SCENE_COMMENTS |
| **WORLDS LIVE** | `novel_to_game_Larry/applications/war_of_the_worlds/frontend/live/` | 维多利亚木刻暗调(CSS) | 入侵/逃亡/文学末日 | 无 | 全：intro+opening+dialogue |
| **最后的人** | `novel_to_game_Larry/frontend/game/game-v2.html` | 木刻暗调(CSS)，旅程版 | 瘟疫/旅程/群像 | 无 | 旅程+幸存者羁绊 |

### 选壳决策树
1. 末世/丧尸/废土 **且** 要最强直播感(像素+双端) → **像素壳**（注意 icon 约束 + 资源用 精神/健康/饱腹/口渴）。
2. 文学性强 / 入侵逃亡 / 要开场演出+同伴对白 → **WORLDS LIVE 壳**（CSS，无 icon 约束，代入感最全）。
3. 旅程/南逃/不断失去同伴 → **最后的人 壳**。
4. 非生存题材（推理/权谋…）→ 暂无壳，退文字冒险或提示用户。

## 第三步：按所选壳生成 GAME_DATA（见 LIVE_GAME_SPEC）
- 资源键名按机制表对齐（像素壳=精神/健康/饱腹/口渴）。
- 像素壳：ITEMS/COMPANIONS 的 icon **只用映射集**；地点/物资贴小说但靠现有像素美术呈现。
- CSS 壳：额外产 intro.json / opening.json / dialogue.json（代入感三件套）。

## 注入方式（怎么把数据喂进壳）
- **像素壳**：产出包成 `window.GAME_DATA={...}` 写 `custom-data.js`，HTML 在 babel 脚本前同步注入（见 `public/pixel-poc/index.html`）；壳 `data.jsx` 已数据驱动（`_GD.X || 默认`）。
- **CSS 壳（WORLDS LIVE）**：产 `data/intro.json`·`opening.json`·`dialogue.json`，壳的 boot 已 fetch 注入 `window.WL_*`。

## Demo 推荐路径（最稳）
**生存/末世类小说 → 像素壳**：题材契合、美术统一(icon 映射集兜得住)、直播感最强(双端+像素配图)、PoC 已验证。一句话：`小说 → world_bible → 路由(生存/像素壳) → GAME_DATA → custom-data.js → 像素直播间游戏`。
