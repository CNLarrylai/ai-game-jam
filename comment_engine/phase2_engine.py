"""
Phase 2 Engine — 现有资源/伙伴调整
双输入源：/phase2_action（玩家指令）+ /phase2_inject（上游评论引擎注入）
四层管线：Input Router → Filter → Generator → Harness Guardian
"""

import random
from enum import Enum
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import List, Optional, Any
from fastapi import FastAPI
from anthropic import Anthropic

app = FastAPI()
client = Anthropic()

# ─────────────────────────────────────────
# 枚举
# ─────────────────────────────────────────

class ActionType(str, Enum):
    USE_NEW_ITEM         = "USE_NEW_ITEM"
    COMPANION_INTERACT   = "COMPANION_INTERACT"
    EVENT_TRIGGER        = "EVENT_TRIGGER"
    EVENT_CHOICE         = "EVENT_CHOICE"
    NPC_ENCOUNTER        = "NPC_ENCOUNTER"
    ITEM_RECEIVED        = "ITEM_RECEIVED"
    LOCATION_PASSTHROUGH = "LOCATION_PASSTHROUGH"
    INVALID              = "INVALID"

class OutputType(str, Enum):
    RESOURCE_MANAGE      = "RESOURCE_MANAGE"
    EVENT                = "EVENT"
    CHARACTER            = "CHARACTER"
    ITEM                 = "ITEM"
    LOCATION_PASSTHROUGH = "LOCATION_PASSTHROUGH"

# ─────────────────────────────────────────
# 数据模型
# ─────────────────────────────────────────

class StatChanges(BaseModel):
    hp:     int = Field(0, description="生命值变更，范围 [-30, 30]")
    hunger: int = Field(0, description="饥饿值变更，变饱填负数，变饿填正数，范围 [-30, 30]")
    thirst: int = Field(0, description="口渴值变更，解渴填负数，变渴填正数，范围 [-30, 30]")
    sanity: int = Field(0, description="精神值变更，范围 [-30, 30]")

    @model_validator(mode="after")
    def clamp_all(self):
        self.hp     = max(-30, min(30, self.hp))
        self.hunger = max(-30, min(30, self.hunger))
        self.thirst = max(-30, min(30, self.thirst))
        self.sanity = max(-30, min(30, self.sanity))
        return self

class InventoryChange(BaseModel):
    remove_items: List[str] = Field(default_factory=list, description="从背包移除的物品名称列表")
    add_items:    List[str] = Field(default_factory=list, description="加入背包的物品名称列表")

class Companion(BaseModel):
    name: str
    personality: str
    loyalty: int

class CurrentStatus(BaseModel):
    hp: int
    hunger: int
    thirst: int
    sanity: int

class HistoryEntry(BaseModel):
    """单条历史记录：每次操作后追加，随请求传入"""
    turn:        int    = Field(..., description="回合序号，从1开始")
    action:      str    = Field(..., description="玩家做了什么 / 上游触发了什么")
    narrative:   str    = Field(..., description="当时的旁白结果")
    items_gained: List[str] = Field(default_factory=list, description="本回合获得的物品")
    items_lost:   List[str] = Field(default_factory=list, description="本回合消耗/丢失的物品")
    stat_delta:   Optional[str] = Field(None, description="本回合数值变化摘要，如 hp-5 sanity-10")

# 接口1入参
class Phase2Request(BaseModel):
    player_input: str
    current_status: CurrentStatus
    companions_list: List[Companion] = []
    inventory: List[str] = []
    history: List[HistoryEntry] = Field(default_factory=list, description="游戏历史记录，最近N条，调用方维护")

# 接口2入参
class Phase2InjectRequest(BaseModel):
    upstream_payload: dict[str, Any]
    current_status: CurrentStatus
    companions_list: List[Companion] = []
    inventory: List[str] = []
    history: List[HistoryEntry] = Field(default_factory=list, description="游戏历史记录，调用方维护")

# 统一输出契约（大模型和所有下游必须 100% 服从此结构）
class Phase2Response(BaseModel):
    type:                 OutputType  = Field(..., description="RESOURCE_MANAGE | EVENT | CHARACTER | ITEM | LOCATION_PASSTHROUGH")
    action_type:          ActionType  = Field(..., description="USE_NEW_ITEM | COMPANION_INTERACT | EVENT_TRIGGER | NPC_ENCOUNTER | ITEM_RECEIVED | EVENT_CHOICE | INVALID")
    final_category:       str         = Field("NONE", description="上游来源分类：EVENT | CHARACTER | ITEM | LOCATION | PLAYER，便于前端路由")
    narrative:            str         = Field(..., description="打字机特效旁白，80字以内")
    companion_agrees:     bool        = Field(False, description="同伴是否同意，由代码摇号决定，非AI输出；非同伴交互时默认 False")
    rebellion_probability: float      = Field(0.0,  description="AI输出的反叛概率 [0.0, 1.0]，代码据此摇号")
    loyalty_change:       int         = Field(0,    description="好感度变更 [-20, 20]：正常=0，善待=+5，反抗=-10，驱逐=-20")
    stat_changes:         StatChanges = Field(default_factory=StatChanges)
    inventory_change:     InventoryChange = Field(default_factory=InventoryChange)
    options:              Optional[List[dict]] = Field(None, description="EVENT/CHARACTER 选项列表，透传给前端")
    passthrough:          Optional[dict]      = Field(None, description="LOCATION 时原样透传给 Phase 4")

# AI 原始输出（不含 companion_agrees）
class AIRawOutput(BaseModel):
    action_type: ActionType
    narrative: str
    rebellion_probability: float = 0.0
    loyalty_change: int = 0
    stat_changes: StatChanges = StatChanges()
    inventory_change: InventoryChange = InventoryChange()

    @field_validator("rebellion_probability")
    @classmethod
    def clamp_prob(cls, v): return max(0.0, min(1.0, v))

    @field_validator("loyalty_change")
    @classmethod
    def clamp_loyalty(cls, v): return max(-20, min(20, v))

# ─────────────────────────────────────────
# 预设物品硬编码
# ─────────────────────────────────────────

PRESET_ITEMS = {
    "矿泉水":   StatChanges(thirst=-20),
    "鲱鱼罐头": StatChanges(hunger=-15, sanity=5),
    "猫咪罐头": StatChanges(hunger=-10, sanity=10),
}

# ─────────────────────────────────────────
# 第一层：输入路由
# ─────────────────────────────────────────

def route_player_input(player_input: str, inventory: list[str]):
    """玩家指令：检测 PRESET_ITEM，否则走 LLM"""
    for item, effects in PRESET_ITEMS.items():
        if item in player_input and item in inventory:
            return "PRESET_ITEM", item
    return "AI_PIPELINE", None

def route_upstream(payload: dict):
    """上游注入：按 type 分流"""
    t = payload.get("type", "").upper()
    if t == "EVENT":    return "EVENT"
    if t == "CHARACTER": return "CHARACTER"
    if t == "ITEM":     return "ITEM"
    if t == "LOCATION": return "LOCATION"
    return "UNKNOWN"

# ─────────────────────────────────────────
# 第二层：结构性过滤
# ─────────────────────────────────────────

def structural_filter(text: str) -> Optional[str]:
    if not text or not text.strip(): return "输入为空"
    if len(text) > 500:              return "输入过长"
    return None

# ─────────────────────────────────────────
# 第三层：LLM 生成
# ─────────────────────────────────────────

SYSTEM_PROMPT = """你是《在AI统治的世界存活100天》的剧情引擎，处理玩家在家中的资源管理和同伴交互。

【世界观】末日废土，AI已统治世界，基调暗黑幽默。

【NERF规则】若玩家指令严重脱离世界观，创造性转译为合理场景，不得拒绝。

【SAN幻觉规则】若 current_sanity < 30，narrative 必须呈现幻觉/惊悚/认知扭曲风格（直接在生成阶段处理）。

严格输出以下 JSON，不要多余文字：
{
  "action_type": "USE_NEW_ITEM 或 COMPANION_INTERACT 或 EVENT_CHOICE 或 INVALID",
  "narrative": "剧情旁白，80字以内",
  "rebellion_probability": 0到1的小数（同伴交互时填，其他填0）,
  "loyalty_change": 整数（-20到+20：正常=0，善待=+5，反抗未驱逐=-10，驱逐=-20）,
  "stat_changes": {"hp": 整数, "hunger": 整数, "thirst": 整数, "sanity": 整数},
  "inventory_change": {"remove_items": [], "add_items": []}
}

数值规则：hunger/thirst越低越好，吃东西喝水返回负数。每项绝对值不超过30。"""

# 专门用于处理「上游事件 + 玩家选择」的 System Prompt
EVENT_CHOICE_SYSTEM_PROMPT = """你是《在AI统治的世界存活100天》的剧情引擎。

【世界观】末日废土，AI已统治世界，基调暗黑幽默。

【重要格式规则】narrative 字段内禁止使用英文双引号 "，人物对话必须用「」或『』表示，否则会破坏 JSON 格式。

【你的任务】上游评论引擎触发了一个事件，玩家已做出选择。你需要根据：
- 事件内容
- 玩家的选择
- 玩家当前的状态（HP/饥饿/口渴/精神/同伴/背包）
生成「有上下文感知」的动态结果，而不是套用硬编码数值。

【关键规则】
- 精神值(sanity) < 30：narrative 必须呈现幻觉/认知扭曲风格
- 玩家状态会影响结果：比如HP很低时行动更危险，有同伴时可能有人帮忙
- 结果要合理反映玩家选择的风险与收益

严格输出以下 JSON，不要多余文字：
{
  "action_type": "EVENT_CHOICE",
  "narrative": "基于玩家状态和选择生成的动态结果旁白，100字以内",
  "stat_changes": {"hp": 整数, "hunger": 整数, "thirst": 整数, "sanity": 整数},
  "inventory_change": {"remove_items": [], "add_items": ["获得的新物品（如有）"]},
  "rebellion_probability": 0.0,
  "loyalty_change": 0
}

数值规则：每项绝对值不超过30。hunger/thirst越低越好。"""

def build_history_block(history: List[HistoryEntry], max_entries: int = 8) -> str:
    """把历史记录格式化成 LLM 可读的上下文摘要"""
    if not history:
        return "（游戏刚开始，暂无历史记录）"
    recent = history[-max_entries:]
    lines = []
    for h in recent:
        delta = f" [{h.stat_delta}]" if h.stat_delta else ""
        gained = f" +{h.items_gained}" if h.items_gained else ""
        lost   = f" -{h.items_lost}"   if h.items_lost   else ""
        lines.append(f"  回合{h.turn}｜{h.action} → {h.narrative[:40]}…{delta}{gained}{lost}")
    return "\n".join(lines)

def build_user_prompt(request: Phase2Request) -> str:
    companions_info = "\n".join(
        f"  - {c.name}（{c.personality}，loyalty={c.loyalty}）"
        for c in request.companions_list
    ) or "  无同伴"
    history_block = build_history_block(request.history)
    return f"""【游戏历史（用于保持剧情连贯性）】
{history_block}

【当前状态】
HP={request.current_status.hp} 饥饿={request.current_status.hunger} 口渴={request.current_status.thirst} 精神={request.current_status.sanity}
同伴：{companions_info}
背包：{', '.join(request.inventory) or '空'}

【玩家指令】"{request.player_input}"

请结合历史上下文生成结果。如果玩家使用的物品是之前事件中获得的，narrative 中应体现这个来源。"""

def build_event_choice_prompt(event_narrative: str, choice: str, request: Phase2Request) -> str:
    companions_info = "\n".join(
        f"  - {c.name}（{c.personality}，loyalty={c.loyalty}）"
        for c in request.companions_list
    ) or "  无同伴"
    history_block = build_history_block(request.history)
    return f"""【游戏历史】
{history_block}

【触发事件】{event_narrative}
【玩家选择】「{choice}」

【当前状态】
HP={request.current_status.hp} 饥饿={request.current_status.hunger} 口渴={request.current_status.thirst} 精神={request.current_status.sanity}
同伴：{companions_info}
背包：{', '.join(request.inventory) or '空'}

请结合历史上下文和玩家当前状态，生成这个选择的动态结果。"""

def _safe_json_parse(raw: str) -> dict:
    """容错 JSON 解析：处理 markdown 代码块、注释、双引号未转义等各种破损格式"""
    import re
    from json_repair import repair_json
    # 1. 剥掉 ```json ... ``` 包裹
    md_match = re.search(r'```(?:json)?\s*(.*?)\s*```', raw, re.DOTALL)
    block = md_match.group(1) if md_match else raw
    # 2. 取第一个 { 到最后一个 }
    s, e = block.find("{"), block.rfind("}") + 1
    cleaned = block[s:e] if s >= 0 else block
    # 3. 用 json_repair 自动修复破损 JSON（处理未转义引号、注释、trailing comma 等）
    return repair_json(cleaned, return_objects=True)

def call_llm(request: Phase2Request) -> AIRawOutput:
    import json
    response = client.messages.create(
        model=os.environ.get("GAME_MODEL", "claude-haiku-4-5-20251001"),
        max_tokens=512,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": build_user_prompt(request)}],
    )
    raw = response.content[0].text.strip()
    return AIRawOutput(**_safe_json_parse(raw))

def call_llm_event_choice(event_narrative: str, choice: str, request: Phase2Request) -> AIRawOutput:
    """处理「上游事件 + 玩家选择」，LLM 基于当前状态动态生成结果"""
    response = client.messages.create(
        model=os.environ.get("GAME_MODEL", "claude-haiku-4-5-20251001"),
        max_tokens=512,
        system=EVENT_CHOICE_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": build_event_choice_prompt(event_narrative, choice, request)}],
    )
    raw = response.content[0].text.strip()
    return AIRawOutput(**_safe_json_parse(raw))

# ─────────────────────────────────────────
# 第四层：Harness Guardian
# ─────────────────────────────────────────

def harness(ai: AIRawOutput, request: Phase2Request) -> Phase2Response:
    sc = ai.stat_changes
    companion_agrees = None

    if ai.action_type == ActionType.COMPANION_INTERACT:
        companion_agrees = random.random() >= ai.rebellion_probability
        if not companion_agrees:
            if random.random() < 0.5:
                sc.hp = max(-30, sc.hp - random.randint(5, 15))
            elif request.inventory:
                stolen = random.choice(request.inventory)
                ai.inventory_change.remove_items.append(stolen)

    if request.current_status.sanity < 30:
        keywords = ["幻觉","扭曲","错乱","融化","影子","颤抖","分不清","看见","消失","破碎"]
        if not any(k in ai.narrative for k in keywords):
            print(f"[WARN] sanity={request.current_status.sanity}<30, narrative missing hallucination style")

    return Phase2Response(
        type=OutputType.RESOURCE_MANAGE,
        final_category="PLAYER",
        action_type=ai.action_type,
        narrative=ai.narrative,
        companion_agrees=companion_agrees if companion_agrees is not None else False,
        rebellion_probability=ai.rebellion_probability,
        loyalty_change=ai.loyalty_change,
        stat_changes=sc,
        inventory_change=ai.inventory_change,
    )

# ─────────────────────────────────────────
# 上游注入处理器
# ─────────────────────────────────────────

def handle_inject_item(payload: dict, request: Phase2InjectRequest) -> Phase2Response:
    effect = payload.get("effect", {})
    raw_sc = effect.get("immediate_stat_change", {})
    sc = StatChanges(
        hp=raw_sc.get("hp", 0), hunger=raw_sc.get("hunger", 0),
        thirst=raw_sc.get("thirst", 0), sanity=raw_sc.get("sanity", 0),
    )
    name = payload.get("name", "未知物品")
    icon = payload.get("icon", "🎒")
    narrative = f"{icon} 获得「{name}」——{payload.get('description', '')}".strip()
    return Phase2Response(
        type=OutputType.ITEM, final_category="ITEM",
        action_type=ActionType.ITEM_RECEIVED,
        narrative=narrative, companion_agrees=False,
        stat_changes=sc, inventory_change=InventoryChange(add_items=[name]),
    )

def handle_inject_character(payload: dict) -> Phase2Response:
    return Phase2Response(
        type=OutputType.CHARACTER, final_category="CHARACTER",
        action_type=ActionType.NPC_ENCOUNTER,
        narrative=payload.get("dialogue_intro", ""), companion_agrees=False,
        options=payload.get("interaction_options", []), passthrough=payload,
    )

def handle_inject_event(payload: dict) -> Phase2Response:
    return Phase2Response(
        type=OutputType.EVENT, final_category="EVENT",
        action_type=ActionType.EVENT_TRIGGER,
        narrative=payload.get("narration", ""), companion_agrees=False,
        options=payload.get("options", []), passthrough=payload,
    )

def handle_inject_location(payload: dict) -> Phase2Response:
    return Phase2Response(
        type=OutputType.LOCATION_PASSTHROUGH, final_category="LOCATION",
        action_type=ActionType.LOCATION_PASSTHROUGH,
        narrative="", companion_agrees=False, passthrough=payload,
    )

# ─────────────────────────────────────────
# FastAPI 接口
# ─────────────────────────────────────────

@app.post("/phase2_action", response_model=Phase2Response)
def phase2_action(request: Phase2Request):
    route, matched = route_player_input(request.player_input, request.inventory)
    if route == "PRESET_ITEM":
        sc = PRESET_ITEMS[matched]
        return Phase2Response(
            type=OutputType.RESOURCE_MANAGE, final_category="PLAYER",
            action_type=ActionType.USE_NEW_ITEM,
            narrative=f"你拿出{matched}，身体略有恢复。",
            companion_agrees=False,
            stat_changes=sc, inventory_change=InventoryChange(remove_items=[matched]),
        )
    err = structural_filter(request.player_input)
    if err:
        return Phase2Response(
            type=OutputType.RESOURCE_MANAGE, final_category="PLAYER",
            action_type=ActionType.INVALID,
            narrative=f"[系统] {err}", companion_agrees=False,
        )
    return harness(call_llm(request), request)


class EventChoiceRequest(BaseModel):
    event_narrative: str
    player_choice: str
    current_status: CurrentStatus
    companions_list: List[Companion] = []
    inventory: List[str] = []
    history: List[HistoryEntry] = Field(default_factory=list)
    precomputed_options: Optional[List[dict]] = Field(None, description="Phase 1 预生成的选项(含outcome+stat_changes)，有则跳过LLM")

@app.post("/phase2_event_choice", response_model=Phase2Response)
def phase2_event_choice(request: EventChoiceRequest):
    # 优先查预生成结果（跳过 LLM，省 ~9s）
    if request.precomputed_options:
        for opt in request.precomputed_options:
            if opt.get("text", "") == request.player_choice:
                sc_raw = opt.get("stat_changes", {})
                # 映射 spirit→sanity（Phase 1 用 spirit，Phase 2 用 sanity）
                sc = StatChanges(
                    hp=sc_raw.get("health", sc_raw.get("hp", 0)),
                    hunger=sc_raw.get("hunger", 0),
                    thirst=sc_raw.get("thirst", 0),
                    sanity=sc_raw.get("spirit", sc_raw.get("sanity", 0)),
                )
                inv = InventoryChange(
                    add_items=[opt["item_gained"]] if opt.get("item_gained") else [],
                    remove_items=[opt["item_lost"]] if opt.get("item_lost") else [],
                )
                return Phase2Response(
                    type=OutputType.EVENT, final_category="EVENT",
                    action_type=ActionType.EVENT_CHOICE,
                    narrative=opt.get("outcome", ""),
                    companion_agrees=False,
                    stat_changes=sc, inventory_change=inv,
                )

    # 没有预生成 or 选项不匹配 → 走 LLM 兜底
    proxy_req = Phase2Request(
        player_input=request.player_choice,
        current_status=request.current_status,
        companions_list=request.companions_list,
        inventory=request.inventory,
        history=request.history,
    )
    ai = call_llm_event_choice(request.event_narrative, request.player_choice, proxy_req)
    return harness(ai, proxy_req)

@app.post("/phase2_inject", response_model=Phase2Response)
def phase2_inject(request: Phase2InjectRequest):
    route = route_upstream(request.upstream_payload)
    if route == "ITEM":       return handle_inject_item(request.upstream_payload, request)
    if route == "CHARACTER":  return handle_inject_character(request.upstream_payload)
    if route == "EVENT":      return handle_inject_event(request.upstream_payload)
    if route == "LOCATION":   return handle_inject_location(request.upstream_payload)
    return Phase2Response(
        type=OutputType.RESOURCE_MANAGE, final_category="NONE",
        action_type=ActionType.INVALID,
        narrative="[系统] 未知的上游注入类型", companion_agrees=False,
    )
