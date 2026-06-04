# 小说 → 末日生存叙事游戏:可复用方法论 (v1)

一套把**任意一本小说**转成"可玩叙事卡点 + 直播互动层"的流水线。换书时流程不变,只换填充内容与少量调参。本文件是团队的复用蓝本。

---

## 0. 核心理念
1. **设定与玩法分离**:一本小说同时含"世界观(不变底座)"和"抉择(玩法实例)"。先抽底座(World Bible,一份),再抽卡点(很多)。
2. **密度即探测器**:关键词密度筛能自动区分"哪里是铺垫、哪里是玩法",从而决定每章挖多深——不是每章都平均用力。
3. **资源是跨小说的桥**:任何小说的关切都映射到固定 N 个游戏资源(本项目 3 个:food/health/morale)。映射规则写进 World Bible 的 `resource_logic`。
4. **引擎可换**:提炼既能用 Claude API(`gamify.mjs`),也能用 in-harness 的 Claude 子 agent(无需 API key)。两条路输出同一契约。

---

## 流水线七步

### 步骤 1 · 摄取与切分 (`split.mjs`)
- 去掉 Project Gutenberg 页眉/页脚(`*** START/END OF ***` 之间)。
- 按章节标题正则切分(本书 `^CHAPTER [IVXLC]+\.`),按"罗马数字重置"识别卷。
- 产出 `chapters.json`(每章 id/卷/正文)。
- ⚠️ **复用时必做**:不同书的章节标记不同(`Chapter 1` / `1.` / `* * *` / `LETTER I`),正则要按书调。
- ⚠️ **已知坑**:本书正文前的 **Introduction(框架引子)在 CHAPTER I 之前,被切分器漏掉了**。引子常含关键世界观(本书=女巫洞穴的"预言残叶")。复用时务必单独捕获 Introduction/Prologue/序。
- ⚠️ **编码**:用 Node(UTF-8)读写 JSON;不要用 PowerShell `ConvertFrom-Json`(会被智能引号噎住)。

### 步骤 2 · 密度图 (`split.mjs` 内)
- 用一组**题材关键词**统计每章密度(命中数/千词)。本项目末日词集:plague/death/famine/flee/danger/sick/dying/escape/corpse/contagion…
- 产出每章密度排名。**高密度 = 玩法金矿;低密度 = 世界观铺垫。**
- ⚠️ **复用时必做**:关键词集随题材换(悬疑→clue/murder/alibi;战争→siege/retreat/ammunition;太空→hull/oxygen/breach)。

### 步骤 3 · 世界圣经 (`WORLDBIBLE.md` → `world_bible.json`)
- 派扫描 agent 通读**低密度开篇**(及全书略读),**只回报世界观素材 + 候选卡点张力评分,不写卡**。
- 我(主控)合成唯一的 `world_bible.json`。schema 见 `WORLDBIBLE.md`,关键字段:
  - `catastrophe.progression_phases` —— 灾难分阶段。**这就是逐章提炼时要喂给模型的"全局背景"来源**(此刻灾难到了哪一步)。
  - `resource_logic` —— 小说关切 → 3 资源的映射(跨小说复用的桥)。
  - `cast` / `factions` / `setup_to_preserve` / `signature_quotes` / `tone_and_motifs` —— 供卡点、旁白、氛围全程复用。
- **这一步是第一性产物**,先于所有卡点。

### 步骤 4 · 定义资源模型
- 选 N 个能概括题材核心张力的资源轴。本项目:`food`(生存底线)/`health`(伤病感染)/`morale`(人性士气)。
- ⚠️ **复用时**:太空求生可能是 oxygen/power/sanity;航海可能是 provisions/hull/crew-loyalty。3 个轴要互相能"真两难"。

### 步骤 5 · 逐章挖卡(密度加权) (`SPEC.md`,引擎=子 agent 或 `gamify.mjs`)
- **按密度分配力度**:高密度章厚挖 2–4 卡;低密度章只取全卷最强的少数(用步骤3的张力评分 ≥3~4 才做)。
- 每个卡点严格遵守**输出契约**(见下)。喂给模型的上下文 = 该章正文 + `world_bible` 里对应的 progression phase。
- 并行 fan-out:一章一个 agent,各写 `out/<id>.json`。

### 步骤 6 · 厚提炼:直播互动层 (`SPEC2.md` → `out_rich/<id>.json`)
- 在卡点之外,每章再榨出 `beats / cast / places / stockpile` + **轻量互动点**(poll / predict / react / micro_choice / lore)。
- 目的:给直播观众高频互动机会点(单章触点可扩到 ~3.7×)。`predict` 钩到 risk 卡 = 选前押注、揭晓爆点。

### 步骤 7 · 合并与校验 (`merge.mjs`)
- 把所有 `out/*.json`(+ prologue)按阅读顺序拼成 `map.json`。
- 全量校验:契约合规、node id 全局唯一、`next` 指向无悬空。
- 跨章节用 `next` 缝主线(prologue 的越界卡 → 第二卷开篇)。

---

## 输出契约(卡点 node)—— 复用时保持不变,前端只认这个
```
node: { id, title, desc, generated:true, icon, choices[2-3] }
choice: { id, label, hint, costs:[{res∈资源集, d:int}], risk:bool,
          outcome:{emoji,title,body}, next:"" | 下一卡id, effects:[string] }
```
规则:每卡 2–3 真两难选项、无明显最优解;代价落在资源集;**每卡至少一个 `risk:true`**(精确 costs/outcome 选后揭晓,选前 `hint` 只给模糊情绪);`effects` 记因果。

---

## 复用到新小说:换什么 / 不换什么
| 不变(流程/工具) | 按书替换(内容/调参) |
|---|---|
| 七步流水线 | 章节切分正则、Introduction 捕获方式 |
| `merge.mjs` 校验 | 题材关键词集(步骤2) |
| 卡点输出契约 | 资源三元组(步骤4) |
| World Bible / SPEC / SPEC2 的 schema | `world_bible.json` 的填充 |
| "密度加权挖卡""张力评分选卡" | 每密度档的挖卡数量阈值 |

---

## 已踩的坑(复用时先看)
1. **Introduction 被漏切**——序言/引子常含最浓世界观,单独捕获。
2. **"每个选项都要有 outcome"**——子 agent 易误解为"只有 risk 才有 outcome";SPEC 要显式强调,合并校验能逮住。
3. **risk 选项老绑"+士气"**——玩家会摸出"高士气=有埋伏"的规律;需在 SPEC 加约束,让 risk 外表多样化。
4. **micro_choice 易写成二元善恶**——加中间项更有张力。
5. **PowerShell JSON 编码**——一律用 Node 读写。

---

## 当前产物清单(本书实例)
| 路径 | 角色 |
|---|---|
| `dist/world_bible.json` | 全局底座(设定/灾难阶段/资源映射/人物/基调/金句) |
| `dist/map.json` | 主线:第二、三卷 19 章 × 38 卡点 |
| `dist/prologue_cards.json` | 第一卷过桥:3 张高张力卡,缝入主线 |
| `build/cards/*.json` · `build/rich/*.json` | 逐章卡点 · 厚提炼(直播互动层,样板 V2-CVIII) |
| `specs/{SPEC,SPEC2,WORLDBIBLE}.md` | 三套提炼规范(引擎吃这个) |
| `scripts/{split,merge,gamify}.mjs` | 切分+密度 · 合并校验 · API 引擎 |
| `data/{pg18247.txt,chapters.json,selected.json}` | 源文件 + 中间产物 |
| `README.md` · `docs/METHODOLOGY.md` | 项目索引 · 复用蓝本(本文件) |
