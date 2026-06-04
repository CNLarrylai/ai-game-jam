# 🎮 AI Game Jam — AI 互动叙事冒险

> 一个由 AI 实时主持的网页互动游戏。玩家选一个剧本，AI 扮演「游戏主持人」，根据玩家的每一个行动即兴编织剧情。
>
> 本项目为 **Hackathon 共建项目**，欢迎随时 fork / 提 PR / 加新玩法。

![tech](https://img.shields.io/badge/Next.js-15-black) ![tech](https://img.shields.io/badge/TypeScript-5-blue) ![tech](https://img.shields.io/badge/Tailwind-3-38bdf8)

---

## ✨ 它能做什么

- 🕯️ 内置 3 个开箱即玩的剧本（古宅探案 / 星舰生存 / 酒馆经营）
- ⌨️ 玩家用自然语言输入行动，AI **逐字流式**回应，像真人主持
- 🧩 **加新游戏零门槛**：往一个文件里加一段配置即可，不碰前后端代码
- 🔌 AI Provider 可插拔：默认 Claude，也支持 Gemini，一个环境变量切换

---

## 🚀 本地跑起来（30 秒）

```bash
# 1. 安装依赖
npm install

# 2. 配置 API Key
cp .env.example .env.local
#   然后编辑 .env.local，填入你的 ANTHROPIC_API_KEY

# 3. 启动
npm run dev
```

打开 http://localhost:3000 即可游玩。

> 没有 Anthropic key？把 `.env.local` 里的 `AI_PROVIDER` 改成 `gemini`，填 `GEMINI_API_KEY` 即可。

---

## 🧩 加一个你自己的剧本（共建主入口）

打开 **`lib/scenarios.ts`**，复制一个现有对象，改成你的：

```ts
{
  id: "your-game-id",        // 唯一标识，英文
  title: "你的游戏名",
  tagline: "一句话简介，显示在卡片上",
  emoji: "🎲",                // 卡片封面 emoji
  opening: "游戏开场时 AI 说的第一段话……",
  systemPrompt: `${BASE_RULES}

【剧本：你的游戏名】
在这里描述世界观、AI 主持人的身份与语气、剧情走向规则。`,
}
```

保存后刷新首页就能看到新卡片——**不需要改任何其他文件**。

> 写好 systemPrompt 是关键，要点见 `lib/scenarios.ts` 顶部注释。

---

## 🗂️ 项目结构

```
ai-game-jam/
├── app/
│   ├── page.tsx              # 首页：剧本选择
│   ├── layout.tsx            # 全局布局
│   ├── globals.css           # 全局样式
│   └── api/game/route.ts     # 后端：接收行动 → 调 AI → 流式返回
├── components/
│   └── GameChat.tsx          # 游戏对话界面（前端核心）
├── lib/
│   ├── scenarios.ts          # 🎯 剧本库（共建主入口）
│   ├── ai.ts                 # AI Provider 抽象（Claude / Gemini）
│   └── types.ts              # 共享类型
├── .env.example              # 环境变量模板
└── README.md
```

数据流：`玩家输入 → GameChat → POST /api/game → lib/ai.ts → 模型 SSE → 流式回前端`

---

## 🤝 一起共建

1. 同步最新代码：`git pull`
2. 建分支：`git checkout -b feature/我的玩法`
3. 改完提交：`git commit -am "feat: 加了 XX 剧本"`
4. 推送并开 PR：`git push -u origin feature/我的玩法`

详见 [CONTRIBUTING.md](./CONTRIBUTING.md)。新人最友好的第一个贡献就是**加一个剧本** 🎲

---

## 🌐 部署

一键部署到 Vercel：导入本仓库 → 在 Environment Variables 里填 `ANTHROPIC_API_KEY`（及可选的 `AI_PROVIDER` / `GEMINI_API_KEY`）→ Deploy。

---

## 💡 可以拓展的方向（认领 issue）

- [ ] 游戏存档 / 分享回放链接
- [ ] 给 AI 主持人加「掷骰子」机制，行动有成败判定
- [ ] 角色属性面板（血量 / 物品栏）并让 AI 感知
- [ ] 多人同屏，轮流行动
- [ ] 图片生成：每个场景配一张 AI 插画
- [ ] 语音朗读主持人的叙述

MIT License.
