# 开局对白演出规范(Opening scene spec)—— 标准产物 · 代入感核心

**目标**:intro(纯世界观)之后,**自动播放**一段剧情对白过场——NPC 先开口、玩家角色接话、你来我往几句,把**当天的情景 + 任务**勾出来。像一般游戏开场的对白演出,**不是**让玩家点菜单去聊天。这是代入感的核心模块,**标准交付物**。

## 和其它产物的区别(别混淆)
- `intro.json`(INTRO_SPEC)= 灾难背景/世界观,独白式旁白,纯叙事。
- **`opening.json`(本规范)= 剧情对白演出**,NPC↔玩家 scripted 对白,自动推进,收尾给当天任务。**这是 Larry 要的"开局后人物对话"。**
- `dialogue.json`(DIALOGUE_SPEC)= 可选的"点击同伴"互动 + 每日技能(玩法,非演出)。

## 输入(主要来自 world_bible.json)
- `route` / `progression_phases`:把故事切成"幕",每幕开头一段对白。journey 类按 leg/天,holdout 类按关键转折。
- `cast`:挑当幕在场的角色作 NPC(妻子/牧师/炮兵…)。
- `setup_to_preserve` + 当幕处境:决定这一幕"情景 + 任务"。

## 输出:`dist/opening.json` —— 对白场景数组(按幕)

```json
[
  {
    "id": "day1_flight",
    "trigger": { "day": 1 },              // 何时播(journey 用 day/leg;holdout 用转折标记)
    "setting": "沃金的家 · 清晨",          // 场景地点/时间 chip
    "lines": [
      { "speaker": "妻子", "av": "👰🏻", "side": "left",  "text": "NPC 开口,抛出处境……" },
      { "speaker": "你",   "av": "🧍🏻", "side": "right", "text": "玩家角色接话,推进或抉择倾向……" }
    ],
    "objective": "今日任务：一句话点明这一幕要达成什么。"
  }
]
```

## 设计规则
1. **每幕 4–8 句**,NPC 与玩家角色**交替**(side: left=NPC / right=你)。开局首句**由 NPC 抛出处境**最自然。
2. 对白要同时完成三件事:**交代情景**(发生了什么)、**塑造关系/角色**(说话方式见性格,忠于原著)、**抛出任务**(收尾 `objective`)。
3. `objective` = 一句话当天目标,玩家读完才进游戏(游戏壳让任务卡只能按"开始"关闭,不被连按跳过)。
4. **不在对白里堆 UI/操作说明**(那靠游戏内上下文提示)。对白是戏,不是教程。
5. 玩家角色("你")要有**声音和立场**,不是哑巴主角——它的回话体现主角的处境与选择倾向。
6. 不必每天都有;**在"幕"的开头放**(角色更替/处境剧变处)。WORLDS LIVE 放在 day 1(护送妻子)/ day 3(废宅潜伏)/ day 6(炮兵虚妄)。
7. 玩家可见文字简体中文;`id`/`side` 英文。

## 数量
按幕 **2–5 段**(对应 route 的主要 leg / 关键转折)。别每天都插,会拖节奏。

## 游戏壳如何消费
新 scene `script`:intro 结束 / 每天开始时,若 `opening.json` 有匹配 `trigger` 的场景,先全屏播放(打字机逐句、空格/点击推进、立绘左右切换、说话方高亮),末尾任务卡 → "开始这一天" → 进 home。参考 `applications/war_of_the_worlds/frontend/live/game/scenes-script.jsx`。

## 收尾
写文件前确认 `JSON.parse`。回报:产了几幕、各幕 trigger 与任务一句话。
