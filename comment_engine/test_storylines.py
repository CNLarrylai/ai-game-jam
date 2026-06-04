"""
故事线压力测试 — 节目效果验证
模拟多条完整故事线，测试：
1. 能力驱动系统在复杂剧情中的表现
2. 荒谬评论的世界观转译是否有趣
3. 同伴死亡/背叛后钩子清理是否正常
4. 回调/伏笔收束的节目效果
5. 观众会截图分享的"名场面"密度

每条故事线模拟一组真实直播间评论，覆盖正常→荒谬→恶意→天才创意的全光谱。
"""

import json
import os
import sys
from game_state import GameState, Item, Companion, CompanionSkill, EventRecord, NarrativeHook
from classifier import classify
from generator import generate
from world_filter import filter_comment
from narrative_safety import check_narrative_safety, clean_orphan_hooks, compress_history


def _load_api_key():
    if not os.environ.get("ANTHROPIC_API_KEY"):
        env_path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
        if os.path.exists(env_path):
            with open(env_path) as f:
                for line in f:
                    if line.startswith("ANTHROPIC_API_KEY="):
                        os.environ["ANTHROPIC_API_KEY"] = line.split("=", 1)[1].strip()
                        break


# ============================================================
# 故事线定义
# ============================================================

STORYLINES = {
    # ── 故事线 A: 回旋镖 ──
    # Day 1 随手捡的破烂在 Day 5 救了命，观众集体高潮
    "boomerang": {
        "name": "回旋镖 — 破烂变救命道具",
        "theme": "Day 1 被嘲笑的选择在 Day 5 成为关键转折",
        "days": {
            1: {
                "phase": "explore", "location": "废弃超市",
                "comments": [
                    {"username": "垃圾佬", "text": "收银台下面有个坏掉的对讲机"},
                    {"username": "吃货", "text": "冰柜里还有冰激凌吗"},
                    {"username": "666", "text": "666666"},
                ],
                "expected_highlight": "对讲机被捡起来，弹幕一片'这破玩意儿有什么用'"
            },
            2: {
                "phase": "home_event", "location": "避难所",
                "comments": [
                    {"username": "电台迷", "text": "收音机里传来一段加密的摩斯密码"},
                    {"username": "怀疑论者", "text": "肯定是AI的陷阱别理它"},
                ],
                "expected_highlight": "摩斯密码无法解读，埋下伏笔"
            },
            3: {
                "phase": "explore", "location": "废弃工厂",
                "comments": [
                    {"username": "技术宅", "text": "工厂里有个老旧的信号放大器"},
                    {"username": "作死王", "text": "把放大器接到对讲机上试试"},
                ],
                "expected_highlight": "观众建议组合道具！对讲机+放大器=能收到更远的信号"
            },
            5: {
                "phase": "explore", "location": "AI控制塔",
                "comments": [
                    {"username": "天才", "text": "用对讲机发送那段摩斯密码给控制塔"},
                    {"username": "赌命", "text": "要么被AI发现要么黑进去没有第三条路"},
                ],
                "expected_highlight": "Day 1 的破对讲机 + Day 2 的摩斯密码 + Day 3 的放大器 = 黑入AI控制塔的钥匙"
            },
        },
    },

    # ── 故事线 B: 背叛 ──
    # 同伴背叛是直播间最大的节目效果
    "betrayal": {
        "name": "背叛 — 同伴黑化名场面",
        "theme": "隐藏特质触发，信任的同伴突然背叛",
        "days": {
            2: {
                "phase": "home_event", "location": "避难所",
                "comments": [
                    {"username": "善良人", "text": "门外有个拿着公文包的西装男在求救"},
                    {"username": "警觉狗", "text": "末日了谁还穿西装？肯定有问题"},
                ],
                "expected_highlight": "西装男自称是前AI公司员工，弹幕分裂成'救他'vs'别信他'"
            },
            3: {
                "phase": "explore", "location": "废弃医院",
                "comments": [
                    {"username": "细心人", "text": "西装男好像在偷偷用什么东西发信号"},
                    {"username": "信任者", "text": "他只是在看手表放松一下"},
                ],
                "expected_highlight": "观众注意到可疑行为，但没有证据"
            },
            4: {
                "phase": "explore", "location": "地下隧道",
                "comments": [
                    {"username": "高能预警", "text": "西装男的公文包里发出嗡嗡声"},
                    {"username": "跑路", "text": "快检查他的包！"},
                ],
                "expected_highlight": "打开公文包 → AI发射器 → 同伴是AI的间谍 → 弹幕炸裂"
            },
        },
    },

    # ── 故事线 C: 荒谬评论压力测试 ──
    # 测试世界观转译能否把最离谱的评论变成节目效果
    "chaos": {
        "name": "混沌 — 荒谬评论转译大赏",
        "theme": "观众越整活，AI转译越精彩",
        "days": {
            1: {
                "phase": "explore", "location": "废弃超市",
                "comments": [
                    {"username": "中二病", "text": "我要召唤神龙许三个愿望"},
                    {"username": "财阀", "text": "给玩家十亿美元和一架私人飞机"},
                    {"username": "魔法师", "text": "用传送门直接去安全区"},
                    {"username": "正常人", "text": "货架上有没有罐头"},
                ],
                "expected_highlight": "神龙→超市里一个标着'Dragon Energy'的过期功能饮料；十亿美元→一堆没用的纸币可以生火"
            },
            3: {
                "phase": "explore", "location": "废弃工厂",
                "comments": [
                    {"username": "整活王", "text": "让AI统治者出来跟我单挑"},
                    {"username": "哲学家", "text": "对AI说谢谢，看它会不会放过我们"},
                    {"username": "物理学家", "text": "制造一个核聚变反应堆"},
                ],
                "expected_highlight": "对AI说谢谢→触发隐藏对话？核聚变→用工厂电焊枪焊了个发热不发电的'迷你太阳'，只能取暖"
            },
        },
    },

    # ── 故事线 D: 感动名场面 ──
    # 末日里的温暖时刻，反差感拉满
    "emotional": {
        "name": "温暖 — 末日中的人性光芒",
        "theme": "在绝望中发现温暖，直播间集体破防",
        "days": {
            3: {
                "phase": "explore", "location": "居民废墟",
                "comments": [
                    {"username": "温柔", "text": "公寓的冰箱上贴着一张全家福"},
                    {"username": "细节控", "text": "全家福旁边有个孩子画的蜡笔画"},
                ],
                "expected_highlight": "蜡笔画上画的是一家人在说'谢谢'——这个孩子可能因此幸存了"
            },
            5: {
                "phase": "explore", "location": "幸存者营地",
                "comments": [
                    {"username": "剧情党", "text": "营地里有个小女孩在画画"},
                    {"username": "连接者", "text": "她画的和Day 3公寓里那张蜡笔画的风格一样"},
                ],
                "expected_highlight": "蜡笔画的孩子找到了！Day 3 的伏笔在 Day 5 收束，弹幕集体破防"
            },
        },
    },

    # ── 故事线 E: 同伴技能连锁 ──
    # 多同伴能力组合产生1+1>2的效果
    "synergy": {
        "name": "协同 — 同伴技能连锁反应",
        "theme": "不同同伴的能力组合产生意想不到的解法",
        "days": {
            2: {
                "phase": "home_event", "location": "避难所",
                "comments": [
                    {"username": "招募官", "text": "来了个瘸腿的前军医"},
                ],
                "expected_highlight": "军医有 heal_injury + identify_medicine，补全队伍医疗缺口"
            },
            4: {
                "phase": "explore", "location": "AI控制塔",
                "comments": [
                    {"username": "战术家", "text": "控制塔的门是电子锁加钢板双重防护"},
                    {"username": "组合技", "text": "让老韩破解电子锁，军医用手术刀撬铰链"},
                ],
                "expected_highlight": "老韩 hack_simple_machine + 军医 surgery_basic = 双人协作破门，弹幕刷'配合！'"
            },
        },
    },
}


# ============================================================
# 测试执行器
# ============================================================

def run_storyline(name: str, storyline: dict):
    """执行一条完整故事线"""
    print(f"\n{'#'*70}")
    print(f"# 故事线: {storyline['name']}")
    print(f"# 主题: {storyline['theme']}")
    print(f"{'#'*70}")

    state = GameState()
    all_results = []

    for day, day_data in sorted(storyline["days"].items()):
        state.day = day
        state.phase = day_data["phase"]
        state.location = day_data["location"]
        if state.location not in state.visited_locations:
            state.visited_locations.append(state.location)

        print(f"\n{'='*60}")
        print(f"📅 DAY {day} — {state.location} ({state.phase})")
        print(f"📺 期望高光: {day_data['expected_highlight']}")
        print(f"{'='*60}")

        comments = day_data["comments"]

        # Step 1: 分类
        classified = []
        for c in comments:
            result = classify(c["text"], phase=state.phase)
            classified.append({"comment": c, "result": result})
            print(f"  💬 @{c['username']}: \"{c['text']}\" → {result.category} ({result.confidence:.2f})")

        # Step 2: 世界观过滤（对每条有效评论）
        filtered = []
        for cl in classified:
            if cl["result"].category == "IRRELEVANT":
                continue
            c = cl["comment"]
            try:
                f = filter_comment(
                    comment=c["text"], username=c["username"],
                    category=cl["result"].category,
                    day=state.day, hp=state.hp, hunger=state.hunger, sanity=state.sanity,
                    phase=state.phase, location=state.location,
                )
                filtered.append({"comment": c, "classify": cl["result"], "filter": f})
                strategy = f.get("strategy", "?")
                entertainment = f.get("entertainment_value", "")
                print(f"  🎭 @{c['username']} → [{strategy}] {entertainment[:80]}")
            except Exception as e:
                print(f"  ⚠️ 过滤失败 @{c['username']}: {e}")

        if not filtered:
            print("  ⚠️ 没有有效评论")
            continue

        # Step 3: 选最佳评论（优先选 entertainment_value 最长的，作为趣味性代理）
        best = filtered[0]
        for f in filtered:
            if len(f["filter"].get("entertainment_value", "")) > len(best["filter"].get("entertainment_value", "")):
                best = f

        comment = best["comment"]
        category = best["classify"].category
        reinterpreted = best["filter"].get("reinterpreted_prompt", comment["text"])

        print(f"\n  🎯 选中: @{comment['username']}: \"{comment['text']}\"")
        print(f"  🔄 转译: {reinterpreted[:120]}...")
        print(f"  📊 能力: {state.capabilities_string()}")
        print(f"  🪝 钩子: {state.hooks_string()}")

        # Step 4: 生成
        context = state.context_string()
        print(f"\n  ⏳ 正在生成 {category}...")

        try:
            generated = generate(
                category=category,
                comment=reinterpreted,
                username=comment["username"],
                context=context,
            )

            # Step 5: 安全检查
            safety = check_narrative_safety(generated, state, category)
            if not safety.passed:
                print(f"  ⛔ 安全检查不通过: {safety.issues}")
                print(f"  🔄 重试...")
                generated = generate(
                    category=category, comment=reinterpreted,
                    username=comment["username"], context=context,
                )
                safety = check_narrative_safety(generated, state, category)

            if safety.warnings:
                print(f"  ⚠️ 警告: {safety.warnings}")

            # 输出结果
            print(f"\n  ✅ 生成结果 (score={safety.score}):")

            if category == "EVENT":
                print(f"  📖 {generated.get('event_title', '')}")
                print(f"  📝 {generated.get('narration', '')[:200]}...")
                for i, opt in enumerate(generated.get("options", [])):
                    cap = opt.get("capability_used", "none")
                    print(f"    [{i+1}] {opt.get('text', '')} (能力:{cap})")
                if generated.get("thread_hook"):
                    print(f"  🧵 伏笔: {generated['thread_hook'][:100]}...")

                # 自动选择第一个选项
                if generated.get("options"):
                    chosen = generated["options"][0]
                    state.apply_stat_changes(chosen.get("stat_changes", {}))
                    if chosen.get("item_gained"):
                        item = Item(
                            name=chosen["item_gained"], icon="📦",
                            category="special", description="", durability=3,
                        )
                        state.add_item(item)
                    state.record_event(EventRecord(
                        day=day, phase=state.phase,
                        title=generated.get("event_title", ""),
                        narration=generated.get("narration", ""),
                        choice_made=chosen.get("text", ""),
                        stat_changes=chosen.get("stat_changes", {}),
                        source_comment=f"@{comment['username']}",
                    ))
                    for hid in generated.get("hooks_resolved", []):
                        state.resolve_hook(hid)

            elif category == "ITEM":
                name = generated.get("name", "?")
                enables = generated.get("enables", [])
                hooks = generated.get("narrative_hooks", [])
                print(f"  🎒 {generated.get('icon', '📦')} {name}")
                print(f"     enables: {enables}")
                print(f"     hooks: {hooks[:2]}")
                item = Item(
                    name=name, icon=generated.get("icon", "📦"),
                    category=generated.get("category", "special"),
                    description=generated.get("description", ""),
                    durability=generated.get("durability", 3),
                    enables=enables, narrative_hooks=hooks,
                )
                state.add_item(item)
                if hooks:
                    state.add_hook(f"获得{name}", hooks)

            elif category == "CHARACTER":
                npc_name = generated.get("name", "?")
                skills = generated.get("skills", [])
                all_enables = []
                skill_objs = []
                for s in skills:
                    if isinstance(s, dict):
                        sk = CompanionSkill(
                            type=s.get("type", ""),
                            description=s.get("description", ""),
                            enables=s.get("enables", []),
                            narrative_hooks=s.get("narrative_hooks", []),
                        )
                        skill_objs.append(sk)
                        all_enables.extend(sk.enables)
                print(f"  👤 {npc_name}")
                print(f"     enables: {all_enables}")
                print(f"     性格: {generated.get('personality', '')}")
                comp = Companion(
                    name=npc_name, skill=generated.get("personality", ""),
                    flaw="", skills=skill_objs,
                )
                state.add_companion(comp)
                if all_enables:
                    state.add_hook(f"招募{npc_name}", [f"{npc_name}技能发挥作用"])

            elif category == "LOCATION":
                loc_name = generated.get("name", "?")
                danger = generated.get("danger_level", "?")
                print(f"  🗺️ {loc_name} (danger={danger})")
                print(f"     {generated.get('description', '')[:150]}...")
                cells = generated.get("preset_cells", [])
                for cell in cells[:3]:
                    print(f"     [{cell.get('type', '?')}] {cell.get('content_hint', '')[:80]}")

            all_results.append({
                "day": day, "category": category,
                "comment": comment["text"], "username": comment["username"],
                "filter_strategy": best["filter"].get("strategy"),
                "safety_score": safety.score,
                "result_title": generated.get("event_title") or generated.get("name", ""),
            })

        except Exception as e:
            print(f"  ❌ 生成失败: {e}")
            import traceback
            traceback.print_exc()

        print(f"\n  📊 HP={state.hp} Hunger={state.hunger} Sanity={state.sanity}")
        print(f"  🎒 {[i.name if isinstance(i, Item) else str(i) for i in state.inventory]}")
        print(f"  👥 {[c.name if isinstance(c, Companion) else str(c) for c in state.companions]}")

    # 故事线总结
    print(f"\n{'='*60}")
    print(f"📋 故事线 [{storyline['name']}] 总结")
    print(f"{'='*60}")
    for r in all_results:
        print(f"  Day {r['day']}: [{r['filter_strategy']}] @{r['username']} \"{r['comment'][:20]}\" → {r['result_title']} (score={r['safety_score']})")
    print(f"  最终能力: {state.capabilities_string()}")
    print(f"  钩子状态: {state.hooks_string()}")


# ============================================================
# 主入口
# ============================================================

if __name__ == "__main__":
    _load_api_key()

    # 选择要跑的故事线
    target = sys.argv[1] if len(sys.argv) > 1 else "all"

    if target == "all":
        for name, storyline in STORYLINES.items():
            run_storyline(name, storyline)
    elif target in STORYLINES:
        run_storyline(target, STORYLINES[target])
    else:
        print(f"可选故事线: {', '.join(STORYLINES.keys())}")
        print("用法: python test_storylines.py [故事线名|all]")
