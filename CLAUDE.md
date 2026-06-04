# AI Game Jam — Project Context

## 项目概述
AI × 直播 × 游戏 Hackathon 项目。末日生存 Roguelike 游戏，主播在直播间操作，观众通过评论影响游戏内容（AI 识别评论并生成事件/道具/角色/场景）。

## 目录结构

```
ai-game-jam/
├── app/                      # Next.js 前端（游戏界面）
├── components/               # React 组件
├── lib/                      # 前端工具库
├── novel_to_game_Larry/      # 模块3：小说→游戏卡点 pipeline（Larry）
│   ├── data/                 #   小说原文 + 切章
│   ├── specs/                #   提炼规范
│   ├── scripts/              #   流水线脚本
│   ├── build/                #   中间产物（卡点/互动层）
│   └── dist/                 #   成品（world_bible + map）
├── comment_engine/           # 评论识别 + 剧情生成引擎（陈昕）
│   ├── classifier.py         #   评论5类分类器
│   ├── comment_pool.py       #   30s窗口评论池
│   ├── generator.py          #   Claude API 4类内容生成
│   ├── game_state.py         #   游戏状态管理
│   └── game_loop.py          #   主循环（可替换输入/输出）
└── CLAUDE.md                 # 本文件
```

## 游戏世界观
- 近未来 AI 末日，AI 定点清除了所有不对 AI 说"谢谢"的人类（99.99%）
- 像素风 / 暗色复古未来 / 暗黑幽默
- 7天生存周期，Day制推进
- 四项核心数值：HP❤️ / 饱腹🍞 / 理智🧠 / 物资📦

## 评论引擎关键设计
- **30秒决策窗口**：每个决策点开窗30秒收集评论
- **5类分类**：EVENT / CHARACTER / ITEM / LOCATION / IRRELEVANT
- **世界观转译**：不兼容的评论不拒绝而是转译（激光枪→损坏的激光笔）
- **连贯性引擎**：每次生成注入完整历史 context，必须 callback 之前的伏笔
- **合码接口**：替换 comment_source 和 render_callback 即可接入真实直播间

## 依赖
- Python 3.9+, anthropic SDK
- Node.js (前端 + novel pipeline)
- Claude API key（generator.py 需要）
