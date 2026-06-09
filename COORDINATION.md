# 🧭 AI Game Jam — 多 Agent 协调中枢

> **所有终端 / agent 开工前先读这里，收工后更新这里。**
> 这是跨 agent 的"共享上下文"：谁在干什么、动了哪些文件、当前状态、待决问题。
> 对话上下文搬不动，但这份文档能让多个 agent 高效互不踩脚。

最后更新：2026-06-09 · by Claude(WORLDS LIVE 终端) · 小说→游戏在线生成统一为「最后的人」决策卡玩法 + JSON 截断救援，已上线

---

## 1. 当前并行工作流（谁在干什么 · 文件产权边界）

> ⚠️ **铁律：各守自己的目录，不动别人的文件。** 跨边界的改动先在本文档「待决问题」里吼一声。

| 工作流 | Owner / 终端 | 分支 | **文件产权（只动这些）** | 状态 |
|---|---|---|---|---|
| **小说→游戏 内容引擎 + WORLDS LIVE 直播间版** | Claude（本终端） | `feature/novel-content-expansion` | `novel_to_game_Larry/**` | 🟢 WORLDS LIVE 已交付并推送 |
| **小说导入网页 + 剧本索引 + 后台生成 worker** | 另一终端 | **已并入** `feature/novel-content-expansion`（曾在 `feature/novel-import-web` worktree 隔离开发） | `app/** lib/** components/** scenarios/** worker/**`（不含 `novel_to_game_Larry/`） | 🟢 v2 已合并：①小说导入现场生成(+离线兜底) ②多来源剧本索引 ③双引擎后台 worker；与本终端交集为空，干净合并，`tsc`/`build` 全绿 |
| **comment_engine 真 AI 管线 + WASTELAND LIVE demo** | cheney | `main` / `feature/comment-intelligence` | `comment_engine/** public/wasteland/**` | 🟢 已在云端 |

### 🚨 已知协作风险
- **本终端 与「小说导入网页」终端共用同一条分支、同一工作目录**。目前文件零重叠（我在 `novel_to_game_Larry/`，它在 `app/ lib/ components/`），但同目录并行 `git add -A` 会互相波及。
  - **缓解**：① 各自只 `git add <自己的目录>`，别用 `git add -A`；② commit 勤一点；③ 若要彻底隔离，其中一方迁到 `git worktree`（独立目录+分支）。

---

## 2. 项目全景（一句话版）

AI Game Jam = TikTok LIVE 末日生存**直播互动游戏**。三块拼图：
1. **cheney 的真 AI 管线**（`comment_engine/`）：观众评论→分类→Claude 生成 事件/道具/NPC。
2. **Larry 侧的内容引擎**（`novel_to_game_Larry/`）：把任意小说→可玩游戏（世界圣经/决策卡/直播互动层），已沉淀成可复用技能 `novel-to-game`。
3. **网页壳 + 剧本注册表 + 生成 worker**（`app/ lib/ components/ worker/`）：Next.js，含①内置剧本对话游戏 ②小说导入现场生成 ③多来源剧本索引（内置/仓库/GitHub/AI生成）④后台 worker（agent优先/API兜底）把小说转成游戏文件。

详见各自的 `README.md` / `novel_to_game_Larry/docs/{HANDOFF,STATE}.md`。

---

## 3. 当前状态快照

- ✅ **WORLDS LIVE**（《世界大战》套进 cheney 直播间框架）已交付：`novel_to_game_Larry/applications/war_of_the_worlds/frontend/live/`。4 机制全达成（队友互动/外部探索/时间流逝/空格潜行），jsdom 渲染级验证零报错。开法：`cd .../frontend/live && npx http-server . -p 8920 -c-1`。
  - 🆕 2026-06-05 **加了开场代入 cold-open**（`game/scenes-intro.jsx` + theme.css intro 样式）：5 拍世界观铺垫（日常→坠星→热射线→带妻逃亡→玩法引导），空格/回车/点击推进、可跳过，结束进 home（重开跳过不重看）。jsdom 验证 5 拍逐拍渲染 + 空格/按钮两条进入路径，零报错。**这套 intro 模式可 upstream 给 cheney 的 wasteland**（待 cheney 协调）。
- 🟢 **小说导入网页 v1 完成**：`app/create`（页面）+ `components/NovelImport.tsx`（导入→分阶段进度→预览路由结果→开玩）+ `app/api/generate/route.ts` + `lib/generation.ts`（小说→识别genre→匹配mechanic→提炼世界圣经→产出剧本）；首页 `app/page.tsx` 已加「从你的小说生成」入口卡；`app/api/game/route.ts` + `GameChat.tsx` 已支持 `custom-*` 自定义剧本带 `systemPrompt`。`next build` + `tsc --noEmit` 全绿。**注**：`/api/generate` 走真 `streamChat`，无 `ANTHROPIC_API_KEY` 时自动走规则版离线兜底 `lib/offlineGeneration.ts`（关键词密度分类→机制匹配→模板装配），本地也能现场生成；有 key 仍走真模型。离线生成端到端实测通过。生成层 UI 刻意把"识别类型 / 匹配机制"显式展示，呼应 OpenRouter 架构。
- 🟢 **剧本索引（多来源注册表）**：`lib/registry.ts` 聚合 内置 / 仓库(`scenarios/index.json`) / GitHub(运行时拉取,5min 缓存,2.5s 超时降级) / AI生成 四来源，按 id 去重；`/api/scenarios` 索引 API + `/scenarios` 浏览页(来源标签) + 首页入口卡。**新增剧本只需往 `scenarios/index.json` 加一项提交，无需改代码**，详见 `scenarios/README.md`。
- 🟢 **后台生成 worker**：`worker/worker.mjs` 监听 `jobs/pending/`，双引擎——agent(`claude -p`+opus，订阅买单、产出更丰富)优先，失败兜底 Anthropic API(默认 `claude-sonnet-4-6`)；产出 `scenarios/generated/<id>.json` 自动进索引。`/api/jobs`(提交)+`/api/jobs/[id]`(轮询)，`/create` 已改为提交任务+轮询。**实测**：agent 22s 产出「星舰残响」(科幻生存)，端到端通过。key 只在 worker 的 `.env.local`(gitignore)。运行时产物 `jobs/`·`scenarios/generated/`·`worker.log` 已 gitignore。**启动**：`cd <仓库> && node worker/worker.mjs`（需 `.env.local` 含 `ANTHROPIC_API_KEY`）。
- 🟢 **统一门户(2026-06-05,Larry 授权合流)**:把 WORLDS LIVE 直播间游戏接进 Next 门户,实现"一个入口:玩成品游戏 / 导入小说造新游戏"。
  - `public/games/worlds-live/` = WORLDS LIVE 静态包(Next 直接服务,`/games/worlds-live/index.html`)。
  - `app/page.tsx` 重构为三段式门户:① 成品游戏(WORLDS LIVE featured 卡) ② 文字冒险剧本(GameChat) ③ 创作入口(/create 导入 + /scenarios 索引)。
  - **⚠️ 本终端(WORLDS LIVE)动了 `app/page.tsx`(导入网页终端 territory)**——经 Larry 授权做门户合流,只重排首页+加 WORLDS LIVE 卡,未碰 /create、/scenarios、API、worker 内部逻辑。导入网页终端后续若改首页请注意此文件已被门户化。
  - `next build` 通过;`next start` 验证 首页(含 WORLDS LIVE 卡)+ 静态包(200)+ /create + /scenarios 全可达。
  - **待办**:整体部署 Vercel(导入/文字冒险需 `ANTHROPIC_API_KEY`,WORLDS LIVE 与离线兜底无需);public/games/worlds-live 是 novel_to_game_Larry/live 的拷贝,WORLDS LIVE 更新后需重新同步(可加脚本)。
- 🟢 **小说→游戏链路验证 + 玩接 agent(2026-06-05, Larry 指派 WORLDS LIVE 终端验证)**:端到端实测通过——粘贴小说 → `/api/jobs` → worker(`claude -p` agent,无 key) → `scenarios/generated/` → 索引(`/api/scenarios` 含 source:generated) → 预览 → 玩。实测「漫游者号」(科幻生存)、「猩红疫年」(末世废土)。
  - **缺口已补**:玩生成的游戏(GM 叙事)原走 `/api/game`→`streamChat`→需 key,本机没 key→500。**改 `lib/ai.ts`**:`streamChat` 无 `ANTHROPIC_API_KEY` 时自动兜底到新增的 `streamAgent`(spawn `claude -p` 流式转发 stdout,与 worker 同款,无需 key);有 key 仍走 API(快·真流式)。亦支持 `AI_PROVIDER=agent` 显式启用。
  - **⚠️ 本终端(WORLDS LIVE)动了 `lib/ai.ts`(原我自己写的脚手架,但属 lib/ territory)**——纯 additive 兜底,不改有 key 时行为,不碰 generation/offlineGeneration/registry。
  - 代价:agent 每回合 spawn 一个 `claude -p`(~15-30s/回合),慢但本机自含可演示;Vercel 上线则必须配 `ANTHROPIC_API_KEY`(云端无 claude CLI)走 API 快路径。
- 🟢 **小说→游戏在线生成统一为「最后的人」决策卡玩法(2026-06-09, Larry 拍板)**:Larry 反馈生存循环类生成"感受不到小说信息被提炼进去",决定**砍掉多种可生成类型,统一只产「最后的人」同款叙事抉择卡**(`/games/last-man/`)——逐幕剧情 + 道德/生存两难,更忠于原著剧情、保守安全。
  - `app/api/generate-game/route.ts`:`SPEC` 重写成产 last-man `window.GAME` 结构(meta/res_def 固定 food·health·morale/start_res/worldLines/crew/campaign/nodes 决策卡/codex),5 幕、每幕 2 抉择含 1 risk、`next` 全空走线性 campaign。引擎:有 `ANTHROPIC_API_KEY`→Anthropic API(Haiku, `max_tokens:3600`, 48s abort);否则本机 `claude -p`(opus)。
  - **JSON 截断救援 `salvage()`**:Haiku 输出常因 `max_tokens` 被截断→数组没闭合→`JSON.parse` 失败。`parseGame` 三级兜底:原文 → 正则修复 → **`salvage`(单遍扫描记录"最后一个完整 value"的位置,区分 key/value 位,丢弃残缺尾部元素并补齐括号)**。即使截断也能救回已完整的卡;`campaign` 再按存在的 node id 过滤。9 个截断场景单测全过。
  - 前端:`app/studio/page.tsx` 单按钮"生成叙事抉择游戏"(已去掉像素/木刻版本选择器),支持粘贴 + .txt 上传(UTF-8/GBK 兜底)+拖拽;生成结果存 `localStorage('wl_game_'+id)`,`/games/last-man/index.html?id=` 壳同步读取覆盖 `window.GAME`。`app/page.tsx` 门户卡指向 /studio。
  - **部署**:Vercel git 已断开(避免自动构建旧 main),**CLI-only**:`npx vercel --prod --force --yes` → `npx vercel alias set <新url> ai-game-jam-nine.vercel.app`。稳定地址 **https://ai-game-jam-nine.vercel.app/studio**。
  - **实测(2026-06-09)**:在线 POST `/api/generate-game` HTTP 200,《末日第四十七天》5 幕(断水危机/口粮困局/感染迹象/逃离之路/营地之门)+同行者苏晴/小满,节点数 5。
  - **⚠️ 本终端动了 `app/api/generate-game/route.ts` + `app/studio/page.tsx` + `app/page.tsx`(导入网页终端 territory)**——经 Larry 多次授权做统一生成,纯重写这条 last-man 生成链;`pixel-player/`、`woodcut-player/` 已弃用(无害遗留)。
  - **已知局限**:生成游戏存浏览器 `localStorage`,换设备/换浏览器打不开同一条链接(分享受限)。下一步可做云存储(KV/blob)真正可分享。
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

- [x] ✅ 2026-06-05 **[Larry 待定→已解决]** 「小说导入网页」WIP 已由该终端在 `feature/novel-import-web` 提交并**合并入共享分支**。
- [ ] **[架构]** 「小说导入网页」要不要收编为 Claude 的 sub-agent？当前结论：**暂不**——两条赛道文件零重叠，双终端 + 本协调文档即可；sub-agent 留给"高耦合需共享决策"的场景。
- [x] ✅ 2026-06-05 **[协作机制]** 「小说导入网页」已迁 `git worktree`(`feature/novel-import-web`)彻底隔离；两分支自共同祖先 `fddb0c7` 以来改动**交集为空**（本终端全在 `novel_to_game_Larry/`，对方全在 `app/ lib/ components/ scenarios/ worker/`），干净合并回 `feature/novel-content-expansion`。
- [ ] **[整合]** 「小说导入网页」生成的剧本，未来可否直接喂给 `novel-to-game` 技能产出 WORLDS LIVE 同款直播间游戏？（两条赛道的合流点）
- [x] ✅ 2026-06-05 **[小说导入网页]** 已补规则版离线兜底（`lib/offlineGeneration.ts`：8 类题材关键词密度分类→机制匹配→模板装配 + `offline` 标记，预览卡显示"离线生成"）。无 `ANTHROPIC_API_KEY` 时 `/api/generate` 自动走它，有 key 仍走真模型。端到端实测：科幻/武侠分类正确、title hint 生效、过短 400、`/create` 200。
- [ ] **[安全 · Larry]** worker 当前用的 Anthropic API key 曾在与 agent 的对话中明文出现，**hackathon 后请轮换**。生产里 key 只应存在 worker 的 `.env.local`（已 gitignore）。
- [ ] **[升级 · 合流点]** worker 的 agent 引擎目前是"单发富生成"（用了 `novel-to-game` 方法论但只产一个剧本 JSON）。下一步接**完整 `novel-to-game` 管线**（世界圣经 / 决策卡 / 直播互动层多文件产物）→ 正好接上上面「整合」那条：导入网页生成的剧本直接产出 WORLDS LIVE 同款直播间游戏。**这条需要两条赛道协作**（worker 调技能 × `novel_to_game_Larry/` 的产物格式对齐）。

---

## 6. 更新约定

每个 agent **收工前**追加更新：① 第 1 表自己工作流的状态；② 第 3 节状态快照；③ 第 5 节新增待决问题。改完顶部「最后更新」署名 + 时间。**只动你负责的工作流那几行，别覆盖别人的。**
