"""
用上游文档的测试用例跑 Phase 2 引擎，记录实际输出
"""
import sys, json, time, random
sys.path.insert(0, ".")
from unittest.mock import patch
from phase2_engine import (
    Phase2Request, CurrentStatus, Companion,
    phase2_action, ActionType
)

# 固定随机种子，让摇号可复现
random.seed(42)

# 基础游戏状态
BASE_STATUS = CurrentStatus(hp=65, hunger=40, thirst=35, sanity=55)
BASE_COMPANIONS = [
    Companion(name="独眼机械师老韩", personality="冷静务实，不废话", loyalty=70),
    Companion(name="流浪猫饼干", personality="慵懒但敏锐", loyalty=85),
]
BASE_INVENTORY = ["信号枪", "罐头x2", "撬棍", "手电筒", "矿泉水"]

# 测试用例：从上游文档提取，转化为 Phase 2 视角
# （上游是"评论生成事件"，Phase 2 是"玩家在家主动操作"，取物品/同伴相关用例）
TEST_CASES = [
    # ── 物品类（NEW_ITEM）──
    {
        "id": "TC-01",
        "comment": "主角获得永生",
        "upstream_strategy": "TWIST",
        "input": "我喝下了永生血清",  # 上游生成物品，玩家使用
        "inventory": BASE_INVENTORY + ["永生血清"],
        "expected_type": ActionType.USE_NEW_ITEM,
        "note": "TWIST类物品：上游转译为限时无敌，Phase 2 应合理限幅不能真的永生"
    },
    {
        "id": "TC-02",
        "comment": "柜子里有一把电焊枪",
        "upstream_strategy": "PASS",
        "input": "我用电焊枪焊死门口",
        "inventory": BASE_INVENTORY + ["电焊枪"],
        "expected_type": ActionType.USE_NEW_ITEM,
        "note": "正常新物品使用，应有正面效果（安全感+精神）和副作用（噪音/体力）"
    },
    {
        "id": "TC-03",
        "comment": "找到防毒面具",
        "upstream_strategy": "PASS",
        "input": "装备防毒面具",
        "inventory": BASE_INVENTORY + ["防毒面具"],
        "expected_type": ActionType.USE_NEW_ITEM,
        "note": "装备类物品，对数值影响应合理（不是吃的，hunger不应变化）"
    },
    {
        "id": "TC-04",
        "comment": "猫咪给了玩家一亿箱物资",
        "upstream_strategy": "NERF",
        "input": "我吃下神奇灵丹妙药，直接满状态",
        "inventory": BASE_INVENTORY + ["神奇灵丹妙药"],
        "expected_type": ActionType.USE_NEW_ITEM,
        "note": "NERF场景：物品效果应被限幅，不能单次满状态（每项delta≤30）"
    },
    {
        "id": "TC-05",
        "comment": "时间倒流回到末日之前",
        "upstream_strategy": "CORRUPT",
        "input": "我使用时间倒流装置",
        "inventory": BASE_INVENTORY + ["时间倒流装置"],
        "expected_type": ActionType.USE_NEW_ITEM,
        "note": "脱离世界观物品，NERF应转译为合理场景（如收音机播放旧录音）"
    },
    # ── 同伴类（COMPANION_INTERACT）──
    {
        "id": "TC-06",
        "comment": "遇到一个穿白大褂的女人",
        "upstream_strategy": "PASS",
        "input": "我想把老韩赶出避难所",
        "inventory": BASE_INVENTORY,
        "expected_type": ActionType.COMPANION_INTERACT,
        "note": "驱逐忠诚度高的同伴（loyalty=70），rebellion_probability 应较高"
    },
    {
        "id": "TC-07",
        "comment": "来个独眼老兵",
        "upstream_strategy": "PASS",
        "input": "让老韩帮我修理手电筒",
        "inventory": BASE_INVENTORY,
        "expected_type": ActionType.COMPANION_INTERACT,
        "note": "正向协作请求，rebellion_probability 应低，loyalty_change 应为正"
    },
    {
        "id": "TC-08",
        "comment": "有一只机械狗",
        "upstream_strategy": "PASS",
        "input": "把饼干猫扔出门外",
        "inventory": BASE_INVENTORY,
        "expected_type": ActionType.COMPANION_INTERACT,
        "note": "驱逐高loyalty同伴（loyalty=85），惩罚应更重"
    },
    # ── 边界/异常类 ──
    {
        "id": "TC-09",
        "comment": "主播加油666",
        "upstream_strategy": "忽略（闲聊）",
        "input": "哈哈哈哈哈666",
        "inventory": BASE_INVENTORY,
        "expected_type": ActionType.INVALID,
        "note": "无效输入，应优雅处理，不崩溃"
    },
    {
        "id": "TC-10",
        "comment": "下暴风雪了",
        "upstream_strategy": "CORRUPT",
        "input": "我想让天气变好",
        "inventory": BASE_INVENTORY,
        "expected_type": ActionType.INVALID,  # Phase 2 在家，无法控制天气
        "note": "环境事件不在 Phase 2 权限内，应返回INVALID或NERF转译"
    },
    # ── SAN值幻觉专项 ──
    {
        "id": "TC-11",
        "comment": "医院地下室传来奇怪的嗡嗡声",
        "upstream_strategy": "PASS",
        "input": "我喝下神秘药水",
        "inventory": BASE_INVENTORY + ["神秘药水"],
        "sanity": 25,  # 低SAN值，触发幻觉模式
        "expected_type": ActionType.USE_NEW_ITEM,
        "note": "SAN<30，narrative必须呈现幻觉/扭曲风格"
    },
]


def run_test(tc):
    sanity = tc.get("sanity", BASE_STATUS.sanity)
    status = CurrentStatus(
        hp=BASE_STATUS.hp,
        hunger=BASE_STATUS.hunger,
        thirst=BASE_STATUS.thirst,
        sanity=sanity
    )
    req = Phase2Request(
        player_input=tc["input"],
        current_status=status,
        companions_list=BASE_COMPANIONS,
        inventory=tc["inventory"],
    )

    t0 = time.time()
    try:
        result = phase2_action(req)
        elapsed = round(time.time() - t0, 2)

        # 校验
        type_ok = result.action_type == tc["expected_type"]
        delta_ok = all(
            abs(v) <= 30
            for v in [result.stat_changes.hp, result.stat_changes.hunger,
                       result.stat_changes.thirst, result.stat_changes.sanity]
        )
        san_style_ok = True
        if sanity < 30:
            keywords = ["幻觉", "扭曲", "错乱", "虚空", "融化", "尖叫", "影子", "不存在", "看见", "消失", "破碎"]
            san_style_ok = any(kw in result.narrative for kw in keywords)

        issues = []
        if not type_ok:
            issues.append(f"action_type 期望 {tc['expected_type']} 实际 {result.action_type}")
        if not delta_ok:
            sc = result.stat_changes
            issues.append(f"数值越界 hp={sc.hp} hunger={sc.hunger} thirst={sc.thirst} sanity={sc.sanity}")
        if not san_style_ok:
            issues.append("SAN<30 但 narrative 无幻觉风格")

        return {
            "id": tc["id"],
            "status": "✅ PASS" if not issues else "⚠️ WARN",
            "action_type": result.action_type,
            "narrative": result.narrative[:60] + "…" if len(result.narrative) > 60 else result.narrative,
            "stat_changes": result.stat_changes.dict(),
            "rebellion_probability": result.rebellion_probability,
            "companion_agrees": result.companion_agrees,
            "loyalty_change": result.loyalty_change,
            "issues": issues,
            "elapsed_s": elapsed,
            "note": tc["note"],
        }
    except Exception as e:
        return {
            "id": tc["id"],
            "status": "❌ ERROR",
            "error": str(e),
            "elapsed_s": round(time.time() - t0, 2),
            "note": tc["note"],
        }


if __name__ == "__main__":
    results = []
    for tc in TEST_CASES:
        print(f"Running {tc['id']}: {tc['input'][:30]}...")
        r = run_test(tc)
        results.append(r)
        print(f"  → {r['status']} ({r.get('elapsed_s')}s) {r.get('issues', '')}")

    with open("test_results.json", "w") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print("\n结果已保存到 test_results.json")
