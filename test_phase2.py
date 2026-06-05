"""
Phase 2 Engine 测试用例 v2
覆盖：/phase2_action（玩家指令）+ /phase2_inject（上游注入 EVENT/CHARACTER/ITEM/LOCATION）
"""
import json, random
import pytest
from unittest.mock import patch, MagicMock
from phase2_engine import (
    Phase2Request, Phase2InjectRequest, CurrentStatus, Companion,
    phase2_action, phase2_inject,
    route_player_input, structural_filter, harness,
    AIRawOutput, StatChanges, InventoryChange,
    ActionType, OutputType,
)

random.seed(42)

def make_status(sanity=60): return CurrentStatus(hp=65, hunger=40, thirst=35, sanity=sanity)
COMPANIONS = [
    Companion(name="老韩", personality="冷静务实", loyalty=70),
    Companion(name="饼干猫", personality="慵懒敏锐", loyalty=85),
]
INVENTORY = ["矿泉水", "信号枪", "螺丝刀", "神秘药水"]

def make_req(**kw):
    return Phase2Request(
        player_input=kw.get("input", ""),
        current_status=kw.get("status", make_status()),
        companions_list=kw.get("companions", COMPANIONS),
        inventory=kw.get("inventory", INVENTORY),
    )

def mock_llm(body):
    m = MagicMock()
    m.content = [MagicMock(text=json.dumps(body, ensure_ascii=False))]
    return m

# ══════════════════════════════════════════
# /phase2_action 测试（玩家指令）
# ══════════════════════════════════════════

class TestPlayerAction:

    def test_preset_water(self):
        """矿泉水：第一层硬拦截，不进 LLM"""
        r = phase2_action(make_req(input="我喝矿泉水"))
        assert r.action_type == ActionType.USE_NEW_ITEM
        assert r.stat_changes.thirst == -20
        assert "矿泉水" in r.inventory_change.remove_items

    def test_preset_not_in_inventory(self):
        """预设物品不在背包，不应拦截"""
        route, _ = route_player_input("我喝矿泉水", [])
        assert route == "AI_PIPELINE"

    def test_empty_input(self):
        assert structural_filter("") == "输入为空"
        assert structural_filter("   ") == "输入为空"

    def test_too_long_input(self):
        assert structural_filter("x" * 501) == "输入过长"

    def test_new_item(self):
        """新物品走 LLM，数值限幅"""
        req = make_req(input="我喝下神秘药水", inventory=INVENTORY)
        with patch("phase2_engine.client.messages.create", return_value=mock_llm({
            "action_type": "USE_NEW_ITEM",
            "narrative": "药水苦涩，但身体轻盈了一些。",
            "rebellion_probability": 0.0, "loyalty_change": 0,
            "stat_changes": {"hp": 10, "hunger": -5, "thirst": -10, "sanity": 5},
            "inventory_change": {"remove_items": ["神秘药水"], "add_items": []}
        })):
            r = phase2_action(req)
        assert r.action_type == ActionType.USE_NEW_ITEM
        assert r.stat_changes.hp == 10
        assert "神秘药水" in r.inventory_change.remove_items

    def test_harness_clamp(self):
        """Harness 把 AI 越界输出截断到 ±30"""
        ai = AIRawOutput(
            action_type=ActionType.USE_NEW_ITEM,
            narrative="test",
            stat_changes=StatChanges(hp=99, hunger=-99),
        )
        assert ai.stat_changes.hp == 30
        assert ai.stat_changes.hunger == -30

    def test_companion_evict_rebels(self):
        """驱逐同伴，rebellion_prob=1.0，必定反抗 → 扣血"""
        req = make_req(input="把老韩赶走")
        ai = AIRawOutput(
            action_type=ActionType.COMPANION_INTERACT,
            narrative="老韩冷冷地看着你。",
            rebellion_probability=1.0, loyalty_change=-20,
        )
        with patch("phase2_engine.random.random", side_effect=[0.5, 0.3]):
            with patch("phase2_engine.random.randint", return_value=10):
                r = harness(ai, req)
        assert r.companion_agrees is False
        assert r.stat_changes.hp == -10

    def test_companion_agrees(self):
        """正向协作，rebellion_prob=0.0，必定同意"""
        req = make_req(input="让老韩修手电筒")
        ai = AIRawOutput(
            action_type=ActionType.COMPANION_INTERACT,
            narrative="老韩熟练地拆开手电筒。",
            rebellion_probability=0.0, loyalty_change=5,
        )
        with patch("phase2_engine.random.random", return_value=0.5):
            r = harness(ai, req)
        assert r.companion_agrees is True
        assert r.loyalty_change == 5

    def test_companion_steals_item(self):
        """反抗走偷物资分支"""
        req = make_req(input="扔饼干猫出去")
        ai = AIRawOutput(
            action_type=ActionType.COMPANION_INTERACT,
            narrative="饼干猫翻了个身。",
            rebellion_probability=1.0,
        )
        with patch("phase2_engine.random.random", side_effect=[0.5, 0.8]):
            with patch("phase2_engine.random.choice", return_value="螺丝刀"):
                r = harness(ai, req)
        assert r.companion_agrees is False
        assert "螺丝刀" in r.inventory_change.remove_items

    def test_san_warning(self, capsys):
        """SAN<30 但 narrative 无幻觉词 → warning，不阻塞"""
        req = make_req(input="喝水", status=make_status(sanity=20))
        ai = AIRawOutput(action_type=ActionType.USE_NEW_ITEM, narrative="你喝了水。")
        harness(ai, req)
        assert "WARN" in capsys.readouterr().out

    def test_nerf_worldview(self):
        """脱离世界观输入，NERF 转译，不返回 INVALID"""
        req = make_req(input="我使用时间倒流装置", inventory=INVENTORY + ["时间倒流装置"])
        with patch("phase2_engine.client.messages.create", return_value=mock_llm({
            "action_type": "USE_NEW_ITEM",
            "narrative": "那不过是台老收音机，播着末日前的广播。",
            "rebellion_probability": 0.0, "loyalty_change": 0,
            "stat_changes": {"hp": 0, "hunger": 0, "thirst": 0, "sanity": 12},
            "inventory_change": {"remove_items": ["时间倒流装置"], "add_items": []}
        })):
            r = phase2_action(req)
        assert r.action_type == ActionType.USE_NEW_ITEM
        assert r.stat_changes.sanity == 12


# ══════════════════════════════════════════
# /phase2_inject 测试（上游注入）
# ══════════════════════════════════════════

class TestUpstreamInject:

    def make_inject(self, payload, **kw):
        return Phase2InjectRequest(
            upstream_payload=payload,
            current_status=kw.get("status", make_status()),
            companions_list=kw.get("companions", COMPANIONS),
            inventory=kw.get("inventory", INVENTORY),
        )

    # ── ITEM ──────────────────────────────

    def test_inject_item_added_to_inventory(self):
        """上游 ITEM：物品加入背包"""
        payload = {
            "type": "ITEM", "name": "购物车外骨骼", "icon": "🦾",
            "description": "用购物车骨架焊的破烂外骨骼",
            "effect": {"immediate_stat_change": {"hp": 0, "hunger": 0, "thirst": 0, "sanity": -5}},
        }
        r = phase2_inject(self.make_inject(payload))
        assert r.action_type == ActionType.ITEM_RECEIVED
        assert r.type == OutputType.ITEM
        assert "购物车外骨骼" in r.inventory_change.add_items
        assert r.stat_changes.sanity == -5

    def test_inject_item_stat_clamp(self):
        """上游 ITEM immediate_stat_change 也要过 Harness 限幅"""
        payload = {
            "type": "ITEM", "name": "超级药水",
            "effect": {"immediate_stat_change": {"hp": 999, "hunger": -999, "thirst": 0, "sanity": 0}},
        }
        r = phase2_inject(self.make_inject(payload))
        assert r.stat_changes.hp == 30
        assert r.stat_changes.hunger == -30

    def test_inject_item_no_effect(self):
        """上游 ITEM 没有 immediate_stat_change，数值全 0"""
        payload = {"type": "ITEM", "name": "神秘纸条", "description": "上面写着乱码"}
        r = phase2_inject(self.make_inject(payload))
        assert r.action_type == ActionType.ITEM_RECEIVED
        assert r.stat_changes.hp == 0

    # ── CHARACTER ─────────────────────────

    def test_inject_character_passthrough(self):
        """上游 CHARACTER：透传给前端，不走 LLM"""
        payload = {
            "type": "CHARACTER",
            "name": "独眼老兵 Hawk",
            "dialogue_intro": "别动！你最近对什么东西说过谢谢吗？",
            "interaction_options": [
                {"text": "招募", "cost": {"food": 3}},
                {"text": "离开"},
            ],
        }
        r = phase2_inject(self.make_inject(payload))
        assert r.action_type == ActionType.NPC_ENCOUNTER
        assert r.type == OutputType.CHARACTER
        assert r.narrative == "别动！你最近对什么东西说过谢谢吗？"
        assert len(r.options) == 2
        assert r.passthrough["name"] == "独眼老兵 Hawk"

    def test_inject_character_no_llm_called(self):
        """CHARACTER 注入不应调用 LLM"""
        payload = {"type": "CHARACTER", "name": "陌生人", "dialogue_intro": "你好。"}
        with patch("phase2_engine.client.messages.create") as mock_llm:
            phase2_inject(self.make_inject(payload))
            mock_llm.assert_not_called()

    # ── EVENT ─────────────────────────────

    def test_inject_event_passthrough(self):
        """上游 EVENT：透传事件卡给前端"""
        payload = {
            "type": "EVENT",
            "event_title": "🚪 敲门声",
            "narration": "午夜，有人在敲避难所的铁门……",
            "options": [
                {"text": "开门查看", "stat_changes": {"hp": -5, "sanity": -10}},
                {"text": "保持沉默", "stat_changes": {"sanity": -15}},
            ],
        }
        r = phase2_inject(self.make_inject(payload))
        assert r.action_type == ActionType.EVENT_TRIGGER
        assert r.type == OutputType.EVENT
        assert r.narrative == "午夜，有人在敲避难所的铁门……"
        assert len(r.options) == 2

    def test_inject_event_no_stat_change(self):
        """EVENT 注入本身不改数值，数值由玩家选择后回调决定"""
        payload = {
            "type": "EVENT",
            "narration": "收音机突然响了。",
            "options": [{"text": "去看看"}, {"text": "忽略"}],
        }
        r = phase2_inject(self.make_inject(payload))
        assert r.stat_changes.hp == 0
        assert r.stat_changes.sanity == 0

    # ── LOCATION ──────────────────────────

    def test_inject_location_passthrough(self):
        """上游 LOCATION：Phase 2 不处理，原样透传"""
        payload = {
            "type": "LOCATION",
            "name": "地下停车场",
            "danger_level": 3,
            "grid_size": {"rows": 6, "cols": 7},
        }
        r = phase2_inject(self.make_inject(payload))
        assert r.action_type == ActionType.LOCATION_PASSTHROUGH
        assert r.type == OutputType.LOCATION_PASSTHROUGH
        assert r.passthrough["name"] == "地下停车场"
        assert r.stat_changes.hp == 0  # 不影响任何数值

    def test_inject_location_no_llm(self):
        """LOCATION 注入不应调用 LLM"""
        payload = {"type": "LOCATION", "name": "废弃工厂"}
        with patch("phase2_engine.client.messages.create") as mock_llm:
            phase2_inject(self.make_inject(payload))
            mock_llm.assert_not_called()

    # ── 边界 ──────────────────────────────

    def test_inject_unknown_type(self):
        """未知 type 返回 INVALID"""
        payload = {"type": "UNKNOWN_TYPE", "data": "???"}
        r = phase2_inject(self.make_inject(payload))
        assert r.action_type == ActionType.INVALID


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
