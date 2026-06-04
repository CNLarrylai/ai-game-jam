# HANDOFF — 在另一台机器(公司)接续这份工作

> 一句话:**所有成果都在这个 git 仓库里**;另一台机器拉下来 + 读这份指南,就能沿用"记忆"继续。对话上下文无法直接搬,但本仓库的文档/规范/技能/代码就是全部的持久知识。

## 0. 怎么在公司的 Claude Code 接上(三步)
1. `git clone https://github.com/CNLarrylai/ai-game-jam` → `cd ai-game-jam` → `git checkout feature/novel-content-expansion`
2. 装技能(让"novel→game"能力跟过去):把 `novel_to_game_Larry/skill/` 整个拷到 `~/.claude/skills/novel-to-game/`;(可选)把 `novel_to_game_Larry/skill/memory/*.md` 拷到 `~/.claude/projects/<你的项目目录>/memory/`。
3. 对新的 Claude Code 说:**"读 novel_to_game_Larry/docs/HANDOFF.md 和 docs/STATE.md,接着干。"**

## 1. 这是什么项目
AI Game Jam 团队项目(TikTok LIVE 末日生存直播游戏)。**我(Larry 侧)负责的模块 = "小说→游戏"内容引擎**,在子目录 `novel_to_game_Larry/`,分支 `feature/novel-content-expansion`(未并入 main)。
- 已把《最后的人》做成可玩游戏 + 把能力沉淀成可复用技能 + 正在套用到《世界大战》。

## 2. 仓库里关键产物(novel_to_game_Larry/)
- `dist/`:**成品** — `world_bible.json`(底座)`map.json`(66卡)`interactions.json`(197互动)`prologue_cards.json`(3过桥)`characters.json`(角色)`generated_pool.json`(观众生成离线池)
- `frontend/game/`:`game.html`(单人对话版)`game-v2.html`(**直播间框架版,主推**:旅程+4维资源+观众采纳生成+图鉴+手记)`engine.js` `gamedata.js`(`node scripts/build-gamedata.mjs` 重建);`frontend/doom.css`(木刻暗调视觉)、`frontend/cold-open.html`、`frontend/character-generator.html`
- `docs/`:`METHODOLOGY.md`(方法论)`GAME_FRAMEWORK.md`(**§E 住所/路线/POI 新通用框架**)`ART_STYLE.md`(美术+角色生成)`INTEGRATION_comment-engine.md`(接 cheney 的契约)`REFRAME_dwelling-route-poi.md`(给团队的形态 reframe)`POLISH_LOOP.md`(自主打磨协议+评分线)`STATE.md`(逐轮进度,**先读它看最近做到哪**)`HANDOFF.md`(本文件)
- `specs/`:SPEC/SPEC2/WORLDBIBLE;`scripts/`:split/merge/rich-merge/build-gamedata/sim;`skill/`:**打包的 novel-to-game 技能**(装到 ~/.claude/skills 即复用)

## 3. 团队 & 关键决策(背景)
- 团队 repo `ai-game-jam`:`main` = Next.js 壳 + **cheney 的 `comment_engine/`(Python:评论→分类→Claude生成 事件/道具/NPC 的真 AI 管线)**;`feature/comment-intelligence` 分支有 cheney 的可玩 demo **「WASTELAND LIVE」**(`public/wasteland/`,像素风+荒诞喜剧,世界观是"AI统治世界存活100天")。
- **已定方向**:① 结合 = 把 cheney 的真·AI 评论管线接进我们 game-v2(见 INTEGRATION 契约),retune 成《最后的人》文学腔;② 游戏形态 = **住所(可移动)+ 路线 + POI**(cheney 的固定基地 = holdout 特例);③ 资源:末世=食物/健康/士气/幸存者,WotW=生命/补给/理智/隐蔽。

## 4. 本机环境约束(公司机器可能不同,留意)
- 这台没装 **Python**(只有 Store 占位)、没有 **ANTHROPIC_API_KEY** → cheney 的 Python 引擎跑不起来、真 AI 生成调不了,所以都做了**离线兜底**(generated_pool.json / 静态服务器看 demo)。**公司若有 Python+key,可把离线分支换成真引擎**(契约已留好钩子)。
- 浏览器开 game-v2.html / cold-open.html / character-generator.html 需联网(React CDN)。`.js` 在 type:module 下当 ESM,Node 侧用 vm 提供 window 加载(见 sim.cjs)。

## 5. 进行中 / 下一步(优先级)
- 🔄 **《世界大战》→游戏**:后台 subagent 正在 `C:\Users\Victoria\war_of_the_worlds\` 构建(本机外,**尚未进仓库**)。底座已好(27章+题记、4资源、6阶段);正补 spine_type/route/dwelling/poi_bank + 挖卡 + 做 wotw 前端。**若公司侧看不到这个目录**:用技能重跑即可——源 = Gutenberg ebook 36(`gutenberg.org/ebooks/36`),按 `~/.claude/skills/novel-to-game/SKILL.md` 流程跑(切章正则按"BOOK ONE/TWO + 罗马数字独行";注意 CRLF/TOC/密度≠张力三坑)。
- ⬜ **game-v2**:把"采纳"升级为"沿途 POI 际遇"(GAME_FRAMEWORK §E 的可玩证明)。
- ⬜ **接 cheney 真引擎**:给他 4 类生成 prompt 的《最后的人》重调稿 + 确认 INTEGRATION 契约。
- ⬜ 给《最后的人》补产 route/dwelling/poi_bank。

## 6. 工作习惯(记忆)
- 任何 UI 改动后**扫固定/绝对定位元素有无重合**;工具栏优先 in-flow 而非 absolute(见 skill/memory/check-ui-overlaps.md)。
- 省 token:避免重复读大文件、避免大输出、复杂构建用 subagent。
- 只在 `feature/novel-content-expansion` 上改,**绝不动 main 上队友的代码**。
