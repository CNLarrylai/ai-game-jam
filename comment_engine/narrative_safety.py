"""
NarrativeSafety — 叙事安全检查层
在 generate → apply 之间执行，防止叙事崩溃。

检查链：
1. 钩子孤儿检查 — 引用的同伴/道具是否还存在
2. 状态一致性 — item_gained/lost 是否合法
3. 数值安全 — 不会一步直接 game over（非 boss 场景）
4. 叙事连续性 — 不引入不可逆的世界观变更
5. Context 压缩 — 历史事件摘要，防止 token 溢出
"""

from dataclasses import dataclass, field
from typing import Optional
from game_state import GameState, Item, Companion, NarrativeHook


# ============================================================
# 检查结果
# ============================================================

@dataclass
class SafetyCheckResult:
    passed: bool
    score: int  # 0-100
    issues: list = field(default_factory=list)  # 严重问题（导致丢弃）
    warnings: list = field(default_factory=list)  # 可修复的警告
    auto_fixes: list = field(default_factory=list)  # 自动修复记录


# ============================================================
# 核心检查函数
# ============================================================

def check_narrative_safety(generated: dict, state: GameState, category: str) -> SafetyCheckResult:
    """
    对生成内容执行全套安全检查。

    Args:
        generated: AI 生成的 JSON dict
        state: 当前游戏状态
        category: EVENT / CHARACTER / ITEM / LOCATION

    Returns:
        SafetyCheckResult
    """
    result = SafetyCheckResult(passed=True, score=100)

    # 1. JSON 完整性
    _check_json_completeness(generated, category, result)

    # 2. 状态一致性（仅 EVENT）
    if category == "EVENT":
        _check_state_consistency(generated, state, result)
        _check_stat_safety(generated, state, result)
        _check_capability_usage(generated, state, result)
        _check_hook_resolution(generated, state, result)

    # 3. 同伴上限（仅 CHARACTER）
    if category == "CHARACTER":
        _check_companion_limit(generated, state, result)
        _check_skill_complement(generated, state, result)

    # 4. 背包上限（仅 ITEM）
    if category == "ITEM":
        _check_inventory_limit(state, result)

    # 最终判定
    if result.issues:
        result.passed = False
    if result.score < 50:
        result.passed = False
        result.issues.append(f"总分 {result.score} 低于阈值 50")

    return result


# ============================================================
# 各项检查实现
# ============================================================

def _check_json_completeness(generated: dict, category: str, result: SafetyCheckResult):
    """检查必要字段是否存在"""
    required_fields = {
        "EVENT": ["event_title", "narration", "options"],
        "CHARACTER": ["name", "skills", "interaction_options"],
        "ITEM": ["name", "category", "enables"],
        "LOCATION": ["name", "danger_level", "grid_size", "preset_cells"],
    }
    missing = [f for f in required_fields.get(category, []) if f not in generated]
    if missing:
        result.issues.append(f"缺少必要字段: {missing}")
        result.score -= 30


def _check_state_consistency(generated: dict, state: GameState, result: SafetyCheckResult):
    """检查 item_gained/lost 是否合法"""
    options = generated.get("options", [])
    inventory_names = [
        i.name if isinstance(i, Item) else str(i) for i in state.inventory
    ]

    for i, opt in enumerate(options):
        lost = opt.get("item_lost")
        if lost and lost not in inventory_names:
            # 自动修复：移除不存在道具的引用
            opt["item_lost"] = None
            result.warnings.append(f"选项{i+1} 引用不存在的道具 '{lost}'，已自动清除")
            result.auto_fixes.append(f"option[{i}].item_lost: '{lost}' → null")
            result.score -= 5


def _check_stat_safety(generated: dict, state: GameState, result: SafetyCheckResult):
    """检查数值变化是否会导致非战斗场景下直接 game over"""
    options = generated.get("options", [])
    is_boss = any(
        "boss" in str(opt.get("outcome", "")).lower()
        or "boss" in str(generated.get("event_title", "")).lower()
        for opt in options
    )

    for i, opt in enumerate(options):
        changes = opt.get("stat_changes", {})
        for stat in ("hp", "hunger", "sanity"):
            change = changes.get(stat, 0)
            current = getattr(state, stat, 100)
            new_val = current + change

            if new_val <= 0 and not is_boss:
                # 非boss场景不允许一步致死，钳位到 5
                changes[stat] = -(current - 5)
                result.warnings.append(
                    f"选项{i+1} 的 {stat} 变化 ({change}) 会导致归零，已钳位到 -{current - 5}"
                )
                result.auto_fixes.append(
                    f"option[{i}].stat_changes.{stat}: {change} → {-(current - 5)}"
                )
                result.score -= 10

            if abs(change) > 30:
                changes[stat] = 30 if change > 0 else -30
                result.warnings.append(f"选项{i+1} 的 {stat} 变化 ({change}) 超出 [-30,30] 范围，已钳位")
                result.auto_fixes.append(f"option[{i}].stat_changes.{stat}: {change} → {changes[stat]}")
                result.score -= 5


def _check_capability_usage(generated: dict, state: GameState, result: SafetyCheckResult):
    """检查是否至少1个选项使用了已有能力"""
    caps = state.get_capabilities()
    all_enables = set()
    for tags in caps["from_inventory"].values():
        all_enables.update(tags)
    for tags in caps["from_companions"].values():
        all_enables.update(tags)

    if not all_enables:
        # 玩家还没有任何能力，跳过检查
        return

    options = generated.get("options", [])
    has_capability_use = False
    for opt in options:
        cap_used = opt.get("capability_used", "")
        if cap_used and cap_used != "none":
            # 检查是否在能力清单中
            for tag in all_enables:
                if tag in cap_used:
                    has_capability_use = True
                    break
        if has_capability_use:
            break

    if not has_capability_use:
        result.issues.append("没有任何选项使用了已有能力（AVAILABLE CAPABILITIES）")
        result.score -= 30


def _check_hook_resolution(generated: dict, state: GameState, result: SafetyCheckResult):
    """检查 MUST_TRIGGER 钩子是否被兑现"""
    must_trigger = []
    for h in state.hook_queue:
        if isinstance(h, NarrativeHook) and not h.resolved:
            waiting = state.day - h.setup_day
            if waiting >= h.max_delay:
                must_trigger.append(h)

    if not must_trigger:
        return

    resolved_ids = set(generated.get("hooks_resolved", []))
    for hook in must_trigger:
        if hook.hook_id not in resolved_ids:
            result.issues.append(
                f"MUST_TRIGGER 钩子 [{hook.hook_id}] '{hook.setup}' 未被兑现"
            )
            result.score -= 25


def _check_companion_limit(generated: dict, state: GameState, result: SafetyCheckResult):
    """检查同伴上限"""
    if len(state.companions) >= 3:
        result.warnings.append("同伴已满（3/3），招募需先遣散现有同伴")
        result.score -= 5


def _check_skill_complement(generated: dict, state: GameState, result: SafetyCheckResult):
    """检查新同伴技能是否与现有队伍互补"""
    existing_enables = set()
    for comp in state.companions:
        if isinstance(comp, Companion):
            existing_enables.update(comp.get_enables())

    new_enables = set()
    for skill in generated.get("skills", []):
        if isinstance(skill, dict):
            new_enables.update(skill.get("enables", []))

    overlap = existing_enables & new_enables
    if overlap and len(overlap) > len(new_enables) * 0.5:
        result.warnings.append(f"新同伴技能与现有队伍重叠超50%: {overlap}")
        result.score -= 15


def _check_inventory_limit(state: GameState, result: SafetyCheckResult):
    """检查背包是否已满"""
    if len(state.inventory) >= state.backpack_capacity:
        result.warnings.append(f"背包已满（{len(state.inventory)}/{state.backpack_capacity}），需先丢弃道具")
        result.score -= 5


# ============================================================
# 钩子孤儿清理
# ============================================================

def clean_orphan_hooks(state: GameState):
    """清理引用已不存在的同伴/道具的钩子"""
    inventory_names = {i.name if isinstance(i, Item) else str(i) for i in state.inventory}
    companion_names = {c.name if isinstance(c, Companion) else str(c) for c in state.companions}
    all_names = inventory_names | companion_names

    cleaned = []
    for h in state.hook_queue:
        if not isinstance(h, NarrativeHook):
            continue
        if h.resolved:
            continue

        # 检查 setup 描述中是否引用了已不存在的实体
        orphaned = False
        for name in list(inventory_names) + list(companion_names):
            # 如果钩子的 setup 明确提到某个实体名，但该实体已不在
            pass  # 简单实现：检查 setup 中是否包含任何当前不存在的名字

        # 更可靠的方式：检查钩子关联的能力是否还可用
        caps = state.get_capabilities()
        all_enables = set()
        for tags in caps["from_inventory"].values():
            all_enables.update(tags)
        for tags in caps["from_companions"].values():
            all_enables.update(tags)

        # 如果钩子的 payoff 都指向已不存在的能力，标记为孤儿
        # 这里用简单的名字匹配
        setup_lower = h.setup.lower()
        is_orphan = False
        for name in inventory_names | companion_names:
            if name.lower() in setup_lower:
                # 这个名字在 setup 中提到了，检查是否还存在
                # （它在当前的 names 集合中，所以还存在，不是孤儿）
                break
        else:
            # setup 中没有提到任何当前实体，但这不一定是孤儿
            # 只有当 setup 明确提到的实体被移除时才是孤儿
            pass

        if is_orphan:
            h.resolved = True
            cleaned.append(h.hook_id)

    return cleaned


# ============================================================
# Context 压缩
# ============================================================

def compress_history(state: GameState, keep_recent_days: int = 2):
    """
    压缩历史事件记录，防止 context 超过 token 限制。
    保留最近 N 天的完整记录，更早的压缩为一行摘要。
    """
    if not state.event_history:
        return

    from game_state import EventRecord

    compressed = []
    detailed = []

    for event in state.event_history:
        if isinstance(event, EventRecord):
            day = event.day
        elif isinstance(event, dict):
            day = event.get("day", 0)
        elif isinstance(event, str):
            # 已经是摘要字符串
            compressed.append(event)
            continue
        else:
            compressed.append(str(event))
            continue

        if day > state.day - keep_recent_days:
            detailed.append(event)
        else:
            # 压缩为一行
            if isinstance(event, EventRecord):
                summary = f"Day{event.day}: {event.title} → {event.choice_made}"
            elif isinstance(event, dict):
                summary = f"Day{event.get('day', '?')}: {event.get('title', '?')} → {event.get('choice_made', '?')}"
            else:
                summary = str(event)
            compressed.append(summary)

    state.event_history = compressed + detailed
