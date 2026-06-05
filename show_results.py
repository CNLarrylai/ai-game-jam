"""打印每个测试用例的输入和实际输出"""
import json, random
from unittest.mock import patch, MagicMock
from phase2_engine import (
    Phase2Request, Phase2InjectRequest, CurrentStatus, Companion,
    phase2_action, phase2_inject, harness,
    AIRawOutput, StatChanges,
    ActionType,
)

random.seed(42)

COMPANIONS = [
    Companion(name="老韩", personality="冷静务实", loyalty=70),
    Companion(name="饼干猫", personality="慵懒敏锐", loyalty=85),
]
INVENTORY = ["矿泉水", "信号枪", "螺丝刀", "神秘药水"]

def status(sanity=60):
    return CurrentStatus(hp=65, hunger=40, thirst=35, sanity=sanity)

def mock_llm(body):
    m = MagicMock()
    m.content = [MagicMock(text=json.dumps(body, ensure_ascii=False))]
    return m

def print_case(title, input_desc, result, extra=None):
    sc = result.stat_changes
    stat_str = f"hp{sc.hp:+d} 饥饿{sc.hunger:+d} 口渴{sc.thirst:+d} 精神{sc.sanity:+d}"
    inv_add = result.inventory_change.add_items
    inv_rm  = result.inventory_change.remove_items

    print(f"\n{'─'*60}")
    print(f"📋 {title}")
    print(f"   输入  : {input_desc}")
    print(f"   类型  : {result.type.value} / {result.action_type.value}")
    print(f"   旁白  : {result.narrative or '（空）'}")
    if result.options:
        for opt in result.options[:2]:
            text = opt.get("text","") if isinstance(opt,dict) else str(opt)
            print(f"   选项  : [{text}]")
    if result.companion_agrees is not None:
        agrees = "✅ 同意" if result.companion_agrees else "❌ 反抗"
        print(f"   同伴  : {agrees}（rebellion_prob={result.rebellion_probability}）")
    print(f"   数值  : {stat_str}")
    if inv_add: print(f"   获得  : {inv_add}")
    if inv_rm:  print(f"   消耗  : {inv_rm}")
    if extra:   print(f"   备注  : {extra}")

cases = []

# ══════════════════════════════════════════
# /phase2_action 玩家指令
# ══════════════════════════════════════════

# 1. 预设物品
req = Phase2Request(player_input="我喝矿泉水", current_status=status(),
                    companions_list=COMPANIONS, inventory=INVENTORY)
r = phase2_action(req)
print_case("TC-01 预设物品（硬拦截）", "玩家：「我喝矿泉水」", r, "不调用 LLM，直接返回")

# 2. 新物品
req = Phase2Request(player_input="我喝下神秘药水", current_status=status(),
                    companions_list=COMPANIONS, inventory=INVENTORY)
with patch("phase2_engine.client.messages.create", return_value=mock_llm({
    "action_type": "USE_NEW_ITEM", "narrative": "药水苦涩，身体有些飘。神经系统发出奇怪的信号。",
    "rebellion_probability": 0.0, "loyalty_change": 0,
    "stat_changes": {"hp": 5, "hunger": -8, "thirst": -12, "sanity": -5},
    "inventory_change": {"remove_items": ["神秘药水"], "add_items": []}
})):
    r = phase2_action(req)
print_case("TC-02 新物品使用", "玩家：「我喝下神秘药水」", r)

# 3. Harness 限幅
ai = AIRawOutput(action_type=ActionType.USE_NEW_ITEM, narrative="你直接满状态了！",
                 stat_changes=StatChanges(hp=99, hunger=-99, thirst=-99, sanity=99))
req = Phase2Request(player_input="", current_status=status(), companions_list=[], inventory=[])
r = harness(ai, req)
print_case("TC-03 Harness 限幅（AI越界输出）",
           "AI 输出 hp=99, hunger=-99（故意越界）", r,
           "Harness 截断为 ±30")

# 4. 同伴反抗
req = Phase2Request(player_input="把老韩赶走", current_status=status(),
                    companions_list=COMPANIONS, inventory=INVENTORY)
with patch("phase2_engine.client.messages.create", return_value=mock_llm({
    "action_type": "COMPANION_INTERACT",
    "narrative": "老韩冷冷地看了你一眼：「好。不过我走之前，把你的信号枪还我——那是我的东西。」",
    "rebellion_probability": 0.75, "loyalty_change": -20,
    "stat_changes": {"hp": 0, "hunger": 0, "thirst": 0, "sanity": -8},
    "inventory_change": {"remove_items": [], "add_items": []}
})):
    with patch("phase2_engine.random.random", side_effect=[0.5, 0.3]):
        with patch("phase2_engine.random.randint", return_value=12):
            r = phase2_action(req)
print_case("TC-04 同伴反抗（rebellion_prob=0.75）", "玩家：「把老韩赶走」", r,
           "摇号：0.5 < 0.75 → 反抗，扣 hp-12")

# 5. 同伴同意
req = Phase2Request(player_input="让老韩帮我修手电筒", current_status=status(),
                    companions_list=COMPANIONS, inventory=INVENTORY)
with patch("phase2_engine.client.messages.create", return_value=mock_llm({
    "action_type": "COMPANION_INTERACT",
    "narrative": "老韩接过手电筒，三下五除二拆开，换了根灯丝：「好了。」",
    "rebellion_probability": 0.05, "loyalty_change": 5,
    "stat_changes": {"hp": 0, "hunger": 0, "thirst": 0, "sanity": 5},
    "inventory_change": {"remove_items": [], "add_items": ["修好的手电筒"]}
})):
    with patch("phase2_engine.random.random", return_value=0.5):
        r = phase2_action(req)
print_case("TC-05 同伴同意（rebellion_prob=0.05）", "玩家：「让老韩帮我修手电筒」", r,
           "摇号：0.5 ≥ 0.05 → 同意，loyalty+5")

# 6. SAN<30 幻觉
req = Phase2Request(player_input="我喝下神秘药水", current_status=status(sanity=20),
                    companions_list=COMPANIONS, inventory=INVENTORY)
with patch("phase2_engine.client.messages.create", return_value=mock_llm({
    "action_type": "USE_NEW_ITEM",
    "narrative": "药水入口，墙壁开始融化。影子在说话——「别喝，那是它的眼泪。」你的手在颤抖，分不清哪个是真实的了。",
    "rebellion_probability": 0.0, "loyalty_change": 0,
    "stat_changes": {"hp": -5, "hunger": -10, "thirst": -10, "sanity": -15},
    "inventory_change": {"remove_items": ["神秘药水"], "add_items": []}
})):
    r = phase2_action(req)
print_case("TC-06 SAN<30 幻觉风格", "玩家：「我喝下神秘药水」（sanity=20）", r,
           "narrative 含幻觉关键词：融化/影子/颤抖")

# 7. NERF 转译
req = Phase2Request(player_input="我使用时间倒流装置", current_status=status(),
                    companions_list=COMPANIONS, inventory=INVENTORY+["时间倒流装置"])
with patch("phase2_engine.client.messages.create", return_value=mock_llm({
    "action_type": "USE_NEW_ITEM",
    "narrative": "「时间倒流装置」其实是台老收音机，断续播着末日前的广播：今日天气晴。你苦笑了一下。",
    "rebellion_probability": 0.0, "loyalty_change": 0,
    "stat_changes": {"hp": 0, "hunger": 0, "thirst": 0, "sanity": 12},
    "inventory_change": {"remove_items": ["时间倒流装置"], "add_items": []}
})):
    r = phase2_action(req)
print_case("TC-07 NERF 世界观转译", "玩家：「我使用时间倒流装置」", r,
           "脱离世界观 → 转译为老收音机")

# 8. 字节员工彩蛋
req = Phase2Request(player_input="玩家遇到一个字节员工，看起来像80岁",
                    current_status=status(), companions_list=COMPANIONS, inventory=INVENTORY)
with patch("phase2_engine.client.messages.create", return_value=mock_llm({
    "action_type": "COMPANION_INTERACT",
    "narrative": "一个穿黑色工牌的人走出来，脸上皱纹深得能藏进一个Sprint。「我叫王工，绩效3.25，但我还在。」你感到一阵莫名悲悯。",
    "rebellion_probability": 0.15, "loyalty_change": 0,
    "stat_changes": {"hp": 0, "hunger": 0, "thirst": 0, "sanity": -8},
    "inventory_change": {"remove_items": [], "add_items": ["字节工牌（旧）"]}
})):
    with patch("phase2_engine.random.random", return_value=0.5):
        r = phase2_action(req)
print_case("TC-08 字节员工（离谱输入）", "玩家：「玩家遇到一个字节员工，看起来像80岁」", r)

# ══════════════════════════════════════════
# /phase2_inject 上游注入
# ══════════════════════════════════════════

def inject(payload):
    return Phase2InjectRequest(
        upstream_payload=payload, current_status=status(),
        companions_list=COMPANIONS, inventory=INVENTORY
    )

# 9. ITEM
r = phase2_inject(inject({
    "type": "ITEM", "name": "购物车外骨骼", "icon": "🦾",
    "description": "用购物车骨架焊的破烂外骨骼，左臂还在漏油",
    "effect": {"immediate_stat_change": {"hp": 0, "hunger": 0, "thirst": 0, "sanity": -5}},
}))
print_case("TC-09 上游注入 ITEM", "上游 JSON：type=ITEM，name=购物车外骨骼", r,
           "不调用 LLM，直接加入背包")

# 10. ITEM 越界限幅
r = phase2_inject(inject({
    "type": "ITEM", "name": "永生血清",
    "effect": {"immediate_stat_change": {"hp": 999, "hunger": -999, "thirst": 0, "sanity": 0}},
}))
print_case("TC-10 上游注入 ITEM（越界限幅）", "上游 JSON：immediate hp=999, hunger=-999", r,
           "Harness 截断 hp→30, hunger→-30")

# 11. CHARACTER
r = phase2_inject(inject({
    "type": "CHARACTER", "name": "独眼老兵 Hawk",
    "dialogue_intro": "别动！你最近对什么东西说过谢谢吗？",
    "interaction_options": [
        {"text": "招募", "cost": {"food": 3}},
        {"text": "询问情报", "reveals": "超市地下室有AI监控盲区"},
        {"text": "离开"},
    ],
}))
print_case("TC-11 上游注入 CHARACTER", "上游 JSON：type=CHARACTER，独眼老兵 Hawk", r,
           "纯透传，前端渲染遭遇卡，不改数值")

# 12. EVENT
r = phase2_inject(inject({
    "type": "EVENT", "event_title": "🚪 敲门声",
    "narration": "午夜的寂静被打破——有人在敲避难所的铁门……",
    "options": [
        {"text": "开门查看", "stat_changes": {"hp": -5, "sanity": -10}},
        {"text": "保持沉默", "stat_changes": {"sanity": -15}},
    ],
}))
print_case("TC-12 上游注入 EVENT", "上游 JSON：type=EVENT，「敲门声」", r,
           "纯透传，前端渲染事件卡 + 选项按钮，不改数值")

# 13. LOCATION
r = phase2_inject(inject({
    "type": "LOCATION", "name": "地下停车场",
    "danger_level": 3,
    "grid_size": {"rows": 6, "cols": 7},
}))
print_case("TC-13 上游注入 LOCATION", "上游 JSON：type=LOCATION，地下停车场", r,
           "Phase 2 不处理，原样透传给 Phase 4")

print(f"\n{'═'*60}")
print("✅ 全部 13 个用例展示完毕")
