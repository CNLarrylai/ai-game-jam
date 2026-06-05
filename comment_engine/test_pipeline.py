#!/usr/bin/env python3
"""
完整管线端到端测试（不依赖 WebSocket）
模拟：用户评论输入 → 分类 → 入池 → 窗口关闭 → 裁定 → 生成剧情 → 输出

用法: cd ai-game-jam && ANTHROPIC_API_KEY=xxx python3 comment_engine/test_pipeline.py
"""

import os
import sys
import json
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from game_state import GameState, Item, Companion, HARDCODED_ITEMS, EventRecord
from classifier import classify
from comment_pool import CommentPool
from world_filter import filter_comment
from generator import generate, resolve_event
from narrative_safety import check_narrative_safety

# ============================================================
# 初始化 Day1 游戏状态
# ============================================================
def init_game():
    state = GameState()
    # 初始物资
    for _ in range(3):
        state.add_item(Item(**{**HARDCODED_ITEMS["矿泉水"].__dict__}))
    for _ in range(2):
        state.add_item(Item(**{**HARDCODED_ITEMS["鲱鱼罐头"].__dict__}))
    state.event_history.append("Day0: AI清洗后醒来，发现自己是少数幸存者之一")
    return state


# ============================================================
# 模拟一轮完整窗口
# ============================================================
def run_window(state, comments, window_label=""):
    """
    模拟一轮30秒窗口：评论输入→分类→入池→选取→裁定→生成

    Args:
        state: GameState
        comments: [(username, text), ...]
        window_label: 打印标签
    """
    print(f"\n{'='*60}")
    print(f"🕐 窗口: {window_label}")
    print(f"📅 Day {state.day} | Phase: {state.phase} | Location: {state.location}")
    print(f"💫 Spirit={state.spirit} 💪Health={state.health} 🍞Hunger={state.hunger} 💧Thirst={state.thirst}")
    print(f"🎒 {[i.name if isinstance(i,Item) else i for i in state.inventory]}")
    print(f"{'='*60}")

    # Step 1: 分类入池
    pool = CommentPool(window_seconds=30, max_adoptions_per_window=2)
    pool.open_window()

    print("\n📢 Step 1: 评论分类")
    icon_map = {"EVENT":"🎭","CHARACTER":"👤","ITEM":"🎒","LOCATION":"🗺️","IRRELEVANT":"💬"}
    for username, text in comments:
        result = classify(text, phase=state.phase)
        pool.add(username, text, result)
        compat = "✅" if result.phase_compatible else "🚫"
        entered = "入池" if result.category != "IRRELEVANT" and result.phase_compatible else "过滤"
        print(f"  {icon_map.get(result.category,'?')} @{username}: \"{text}\" → {result.category}({result.confidence:.1f}) {compat} {entered}")

    print(f"\n  📊 队列: {pool.get_queue_summary()} | 今日剩余: {pool.get_daily_remaining()}")

    # Step 2: 选取最佳评论
    adopted = pool.select_adoptions(phase=state.phase)
    if not adopted:
        print("\n  ⏭️ 无有效评论，跳过生成")
        return []

    print(f"\n📢 Step 2: 选取 {len(adopted)} 条评论")
    for i, pick in enumerate(adopted):
        print(f"  [{i+1}] @{pick.username}: \"{pick.raw_text}\" ({pick.classify_result.category})")

    # Step 3-5: 对每条采纳的评论执行 裁定→生成→安全检查
    results = []
    for pick in adopted:
        cat = pick.classify_result.category
        print(f"\n📢 Step 3: 世界观裁定 — @{pick.username}: \"{pick.raw_text}\"")

        # 裁定
        try:
            filter_result = filter_comment(
                comment=pick.raw_text, username=pick.username, category=cat,
                day=state.day, spirit=state.spirit, health=state.health,
                hunger=state.hunger, thirst=state.thirst,
                phase=state.phase, location=state.location,
            )
            strategy = filter_result.get("strategy", "?")
            print(f"  策略: {strategy}")
            print(f"  转译: {filter_result.get('reinterpreted_prompt', '直接通过')[:80]}")
        except Exception as e:
            print(f"  ⚠️ 裁定失败: {e}，使用原文")
            filter_result = {"strategy": "PASS", "reinterpreted_prompt": pick.raw_text}
            strategy = "PASS"

        # 生成用的 prompt（PASS 用原文，其他用转译后的）
        gen_prompt = pick.raw_text if strategy == "PASS" else filter_result.get("reinterpreted_prompt", pick.raw_text)

        print(f"\n📢 Step 4: Claude API 生成 ({cat})")
        try:
            context = state.context_string()
            gen_result = generate(
                category=cat,
                comment=gen_prompt,
                username=pick.username,
                context=context,
            )

            # 打印生成结果
            title = gen_result.get("event_title") or gen_result.get("name") or "?"
            print(f"  ✅ {title}")

            if cat == "EVENT":
                print(f"  📜 {gen_result.get('narration', '')[:100]}")
                opts = gen_result.get("options", [])
                for j, opt in enumerate(opts):
                    sc = opt.get("stat_changes", {})
                    sc_str = " ".join(f"{k}:{v:+d}" for k, v in sc.items() if v != 0) or "无"
                    src = f" (💬@{opt['comment_source']})" if opt.get("comment_source") else ""
                    print(f"    [{j+1}] {opt.get('text','')}{src} → {sc_str}")
            elif cat == "CHARACTER":
                print(f"  👤 {gen_result.get('personality', '')}")
                print(f"  💬 \"{gen_result.get('dialogue_intro', '')[:60]}\"")
                for opt in gen_result.get("interaction_options", []):
                    print(f"    - {opt.get('text', '')}")
            elif cat == "ITEM":
                print(f"  {gen_result.get('icon','')} {gen_result.get('description','')[:60]}")
                print(f"  效果: {gen_result.get('effect', {})}")
                print(f"  获取文案: {gen_result.get('pickup_text', '无')}")
            elif cat == "LOCATION":
                print(f"  ⭐{'⭐'*gen_result.get('danger_level',0)}")
                print(f"  📜 {gen_result.get('entry_narration', gen_result.get('description',''))[:80]}")

            print(f"  💡 {gen_result.get('source_display', '')}")

            # Step 5: 安全检查
            print(f"\n📢 Step 5: 安全检查")
            try:
                safety = check_narrative_safety(gen_result, state, cat)
                print(f"  {'✅' if safety.passed else '❌'} score={safety.score} | issues={safety.issues or '无'}")
            except Exception as e:
                print(f"  ⚠️ 安全检查跳过: {e}")

            # 记录
            state.record_adopted_comment(pick.username, pick.raw_text, cat, title)
            results.append({
                "source": {"username": pick.username, "text": pick.raw_text, "category": cat},
                "filter": filter_result,
                "generated": gen_result,
            })

        except Exception as e:
            print(f"  ❌ 生成失败: {e}")

    return results


# ============================================================
# 主测试流程：模拟 Day 1 超市探索
# ============================================================
def main():
    print("🎮 WASTELAND LIVE — 完整管线端到端测试")
    print("📋 场景: Day 1 大型超市探索\n")

    state = init_game()
    state.phase = "explore"
    state.location = "大型超市"
    state.visited_locations.append("大型超市")

    # === 窗口 1: 第一波评论（混合类型）===
    results_1 = run_window(state, [
        ("小明", "收银机在尖叫"),
        ("大壮", "有一只会说话的猫"),
        ("夜猫子", "666"),
        ("冒险王", "地上有把生锈的扳手"),
        ("科技宅", "去地下停车场"),
        ("路人甲", "哈哈哈哈"),
        ("探险家", "看到一个略眼熟的身影"),
        ("中二少年", "给他一套末日机甲"),
    ], window_label="Day1 超市探索 - 第一波")

    # === 模拟主播对事件做出反应 ===
    if results_1:
        for r in results_1:
            if r["source"]["category"] == "EVENT":
                event = r["generated"]
                print(f"\n{'='*60}")
                print(f"🎮 主播回应事件: {event.get('event_title','')}")
                print(f"{'='*60}")
                print(f"主播说: \"赞同他的话，和他一起谴责种机歧视\"")

                try:
                    resolve_result = resolve_event(
                        player_input="赞同他的话，和他一起谴责种机歧视",
                        situation=event.get("narration", ""),
                        context=state.context_string(),
                    )
                    print(f"\n📜 结果: {resolve_result.get('result_narration', '')[:120]}")
                    print(f"📊 数值: {resolve_result.get('stat_changes', {})}")
                    state.apply_stat_changes(resolve_result.get("stat_changes", {}))
                    print(f"💫 Spirit={state.spirit} 💪Health={state.health} 🍞Hunger={state.hunger} 💧Thirst={state.thirst}")

                    if resolve_result.get("follow_up"):
                        print(f"🔄 还有后续: {resolve_result['follow_up'][:80]}...")
                except Exception as e:
                    print(f"❌ resolve 失败: {e}")
                break  # 只处理第一个事件

    # === 窗口 2: 第二波评论（更离谱的）===
    results_2 = run_window(state, [
        ("捣蛋鬼", "给他一颗核弹"),
        ("奇幻粉", "召唤一条龙来帮忙"),
        ("科幻迷", "马斯克出现了"),
        ("善良人", "应该去找找水源"),
        ("怀旧党", "去白宫看看"),
    ], window_label="Day1 超市探索 - 第二波")

    # === 每日结算 ===
    print(f"\n{'='*60}")
    print(f"🌙 Day {state.day} 结束，每日结算")
    print(f"{'='*60}")
    before = f"Spirit={state.spirit} Health={state.health} Hunger={state.hunger} Thirst={state.thirst}"
    state.advance_day()
    after = f"Spirit={state.spirit} Health={state.health} Hunger={state.hunger} Thirst={state.thirst}"
    print(f"  结算前: {before}")
    print(f"  结算后: {after} (hunger+15, thirst+30)")
    print(f"  Game over: {state.game_over}")
    print(f"  被采纳评论: {len(state.adopted_comments)} 条")
    for ac in state.adopted_comments:
        print(f"    @{ac['username']}: \"{ac['comment']}\" → {ac['result_title']}")

    print(f"\n{'='*60}")
    print(f"✅ 端到端测试完成！")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
