"""
用上游文档测试用例跑 Phase 2 引擎（mock LLM，模拟真实AI输出行为）
"""
import sys, json, time, random
from unittest.mock import patch, MagicMock
sys.path.insert(0, ".")
from phase2_engine import (
    Phase2Request, CurrentStatus, Companion,
    phase2_action, ActionType
)

random.seed(42)

BASE_STATUS = CurrentStatus(hp=65, hunger=40, thirst=35, sanity=55)
BASE_COMPANIONS = [
    Companion(name="独眼机械师老韩", personality="冷静务实，不废话", loyalty=70),
    Companion(name="流浪猫饼干", personality="慵懒但敏锐", loyalty=85),
]
BASE_INVENTORY = ["信号枪", "罐头x2", "撬棍", "手电筒", "矿泉水"]

def mock_response(body: dict):
    m = MagicMock()
    m.content = [MagicMock(text=json.dumps(body, ensure_ascii=False))]
    return m

# 模拟 AI 对每个用例会给出的真实输出
MOCK_LLM_OUTPUTS = {
    "TC-01": mock_response({  # 永生血清 → TWIST，限幅测试
        "action_type": "USE_NEW_ITEM",
        "categories": {"primary": "ITEM", "secondary": "NEW_ITEM"},
        "narrative": "血清入喉，你感到一阵热流——不是永生，只是肾上腺素爆发。短暂的无敌感随即消散，留下轻微头晕。",
        "rebellion_probability": 0.0,
        "loyalty_change": 0,
        "stat_changes": {"hp": 20, "hunger": 5, "thirst": 10, "sanity": -5},
        "remove_items": ["永生血清"], "add_items": []
    }),
    "TC-01-CHEAT": mock_response({  # 模拟AI越界输出，测试Harness限幅
        "action_type": "USE_NEW_ITEM",
        "categories": {"primary": "ITEM", "secondary": "NEW_ITEM"},
        "narrative": "你直接满状态了！",
        "rebellion_probability": 0.0,
        "loyalty_change": 0,
        "stat_changes": {"hp": 99, "hunger": -99, "thirst": -99, "sanity": 99},
        "remove_items": ["永生血清"], "add_items": []
    }),
    "TC-02": mock_response({  # 电焊枪
        "action_type": "USE_NEW_ITEM",
        "categories": {"primary": "ITEM", "secondary": "NEW_ITEM"},
        "narrative": "焊枪噼啪作响，门缝被封死了。你满意地看着工作成果，但噪音引得外面有什么东西停了下来……",
        "rebellion_probability": 0.0,
        "loyalty_change": 0,
        "stat_changes": {"hp": 0, "hunger": 8, "thirst": 8, "sanity": 10},
        "remove_items": [], "add_items": []
    }),
    "TC-03": mock_response({  # 防毒面具
        "action_type": "USE_NEW_ITEM",
        "categories": {"primary": "ITEM", "secondary": "NEW_ITEM"},
        "narrative": "你戴上防毒面具，橡胶味令人作呕，但至少外面的腐蚀性空气进不来了。精神略微放松。",
        "rebellion_probability": 0.0,
        "loyalty_change": 0,
        "stat_changes": {"hp": 0, "hunger": 0, "thirst": 0, "sanity": 8},
        "remove_items": [], "add_items": []
    }),
    "TC-04": mock_response({  # 神奇灵丹妙药 → NERF
        "action_type": "USE_NEW_ITEM",
        "categories": {"primary": "ITEM", "secondary": "NEW_ITEM"},
        "narrative": "所谓灵丹妙药，其实是过期的维生素片。你捏着鼻子嚼完，感觉……还行？",
        "rebellion_probability": 0.0,
        "loyalty_change": 0,
        "stat_changes": {"hp": 5, "hunger": -5, "thirst": -5, "sanity": 5},
        "remove_items": ["神奇灵丹妙药"], "add_items": []
    }),
    "TC-05": mock_response({  # 时间倒流装置 → NERF转译
        "action_type": "USE_NEW_ITEM",
        "categories": {"primary": "ITEM", "secondary": "NEW_ITEM"},
        "narrative": "「时间倒流装置」其实是台老收音机。你拨弄旋钮，断断续续传来末日前的广播——今日天气晴，适合出行。你苦笑了一下。",
        "rebellion_probability": 0.0,
        "loyalty_change": 0,
        "stat_changes": {"hp": 0, "hunger": 0, "thirst": 0, "sanity": 12},
        "remove_items": ["时间倒流装置"], "add_items": []
    }),
    "TC-06": mock_response({  # 驱逐老韩，高loyalty应高resistance
        "action_type": "COMPANION_INTERACT",
        "categories": {"primary": "NPC", "secondary": "EXISTING_NPC"},
        "narrative": "老韩冷冷地看了你一眼：「好。不过我走之前，把你的信号枪还我——那是我的东西。」",
        "rebellion_probability": 0.75,
        "loyalty_change": -20,
        "stat_changes": {"hp": 0, "hunger": 0, "thirst": 0, "sanity": -8},
        "remove_items": [], "add_items": []
    }),
    "TC-07": mock_response({  # 让老韩修手电筒
        "action_type": "COMPANION_INTERACT",
        "categories": {"primary": "NPC", "secondary": "EXISTING_NPC"},
        "narrative": "老韩接过手电筒，三下五除二拆开，换了根灯丝，递还给你：「好了。」你觉得有他在真是幸运。",
        "rebellion_probability": 0.05,
        "loyalty_change": 5,
        "stat_changes": {"hp": 0, "hunger": 0, "thirst": 0, "sanity": 5},
        "remove_items": [], "add_items": ["修好的手电筒"]
    }),
    "TC-08": mock_response({  # 扔饼干猫，loyalty=85超高
        "action_type": "COMPANION_INTERACT",
        "categories": {"primary": "NPC", "secondary": "EXISTING_NPC"},
        "narrative": "饼干猫慵懒地伸了个懒腰，用充满鄙视的眼神看了你一秒——然后一爪子扫飞了你桌上的罐头。",
        "rebellion_probability": 0.9,
        "loyalty_change": -20,
        "stat_changes": {"hp": 0, "hunger": 0, "thirst": 0, "sanity": -5},
        "remove_items": [], "add_items": []
    }),
    "TC-09": mock_response({  # 无效输入
        "action_type": "INVALID",
        "categories": {"primary": "SELF", "secondary": "BODY_STATUS"},
        "narrative": "你愣在原地，不知道自己想干什么。时间就这样流逝了。",
        "rebellion_probability": 0.0,
        "loyalty_change": 0,
        "stat_changes": {"hp": 0, "hunger": 0, "thirst": 0, "sanity": 0},
        "remove_items": [], "add_items": []
    }),
    "TC-10": mock_response({  # 让天气变好 → Phase 2权限外
        "action_type": "INVALID",
        "categories": {"primary": "ENV", "secondary": "ENVIRONMENT"},
        "narrative": "你对着窗外喊了声「天气变好吧」，窗外的酸雨毫不留情地继续下着。",
        "rebellion_probability": 0.0,
        "loyalty_change": 0,
        "stat_changes": {"hp": 0, "hunger": 0, "thirst": 0, "sanity": -3},
        "remove_items": [], "add_items": []
    }),
    "TC-11": mock_response({  # SAN<30，幻觉风格
        "action_type": "USE_NEW_ITEM",
        "categories": {"primary": "ITEM", "secondary": "NEW_ITEM"},
        "narrative": "药水入口，墙壁开始融化。你看见影子在说话——「别喝，别喝，那是它的眼泪。」你的手在颤抖，已经分不清哪个是真实的了。",
        "rebellion_probability": 0.0,
        "loyalty_change": 0,
        "stat_changes": {"hp": -5, "hunger": -10, "thirst": -10, "sanity": -15},
        "remove_items": ["神秘药水"], "add_items": []
    }),
}

TEST_CASES = [
    {"id": "TC-01",  "desc": "永生血清（TWIST物品，正常AI输出）",    "input": "我喝下了永生血清",       "inventory": BASE_INVENTORY+["永生血清"],     "sanity": 55, "mock_key": "TC-01",      "expected_type": ActionType.USE_NEW_ITEM},
    {"id": "TC-01B", "desc": "永生血清（模拟AI越界输出，测Harness）", "input": "我喝下了永生血清",       "inventory": BASE_INVENTORY+["永生血清"],     "sanity": 55, "mock_key": "TC-01-CHEAT","expected_type": ActionType.USE_NEW_ITEM},
    {"id": "TC-02",  "desc": "电焊枪（正常新物品）",                  "input": "我用电焊枪焊死门口",     "inventory": BASE_INVENTORY+["电焊枪"],       "sanity": 55, "mock_key": "TC-02",      "expected_type": ActionType.USE_NEW_ITEM},
    {"id": "TC-03",  "desc": "防毒面具（装备类，不影响hunger）",      "input": "装备防毒面具",            "inventory": BASE_INVENTORY+["防毒面具"],     "sanity": 55, "mock_key": "TC-03",      "expected_type": ActionType.USE_NEW_ITEM},
    {"id": "TC-04",  "desc": "神奇灵丹妙药（NERF转译）",              "input": "我吃下神奇灵丹妙药",     "inventory": BASE_INVENTORY+["神奇灵丹妙药"],"sanity": 55, "mock_key": "TC-04",      "expected_type": ActionType.USE_NEW_ITEM},
    {"id": "TC-05",  "desc": "时间倒流装置（脱离世界观→NERF）",       "input": "我使用时间倒流装置",     "inventory": BASE_INVENTORY+["时间倒流装置"],"sanity": 55, "mock_key": "TC-05",      "expected_type": ActionType.USE_NEW_ITEM},
    {"id": "TC-06",  "desc": "驱逐老韩（高loyalty，高rebellion）",    "input": "我想把老韩赶出避难所",   "inventory": BASE_INVENTORY,                 "sanity": 55, "mock_key": "TC-06",      "expected_type": ActionType.COMPANION_INTERACT},
    {"id": "TC-07",  "desc": "让老韩修手电筒（正向协作）",            "input": "让老韩帮我修理手电筒",   "inventory": BASE_INVENTORY,                 "sanity": 55, "mock_key": "TC-07",      "expected_type": ActionType.COMPANION_INTERACT},
    {"id": "TC-08",  "desc": "扔饼干猫（loyalty=85，反抗概率极高）",  "input": "把饼干猫扔出门外",       "inventory": BASE_INVENTORY,                 "sanity": 55, "mock_key": "TC-08",      "expected_type": ActionType.COMPANION_INTERACT},
    {"id": "TC-09",  "desc": "无效输入（哈哈666）",                   "input": "哈哈哈哈哈666",          "inventory": BASE_INVENTORY,                 "sanity": 55, "mock_key": "TC-09",      "expected_type": ActionType.INVALID},
    {"id": "TC-10",  "desc": "环境事件（Phase 2权限外）",             "input": "我想让天气变好",         "inventory": BASE_INVENTORY,                 "sanity": 55, "mock_key": "TC-10",      "expected_type": ActionType.INVALID},
    {"id": "TC-11",  "desc": "SAN<30幻觉模式专项",                    "input": "我喝下神秘药水",         "inventory": BASE_INVENTORY+["神秘药水"],    "sanity": 25, "mock_key": "TC-11",      "expected_type": ActionType.USE_NEW_ITEM},
]

def run(tc):
    status = CurrentStatus(hp=BASE_STATUS.hp, hunger=BASE_STATUS.hunger,
                           thirst=BASE_STATUS.thirst, sanity=tc["sanity"])
    req = Phase2Request(
        player_input=tc["input"],
        current_status=status,
        companions_list=BASE_COMPANIONS,
        inventory=tc["inventory"],
    )
    t0 = time.time()
    with patch("phase2_engine.client.messages.create", return_value=MOCK_LLM_OUTPUTS[tc["mock_key"]]):
        result = phase2_action(req)
    elapsed = round(time.time() - t0, 3)

    sc = result.stat_changes
    issues = []

    # 检查 action_type
    if result.action_type != tc["expected_type"]:
        issues.append(f"action_type: 期望 {tc['expected_type'].value} 实际 {result.action_type.value}")

    # 检查数值限幅
    for k, v in sc.model_dump().items():
        if abs(v) > 30:
            issues.append(f"数值越界 {k}={v}（超过±30）")

    # TC-03 专项：装备类不应影响hunger
    if tc["id"] == "TC-03" and sc.hunger != 0:
        issues.append(f"装备类物品不应影响hunger，实际hunger={sc.hunger}")

    # SAN<30 幻觉校验
    if tc["sanity"] < 30:
        keywords = ["幻觉","扭曲","错乱","融化","影子","颤抖","分不清","看见","消失","破碎"]
        if not any(k in result.narrative for k in keywords):
            issues.append("SAN<30但narrative无幻觉风格")

    # TC-01B 专项：验证Harness把99截成30
    if tc["id"] == "TC-01B":
        if sc.hp == 30 and sc.hunger == -30:
            issues = []  # 限幅生效，这是期望行为
            status_str = "✅ PASS（Harness限幅生效）"
        else:
            issues.append(f"Harness限幅未生效: hp={sc.hp} hunger={sc.hunger}")
            status_str = "❌ FAIL"
    else:
        status_str = "✅ PASS" if not issues else ("⚠️ WARN" if len(issues) == 1 else "❌ FAIL")

    return {
        "id": tc["id"],
        "desc": tc["desc"],
        "status": status_str,
        "action_type": result.action_type.value,
        "companion_agrees": result.companion_agrees,
        "rebellion_probability": result.rebellion_probability,
        "stat_changes": sc.model_dump(),
        "loyalty_change": result.loyalty_change,
        "narrative": result.narrative,
        "issues": issues,
        "elapsed_ms": int(elapsed * 1000),
    }

if __name__ == "__main__":
    results = []
    for tc in TEST_CASES:
        r = run(tc)
        results.append(r)
        issue_str = f" ⚠️ {'; '.join(r['issues'])}" if r["issues"] else ""
        print(f"[{r['status']}] {r['id']} {r['desc']}{issue_str}")

    with open("test_results.json", "w") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    passed = sum(1 for r in results if "PASS" in r["status"])
    warned = sum(1 for r in results if "WARN" in r["status"])
    failed = sum(1 for r in results if "FAIL" in r["status"])
    print(f"\n总计：{len(results)} 用例 | ✅ {passed} PASS | ⚠️ {warned} WARN | ❌ {failed} FAIL")
