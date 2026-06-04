# 项目状态(handoff / 防压缩续作锚点)

## 位置
- 团队 repo:`C:\Users\Victoria\ai-game-jam`(Next.js 脚手架,**勿动 main 上别人的代码**)
- 我们的模块:`ai-game-jam\novel_to_game_Larry\`,分支 **`feature/novel-content-expansion`**(从 main 切,独立,合并以后再说)
- GitHub:https://github.com/CNLarrylai/ai-game-jam(凭据已缓存,push 不弹窗)

## 已完成
- `dist/world_bible.json` 全局底座;`dist/map.json` 66 决策卡(19 章);`dist/interactions.json` 197 互动点;`dist/prologue_cards.json` 3 过桥卡;`dist/characters.json` 角色库(木刻配方)
- `frontend/`:`doom.css`(暗调视觉系统)、`cold-open.html`(冷开场,可玩)、`character-generator.html`+`avatar.css`(角色生成器)、`design-ref/`(Claude Design 原始源码)
- `docs/`:`METHODOLOGY.md`(可复用方法论)、`ART_STYLE.md`(美术+玩法规范,§7 插画 §8 角色生成)
- `specs/`:SPEC / SPEC2 / WORLDBIBLE;`scripts/`:split / merge / gamify / rich-merge / build-gamedata / sim

## 进行中:可玩游戏 `frontend/game/`
- `gamedata.js`(自动生成:22 节点主线 campaign + nodes + interactions + nodeChapter;`node scripts/build-gamedata.mjs` 重建)
- `engine.js`(纯逻辑,浏览器/Node 双用):资源 food/health/morale(0–10,任一≤0 出局);risk 揭晓;`next` 分支否则下一章锚点;通关/死亡结局。
  观众机制:顺应民意 +1 士气、押注共鸣 +1 士气、**金主每 4 抉择给最低资源 +2**(solo 模拟,multiplayer 接真观众)。TUNING 常量可调。
- `game.html`(UI,复用 cold-open 的 React+doom.css 模式):开场(world lines+crew)→ 逐卡(资源条/情境/选项/观众投票条)→ 屏息揭晓 → 死亡或通关。
- 自测:`node scripts/sim.cjs [N]` 多策略模拟统计平衡(随机/谨慎/激进)。
- 要求:单人耐玩 + 留观众互动影响游戏的钩子。**先让用户玩一遍 → 再自我迭代到 80 分**。

## 注意
- `.js` 在 type:module 下被当 ESM;gamedata/engine 用 `window` 全局导出,Node 侧用 vm 提供 window 加载(见 sim.cjs)。
- 浏览器打开 game.html 需联网(React CDN)。
- 省 token:避免重复读大文件、避免大输出。

## Polish 记录
- polish 第2轮:幸存者改为忠于原著的按章节失人映射(V3-CI 失伊德丽丝 −1、V3-CIX 沉船同失阿德里安+克拉拉 −2 → 归0锁"最后的人"结局,移除原 spectre/ice_burial 失人点,同伴小条置灰+悼念提示);征集倒计时 20s→12s 且可随时立即采纳/直接选不阻塞;采纳给当前最低资源+1并在横幅/反馈点明"观众的点子帮了你·X+1";新增幕间承接旁白过场卡(章节切换时一两句把22幕串成南逃线);Babel 编译通过、预览无 JS 报错、sim 600 死亡率随策略 10%~100%(谨慎100%胜/激进100%死,未动 engine 经济)。下一步:打磨结局多样性(survivors>0 的"幸存者/余生"分支文案与画面)+ 让 poll/predict 投票更显著影响抉择结果。
- polish 第3轮(主agent直调平衡):起始资源 8/9/8 + 金主 every3/+2;sim1500 随机死亡率 90%→26%(评分线第2项达标)。剩余给定时任务:① 让 poll/predict 观众投票真正改变抉择结果(signature,目前只 +1士气)② 打磨'最后的人'结局的情感冲击 + 确认死亡结局已多样(注:完整通关锁'最后的人'本就忠于原著)。
- polish 第4轮(cron):实现观众投票真正改变结果——顺应强民意(≥50%)软化该选项最重负代价+1、逆强民意士气−1(engine 加通用 extraAdjust,game.html 不传不受影响);sim600 平衡不变;engine 解析正常。**未标 DONE**:Chrome 自动化不可用、未能亲自浏览器实测,留待用户早上验证。下一步:① 人工实测 game-v2 全流程 ② 可选:打磨'最后的人'结局情感冲击 + poll/predict 之外的事件分支。
- polish 第5轮(cron):强化'最后的人'结局文案(罗马刻字+扬帆,忠于原著,engine 共用 game.html 同步受益);node --check engine 语法 OK。**判定达到评分线 → 写 frontend/game/POLISH_DONE.md,停止 2 小时夜间循环以省额度**。唯一未达项=人工浏览器实测(Chrome 自动化不可用),留用户早上验证;删 POLISH_DONE.md 可恢复循环。
