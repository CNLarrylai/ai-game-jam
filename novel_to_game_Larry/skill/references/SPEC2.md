# 厚提炼规范(rich extraction spec)—— 给直播互动用

在原有"决策卡"之外,把一个章节里**所有可复用的互动素材**榨出来,供直播互动叙事游戏制造更多"观众互动机会点"。

## 输入
- 章节全文在 `data/chapters.json`,按 `id` 找你那一章的 `text`。
- 如果 `build/cards/<id>.json` 已存在(之前产出的 2 个决策卡),**复用它们**,在此基础上加厚,不要推翻重写已合格的卡。
- (调用你时通常会直接给绝对路径,以它为准。)

## 输出:写到 `build/rich/<id>.json`,结构如下

```json
{
  "chapter": "V2-CVIII",
  "summary": "1-2句章节梗概(这一章在末日进程里发生了什么)",
  "beats": ["按时间顺序的关键事件,4-8条短句"],
  "cast": [ {"name":"伊德丽丝","state":"为孩子的安危濒临崩溃"} ],
  "places": ["圣巴塞洛缪医院","温莎城堡"],
  "stockpile": [
    {"item":"医院里成堆的药品与床位","res":"health","note":"可抢救但也可能染疫"}
  ],
  "nodes": [ /* 决策卡:2-4个,严格沿用旧契约(见下) */ ],
  "interactions": [ /* 轻量互动点:6-10个,见下面的类型 */ ]
}
```

### nodes(决策卡)—— 契约不变
每个 node 仍是完整契约:`id,title,desc,generated:true,icon,choices[2-3]`,每个 choice 必须有 `id,label,hint,costs([{res,d}],res∈food/health/morale,d整数),risk(bool),outcome({emoji,title,body}),next("" 或下一卡id),effects([])`,每卡至少一个 `risk:true`。**数量按章节密度定 2-4 个**:事件多就多产。

### interactions(轻量互动点)—— 新增,每章 6-10 个
每条至少有 `type`、`id`(snake_case)、`prompt`(给观众看的中文一句话)。按类型补字段:

| type | 作用 | 额外字段 |
|---|---|---|
| `poll` | 纯观点站队,不改资源 | `options`:["选项A","选项B"](2-4个) |
| `predict` | 让观众选前押注某个 risk 卡的隐藏结局 | `setup_node`:对应的 node id;`options`:["他还活着","他已死"] |
| `react` | 情绪刷屏时刻(惨烈/震撼场景) | `mood`:如 "horror"/"grief"/"awe" |
| `micro_choice` | 低风险小抉择,只轻推 ±1 资源 | `options`:[ {"label":"...","effect":{"res":"morale","d":1}} ](2-3个) |
| `lore` | 原文金句 / 主播可口播的旁白料 | `quote`:原文金句的简洁中译;`note`:一句主播怎么用 |

要求:
- 每章 interactions 至少覆盖 **3 种不同 type**,且至少 1 个 `predict` 钩到某个 risk 卡。
- `micro_choice` 的 effect 只用 food/health/morale,`d` 限 ±1。
- 全部紧扣本章真实事件,别另编故事。

## 文风
- 玩家/观众可见文字用**简体中文**,简洁、有末日紧张感。
- `id`、`res`、`mood` 用英文 snake_case。
- 写文件前确认整个 JSON 能 `JSON.parse`。

## 收尾
回报一句话:章节 id、产了几个 node、几个 interaction(列出各 type 计数)。
