# WORLDS LIVE — 世界大战 · 火星入侵生存直播

把《世界大战》（H.G. Wells）套进 **cheney 的「WASTELAND LIVE」直播间框架**，做了世界观、美术与玩法的重铸。这是"小说→游戏"引擎的第二种壳：**直播间互动版**（区别于同目录 `frontend/game/` 的 journey 单人版）。

## 怎么开
React 走 CDN，必须用 HTTP（不能 `file://`）：
```bash
cd novel_to_game_Larry/applications/war_of_the_worlds/frontend/live
npx http-server . -p 8920 -c-1
# 打开 http://127.0.0.1:8920/index.html
```

## 复刻了 cheney 框架的什么
- **三栏直播间**：顶部状态栏（DAY x/7 + 4 资源 + 行囊）｜左舞台（场景）｜右弹幕流（采纳/刷屏去重/征集创意）
- **状态机**：栖身(home) → 整理行囊(organize) → 选路线(destination) → 探索(explore) → 回栖身(Day+1) → … → 失败/通关/结算
- **导演对象 D**：场景只调用 `D.decision / applyStats / story / banner / addItem…`
- **观众回路**：弹幕实时流、@某人创意"融入游戏世界"、刷屏自动合并去重、📢 征集创意
- **接口契约保留**：`generateAIEvent` 仍调 `window.ApiBridge`（接 cheney 的真 AI 时无缝；离线走兜底）

## 按《世界大战》做的重铸（内容 + 美术 + 玩法）
| 维度 | WASTELAND（cheney） | WORLDS LIVE（本作） |
|---|---|---|
| 资源轴 | HP/饱腹/理智/物资 | **生命/补给/理智/隐蔽** |
| 核心机制 | 打 Boss（机械守卫） | **躲三脚机器人**——火星人只能躲不能打，吃「隐蔽」轴（忠于原著） |
| 队友 | 机械师/军医 | **妻子(D1-2)→牧师(D3-5)→炮兵(D6-7)**，随天数更替，各自忠于原著（牧师=累赘、炮兵=虚假希望） |
| 栖身 | 固定避难所 | **可移动栖身**：家/单马车 → 哈利福德废宅 → 帕特尼地窖（顶栏 chip 显示暴露度） |
| 目的地 | 工厂/超市 | 路线的"程"：梅伯里储藏室 / 泰晤士渡口 / 哈利福德废宅 / 死寂伦敦 |
| 美术 | 暗色像素霓虹废土 | **维多利亚末日**：灰烬炭黑 + 火星红草 + 热射线惨绿 + 烛火（`theme.css` 覆盖 `game-base.css`） |
| 结局 | 找到出口 | **撑到第 7 天 = 火星人被地球细菌击倒**（忠于原著） |

## 4 个新增/强化的交互（本次需求）
1. **队友互动场景**：栖身处点击同伴 → 对话（技能/询问），技能带忠于原著的代价（捂住牧师=隐蔽↑理智↓）
2. **明确的外部探索**：选路线 → 六边形地图，行动点（AP）限制，点相邻格触发 搜空屋/难民/三脚机器人/红草
3. **时间流逝**：DAY x/7 + 每次外出 5 点行动点；补给见底则每日扣生命
4. **空格探索**：探索时按 `空格` = 屏息潜行，自动摸向最近方向（消耗 1 AP，带冷却）— 见 `scenes-out.jsx` 的 `stealthProbe`

## 文件地图
```
live/
├── index.html              # 入口（game-base.css → theme.css 叠加；按序加载 jsx）
└── game/
    ├── game-base.css       # 复用 cheney 的全部组件样式（基底）
    ├── theme.css           # 维多利亚末日主题覆盖 + 空格潜行提示样式 + 4 资源配色
    ├── data.jsx            # 🎯 内容：资源/同伴/路线/六边形格/弹幕（改这里换内容）
    ├── chrome.jsx          # 顶栏（4 资源 + 栖身 chip）+ 弹幕流
    ├── effects.jsx         # 覆盖层（决策卡/故事卡/横幅/toast…）— 复用 cheney
    ├── scenes-home.jsx     # 栖身/营地（队友互动）+ 整理行囊
    ├── scenes-out.jsx      # 选路线 + 六边形探索 + 空格潜行
    ├── scenes-end.jsx      # 失败/通关/结算/分享
    └── app.jsx             # 编排：状态机 + 导演 D + 死亡/通关判定
```

## 验证
无 Chrome 环境下用 jsdom + Babel 做了渲染级验证：7 个 jsx 全部编译通过、`<App/>` 完整渲染零运行时错误、状态机切换正常、**全流程 home→explore→空格潜行（AP 5→4）端到端通过**。唯一未做：真人浏览器逐帧手验（留待打开页面确认观感）。

## 接真 AI（公司机器若有 Python + ANTHROPIC_API_KEY）
`generateAIEvent` 的钩子已留好，按 `docs/INTEGRATION_comment-engine.md` 契约把 cheney 的 `comment_engine/` 接上，即可把"征集创意/探索格"的离线兜底换成真·AI 实时生成。
