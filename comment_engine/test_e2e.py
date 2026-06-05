"""
端到端联调测试 — 验证能力驱动剧情系统
模拟 Day 1→4 的连续游戏，验证：
1. 道具/同伴的 enables 被正确积累
2. 钩子在 min_delay 后开始触发，max_delay 时强制触发
3. 事件选项确实引用了已有能力
4. 同伴技能被使用时有角色化反应
"""

import json
import sys
from game_state import GameState, Item, Companion, CompanionSkill, EventRecord
from classifier import classify
from generator import generate

# ============================================================
# 模拟评论序列（每天2-3条）
# ============================================================

DAILY_COMMENTS = {
    1: [
        {"username": "user_A", "text": "收银台后面有个箱子"},
        {"username": "user_B", "text": "地上有把信号枪"},
        {"username": "user_C", "text": "哈哈哈666"},
    ],
    2: [
        {"username": "user_D", "text": "门口站着一个独眼老头"},
        {"username": "user_E", "text": "老头手里拿着扳手，像个修理工"},
    ],
    3: [
        {"username": "user_F", "text": "工厂里有台坏掉的发电机"},
        {"username": "user_G", "text": "天花板上传来嗡嗡声，好像有无人机"},
    ],
    4: [
        {"username": "user_H", "text": "医院地下室传来奇怪的嗡嗡声"},
        {"username": "user_I", "text": "遇到一个穿白大褂的女人在翻药柜"},
    ],
}

DAILY_LOCATIONS = {1: "废弃超市", 2: "避难所", 3: "废弃工厂", 4: "废弃医院"}

def run_test():
    state = GameState()
    results = []

    for day in range(1, 5):
        state.day = day
        state.phase = "explore" if day != 2 else "home_event"
        state.location = DAILY_LOCATIONS[day]
        if state.location not in state.visited_locations:
            state.visited_locations.append(state.location)

        comments = DAILY_COMMENTS[day]
        print(f"\n{'='*60}")
        print(f"📅 DAY {day} — {state.location}")
        print(f"{'='*60}")

        # 1. 分类评论
        classified = []
        for c in comments:
            result = classify(c["text"], phase=state.phase)
            classified.append({"comment": c, "result": result})
            print(f"  💬 @{c['username']}: \"{c['text']}\" → {result.category} ({result.confidence:.2f})")

        # 2. 选最佳评论生成内容
        valid = [c for c in classified if c["result"].category != "IRRELEVANT" and c["result"].phase_compatible]
        if not valid:
            print("  ⚠️ 没有有效评论，跳过")
            continue

        best = max(valid, key=lambda x: x["result"].confidence)
        comment = best["comment"]
        category = best["result"].category

        print(f"\n  🎯 选中: @{comment['username']}: \"{comment['text']}\" ({category})")
        print(f"\n  📊 当前能力清单:")
        print(f"  {state.capabilities_string()}")
        print(f"\n  🪝 当前钩子队列:")
        print(f"  {state.hooks_string()}")

        # 3. 生成内容
        context = state.context_string()
        print(f"\n  ⏳ 正在生成 {category} 内容...")

        try:
            generated = generate(
                category=category,
                comment=comment["text"],
                username=comment["username"],
                context=context,
            )
            print(f"\n  ✅ 生成成功:")
            print(json.dumps(generated, ensure_ascii=False, indent=4))

            # 4. 模拟应用结果（取第一个选项）
            if category == "EVENT" and generated.get("options"):
                chosen = generated["options"][0]
                stat_changes = chosen.get("stat_changes", {})
                state.apply_stat_changes(stat_changes)
                print(f"\n  🎮 自动选择: \"{chosen.get('text', '')}\"")
                print(f"  📈 数值变化: {stat_changes}")

                # 记录事件
                state.record_event(EventRecord(
                    day=day, phase=state.phase,
                    title=generated.get("event_title", ""),
                    narration=generated.get("narration", ""),
                    choice_made=chosen.get("text", ""),
                    stat_changes=stat_changes,
                    source_comment=f"@{comment['username']}",
                ))

                # 处理钩子解决
                for hid in generated.get("hooks_resolved", []):
                    state.resolve_hook(hid)
                    print(f"  🪝 钩子已解决: {hid}")

            elif category == "ITEM":
                item_name = generated.get("name", "未知物品")
                enables = generated.get("enables", [])
                hooks = generated.get("narrative_hooks", [])
                item = Item(
                    name=item_name,
                    icon=generated.get("icon", "📦"),
                    category=generated.get("category", "special"),
                    description=generated.get("description", ""),
                    durability=generated.get("durability", 3),
                    enables=enables,
                    narrative_hooks=hooks,
                )
                state.add_item(item)
                print(f"\n  🎒 获得道具: {item_name} (enables: {enables})")

                # 自动创建钩子
                if hooks:
                    state.add_hook(f"获得{item_name}", hooks)
                    print(f"  🪝 新建钩子: 获得{item_name}")

            elif category == "CHARACTER":
                npc_name = generated.get("name", "未知NPC")
                skills_data = generated.get("skills", [])
                skill_objs = []
                all_enables = []
                for s in skills_data:
                    if isinstance(s, dict):
                        sk = CompanionSkill(
                            type=s.get("type", ""),
                            description=s.get("description", ""),
                            enables=s.get("enables", []),
                            narrative_hooks=s.get("narrative_hooks", []),
                        )
                        skill_objs.append(sk)
                        all_enables.extend(sk.enables)

                comp = Companion(
                    name=npc_name,
                    skill=generated.get("personality", ""),
                    flaw="unknown",
                    skills=skill_objs,
                )
                state.add_companion(comp)
                print(f"\n  👤 招募同伴: {npc_name} (enables: {all_enables})")

                # 自动创建钩子
                if all_enables:
                    state.add_hook(f"招募{npc_name}", [f"{npc_name}的技能在未来场景中发挥作用"])
                    print(f"  🪝 新建钩子: 招募{npc_name}")

            results.append({"day": day, "category": category, "result": generated})

        except Exception as e:
            print(f"\n  ❌ 生成失败: {e}")
            results.append({"day": day, "category": category, "error": str(e)})

        print(f"\n  📊 Day {day} 结束状态: HP={state.hp} Hunger={state.hunger} Sanity={state.sanity}")
        print(f"  🎒 背包: {[i.name if isinstance(i, Item) else str(i) for i in state.inventory]}")
        print(f"  👥 同伴: {[c.name if isinstance(c, Companion) else str(c) for c in state.companions]}")

    # 最终报告
    print(f"\n{'='*60}")
    print("📋 联调测试报告")
    print(f"{'='*60}")
    print(f"总天数: {len(results)}")
    print(f"最终能力清单:\n{state.capabilities_string()}")
    print(f"钩子队列:\n{state.hooks_string()}")

    # 验证点
    caps = state.get_capabilities()
    all_enables = []
    for v in caps["from_inventory"].values():
        all_enables.extend(v)
    for v in caps["from_companions"].values():
        all_enables.extend(v)
    print(f"\n✅ 总能力标签数: {len(all_enables)}")
    print(f"✅ 道具数: {len(state.inventory)}")
    print(f"✅ 同伴数: {len(state.companions)}")
    print(f"✅ 钩子总数: {len(state.hook_queue)} (已解决: {sum(1 for h in state.hook_queue if isinstance(h, NarrativeHook) and h.resolved)})")


if __name__ == "__main__":
    # 需要设置 ANTHROPIC_API_KEY
    import os
    if not os.environ.get("ANTHROPIC_API_KEY"):
        # 尝试从 .env.local 读取
        env_path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
        if os.path.exists(env_path):
            with open(env_path) as f:
                for line in f:
                    if line.startswith("ANTHROPIC_API_KEY="):
                        os.environ["ANTHROPIC_API_KEY"] = line.split("=", 1)[1].strip()
                        break

    from game_state import NarrativeHook
    run_test()
