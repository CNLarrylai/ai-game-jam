# Phase 2 接口契约

> **给 Charlotte / 任何维护 phase2_engine.py 的人看的。**
> 修改 Phase 2 内部逻辑随意改，但下面的接口签名和输出格式不能变，否则 bridge.py 和测试会挂。

## 调用方式

Phase 2 有两种调用方式，都必须兼容：

### 1. HTTP 调用（生产环境，bridge.py 用）
```bash
uvicorn phase2_engine:app --port 8000
```
bridge.py 通过 `aiohttp` 调 `http://localhost:8000/phase2_*`

### 2. 直接 import（测试用）
```python
from phase2_engine import phase2_action, phase2_inject, phase2_event_choice
```
测试脚本 `test_pipeline_e2e.py` 直接 import 函数调用，不起 HTTP 服务。

**两种方式的入参和返回值完全一致。**

## 三个接口（不可改签名）

### POST /phase2_action
```
入参: Phase2Request
  - player_input: str
  - current_status: CurrentStatus {hp, hunger, thirst, sanity}
  - companions_list: List[Companion {name, personality, loyalty}]
  - inventory: List[str]
  - history: List[HistoryEntry]

出参: Phase2Response
```

### POST /phase2_inject
```
入参: Phase2InjectRequest
  - upstream_payload: dict  ← Phase 1 generator 的输出，必须含 "type" 字段
    type="EVENT"     → 透传 narration + options
    type="CHARACTER" → 透传 NPC 信息
    type="ITEM"      → 加背包 + stat_change
    type="LOCATION"  → 原样透传
  - current_status, companions_list, inventory, history（同上）

出参: Phase2Response
```

### POST /phase2_event_choice
```
入参: EventChoiceRequest
  - event_narrative: str    ← 事件描述（EVENT 为 narration，CHARACTER 为完整 JSON）
  - player_choice: str      ← 主播选的选项文字
  - current_status, companions_list, inventory, history（同上）

出参: Phase2Response
```

## Phase2Response（不可改字段名）

```python
{
    "type": str,                    # RESOURCE_MANAGE|EVENT|CHARACTER|ITEM|LOCATION_PASSTHROUGH
    "action_type": str,             # USE_NEW_ITEM|COMPANION_INTERACT|EVENT_TRIGGER|NPC_ENCOUNTER|ITEM_RECEIVED|EVENT_CHOICE|INVALID
    "final_category": str,          # EVENT|CHARACTER|ITEM|LOCATION|PLAYER ← bridge 按这个路由
    "narrative": str,               # 叙事文本
    "companion_agrees": bool,       # 同伴是否同意
    "rebellion_probability": float, # 反叛概率
    "loyalty_change": int,          # 好感度变更
    "stat_changes": {               # ← bridge 用这个更新 GameState
        "hp": int,
        "hunger": int,
        "thirst": int,
        "sanity": int
    },
    "inventory_change": {           # ← bridge 用这个更新背包
        "remove_items": [str],
        "add_items": [str]
    },
    "options": [dict] | null,       # EVENT/CHARACTER 时有选项
    "passthrough": dict | null      # LOCATION 时透传
}
```

## 字段映射（重要）

bridge.py 维护的 GameState 用 `spirit/health`，Phase 2 用 `sanity/hp`：

| bridge (GameState) | Phase 2 (CurrentStatus) |
|---------------------|------------------------|
| state.spirit        | current_status.sanity   |
| state.health        | current_status.hp       |
| state.hunger        | current_status.hunger   |
| state.thirst        | current_status.thirst   |

bridge.py 在调用时自动映射，Phase 2 不需要关心。

## 可以自由修改的部分

- System Prompt 内容（SYSTEM_PROMPT / EVENT_CHOICE_SYSTEM_PROMPT）
- LLM 模型选择（当前 Haiku，可换）
- Harness 内部逻辑（限幅范围、反叛惩罚规则）
- PRESET_ITEMS 硬编码道具列表
- _safe_json_parse 的容错逻辑
- 新增内部函数

## 不可修改的部分

- 三个接口的函数签名（参数名 + 类型）
- Phase2Response 的字段名和类型
- CurrentStatus / StatChanges / InventoryChange 的字段名
- FastAPI app 实例名必须是 `app`

## 测试验证

修改后跑这个确认没挂：
```bash
cd comment_engine && python3 test_pipeline_e2e.py
```
10 个用例全通过 = 接口兼容。
