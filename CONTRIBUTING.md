# 贡献指南 Contributing

欢迎一起共建！这是个 hackathon 项目，规则尽量轻量，目标是**快速、愉快地堆出好玩的东西**。

## 开始之前

```bash
git clone git@github.com:CNLarrylai/ai-game-jam.git
cd ai-game-jam
npm install
cp .env.example .env.local   # 填入你的 API key
npm run dev
```

## 工作流

1. **永远从最新 main 切分支**
   ```bash
   git checkout main && git pull
   git checkout -b feature/简短描述
   ```
2. 改代码、本地跑 `npm run dev` 验证
3. 提交（用清晰的中文/英文 message）
   ```bash
   git commit -am "feat: 新增赛博朋克剧本"
   ```
4. 推送并在 GitHub 开 Pull Request
   ```bash
   git push -u origin feature/简短描述
   ```
5. 至少一个队友 review 后合并（hackathon 期间可放宽，约定即可）

## 分支命名约定

| 前缀 | 用途 |
|------|------|
| `feature/` | 新功能 / 新剧本 |
| `fix/` | 修 bug |
| `polish/` | UI / 文案打磨 |

## Commit message 约定（宽松版）

`feat:` 新功能 ・ `fix:` 修复 ・ `docs:` 文档 ・ `style:` 样式 ・ `refactor:` 重构

## 最容易上手的贡献

**加一个剧本** —— 只改 `lib/scenarios.ts` 一个文件，不会和别人冲突，5 分钟出活。详见 README。

## 避免冲突的小约定

- 不同人尽量改不同文件；多个剧本各自是独立对象，并行加不冲突
- 不要提交 `.env.local` 或任何 API key（`.gitignore` 已拦截，但请再确认）
- 大改动（动 `lib/ai.ts`、`api/game/route.ts` 这类公共文件）先在群里吼一声

## 行为准则

友善、互相帮忙、玩得开心。Hackathon 的第一目标是一起做出能 demo 的东西 🚀
