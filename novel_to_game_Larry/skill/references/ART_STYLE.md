# 末日 · 美术与玩法规范(art & gameplay spec)

来源:Claude Design「末日生存·冷开场 — 暗调视觉系统」。实时样式见 `frontend/doom.css`,原始设计源码见 `frontend/design-ref/`。
**这是本项目所有游戏内容与前端的视觉/形式治理基线。生产内容时对齐它。**

---

## 1. 设计 token(全部用 oklch)

**底色(暗)**
- `--bg-0/1/2` = `oklch(0.16 / 0.13 / 0.10 …248-252)` —— 由上到下渐深的蓝黑天幕
- `--panel / --panel-2` 卡面;`--line / --line-soft` 描边

**文字(雾灰)**
- `--fog` 主文字 `oklch(0.74…)` · `--fog-soft` 次要 · `--fog-dim` 标签/暗示

**强调色(极克制)**
- `--ember` 余烬暖光 `oklch(0.72 0.13 55)` —— 唯一的"暖",用于 hover/重点/进度
- `--toxic` 病变绿 `oklch(0.66 0.1 150)` —— **只用于悬念/risk 揭晓**
- 三资源色直接绑定:`--food = wheat(0.76 0.08 78)`、`--health = cyan(0.74 0.07 210)`、`--morale = rust(0.62 0.15 35)`

## 2. 字体
- `--f-serif` **Noto Serif SC** —— 叙事正文、标题、选项动作(沉浸感主力)
- `--f-sans` Noto Sans SC —— UI 正文
- `--f-stamp` **Oswald** —— 全大写、大字距的"印章"标签(资源名、天数、kicker、按钮)

## 3. 氛围质感(全是叠加层,纯 CSS)
- `.world` 多重 radial/linear 渐变天幕 + `.horizon` 余烬呼吸(emberBreath 9s)
- `.vignette` 内阴影暗角 · `.grain` SVG 噪声颗粒(grainShift) · `.ash` 上升的灰烬粒子
- 木刻质感:`repeating-linear-gradient` 斜向排线 + multiply 混合(`.scene-hatch` / `.portrait-hatch`)

## 4. 组件
- **顶栏**:`.daystamp`(PLAGUE / DAY n,印章字)+ `.resbar`(三资源,10 段式 `.seg`,变化时 `.delta` 浮字)
- **世界铺陈** `.wline`:serif 大字,blur(5px)+ 上移淡入,逐行浮现;`.accent`=ember,`.dim`=已读变暗
- **幸存者卡** `.survivor` + 木刻剪影 `.bust`(细节:cross/pony/hood + suspense `.mark` 病变点)
- **选项** `.choice`:`c-num` 序号 + `c-act`(serif 动作)+ `c-hint`(斜体暗示)+ `c-arrow`;hover 亮 ember 左条
- **揭晓** `.reveal-box`:三段式 屏息`.rv-hold`(脉冲点)→ 结果 `.rv-title/.rv-body` → `.rv-deltas` 资源增减 + `.rv-foot`;`good`/`bad` 边框与标题变色;配合全屏 `.flash` 与 `.world.shake`
- **底部**:`.hairline` 进度发丝线 · `.skip` 跳过 · `.mute` 环境音

## 5. 玩法形式:冷开场三层递进(见 `frontend/cold-open.html` / `design-ref/doom.jsx`)
```
world  世界铺陈  —— 氛围文字逐行浮现,定调灾难阶段
crew   幸存者群像 —— 介绍你要守护的人(其中一人带"悬念")
choice 首个抉择  —— 情境铺陈 → 选项列表
pick → 屏息(hold) → 结果文字(show) → 资源 delta + 闪光/震屏(good/bad)
ending 接入正式游戏
```
节奏参数:世界行 ~2.1s/行,幸存者 ~0.9s/张,揭晓 屏息 1.1s → 文字 → +1.1s 出数值。可跳过、可静音、有 WebAudio 环境低鸣 + 点击/屏息/吉凶音效。

---

## 6. ⭐ 关键:我们的卡点契约**直接**映射进这套引擎

设计里每个选项的数据结构,和我们 `dist/map.json` 的卡点选项几乎一一对应:

| 引擎(doom.jsx) | 我们的卡点契约 |
|---|---|
| `act` | `choice.label` |
| `hint` | `choice.hint` |
| `costs:[{res,d}]` | `choice.costs:[{res,d}]`(res 同为 food/health/morale) |
| `title` / `body` | `choice.outcome.title` / `outcome.body` |
| `foot` | `choice.effects[0]`(或专门的收尾句) |
| `tone: good/bad` | 由 `choice.risk` + 净收益推导;`risk:true` 走 `--toxic` 悬念揭晓 |
| 资源 10 段表 | 由世界圣经 `resource_logic` 驱动的资源经济 |

**结论**:`world_bible.json`(世界铺陈 + 人物 + 资源逻辑)→ 冷开场的 world/crew 两层;`map.json` 的任意卡点 → choice/reveal 两层。内容与美术彻底解耦,我们产的每张卡都能直接在这套视觉里播放。

> 生产新内容时:文字走 serif 的克制末日腔;risk 选项的 `hint` 留白、`outcome` 里用"病变绿"语感的揭晓;`icon`/emoji 与资源色系一致(🥫/💊/🔥)。

---

## 7. 插画生成 guideline(每张卡自动配图)

来源:`frontend/design-ref/doom-art.jsx`。**木刻剪影 SVG**,可按"配方"为任意场景/人物批量生成,无需外部图片。

**通用画法(场景 `DoomScene`)** — viewBox `0 0 1000 560`:
1. 天空:`<rect fill="url(#duskSky)">`(暮色四段渐变)+ `<ellipse fill="url(#duskGlow)">`(地平线余烬)
2. 剪影:深色 `path/rect`(`#06070a`→`#0d0f14`)分层堆远→近,**全部套 `filter="url(#dRough)"`** 得到木刻毛边;`dRough2` 用于细物
3. 一点不祥光:门窗/火光用 `oklch(0.66 0.13 58)` 低透明小矩形
4. 人物:`svgSurvivor(x,y,scale)` 放前景小剪影
5. 覆盖:`.scene-hatch`(斜向排线)+ `.scene-grain`(噪声),由 doom.css 自动加
- 用法:`world-scene`(底部 46vh,subtle)/ `choice-scene`(顶部 64vh,向下渐隐到暗,卡片浮其上)
- 已为本作自绘:`windsorDusk`(温莎城堡暮色)、`derelictHut`(水闸破屋)。**新卡 = 加一个 DOOM_SCENES 条目**,照上面 5 步堆该场景的标志物(如"城堡病榻""沉船""冰穴")。

**人物配方(`portraitSVG`)** — 四参数即出新角色:
`{ body: tall|mid|small, trait: glasses|ponytail|cap|scarf|hood, emblem: {type: cross|strap|armband|mark, color}, eyes }`
- `trait` 一个就够(辨识度);`emblem` 一个点睛;`hood`+`eyes` = 悬念角色(阿德里安即用此)
- 已配:伊德丽丝(mid+ponytail+strap)、克拉拉(small+scarf)、阿德里安(tall+hood+mark+eyes)

**结论**:逐章铺内容时,每张卡可同时产出 `scene`(场景配方)与新出场人物的 `recipe`,渲染端零图片、纯 SVG 即得统一木刻插画。这套配方将并入 `SPEC.md`,让卡点生成顺带产出配图参数。

---

## 8. 角色生成器(团队/NPC/观众入场)

来源:Claude Design「末日·角色生成器」。可玩工具 `frontend/character-generator.html`(双击打开),源码 `frontend/design-ref/avatar.*`,渲染组件 `Avatar(recipe)`。比 §7 的肖像配方更完整,**一套版画语言覆盖"末日匿名剪影 ↔ 写实可认头像"**。

**recipe 字段(全部可枚举,见 `dist/characters.json`)**
| 字段 | 取值 |
|---|---|
| `lit` | `true` 写实有脸 / `false` 纯剪影(未知·神秘·已逝) |
| `body` | tall / mid / small |
| `skin` | porcelain / light / tan / brown / deep / ebony |
| `hair` | short / long / bun / afro / buzz / bald / hijab / hood |
| `hairColor` | black / darkbrown / brown / blonde / gray / red / teal / pink |
| `accessory` | none / glasses / cap / mask / headphones |
| `facial` | none / stubble / beard |
| `emblem` | none / armband / cross(医者) / strap(背包带) |
| `role` | none / active(活跃💬) / mic(上麦🎙️) / donor(金主👑) |
| `suspense` | `true` 病变绿斑(疑似感染/悬念) |

脸部默认是"末日疲惫"长相(凹陷阴影、皱眉、眼袋、倦容);`lit:false` 退化为纯剪影,适合"门后的未知""逃难者群像"。

**两类用途(已落地 `dist/characters.json`)**
1. **团队角色 + 剧情 NPC**:`cast`(主角群 8 人)+ `npcs`(老保姆/末日疯先生/破屋弃者/百岁老人/逃难者/哗变兵)。新卡出场新人物时,顺手给一个 recipe 即可有配图。
2. **观众入场(直播 → 游戏)**:`role` 系统把直播间身份映射成可识别角色——金主戴冠、上麦持麦、活跃带框。没传头像的观众用 `randomAvatar(role)` 一键生成通用角色,仿佛"入场"参与这一局。

**未来:按观众信息生成相关 NPC(架构 + 隐私)**
- 思路:把观众的**公开**信息(昵称/平台头像/打赏等级)确定性地映射成 recipe ——例如对昵称做 hash → 选 body/skin/hair/发色,打赏等级 → `role`。同一观众每次进场得到同一张脸(稳定代入感)。
- ⚠️ **隐私红线**:只用观众**主动提供或平台公开**的信息,并应取得同意;不要抓取私密数据、不要把可识别个人信息落库。hackathon 演示建议"由公开昵称确定性派生",不存原始个人数据。
- 落点:这层做成一个 `deriveRecipe(publicProfile) -> recipe` 的纯函数,接到直播端;游戏内容侧不感知。
