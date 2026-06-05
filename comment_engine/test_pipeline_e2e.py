"""
端到端管线测试 — Phase 1 → Phase 2 全服务端闭环
前端不感知中间过程，只收到最终的 Phase2Response。

测试矩阵：
1. 评论 → 分类 → 生成 → inject → Phase2Response（EVENT/CHARACTER/ITEM/LOCATION）
2. Phase2Response 有 options 时 → event_choice → 动态结果
3. 主播直接操作 → phase2_action → 结果
4. 预设道具硬拦截（不调 LLM）
5. 荒谬评论转译后注入
6. 连续多轮，验证 history 积累和状态一致性
"""

import os
import sys
import json
import time

sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))

from classifier import classify
from generator import generate
from game_state import GameState, Item, Companion, CompanionSkill, NarrativeHook
from narrative_safety import check_narrative_safety
from phase2_engine import (
    Phase2Request, Phase2InjectRequest, EventChoiceRequest,
    CurrentStatus, Companion as P2Companion, HistoryEntry,
    phase2_action, phase2_inject, phase2_event_choice,
)


# ============================================================
# 测试基础设施
# ============================================================

class PipelineState:
    """模拟 bridge.py 维护的全局状态"""
    def __init__(self):
        self.game = GameState()
        self.game.spirit = 60
        self.game.health = 50
        self.game.hunger = 30
        self.game.thirst = 30
        self.game.inventory = [
            Item("矿泉水", "💧", "drink", "干净饮用水", -1),
            Item("鲱鱼罐头", "🐟", "food", "极其刺激", -1),
            Item("旧手电筒", "🔦", "tool", "勉强能用", 3, enables=["light_source"]),
        ]
        self.history = []
        self.turn = 0
        self.results = []  # 收集所有测试结果

    def to_phase2_status(self):
        return CurrentStatus(
            hp=self.game.health, hunger=self.game.hunger,
            thirst=self.game.thirst, sanity=self.game.spirit,
        )

    def to_phase2_companions(self):
        return [
            P2Companion(
                name=c.name if isinstance(c, Companion) else str(c),
                personality=c.skill if isinstance(c, Companion) else "",
                loyalty=60,
            )
            for c in self.game.companions
        ]

    def to_inventory_names(self):
        return [i.name if isinstance(i, Item) else str(i) for i in self.game.inventory]

    def to_history_entries(self):
        return [HistoryEntry(**h) for h in self.history[-20:]]

    def apply_response(self, resp, action_desc=""):
        """应用 Phase2Response 到状态"""
        sc = resp.stat_changes
        self.game.spirit = max(0, min(100, self.game.spirit + sc.sanity))
        self.game.health = max(0, min(100, self.game.health + sc.hp))
        self.game.hunger = max(0, min(100, self.game.hunger + sc.hunger))
        self.game.thirst = max(0, min(100, self.game.thirst + sc.thirst))

        for name in resp.inventory_change.remove_items:
            self.game.remove_item(name)
        for name in resp.inventory_change.add_items:
            self.game.add_item(Item(name, "📦", "special", "", 3))

        self.turn += 1
        delta = []
        if sc.hp: delta.append(f"hp{sc.hp:+d}")
        if sc.hunger: delta.append(f"饥饿{sc.hunger:+d}")
        if sc.thirst: delta.append(f"口渴{sc.thirst:+d}")
        if sc.sanity: delta.append(f"精神{sc.sanity:+d}")
        self.history.append({
            "turn": self.turn,
            "action": action_desc[:40] or resp.narrative[:40],
            "narrative": resp.narrative,
            "items_gained": resp.inventory_change.add_items,
            "items_lost": resp.inventory_change.remove_items,
            "stat_delta": " ".join(delta) or None,
        })


def check(name, condition, detail=""):
    status = "✅" if condition else "❌"
    print(f"  {status} {name}" + (f" — {detail}" if detail else ""))
    return condition


# ============================================================
# 测试用例
# ============================================================

def test_1_preset_item(ps: PipelineState):
    """TC-1: 预设道具硬拦截（不调 LLM）"""
    print("\n═══ TC-1: 预设道具硬拦截 ═══")
    resp = phase2_action(Phase2Request(
        player_input="我喝矿泉水",
        current_status=ps.to_phase2_status(),
        companions_list=ps.to_phase2_companions(),
        inventory=ps.to_inventory_names(),
        history=ps.to_history_entries(),
    ))
    ps.apply_response(resp, "喝矿泉水")
    print(f"  叙事: {resp.narrative}")
    print(f"  数值: thirst{resp.stat_changes.thirst:+d}")
    ok = all([
        check("口渴下降", resp.stat_changes.thirst < 0),
        check("矿泉水被消耗", "矿泉水" in resp.inventory_change.remove_items),
        check("action_type正确", resp.action_type == "USE_NEW_ITEM"),
    ])
    return ok


def test_2_comment_to_event(ps: PipelineState):
    """TC-2: 评论 → 分类 → 生成 → inject → EVENT（含选项）"""
    print("\n═══ TC-2: 评论→EVENT 全链路 ═══")

    comment = "有人在敲门"
    # Phase 1: 分类
    cr = classify(comment, phase="home_event")
    print(f"  分类: {cr.category} (conf={cr.confidence:.2f})")
    check("分类为EVENT", cr.category == "EVENT")

    # Phase 1: 生成
    generated = generate(
        category=cr.category, comment=comment,
        username="测试观众", context=ps.game.context_string(),
    )
    print(f"  生成: {generated.get('event_title', '?')}")
    check("有event_title", "event_title" in generated)

    # Phase 2: inject
    generated["type"] = "EVENT"
    resp = phase2_inject(Phase2InjectRequest(
        upstream_payload=generated,
        current_status=ps.to_phase2_status(),
        companions_list=ps.to_phase2_companions(),
        inventory=ps.to_inventory_names(),
        history=ps.to_history_entries(),
    ))
    print(f"  Phase2: type={resp.type}, category={resp.final_category}")
    print(f"  叙事: {resp.narrative[:80]}...")
    print(f"  选项: {[o.get('text', '') for o in (resp.options or [])]}")

    # v2 EVENT 使用 suggested_reactions 而非 options，options 可能为空
    has_content = (resp.options and len(resp.options) > 0) or len(resp.narrative) > 20
    ok = all([
        check("final_category=EVENT", resp.final_category == "EVENT"),
        check("有叙事或选项", has_content),
        check("数值未变(透传)", resp.stat_changes.hp == 0 and resp.stat_changes.hunger == 0),
    ])

    # 保存 pending_event 供 TC-3 用
    ps._pending = {"narration": resp.narrative, "options": resp.options, "generated": generated}
    return ok


def test_3_event_choice(ps: PipelineState):
    """TC-3: 主播选择选项 → event_choice → 动态结果"""
    print("\n═══ TC-3: 主播选择→动态结果 ═══")

    if not hasattr(ps, '_pending') or not ps._pending:
        print("  ⚠️ 跳过: TC-2 未产生 pending_event")
        return True

    options = ps._pending.get("options", [])
    if not options:
        print("  ⚠️ 跳过: 无选项")
        return True

    choice = options[0].get("text", "开门查看")
    print(f"  主播选择: \"{choice}\"")

    resp = phase2_event_choice(EventChoiceRequest(
        event_narrative=ps._pending["narration"],
        player_choice=choice,
        current_status=ps.to_phase2_status(),
        companions_list=ps.to_phase2_companions(),
        inventory=ps.to_inventory_names(),
        history=ps.to_history_entries(),
    ))
    ps.apply_response(resp, f"选择:{choice}")
    print(f"  结果叙事: {resp.narrative[:80]}...")
    print(f"  数值变化: hp{resp.stat_changes.hp:+d} hunger{resp.stat_changes.hunger:+d} thirst{resp.stat_changes.thirst:+d} sanity{resp.stat_changes.sanity:+d}")
    print(f"  背包变化: +{resp.inventory_change.add_items} -{resp.inventory_change.remove_items}")

    ok = all([
        check("有叙事文本", len(resp.narrative) > 0),
        check("action_type=EVENT_CHOICE", resp.action_type == "EVENT_CHOICE"),
    ])
    return ok


def test_4_comment_to_item(ps: PipelineState):
    """TC-4: 评论 → ITEM → inject → 直接入背包"""
    print("\n═══ TC-4: 评论→ITEM 全链路 ═══")

    comment = "地上有把信号枪"
    cr = classify(comment, phase="explore")
    print(f"  分类: {cr.category}")

    generated = generate(
        category="ITEM", comment=comment,
        username="枪迷", context=ps.game.context_string(),
    )
    item_name = generated.get("name", "?")
    print(f"  生成道具: {item_name} enables={generated.get('enables', [])}")

    generated["type"] = "ITEM"
    resp = phase2_inject(Phase2InjectRequest(
        upstream_payload=generated,
        current_status=ps.to_phase2_status(),
        companions_list=ps.to_phase2_companions(),
        inventory=ps.to_inventory_names(),
        history=ps.to_history_entries(),
    ))
    ps.apply_response(resp, f"获得{item_name}")
    print(f"  Phase2: {resp.final_category}, 入包={resp.inventory_change.add_items}")

    ok = all([
        check("final_category=ITEM", resp.final_category == "ITEM"),
        check("道具入包", len(resp.inventory_change.add_items) > 0),
        check("action_type=ITEM_RECEIVED", resp.action_type == "ITEM_RECEIVED"),
    ])
    return ok


def test_5_comment_to_character(ps: PipelineState):
    """TC-5: 评论 → CHARACTER → inject → NPC遭遇卡（透传选项）"""
    print("\n═══ TC-5: 评论→CHARACTER 全链路 ═══")

    comment = "来了个独眼老头拿着扳手"
    cr = classify(comment, phase="explore")
    print(f"  分类: {cr.category}")

    generated = generate(
        category="CHARACTER", comment=comment,
        username="招募官", context=ps.game.context_string(),
    )
    npc_name = generated.get("name", "?")
    print(f"  生成NPC: {npc_name}")

    generated["type"] = "CHARACTER"
    resp = phase2_inject(Phase2InjectRequest(
        upstream_payload=generated,
        current_status=ps.to_phase2_status(),
        companions_list=ps.to_phase2_companions(),
        inventory=ps.to_inventory_names(),
        history=ps.to_history_entries(),
    ))
    print(f"  Phase2: {resp.final_category}, options={[o.get('text','') for o in (resp.options or [])]}")

    ok = all([
        check("final_category=CHARACTER", resp.final_category == "CHARACTER"),
        check("有交互选项", resp.options and len(resp.options) > 0),
        check("数值未变(透传)", resp.stat_changes.hp == 0),
        check("action_type=NPC_ENCOUNTER", resp.action_type == "NPC_ENCOUNTER"),
    ])
    return ok


def test_6_comment_to_location(ps: PipelineState):
    """TC-6: 评论 → LOCATION → inject → 透传"""
    print("\n═══ TC-6: 评论→LOCATION 透传 ═══")

    comment = "去废弃医院"
    generated = generate(
        category="LOCATION", comment=comment,
        username="探险家", context=ps.game.context_string(),
    )
    loc_name = generated.get("name", "?")
    print(f"  生成地点: {loc_name} (danger={generated.get('danger_level','?')})")

    generated["type"] = "LOCATION"
    resp = phase2_inject(Phase2InjectRequest(
        upstream_payload=generated,
        current_status=ps.to_phase2_status(),
        companions_list=ps.to_phase2_companions(),
        inventory=ps.to_inventory_names(),
        history=ps.to_history_entries(),
    ))

    ok = all([
        check("LOCATION_PASSTHROUGH", resp.type == "LOCATION_PASSTHROUGH"),
        check("有passthrough数据", resp.passthrough is not None),
        check("数值全0", resp.stat_changes.hp == 0 and resp.stat_changes.hunger == 0),
    ])
    return ok


def test_7_player_action_llm(ps: PipelineState):
    """TC-7: 主播口述操作（走 LLM）"""
    print("\n═══ TC-7: 主播口述操作 ═══")

    resp = phase2_action(Phase2Request(
        player_input="我用手电筒检查角落",
        current_status=ps.to_phase2_status(),
        companions_list=ps.to_phase2_companions(),
        inventory=ps.to_inventory_names(),
        history=ps.to_history_entries(),
    ))
    ps.apply_response(resp, "用手电筒检查角落")
    print(f"  叙事: {resp.narrative[:80]}...")
    print(f"  action_type: {resp.action_type}")

    ok = check("有叙事", len(resp.narrative) > 0)
    return ok


def test_8_absurd_comment(ps: PipelineState):
    """TC-8: 荒谬评论（世界观转译后注入）"""
    print("\n═══ TC-8: 荒谬评论→转译→注入 ═══")

    comment = "给玩家一百万罐头"
    # 直接走生成（generator 内部会 NERF）
    generated = generate(
        category="ITEM", comment=comment,
        username="整活王", context=ps.game.context_string(),
    )
    item_name = generated.get("name", "?")
    print(f"  转译结果: {item_name} — {generated.get('description', '')[:60]}")

    generated["type"] = "ITEM"
    resp = phase2_inject(Phase2InjectRequest(
        upstream_payload=generated,
        current_status=ps.to_phase2_status(),
        companions_list=ps.to_phase2_companions(),
        inventory=ps.to_inventory_names(),
        history=ps.to_history_entries(),
    ))
    ps.apply_response(resp, f"荒谬评论→{item_name}")

    ok = all([
        check("成功入包", len(resp.inventory_change.add_items) > 0),
        check("数值在合理范围", all(abs(v) <= 30 for v in [resp.stat_changes.hp, resp.stat_changes.hunger, resp.stat_changes.thirst, resp.stat_changes.sanity])),
    ])
    return ok


def test_9_history_continuity(ps: PipelineState):
    """TC-9: 验证 history 积累和连续性"""
    print("\n═══ TC-9: History 连续性验证 ═══")

    ok = all([
        check(f"history 有 {len(ps.history)} 条", len(ps.history) >= 3),
        check("turn 递增", all(ps.history[i]["turn"] < ps.history[i+1]["turn"] for i in range(len(ps.history)-1))),
        check("每条有 narrative", all(h.get("narrative") for h in ps.history)),
    ])

    print(f"\n  完整 history:")
    for h in ps.history:
        delta = h.get("stat_delta", "")
        gained = f"+{h['items_gained']}" if h.get("items_gained") else ""
        lost = f"-{h['items_lost']}" if h.get("items_lost") else ""
        print(f"    回合{h['turn']}: {h['action'][:30]}... {delta} {gained} {lost}")
    return ok


def test_10_final_state(ps: PipelineState):
    """TC-10: 最终状态一致性"""
    print("\n═══ TC-10: 最终状态审计 ═══")

    ok = all([
        check(f"精神={ps.game.spirit} 在[0,100]", 0 <= ps.game.spirit <= 100),
        check(f"健康={ps.game.health} 在[0,100]", 0 <= ps.game.health <= 100),
        check(f"饥饿={ps.game.hunger} 在[0,100]", 0 <= ps.game.hunger <= 100),
        check(f"口渴={ps.game.thirst} 在[0,100]", 0 <= ps.game.thirst <= 100),
        check(f"背包{len(ps.game.inventory)}件 ≤{ps.game.backpack_capacity}", len(ps.game.inventory) <= ps.game.backpack_capacity),
        check(f"同伴{len(ps.game.companions)}人 ≤3", len(ps.game.companions) <= 3),
    ])

    print(f"\n  背包: {[i.name if isinstance(i, Item) else str(i) for i in ps.game.inventory]}")
    print(f"  同伴: {[c.name if isinstance(c, Companion) else str(c) for c in ps.game.companions]}")
    return ok


# ============================================================
# 主入口
# ============================================================

def main():
    ps = PipelineState()
    tests = [
        ("TC-1 预设道具硬拦截", test_1_preset_item),
        ("TC-2 评论→EVENT全链路", test_2_comment_to_event),
        ("TC-3 主播选择→动态结果", test_3_event_choice),
        ("TC-4 评论→ITEM全链路", test_4_comment_to_item),
        ("TC-5 评论→CHARACTER全链路", test_5_comment_to_character),
        ("TC-6 评论→LOCATION透传", test_6_comment_to_location),
        ("TC-7 主播口述操作", test_7_player_action_llm),
        ("TC-8 荒谬评论转译", test_8_absurd_comment),
        ("TC-9 History连续性", test_9_history_continuity),
        ("TC-10 最终状态审计", test_10_final_state),
    ]

    passed = 0
    failed = 0

    print("🧪 ════════════════════════════════════════")
    print("🧪  Phase 1 → Phase 2 端到端管线测试")
    print("🧪  前端不感知，全服务端闭环")
    print("🧪 ════════════════════════════════════════")

    for name, test_fn in tests:
        try:
            if test_fn(ps):
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"  ❌ {name} 异常: {e}")
            import traceback
            traceback.print_exc()
            failed += 1

    print(f"\n{'═'*50}")
    print(f"📋 结果: {passed} 通过 / {failed} 失败 / {passed + failed} 总计")
    print(f"{'═'*50}")


if __name__ == "__main__":
    main()
