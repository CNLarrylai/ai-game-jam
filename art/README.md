# 《在AI统治的世界存活100天》美术资产包 · 接入说明

> 产出方：游戏美术 Agent（林子尧）。资产 100% 来自 28 色白名单（见 [`wasteland-style-bible.md`](./wasteland-style-bible.md)），全部 CC0 兼容、可商用。
> 有任何资产不满意：报文件名即可，单张重跑不影响其他。
>
> 🎮 想直接看效果：浏览器打开 `demo/live-demo.html` —— Day1 剧本全流程双端可玩演示（开局打字机→家→选地图→双地图探索→收银机事件链 + 看播端 + 评论创意生效链路 + HD-2D 开关）。

## 1. 三步接入

1. 把 `assets/` 整个目录拷进你的游戏工程（结构别动）
2. 所有 PNG 都是**原始像素尺寸、透明底**，渲染时整数倍放大 + 关插值：
   ```css
   img, canvas { image-rendering: pixelated; }
   ```
   ```js
   ctx.imageSmoothingEnabled = false;  // canvas
   ```
3. 评论生成内容（NPC/道具）需要配图的，用 `runtime/art-resolver.mjs`（见 §4）

## 2. 目录与命名

```
assets/
├── title/title_screen.png        320×180  开局画面（下 1/3 留给标题字和按钮）
├── home/home_scene.png           256×176  家场景整屏
├── maps/
│   ├── supermarket/tile_*.png    32×32    超市 tileset（floor_a/b 可混拼）
│   ├── factory/tile_*.png        32×32    工厂 tileset
│   └── fog.png                   32×32    迷雾遮罩（直接叠未探索格上）
├── characters/
│   ├── char_player_idle.png              32×32  玩家待机
│   ├── char_player_walk_<dir>_f<1|2>.png 32×32  4 方向×2 帧（dir: down/up/left/right）
│   ├── char_npc_<name>.png               48×72  事件立绘（cashier/cat/ghost/qinshihuang）
│   └── char_companion_<name>.png         48×72  同伴（uncle/girl）
├── icons/icon_<name>.png         16×16    物资图标 ×15（_ai 后缀=AI 来源变体）
└── ui/                           界面件（九宫格参数见 ui/README.md）
```

行走动画：f1→f2 循环，建议 6-8 fps；idle 用单帧。

## 3. UI 关键参数速查

| 文件 | 尺寸 | 九宫格（上/右/下/左） | 用途 |
|---|---|---|---|
| panel_9slice | 48×48 | 4/4/4/4 | 通用面板 |
| event_card_frame | 160×96 | 18/4/4/4 | 事件弹窗（顶 18px 是标题条） |
| bubble_dialogue | 96×32 | 4/4/8/4 | NPC 对话气泡（下 8 保尾巴） |
| card_location | 96×64 | 18/4/16/4 | 地点卡（底 16 是星位行，用 star_danger.png 横排 N 颗 = 危险等级） |
| toast_item | 128×24 | 不拉伸 | 获得物品弹条，左侧 20×20 凹槽放图标 |
| banner_comment | 192×20 | 不拉伸 | 公屏横幅"✨ @xx 的创意生效了" |
| bar_warning | 160×12 | 不拉伸 | 环境危害常驻警告条 |
| bar_<stat> | 48×6 | 按比例裁宽 | 数值条：health 红 / spirit 蓝 / hunger 黄 / thirst 青，bar_empty 是空槽 |
| btn_primary_<state> | 64×20 | 不拉伸 | 主按钮三态；btn_choice_* 96×16 是事件选项 |
| hud_ap_pip_<on/off> | 8×8 | — | 行动点 ×5 横排 |

## 4. 运行时配图（评论生成的内容怎么有图）

剧情管线生成的 NPC/ITEM JSON 直接喂给 resolver：

```js
import { resolveArt } from './runtime/art-resolver.mjs';

const art = resolveArt(generatedJson);
// → { src: 'assets/icons/icon_canned_food.png', kind: 'icon', aiVariant: false }
```

- **ITEM**：按 category + 名称关键词匹配 15 个图标；`filter_strategy` 含 AI 语义或物品来源为 AI 时返回 `_ai` 变体（没有现成变体时返回 `aiFrame: true`，前端给图标加 1px #30e1b9 边框即可）
- **CHARACTER**：按 skills/关键词匹配 6 张立绘原型（机械/电子→cashier，动物→cat，灵异→ghost，古人/帝王→qinshihuang，军/工→uncle，医/学→girl）
- 没命中的返回兜底图 + `matched: false`，前端可只显示名字卡。原型库演示后会扩到 12+

详细映射表和"同画风生图 prompt 模板"（如果你们要接生图模型）见 `runtime/RUNTIME-ART.md`。

## 5. HD-2D 增强层（可选演示彩蛋）

整个游戏容器套一层 CSS 即可获得"八方旅人感"，一键开关：

```css
.hd2d { filter: contrast(1.06) saturate(1.1); }
.hd2d::after {  /* 暗角 */
  content:''; position:absolute; inset:0; pointer-events:none;
  box-shadow: inset 0 0 12vmin 2vmin rgba(24,20,37,.55);
}
```
