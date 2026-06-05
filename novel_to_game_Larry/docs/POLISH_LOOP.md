# 自主打磨协议(可被任意新会话/定时任务接力)

目标:把 `frontend/game/game-v2.html`(直播间框架版《最后的人》)打磨到"足够好"(见评分线),期间无需用户在场,主 agent 代用户决策。

> 背景与决策见 `docs/GAME_FRAMEWORK.md`;整体状态见 `docs/STATE.md`。分支 `feature/novel-content-expansion`。
> 现有可玩旧版 `frontend/game/game.html`(组件/模式来源);引擎 `engine.js`、数据 `gamedata.js`(`node scripts/build-gamedata.mjs` 重建)、`sim.cjs`(平衡模拟)、美术 `frontend/doom.css`(木刻暗调,勿改像素)。

## 评分线(达到即"足够好",≥80 分)
1. **能跑通**:浏览器打开无 JS 报错;开场→旅程→事件→结算 全流程走得通。
2. **4 维经济**:食物/健康/士气/幸存者 正常增减;死亡/通关/最后一人 结局可达且**平衡**(随机play不必死、谨慎play能赢;用 `node scripts/sim.cjs` 验,死亡率别 0% 也别 100%)。
3. **直播间布局**:左70%游戏 + 右30%评论区 + 顶部状态栏,16:9 对齐干净、无错位/怪折行。
4. **观众采纳回路可见可用**:征集倒计时 → 采纳三件套(公屏横幅 + 评论金色高亮✨ + 画面光圈);poll/predict 投票影响游戏(顺应民意+1士气)。
5. **保留**:人物图鉴(正文人名可点)、手记、顶栏身份条,均工作。
6. **美术一致**:木刻暗调,无像素;无对齐问题。
7. **故事连贯**:旅程读起来是一条线(幕间有承接,不"跳");人物首次出现能看懂是谁。
8. **节奏**:不过长/过短;重大节点有剧情卡。
9. **无 UI 重合**:固定/绝对定位元素(状态栏 / 工具按钮 / 公屏横幅 / 弹窗 / 倒计时条 / toast…)互不遮挡;开场、游戏、揭晓、结算各阶段对齐正常,无文字被压、无按钮叠在数值条上。

## 每轮迭代流程(一轮只做 1–3 个最高优先项,省 token)
1. 读 `docs/STATE.md`、本协议、`frontend/game/game-v2.html`(按需读 engine/gamedata/doom.css/game.html)。
2. 对照评分线,挑出**当前最该修的 1–3 项**(坏 > 不平衡 > 粗糙 > 细节打磨)。
3. 修(改 game-v2.html / engine / 数据;涉及平衡就跑 `scripts/sim.cjs` 调 TUNING/起始资源)。
4. 自检:无 JS 语法错;逻辑用 sim 验;**逐项扫 UI 有无不必要的重合/遮挡**(重点:顶部状态栏 vs 浮动按钮/横幅;弹窗 vs 倒计时条);不要破坏 game.html。
5. 提交:`git add novel_to_game_Larry && git commit`(中文 message,标注 polish 轮次),分支 `feature/novel-content-expansion`。
6. 更新 `docs/STATE.md` 末尾:"polish 第 N 轮:做了 X;下一步 Y"。
7. **达到评分线**就创建 `frontend/game/POLISH_DONE.md`(写一句完成总结)并停止;否则进入下一轮。

## 并发锁(避免定时任务与在跑的 subagent 互相覆盖)
- 开工前看 `frontend/game/.polish-lock`:若存在且修改时间 < 30 分钟,**跳过本次**(有别的迭代在跑)。
- 否则写入 `.polish-lock`(内容=当前时间戳),干完删除。

## 需要时回原著挖
`data/pg18247.txt` 在手。缺旅程地点/物资/NPC/危机场景/剧情文本时,按 `GAME_FRAMEWORK.md` C 节去检索补充。

## 给定时任务的单轮指令(自包含)
"读 `C:\Users\Victoria\ai-game-jam\novel_to_game_Larry\docs\POLISH_LOOP.md` 并遵循它。若 `frontend/game/POLISH_DONE.md` 已存在则什么都不做。否则按协议做**一轮**(1–3 项)打磨 `game-v2.html`,提交并更新 STATE.md。保持单轮、省 token。"
