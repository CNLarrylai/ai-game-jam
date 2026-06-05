# 剧本目录与索引（Scenario Registry）

这个目录是**剧本的动态来源**。系统把剧本抽象成"可被索引的多来源目录"，由 `lib/registry.ts` 聚合。

## 怎么新增一个剧本

往 `index.json` 的 `scenarios` 数组里加一个对象即可（`id` 全局唯一）：

```json
{
  "id": "my-scenario",
  "title": "剧本名",
  "tagline": "一句话简介",
  "emoji": "🎲",
  "genre": "题材（可选）",
  "mechanic": "游戏机制（可选）",
  "opening": "开场白……结尾给玩家一个抉择。",
  "systemPrompt": "给 GM 的系统提示词：世界观 + 玩法 + 基本规则。"
}
```

提交即入库。**不需要改任何代码。**

## 三种来源 · 新增后多久能访问

`lib/registry.ts` 按 `id` 合并去重，后者覆盖前者：

| 来源 | 在哪 | 新增后何时可访问 | 适用 |
|---|---|---|---|
| **builtin** 内置 | `lib/scenarios.ts`（硬编码） | 改代码 → 重新构建/部署 | 官方基线剧本 |
| **repo** 仓库 | 本文件 `scenarios/index.json`（构建期读盘） | 提交 → 下次构建/部署 | 团队共建库 |
| **github** 运行时 | 运行时从 GitHub 拉同名 `index.json` | 提交 → **最多 5 分钟内**（缓存 TTL），**无需重新部署** | 真·动态新增 |

> github 来源指向 `SCENARIO_REPO`（默认 `CNLarrylai/ai-game-jam`）的 `SCENARIO_REF`（默认 `main`）分支。
> 想让某个分支的剧本即时上线，把 `SCENARIO_REF` 指到那个分支即可。失败/超时(2.5s)会静默降级，不影响内置与仓库来源。

第四种来源是用户在 `/create` 用自己的小说**现场生成**（`generated`，客户端临时态），不进此索引。

## 访问方式

- 索引页：`/scenarios`（按来源打标签，可直接开玩）
- 索引 API：`GET /api/scenarios`（只回元数据；`?github=0` 跳过运行时拉取）
- 解析单个：`registry.getScenarioById(id)`

## 寻址模型（一个剧本怎么被"访问到"）

```
稳定 id ──► 索引解析(registry) ──► 拿到完整剧本(含 systemPrompt) ──► 进入对话(/api/game 带 systemPrompt)
```

id 是跨来源的稳定锚点；来源切换（仓库↔GitHub↔DB）不改变寻址方式——这是为了将来把来源换成数据库/对象存储/第三方注册中心时，上层无需改动。
