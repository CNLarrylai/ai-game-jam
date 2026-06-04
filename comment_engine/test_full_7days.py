"""
完整7天剧情模拟 — 从开局到结局
模拟一场真实直播的完整游戏流程，每天包含：
1. 在家突发事件（评论生成）
2. 选择地图
3. 探索（2-3个事件）
4. 回家休息

输出一份可读的"剧情回顾"文档，像直播回放一样。
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
# 7天评论剧本 — 模拟真实直播间弹幕
# ============================================================

SCRIPT = {
    1: {
        "home_event": [
            {"username": "早起鸟", "text": "窗外好像有猫在叫"},
            {"username": "乐观主义", "text": "新的一天，今天一定能找到物资！"},
        ],
        "choose_map": [
            {"username": "探险家", "text": "去废弃超市看看有没有吃的"},
            {"username": "冒险王", "text": "去军事基地，搞把枪"},
        ],
        "explore": [
            [
                {"username": "垃圾佬", "text": "收银台下面有个坏掉的对讲机"},
                {"username": "吃货", "text": "冷柜里有没有罐头"},
            ],
            [
                {"username": "胆小鬼", "text": "听到货架后面有动静"},
                {"username": "搞笑人", "text": "是不是一只还活着的roomba扫地机器人"},
            ],
        ],
    },
    2: {
        "home_event": [
            {"username": "善良人", "text": "门口有个独眼老头在敲门，手里拿着扳手"},
            {"username": "警觉哥", "text": "别开门，可能是陷阱"},
        ],
        "choose_map": [
            {"username": "医疗党", "text": "去医院找药"},
            {"username": "技术宅", "text": "去废弃工厂找零件"},
        ],
        "explore": [
            [
                {"username": "探索者", "text": "工厂里有台坏掉的发电机"},
                {"username": "电工", "text": "让老头试试能不能修"},
            ],
            [
                {"username": "恐怖片迷", "text": "天花板上传来嗡嗡声"},
                {"username": "跑路王", "text": "是无人机快跑！"},
            ],
        ],
    },
    3: {
        "home_event": [
            {"username": "电台迷", "text": "对讲机里突然传来一段摩斯密码"},
            {"username": "破译者", "text": "谁来翻译一下密码内容"},
        ],
        "choose_map": [
            {"username": "剧情党", "text": "顺着信号方向去地下隧道"},
            {"username": "安全第一", "text": "还是去居民区翻翻公寓"},
        ],
        "explore": [
            [
                {"username": "温柔", "text": "公寓冰箱上贴着一张全家福和蜡笔画"},
                {"username": "细节控", "text": "蜡笔画上面写着thank you"},
            ],
            [
                {"username": "中二病", "text": "我要召唤神龙许三个愿望"},
                {"username": "正常人", "text": "卧室抽屉里有没有手电筒"},
            ],
            [
                {"username": "整活王", "text": "给AI写一封道歉信"},
                {"username": "哲学家", "text": "如果我们集体说谢谢，AI会停手吗"},
            ],
        ],
    },
    4: {
        "home_event": [
            {"username": "大事件", "text": "外面传来巨大的爆炸声"},
            {"username": "观察者", "text": "浓烟从北边升起来了，好像是工厂方向"},
        ],
        "choose_map": [
            {"username": "勇者", "text": "去爆炸现场看看发生了什么"},
            {"username": "捡漏王", "text": "趁乱去军事基地，守卫可能被吸引走了"},
        ],
        "explore": [
            [
                {"username": "战术家", "text": "基地大门的电子锁还在运行"},
                {"username": "组合技", "text": "让老头破解电子锁，我们用撬棍撬铰链"},
            ],
            [
                {"username": "宝藏猎人", "text": "军火库的门虚掩着"},
                {"username": "谨慎者", "text": "先用手电筒照进去看看有没有陷阱"},
            ],
        ],
    },
    5: {
        "home_event": [
            {"username": "不速之客", "text": "一个穿西装的男人出现在门口，说他知道安全区在哪"},
            {"username": "怀疑论者", "text": "末日了谁还穿西装？不要信他"},
        ],
        "choose_map": [
            {"username": "跟踪者", "text": "跟着西装男去他说的安全区方向"},
            {"username": "独立党", "text": "别跟他走，自己去幸存者营地打听"},
        ],
        "explore": [
            [
                {"username": "发现者", "text": "营地里有个小女孩在画画"},
                {"username": "连接者", "text": "她画的风格和Day 3公寓那张蜡笔画一模一样"},
            ],
            [
                {"username": "高能预警", "text": "西装男在角落里偷偷打开公文包"},
                {"username": "间谍片", "text": "公文包里发出蓝光和嗡嗡声"},
            ],
        ],
    },
    6: {
        "home_event": [
            {"username": "紧急", "text": "对讲机收到求救信号，有人被困在医院地下室"},
            {"username": "理性人", "text": "可能是AI模拟的声音，要小心"},
        ],
        "choose_map": [
            {"username": "英雄", "text": "去医院救人"},
            {"username": "生存主义", "text": "去控制塔，找到关闭AI的方法"},
        ],
        "explore": [
            [
                {"username": "名场面", "text": "医院地下室传来奇怪的嗡嗡声"},
                {"username": "boss战", "text": "一个巨大的医疗机器人挡在前面"},
            ],
            [
                {"username": "高潮", "text": "机器人的胸口有个红色按钮，上面写着thank you"},
                {"username": "赌徒", "text": "按下去！"},
            ],
        ],
    },
    7: {
        "home_event": [
            {"username": "最后一天", "text": "天边出现了奇怪的光"},
            {"username": "末日感", "text": "所有的AI机器同时安静了下来"},
        ],
        "choose_map": [
            {"username": "最终决战", "text": "去AI控制塔"},
            {"username": "逃跑路线", "text": "带所有人往南走，离开这座城市"},
        ],
        "explore": [
            [
                {"username": "终章", "text": "控制塔的核心是一个巨大的屏幕，上面显示着一行字"},
                {"username": "结局", "text": "屏幕上写着：你说过谢谢吗"},
            ],
            [
                {"username": "财阀", "text": "给AI十亿美元让它放过我们"},
                {"username": "真诚者", "text": "对着屏幕说谢谢"},
            ],
        ],
    },
}


# ============================================================
# 游戏引擎
# ============================================================

def safe_generate(category, comment, username, context, state, retries=2):
    """带安全检查和重试的生成"""
    for attempt in range(retries + 1):
        try:
            result = generate(category=category, comment=comment, username=username, context=context)
            safety = check_narrative_safety(result, state, category)
            if safety.passed:
                return result, safety
            if attempt < retries:
                continue
            return result, safety  # 最后一次即使不过也返回
        except Exception as e:
            if attempt < retries:
                continue
            return None, None
    return None, None


def streamer_pick_option(options: list, state) -> int:
    """
    模拟话题型主播的选择策略：
    - 优先选最有话题性/戏剧性的选项（不选"安全离开"之类的无聊选项）
    - 如果有同伴互动的选项，优先选（观众喜欢看角色互动）
    - 如果有使用道具/能力的选项，优先选（观众喜欢看装备发挥作用）
    - 避免纯暴力/破坏选项（不选"砸烂""摧毁"除非没别的了）
    - 如果数值危险（HP/Hunger/Sanity < 20），优先选有正面收益的
    """
    if not options:
        return 0

    scores = []
    for i, opt in enumerate(options):
        score = 0
        text = opt.get("text", "").lower()
        outcome = opt.get("outcome", "").lower()
        cap_used = opt.get("capability_used", "")

        # 话题性加分
        if any(kw in text for kw in ["调查", "investigate", "question", "analyze", "decode", "ask", "打开", "open"]):
            score += 3  # 探索/揭秘类 = 高话题
        if any(kw in outcome for kw in ["secret", "hidden", "reveal", "discover", "秘密", "发现", "真相"]):
            score += 3  # 有揭秘结果

        # 同伴互动加分
        companion_names = [c.name.lower() if isinstance(c, Companion) else str(c).lower() for c in state.companions]
        for name in companion_names:
            short_name = name.split("'")[0].strip().split(" ")[0]
            if short_name in text.lower() or short_name in outcome.lower():
                score += 4  # 观众爱看角色互动
                break

        # 能力使用加分
        if cap_used and cap_used != "none":
            score += 3  # 装备发挥作用 = 观众满足感

        # 风险收益型（赌博感）加分
        changes = opt.get("stat_changes", {})
        has_big_negative = any(v <= -15 for v in changes.values())
        has_positive = any(v > 0 for v in changes.values())
        if has_big_negative and has_positive:
            score += 2  # 高风险高回报 = 刺激

        # 有道具获得加分
        if opt.get("item_gained"):
            score += 2

        # 纯暴力/无聊减分
        if any(kw in text for kw in ["smash", "destroy", "砸", "摧毁", "ignore", "leave", "离开", "走"]):
            score -= 2
        if any(kw in text for kw in ["seal", "seal &", "move on", "pass"]):
            score -= 3  # 无聊选项

        # 危险时求生本能
        if state.hp < 20 or state.hunger < 20 or state.sanity < 15:
            hp_change = changes.get("hp", 0) + changes.get("hunger", 0) + changes.get("sanity", 0)
            if hp_change > 0:
                score += 3  # 快死了就选能回血的

        # "说谢谢"在这个世界观里是核心梗，永远选
        if any(kw in text for kw in ["thank", "谢谢", "感谢", "say thank"]):
            score += 10  # 世界观核心机制 = 必选

        scores.append(score)

    best_idx = max(range(len(scores)), key=lambda i: scores[i])
    return best_idx


def process_comments(comments, state, phase):
    """分类+过滤评论，返回最佳评论和生成所需信息"""
    classified = []
    for c in comments:
        result = classify(c["text"], phase=phase)
        classified.append({"comment": c, "result": result})

    valid = [c for c in classified if c["result"].category != "IRRELEVANT" and c["result"].phase_compatible]
    if not valid:
        return None, None, classified

    # 过滤
    best_entry = None
    best_filter = None
    for v in valid:
        c = v["comment"]
        try:
            f = filter_comment(
                comment=c["text"], username=c["username"],
                category=v["result"].category,
                day=state.day, hp=state.hp, hunger=state.hunger, sanity=state.sanity,
                phase=phase, location=state.location,
            )
            if best_filter is None or len(f.get("entertainment_value", "")) > len(best_filter.get("entertainment_value", "")):
                best_entry = v
                best_filter = f
        except:
            continue

    return best_entry, best_filter, classified


def apply_event(generated, state, day, phase, username):
    """应用事件结果到游戏状态"""
    if not generated or not generated.get("options"):
        return None
    pick_idx = streamer_pick_option(generated["options"], state)
    chosen = generated["options"][pick_idx]
    state.apply_stat_changes(chosen.get("stat_changes", {}))
    if chosen.get("item_gained"):
        state.add_item(Item(
            name=chosen["item_gained"], icon="📦",
            category="special", description="", durability=3,
        ))
    if chosen.get("item_lost"):
        state.remove_item(chosen["item_lost"])
    state.record_event(EventRecord(
        day=day, phase=phase,
        title=generated.get("event_title", ""),
        narration=generated.get("narration", ""),
        choice_made=chosen.get("text", ""),
        stat_changes=chosen.get("stat_changes", {}),
        source_comment=f"@{username}",
    ))
    if generated.get("thread_hook"):
        state.unresolved_threads.append(generated["thread_hook"])
    for hid in generated.get("hooks_resolved", []):
        state.resolve_hook(hid)
    return chosen


def apply_item(generated, state):
    """应用道具到游戏状态"""
    if not generated:
        return
    enables = generated.get("enables", [])
    hooks = generated.get("narrative_hooks", [])
    item = Item(
        name=generated.get("name", "?"), icon=generated.get("icon", "📦"),
        category=generated.get("category", "special"),
        description=generated.get("description", ""), durability=generated.get("durability", 3),
        enables=enables, narrative_hooks=hooks,
    )
    state.add_item(item)
    if hooks:
        state.add_hook(f"获得{item.name}", hooks)


def apply_character(generated, state):
    """应用角色到游戏状态"""
    if not generated:
        return
    skills = generated.get("skills", [])
    skill_objs = []
    for s in skills:
        if isinstance(s, dict):
            skill_objs.append(CompanionSkill(
                type=s.get("type", ""), description=s.get("description", ""),
                enables=s.get("enables", []), narrative_hooks=s.get("narrative_hooks", []),
            ))
    comp = Companion(
        name=generated.get("name", "?"), skill=generated.get("personality", ""),
        flaw="", skills=skill_objs,
    )
    state.add_companion(comp)
    all_enables = [t for s in skill_objs for t in s.enables]
    if all_enables:
        state.add_hook(f"招募{comp.name}", [f"{comp.name}的技能发挥作用"])


# ============================================================
# 主循环
# ============================================================

def run_full_game():
    state = GameState()
    log = []  # 完整剧情日志

    for day in range(1, 8):
        state.day = day
        day_log = {"day": day, "events": []}

        if state.game_over:
            day_log["events"].append({"type": "GAME_OVER", "result": state.game_result})
            log.append(day_log)
            break

        print(f"\n{'█'*70}")
        print(f"█  DAY {day}/7")
        print(f"█  HP={state.hp}  Hunger={state.hunger}  Sanity={state.sanity}")
        print(f"█  背包: {[i.name if isinstance(i, Item) else str(i) for i in state.inventory]}")
        print(f"█  同伴: {[c.name if isinstance(c, Companion) else str(c) for c in state.companions]}")
        print(f"{'█'*70}")

        day_script = SCRIPT.get(day, {})

        # ── Phase 1: 在家突发事件 ──
        state.phase = "home_event"
        state.location = "避难所"
        home_comments = day_script.get("home_event", [])
        if home_comments:
            print(f"\n🏠 在家突发事件")
            best, filt, all_cl = process_comments(home_comments, state, "home_event")
            for cl in all_cl:
                c = cl["comment"]
                print(f"  💬 @{c['username']}: \"{c['text']}\" → {cl['result'].category}")

            if best and filt:
                comment = best["comment"]
                category = best["result"].category
                reinterpreted = filt.get("reinterpreted_prompt", comment["text"])
                strategy = filt.get("strategy", "?")
                print(f"  🎯 [{strategy}] @{comment['username']}: \"{comment['text']}\"")

                result, safety = safe_generate(category, reinterpreted, comment["username"], state.context_string(), state)
                if result:
                    title = result.get("event_title") or result.get("name", "")
                    print(f"  ✨ {title}")

                    if category == "EVENT":
                        narr = result.get("narration", "")
                        print(f"  📖 {narr[:150]}...")
                        opts = result.get("options", [])
                        for oi, opt in enumerate(opts):
                            print(f"    [{oi+1}] {opt.get('text', '')}")
                        chosen = apply_event(result, state, day, "home_event", comment["username"])
                        if chosen:
                            print(f"  🎮 主播选择 → \"{chosen.get('text', '')}\"")
                        day_log["events"].append({"phase": "home_event", "type": "EVENT", "title": title, "narration": narr, "choice": chosen.get("text", "") if chosen else ""})
                    elif category == "CHARACTER":
                        apply_character(result, state)
                        print(f"  👤 招募: {result.get('name', '?')}")
                        day_log["events"].append({"phase": "home_event", "type": "CHARACTER", "name": result.get("name", "?")})
                    elif category == "ITEM":
                        apply_item(result, state)
                        print(f"  🎒 获得: {result.get('name', '?')}")
                        day_log["events"].append({"phase": "home_event", "type": "ITEM", "name": result.get("name", "?")})

        # ── Phase 4: 选择地图 ──
        map_comments = day_script.get("choose_map", [])
        if map_comments:
            state.phase = "choose_map"
            # 简单选第一个有location关键词的评论作为目的地
            location = "废弃超市"  # 默认
            location_map = {
                "超市": "废弃超市", "医院": "废弃医院", "工厂": "废弃工厂",
                "基地": "军事基地", "隧道": "地下隧道", "公寓": "居民废墟",
                "营地": "幸存者营地", "控制塔": "AI控制塔", "南": "南郊公路",
            }
            for mc in map_comments:
                for kw, loc in location_map.items():
                    if kw in mc["text"]:
                        location = loc
                        print(f"\n🗺️ @{mc['username']} 建议: {location}")
                        break
            state.set_location(location)

        # ── Phase 5: 探索 ──
        explore_rounds = day_script.get("explore", [])
        state.phase = "explore"
        for round_idx, round_comments in enumerate(explore_rounds):
            if state.action_points <= 0:
                break
            state.action_points -= 1

            print(f"\n⚔️ 探索 #{round_idx+1} ({state.location}, 行动点={state.action_points})")
            best, filt, all_cl = process_comments(round_comments, state, "explore")
            for cl in all_cl:
                c = cl["comment"]
                print(f"  💬 @{c['username']}: \"{c['text']}\" → {cl['result'].category}")

            if best and filt:
                comment = best["comment"]
                category = best["result"].category
                reinterpreted = filt.get("reinterpreted_prompt", comment["text"])
                strategy = filt.get("strategy", "?")
                print(f"  🎯 [{strategy}] @{comment['username']}")

                result, safety = safe_generate(category, reinterpreted, comment["username"], state.context_string(), state)
                if result:
                    title = result.get("event_title") or result.get("name", "")
                    print(f"  ✨ {title}")

                    if category == "EVENT":
                        narr = result.get("narration", "")
                        print(f"  📖 {narr[:150]}...")
                        opts = result.get("options", [])
                        for oi, opt in enumerate(opts):
                            cap = opt.get("capability_used", "none")
                            print(f"    [{oi+1}] {opt.get('text', '')} (能力:{cap})")
                        chosen = apply_event(result, state, day, "explore", comment["username"])
                        if chosen:
                            print(f"  🎮 主播选择 → \"{chosen.get('text', '')}\"")
                        day_log["events"].append({"phase": "explore", "type": "EVENT", "title": title, "choice": chosen.get("text", "") if chosen else ""})
                    elif category == "ITEM":
                        apply_item(result, state)
                        print(f"  🎒 获得: {result.get('name', '?')} (enables: {result.get('enables', [])})")
                        day_log["events"].append({"phase": "explore", "type": "ITEM", "name": result.get("name", "?")})
                    elif category == "CHARACTER":
                        apply_character(result, state)
                        print(f"  👤 遇到: {result.get('name', '?')}")
                        day_log["events"].append({"phase": "explore", "type": "CHARACTER", "name": result.get("name", "?")})
                    elif category == "LOCATION":
                        print(f"  🗺️ 发现: {result.get('name', '?')} (danger={result.get('danger_level', '?')})")
                        day_log["events"].append({"phase": "explore", "type": "LOCATION", "name": result.get("name", "?")})

            if state.game_over:
                break

        # ── Phase 6: 回家休息 ──
        print(f"\n🌙 回家休息")
        clean_orphan_hooks(state)
        compress_history(state, keep_recent_days=2)
        state.advance_day()
        state.day = day  # 保持当前day用于日志
        print(f"  📊 日终: HP={state.hp} Hunger={state.hunger} Sanity={state.sanity}")

        if state.game_over:
            print(f"  💀 GAME OVER: {state.game_result}")
            day_log["events"].append({"type": "GAME_OVER", "result": state.game_result})

        log.append(day_log)

        # 恢复day为下一天
        state.day = day + 1

    # ============================================================
    # 输出剧情回顾
    # ============================================================
    print(f"\n\n{'═'*70}")
    print(f"{'═'*20}  📺 完整剧情回顾  {'═'*20}")
    print(f"{'═'*70}\n")

    for day_log in log:
        d = day_log["day"]
        print(f"── Day {d} ──")
        for evt in day_log["events"]:
            if evt.get("type") == "GAME_OVER":
                print(f"  💀 {evt['result'].upper()}")
            elif evt["type"] == "EVENT":
                choice = evt.get("choice", "")
                print(f"  🎭 {evt.get('title', '')} → \"{choice}\"")
            elif evt["type"] == "ITEM":
                print(f"  🎒 获得 {evt.get('name', '?')}")
            elif evt["type"] == "CHARACTER":
                print(f"  👤 遇到 {evt.get('name', '?')}")
            elif evt["type"] == "LOCATION":
                print(f"  🗺️ 发现 {evt.get('name', '?')}")
        print()

    print(f"最终状态: HP={state.hp} Hunger={state.hunger} Sanity={state.sanity}")
    print(f"背包: {[i.name if isinstance(i, Item) else str(i) for i in state.inventory]}")
    print(f"同伴: {[c.name if isinstance(c, Companion) else str(c) for c in state.companions]}")
    print(f"能力: {state.capabilities_string()}")
    print(f"钩子: {state.hooks_string()}")
    print(f"已访问: {state.visited_locations}")

    # ============================================================
    # 逻辑一致性审计
    # ============================================================
    print(f"\n{'═'*70}")
    print(f"{'═'*20}  🔍 逻辑一致性审计  {'═'*20}")
    print(f"{'═'*70}\n")

    issues = []

    # 1. 同伴数量超限检查
    if len(state.companions) > 3:
        issues.append(f"❌ 同伴数量 {len(state.companions)} 超过上限 3")

    # 2. 背包容量检查
    if len(state.inventory) > state.backpack_capacity:
        issues.append(f"❌ 背包 {len(state.inventory)}/{state.backpack_capacity} 超容量")

    # 3. 数值合法性
    for stat_name, val in [("HP", state.hp), ("Hunger", state.hunger), ("Sanity", state.sanity)]:
        if val < 0:
            issues.append(f"❌ {stat_name}={val} 为负数")
        if val > 100:
            issues.append(f"❌ {stat_name}={val} 超过100")

    # 4. 未解决钩子检查
    active_hooks = [h for h in state.hook_queue if isinstance(h, NarrativeHook) and not h.resolved]
    must_triggers = [h for h in active_hooks if (state.day - h.setup_day) >= h.max_delay]
    if must_triggers:
        for h in must_triggers:
            issues.append(f"⚠️ MUST_TRIGGER 钩子未兑现: [{h.hook_id}] {h.setup} (等待{state.day - h.setup_day}天)")

    # 5. 剧情中提到砸/丢弃的道具是否还在背包
    inventory_names = {i.name if isinstance(i, Item) else str(i) for i in state.inventory}
    for day_log_entry in log:
        for evt in day_log_entry.get("events", []):
            choice = evt.get("choice", "").lower()
            if any(kw in choice for kw in ["smash", "destroy", "砸", "丢弃", "扔掉"]):
                # 检查事件中是否有 item_lost，如果有但道具还在背包里就是bug
                pass  # 需要更细的追踪，这里标记为需要人工review

    # 6. 同伴能力标签重复率
    all_comp_enables = []
    for comp in state.companions:
        if isinstance(comp, Companion):
            all_comp_enables.extend(comp.get_enables())
    if all_comp_enables:
        unique = set(all_comp_enables)
        dup_rate = 1 - len(unique) / len(all_comp_enables)
        if dup_rate > 0.3:
            issues.append(f"⚠️ 同伴能力标签重复率 {dup_rate:.0%}（{len(all_comp_enables)}个标签中{len(unique)}个唯一）")

    if issues:
        print("发现问题：")
        for issue in issues:
            print(f"  {issue}")
    else:
        print("✅ 未发现逻辑一致性问题")

    print()


if __name__ == "__main__":
    _load_api_key()
    run_full_game()
