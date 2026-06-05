# 🧭 AI Game Jam — 多 Agent 协调中枢

> **所有终端 / agent 开工前先读这里，收工后更新这里。**
> 这是跨 agent 的"共享上下文"：谁在干什么、动了哪些文件、当前状态、待决问题。
> 对话上下文搬不动，但这份文档能让多个 agent 高效互不踩脚。

最后更新：2026-06-05 · by Claude(WORLDS LIVE 终端)

---

## 1. 当前并行工作流（谁在干什么 · 文件产权边界）

> ⚠️ **铁律：各守自己的目录，不动别人的文件。** 跨边界的改动先在本文档「待决问题」里吼一声。

| 工作流 | Owner / 终端 | 分支 | **文件产权（只动这些）** | 状态 |
|---|---|---|---|---|
| **小说→游戏 内容引擎 + WORLDS LIVE 直播间版** | Claude（本终端） | `feature/novel-content-expansion` | `novel_to_game_Larry/**` | 🟢 WORLDS LIVE 已交付并推送 |
| **小说导入网页（粘贴小说→现场生成可玩剧本）** | 另一终端 | `feature/novel-content-expansion`（同分支！） | `app/** lib/** components/**`（Next.js 壳） | 🟡 进行中 |
| **comment_engine 真 AI 管线 + WASTELAND LIVE demo** | cheney | `main` / `feature/comment-intelligence` | `comment_engine/** public/wasteland/**` | 🟢 已在云端 |
| **美术资产包 + 全游戏换皮 + 走格探索** | 林子尧（两个终端：换皮 agent + git 统筹） | `feature/art-assets` / `feature/art-integration` | `art/** public/assets/**`；换皮临时跨界 `public/wasteland/game/*.jsx`（见待决问题） | 🟡 换皮进行中 |

### 🚨 已知协作风险
- **本终端 与「小说导入网页」终端共用同一条分支、同一工作目录**。目前文件零重叠（我在 `novel_to_game_Larry/`，它在 `app/ lib/ components/`），但同目录并行 `git add -A` 会互相波及。
  - **缓解**：① 各自只 `git add <自己的目录>`，别用 `git add -A`；② commit 勤一点；③ 若要彻底隔离，其中一方迁到 `git worktree`（独立目录+分支）。

---

## 2. 项目全景（一句话版）

AI Game Jam = TikTok LIVE 末日生存**直播互动游戏**。三块拼图：
1. **cheney 的真 AI 管线**（`comment_engine/`）：观众评论→分类→Claude 生成 事件/道具/NPC。
2. **Larry 侧的内容引擎**（`novel_to_game_Larry/`）：把任意小说→可玩游戏（世界圣经/决策卡/直播互动层），已沉淀成可复用技能 `novel-to-game`。
3. **网页壳**（`app/ lib/`）：Next.js，含①内置剧本对话游戏 ②**小说导入现场生成**（建设中）。

详见各自的 `README.md` / `novel_to_game_Larry/docs/{HANDOFF,STATE}.md`。

---

## 3. 当前状态快照

- ✅ **WORLDS LIVE**（《世界大战》套进 cheney 直播间框架）已交付：`novel_to_game_Larry/applications/war_of_the_worlds/frontend/live/`。4 机制全达成（队友互动/外部探索/时间流逝/空格潜行），jsdom 渲染级验证零报错。开法：`cd .../frontend/live && npx http-server . -p 8920 -c-1`。
- 🟡 **小说导入网页** 进行中：`app/create`（页面）+ `app/api/generate/route.ts` + `lib/generation.ts`；首页 `app/page.tsx` 已加「从你的小说生成」入口卡；`app/api/game/route.ts` + `GameChat.tsx` 已支持 `custom-*` 自定义剧本带 `systemPrompt`。
- ⚪ 待办池见下「待决问题」。

---

## 4. 关键决策（背景，避免重复讨论）

- **游戏形态**：直播间互动（弹幕采纳/刷屏去重/征集创意），观众的评论"融入游戏世界"。
- **资源轴随题材换**：末世瘟疫=食物/健康/士气；WotW=生命/补给/理智/**隐蔽**（火星人只能躲不能打）。
- **离线兜底 + 真 AI 钩子**：本机无 Python / 无 `ANTHROPIC_API_KEY`，一律做离线兜底；`generateAIEvent` / `lib/ai.ts` 留好钩子，公司机器有 key 即可换真引擎。
- **WORLDS LIVE 复用 cheney 框架**而非另起炉灶：`game-base.css` = 复制 cheney 的 `game.css`，`theme.css` 只做主题覆盖。

---

## 5. 待决问题 / 跨 agent 待跟进

> 谁提的就署名；解决了打 ✅ 不删除。

- [ ] **[Larry 待定]** 工作区里 `app/api/generate/route.ts`、`lib/generation.ts` 是「小说导入网页」终端的 WIP（已确认来历）。由该终端自己提交，本终端不碰。
- [ ] **[林子尧 吼一声]** 美术换皮正在跨界改 `public/wasteland/game/*.jsx`（emoji→PNG，资产在 `public/assets/`，映射器 `art/runtime/art-resolver.mjs`），改完提 PR 给 cheney/陈昕 review。
- [ ] **[林子尧 吼一声]** 计划改造 `scenes-out.jsx` 探索交互：点格→**键盘走格踏入式开格**（hero 可移动 + 行走动画 + 踏入未探索格扣 AP 翻牌），对齐游戏框架文档"键盘行走+迷雾"，事件逻辑不动。完成后同样提 PR。
- [ ] **[林子尧 → 陈昕确认]** 引擎与《游戏框架》文档两处偏离，是没来得及还是改了设计？① **每日饥饿+15/口渴+30 衰减未实现**（returnShelter 过天不动数值，生存压力主轴缺失）② **光头厨师**（物资效果翻倍）未实现，同伴体系换成了凛/老K。文档镜像见 `docs/game-framework.md`。
- [ ] **[架构]** 「小说导入网页」要不要收编为 Claude 的 sub-agent？当前结论：**暂不**——两条赛道文件零重叠，双终端 + 本协调文档即可；sub-agent 留给"高耦合需共享决策"的场景。
- [ ] **[协作机制]** 是否让其中一方迁到 `git worktree` 彻底隔离工作目录，避免同分支并行 commit 互扰？
- [ ] **[整合]** 「小说导入网页」生成的剧本，未来可否直接喂给 `novel-to-game` 技能产出 WORLDS LIVE 同款直播间游戏？（两条赛道的合流点）

---

## 6. 更新约定

每个 agent **收工前**追加更新：① 第 1 表自己工作流的状态；② 第 3 节状态快照；③ 第 5 节新增待决问题。改完顶部「最后更新」署名 + 时间。**只动你负责的工作流那几行，别覆盖别人的。**
