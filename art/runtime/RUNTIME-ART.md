# 运行时美术：评论生成内容的配图方案

> 对应剧情管线文档（评论识别与剧情生成模型设计）的前端需求：NPC 卡片像素头像、道具 toast 像素图标。

## 两层方案

### 第一层（默认）：标签检索，零延迟零成本

`art-resolver.mjs` 把生成 JSON 映射到资产包现有图：ITEM → 15 个图标（关键词优先、category 兜底），CHARACTER → 6 张立绘原型。没命中返回 `matched:false` + 兜底图。

原型库现状与扩展计划：当前 6 个原型（机械系/动物/灵异/古人/军工大叔/学者少女）。演示后按"评论高频角色类型"扩到 12+（老人/小孩/商人/异变体/无人机/宗教者……），扩一个 = 画一张 48×72 + resolver 加一行。

### 第二层（可选）：接生图模型时的"同画风"prompt 模板

把下面模板拼进生图调用，`{appearance_prompt}` 用生成 JSON 里的字段：

```
Pixel art character portrait, 48x72, transparent background.
{appearance_prompt}
STYLE RULES (strict):
- Palette ONLY these hex colors: #2e222f #3e3546 #625565 #7f708a #9babb2
  #6e2727 #b33831 #cd683d #f57d4a #f9c22b #733e39 #f77622 #feae34 #fee761
  #165a4c #239063 #1ebc73 #a2a947 #d5e04b (+#0b5e65 #0b8a8f #0eaf9b #30e1b9
  #8ff8e2 #4d9be6 ONLY for AI-faction characters)
- 4-5 value ramp per material, shadows shift purple, light from top-left 45°
- Selective dark outline (#181425) on silhouette only, colored inner lines
- Human characters: >=2 wear details (patches/rust/cracks), warm accents
- AI/machine characters: 1px cyan glow edge (#30e1b9), zero warm colors
- No gradients, no anti-alias blur, crisp pixels, post-apocalyptic survivor look
```

生图后建议过一遍 `scripts/restyle.mjs --keep-distinct` 把溢出色吸附回白名单（命令见根目录 README）。

## 给分类管线的建议字段

事件管线如果在 ITEM/CHARACTER JSON 里多带一个 `art_keywords: ["..."]`（生成时顺手抽 2-3 个名词），resolver 命中率会显著提高——比从 description 里正则猜可靠。
