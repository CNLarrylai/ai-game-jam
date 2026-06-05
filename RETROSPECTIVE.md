# Phase 2 Engine 项目复盘

> AI末日：群体意志 Hackathon — Phase 2 现有资源/伙伴调整模块
> 负责人：Charlotte Yang | 时间：2026-06

---

## 一、核心设计思路

### 从零到四层管线

项目初期只有一句话需求：「玩家在家阶段，消耗物品或与同伴互动」。
逐步拆解后形成**四层管线**：

```
[输入] → Input Router → Filter → Generator → Harness Guardian → [输出]
```

| 层 | 职责 | 关键决策 |
|---|---|---|
| 第一层 Input Router | 分流 PRESET_ITEM / LLM / 上游注入 | 预设物品硬拦截，不消耗 LLM 算力 |
| 第二层 Filter | 结构性过滤，loyalty 传感器 | NERF 下放第三层，硬代码无法枚举非法输入 |
| 第三层 Generator | LLM 生成旁白和结果 | System Prompt 注入游戏历史 + SAN 幻觉规则 |
| 第四层 Harness | 数值限幅 + 摇号 + 容错解析 | AI 只输出概率，代码摇号决定结果 |

---

## 二、重要设计决策及讨论过程

### 决策1：companion_agrees 由代码摇号，不由 AI 决定

**初始设计**：AI 直接输出 `companion_agrees: bool`

**问题**：AI 输出 `companion_agrees=false` 和 `rebellion_probability` 两个字段同时存在，双重裁决冲突——如果 AI 已经判定不同意，概率字段还有意义吗？

**结论**：AI 只输出 `rebellion_probability`（0.0~1.0），代码执行 `random.random() >= rebellion_probability` 摇号，摇号结果决定 `companion_agrees`。这样随机性更强，游戏体验更好。

---

### 决策2：NERF 世界观校验放第三层，不放第二层

**初始设计**：第二层硬代码拦截「脱离世界观」的输入，强制执行 NERF

**问题**：硬代码无法枚举所有非法输入——「我要开宇宙飞船」是非法的，但「我要修一辆破自行车」呢？边界无法穷举。

**结论**：第二层只做结构性过滤（空输入/过长），NERF 转译逻辑写进 System Prompt，让 AI 做语义判断并创造性转译。

---

### 决策3：SAN 幻觉在生成阶段处理，不做后置重写

**初始设计**：第四层检测 sanity<30，调用 LLM 将 narrative 重写为幻觉风格

**问题**：后置重写 = 额外一次 LLM 调用，延迟和成本翻倍。

**结论**：`current_sanity` 作为第三层 Prompt 的 Context 输入，当 sanity<30 时直接要求 AI 以幻觉风格生成，第四层只做 warning 校验不阻塞流程。

---

### 决策4：上游注入后，玩家选择要带完整角色信息

**初始设计**：CHARACTER 注入后，玩家选择时只传 `dialogue_intro`（开场白）给 LLM

**发现的问题**：玩家把 CHARACTER 改成「字节跳动老员工」，但 LLM 生成的旁白完全没有字节相关内容——因为 LLM 根本不知道这个角色是谁。

**结论**：`pending_event` 需要保存完整的上游 payload（含 name、personality、hidden_trait），调用 `/phase2_event_choice` 时将完整角色信息拼入 `event_narrative`。

---

### 决策5：游戏历史上下文随请求携带

**问题**：LLM 每次调用都是「失忆状态」——不知道手绘地图是敲门事件里幸存者给的，不知道小明上回合差点被赶走。

**方案**：每次请求携带最近 20 条 `HistoryEntry`，LLM Prompt 格式：
```
【游戏历史】
  回合1｜我喝矿泉水 → 身体略有恢复 [口渴-20]
  回合2｜开门查看 → 门外是个幸存者 [hp-5] +['手绘地图']
【玩家指令】"我把手绘地图给小明研究"
```

**效果**：LLM 会生成「你展开那张来之不易的手绘地图……」而不是凭空生成。

---

## 三、遇到的 Bug 及解决方案

### Bug 1：ASCII 编码错误
**现象**：`UnicodeEncodeError: 'ascii' codec can't encode characters`

**根因**：`harness()` 里有一行 `print(f"[WARN] sanity<30 但 narrative 无幻觉风格")`，在终端编码为 ASCII 的环境下，打印中文字符失败，异常向上传播被误判为 LLM 调用失败。

**修复**：将 print 里的中文改为英文：`print("[WARN] sanity<30, narrative missing hallucination style")`

**教训**：日志里的中文在某些终端环境会爆，核心路径的 print 用英文更保险。

---

### Bug 2：LLM 返回的 JSON 解析失败（持续出现）
**现象**：`JSONDecodeError: Expecting ',' delimiter`

**根因分析（三个层次）**：

1. **第一层**：LLM 把 JSON 包在 ` ```json ``` ` markdown 代码块里，直接 `json.loads` 失败
2. **第二层**：narrative 字段里的人物对话用了英文双引号（如 `"AI巡逻队追我"`），破坏了 JSON 字符串结构
3. **第三层**：偶发的 trailing comma、行内注释等宽松格式

**修复路径**：
- 初版：正则提取 `{...}` → 失败（非贪婪匹配只取到第一个 `}`）
- 二版：剥掉 markdown 块再提取 → 部分解决
- 三版：引入 `json-repair` 库 + System Prompt 明确禁止 narrative 里用英文双引号

**最终方案**：
```python
from json_repair import repair_json

def _safe_json_parse(raw: str) -> dict:
    md_match = re.search(r'```(?:json)?\s*(.*?)\s*```', raw, re.DOTALL)
    block = md_match.group(1) if md_match else raw
    s, e = block.find("{"), block.rfind("}") + 1
    return repair_json(block[s:e], return_objects=True)
```

**教训**：LLM 输出的 JSON 永远不要假设格式完全正确，必须有容错层。

---

### Bug 3：`EVENT_CHOICE` 未加入 ActionType 枚举
**现象**：`ValidationError: Input should be 'USE_NEW_ITEM', 'COMPANION_INTERACT'... not 'EVENT_CHOICE'`

**根因**：新增了 `/phase2_event_choice` 接口，System Prompt 要求 AI 输出 `action_type: EVENT_CHOICE`，但 `ActionType` 枚举忘记加这个值。

**修复**：
```python
class ActionType(str, Enum):
    EVENT_CHOICE = "EVENT_CHOICE"  # 补充
    ...
```

**教训**：新增 action_type 时，枚举、Pydantic 模型、System Prompt 三处要同步更新。

---

### Bug 4：Pydantic `.dict()` 废弃警告
**现象**：`PydanticDeprecatedSince20: The dict method is deprecated`

**修复**：全局替换 `.dict()` → `.model_dump()`

---

### Bug 5：正则非贪婪导致 JSON 截断
**现象**：`_safe_json_parse` 里用 `re.search(r'```(?:json)?\s*(\{.*?\})\s*```', ...)` 提取 JSON，`.*?` 非贪婪，只匹配到第一个 `}`，JSON 被截断

**修复**：改为先提取 markdown 块内容，再用 `rfind("}")` 找最后一个 `}`：
```python
md_match = re.search(r'```(?:json)?\s*(.*?)\s*```', raw, re.DOTALL)
block = md_match.group(1) if md_match else raw
e = block.rfind("}") + 1
```

**教训**：正则里 `.*?` 非贪婪在多层嵌套 JSON 里不可用，用 `rfind` 更可靠。

---

### Bug 6：Gemini API 额度耗尽
**现象**：切换 Gemini API 测速，所有模型返回 `429 RESOURCE_EXHAUSTED`

**教训**：hackathon 阶段先确认 API 额度，不要临场换 provider。

---

## 四、接口演进历史

```
v1: /phase2_action（玩家指令）
      ↓ 发现上游也需要注入
v2: + /phase2_inject（EVENT/CHARACTER/ITEM/LOCATION）
      ↓ 发现透传后玩家选择结果没有动态生成
v3: + /phase2_event_choice（玩家选择后回调，LLM 动态生成）
      ↓ 发现 CHARACTER 旁白不知道角色是谁
v4: event_narrative 携带完整角色信息（name/personality/hidden_trait）
```

---

## 五、可复用的工程经验

### 1. LLM 输出必须有 Harness 防御层
不要相信 LLM 严格遵守格式约束。永远加：
- 数值范围 clamp（`max(-30, min(30, v))`）
- JSON 容错解析（`json-repair`）
- 概率输出而非直接布尔判定

### 2. System Prompt 格式规则要具体
「输出 JSON」不够，要写：
- narrative 字段禁止英文双引号
- 对话用「」或『』
- 不要加注释、不要加 markdown 包裹

### 3. 新增 action_type 时三处同步
Enum 定义 → Pydantic 模型 → System Prompt

### 4. 测试先于交付
每次改动先本地跑通（`python3 -c "..."`），确认无报错再重启 demo 给用户测。这次多次出现「改了代码 → 让用户测 → 报错 → 再改」的循环，应该在本地先验证。

### 5. 历史上下文是 AI 游戏的灵魂
没有历史就没有连贯性，道具来源、人物关系、剧情因果都需要历史上下文。设计 AI 游戏模块时，历史上下文应该是一等公民，从第一版就要设计进去。

---

## 六、没做完的事（如果还有时间）

- [ ] Session 级别的历史存储（引擎内部维护，不依赖调用方传入）
- [ ] 真实 LLM 测试（需要稳定的 API Key）
- [ ] CHARACTER 招募后加入同伴列表的完整逻辑
- [ ] 同伴被驱逐后的后续剧情影响
- [ ] 物品组合使用（两个物品叠加效果）
