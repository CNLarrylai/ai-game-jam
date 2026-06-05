"""
Phase 2 Demo — 双Tab：玩家指令 + 上游注入
上游注入 Tab 无需 API Key 即可测试
"""
import random, json, os
import gradio as gr
from phase2_engine import (
    Phase2Request, Phase2InjectRequest, CurrentStatus, Companion,
    phase2_action, phase2_inject,
    PRESET_ITEMS, ActionType,
)
from anthropic import Anthropic

# ── 初始状态 ──────────────────────────────
DEFAULT_STATE = {
    "hp": 50, "hunger": 30, "thirst": 30, "sanity": 60,
    "inventory": ["矿泉水", "鲱鱼罐头", "猫咪罐头", "神秘药水", "生锈的螺丝刀", "旧手电筒"],
    "companions": [
        {"name": "仿生人小明", "personality": "冷漠、自尊心极强", "loyalty": 60},
        {"name": "流浪猫饼干", "personality": "慵懒但偶尔温柔", "loyalty": 80},
    ],
    "log": [],
    "history": [],   # 游戏历史，每回合追加
    "turn": 0,
}

def append_history(state, action, result):
    """每次操作后追加历史记录"""
    state["turn"] += 1
    sc = result.stat_changes
    delta_parts = []
    if sc.hp:     delta_parts.append(f"hp{sc.hp:+d}")
    if sc.hunger: delta_parts.append(f"饥饿{sc.hunger:+d}")
    if sc.thirst: delta_parts.append(f"口渴{sc.thirst:+d}")
    if sc.sanity: delta_parts.append(f"精神{sc.sanity:+d}")
    entry = {
        "turn": state["turn"],
        "action": action,
        "narrative": result.narrative,
        "items_gained": result.inventory_change.add_items or [],
        "items_lost": result.inventory_change.remove_items or [],
        "stat_delta": " ".join(delta_parts) or None,
    }
    state["history"].append(entry)
    # 只保留最近20条，避免 token 爆炸
    state["history"] = state["history"][-20:]

def clamp(v, lo=0, hi=100): return max(lo, min(hi, v))

def state_display(state):
    def bar(val, reverse=False):
        danger = val > 70 if reverse else val < 30
        filled = val // 10
        b = "🟥" if danger else "🟩"
        return b * filled + "⬜" * (10 - filled)

    companions = "\n".join(
        f"  **{c['name']}** — 好感度 {c['loyalty']}/100 {'❤️'*(c['loyalty']//20)}"
        for c in state["companions"]
    ) or "  无同伴"
    log_text = "\n\n".join(state["log"]) if state["log"] else "_暂无事件_"

    return f"""## 📊 状态
❤️ **生命值** {bar(state['hp'])} {state['hp']}/100
🍖 **饥饿值** {bar(state['hunger'], reverse=True)} {state['hunger']}/100 _(越低越好)_
💧 **口渴值** {bar(state['thirst'], reverse=True)} {state['thirst']}/100 _(越低越好)_
🧠 **精神值** {bar(state['sanity'])} {state['sanity']}/100

---
## 👥 同伴
{companions}

---
## 🎒 背包
{', '.join(state['inventory']) or '空空如也'}

---
## 📜 事件记录
{log_text}
"""

def apply_stat(state, sc):
    state["hp"]     = clamp(state["hp"]     + sc.hp)
    state["hunger"] = clamp(state["hunger"] + sc.hunger)
    state["thirst"] = clamp(state["thirst"] + sc.thirst)
    state["sanity"] = clamp(state["sanity"] + sc.sanity)

def check_game_over(state):
    if state["sanity"] <= 10: return "💀 精神崩溃，游戏结束！"
    if state["hp"] <= 0:      return "💀 你死了，游戏结束！"
    if state["hunger"] >= 100: return "💀 饿死了，游戏结束！"
    if state["thirst"] >= 100: return "💀 渴死了，游戏结束！"
    return None

def make_req(player_input, state):
    from phase2_engine import HistoryEntry
    return Phase2Request(
        player_input=player_input,
        current_status=CurrentStatus(**{k: state[k] for k in ["hp","hunger","thirst","sanity"]}),
        companions_list=[Companion(**c) for c in state["companions"]],
        inventory=state["inventory"],
        history=[HistoryEntry(**h) for h in state.get("history", [])],
    )

def make_inject_req(payload, state):
    from phase2_engine import HistoryEntry
    return Phase2InjectRequest(
        upstream_payload=payload,
        current_status=CurrentStatus(**{k: state[k] for k in ["hp","hunger","thirst","sanity"]}),
        companions_list=[Companion(**c) for c in state["companions"]],
        inventory=state["inventory"],
        history=[HistoryEntry(**h) for h in state.get("history", [])],
    )

# ══════════════════════════════════════════
# Tab 1：玩家指令
# ══════════════════════════════════════════

def player_action(player_input, state_json):
    state = json.loads(state_json)
    log = state["log"]

    if not player_input.strip():
        return state_display(state), gr.update(), json.dumps(state), ""

    # 无论有没有 key，先走预设物品硬拦截
    for item in PRESET_ITEMS:
        if item in player_input and item in state["inventory"]:
            state["inventory"].remove(item)
            sc = PRESET_ITEMS[item]
            apply_stat(state, sc)
            log.insert(0, f"🎒 **{item}**｜已使用，身体略有恢复。")
            state["log"] = log[:15]
            return state_display(state), gr.update(value=""), json.dumps(state), ""

    # 非预设物品：需要 API Key
    has_key = bool(os.environ.get("ANTHROPIC_API_KEY", "").strip())
    if not has_key:
        return state_display(state), gr.update(), json.dumps(state), \
               "⚠️ 需要 ANTHROPIC_API_KEY 才能运行 AI 生成。预设物品（矿泉水/鲱鱼罐头/猫咪罐头）可直接测试，或切换到「上游注入」Tab（无需 Key）。"

    try:
        req = make_req(player_input, state)
        result = phase2_action(req)
    except Exception as e:
        return state_display(state), gr.update(value=""), json.dumps(state), f"❌ 错误：{e}"

    apply_stat(state, result.stat_changes)
    for item in result.inventory_change.remove_items:
        if item in state["inventory"]: state["inventory"].remove(item)
    state["inventory"].extend(result.inventory_change.add_items)

    append_history(state, player_input, result)

    if result.action_type.value == "COMPANION_INTERACT" and not result.companion_agrees:
        prefix = "😤 **同伴反抗**｜"
    elif result.action_type.value == "COMPANION_INTERACT" and result.companion_agrees:
        prefix = "✅ **同伴同意**｜"
    else:
        prefix = "🎲 **事件**｜"

    log.insert(0, f"{prefix}{result.narrative}")
    over = check_game_over(state)
    if over: log.insert(0, over)
    state["log"] = log[:15]

    return state_display(state), gr.update(value=""), json.dumps(state), ""

# ══════════════════════════════════════════
# Tab 2：上游注入（无需 API Key）
# ══════════════════════════════════════════

EVENT_EXAMPLE = json.dumps({
    "type": "EVENT",
    "event_title": "🚪 敲门声",
    "narration": "午夜的寂静被打破——有人在敲避难所的铁门……",
    "options": [
        {"text": "开门查看", "stat_changes": {"hp": -5, "sanity": -10}},
        {"text": "保持沉默", "stat_changes": {"sanity": -15}}
    ]
}, ensure_ascii=False, indent=2)

CHARACTER_EXAMPLE = json.dumps({
    "type": "CHARACTER",
    "name": "独眼老兵 Hawk",
    "dialogue_intro": "别动！你最近对什么东西说过谢谢吗？",
    "interaction_options": [
        {"text": "招募", "cost": {"food": 3}},
        {"text": "询问情报", "reveals": "超市地下室有AI监控盲区"},
        {"text": "离开"}
    ]
}, ensure_ascii=False, indent=2)

ITEM_EXAMPLE = json.dumps({
    "type": "ITEM",
    "name": "购物车外骨骼",
    "icon": "🦾",
    "description": "用购物车骨架焊的破烂外骨骼，左臂还在漏油",
    "effect": {
        "immediate_stat_change": {"hp": 0, "hunger": 0, "thirst": 0, "sanity": -5}
    }
}, ensure_ascii=False, indent=2)

LOCATION_EXAMPLE = json.dumps({
    "type": "LOCATION",
    "name": "地下停车场",
    "danger_level": 3,
    "description": "漆黑的混凝土坟墓，弥漫着机油和腐烂橡胶的气味"
}, ensure_ascii=False, indent=2)

def upstream_inject(payload_str, state_json):
    state = json.loads(state_json)
    log = state["log"]

    try:
        payload = json.loads(payload_str)
    except Exception:
        return state_display(state), json.dumps(state), "❌ JSON 格式错误，请检查输入"

    try:
        req = make_inject_req(payload, state)
        result = phase2_inject(req)
    except Exception as e:
        return state_display(state), json.dumps(state), f"❌ 错误：{e}"

    t = result.type.value

    if t == "ITEM":
        # ITEM：Phase 2 直接处理，加背包 + 改数值
        apply_stat(state, result.stat_changes)
        state["inventory"].extend(result.inventory_change.add_items)
        log.insert(0, f"📦 **[上游输入]** {result.narrative}")
        state["log"] = log[:15]
        return state_display(state), json.dumps(state), \
            "**Phase 2 处理结果（ITEM）：**\n" + \
            f"- 物品已入背包：{result.inventory_change.add_items}\n" + \
            f"- 数值变化：hp{result.stat_changes.hp:+d} 饥饿{result.stat_changes.hunger:+d} " + \
            f"口渴{result.stat_changes.thirst:+d} 精神{result.stat_changes.sanity:+d}\n\n" + \
            "_ITEM 是 Phase 2 唯一直接处理的注入类型，其他类型透传给前端等待玩家选择。_"

    elif t in ("EVENT", "CHARACTER"):
        # EVENT / CHARACTER：Phase 2 透传，在 demo 里额外显示「玩家选择」环节
        opts = result.options or []
        opt_texts = [o.get("text", str(o)) if isinstance(o, dict) else str(o) for o in opts]
        log.insert(0, f"⚡ **[上游输入 → 等待玩家选择]** {result.narrative}")
        state["log"] = log[:15]
        # 把完整 payload 存起来，确保 LLM 能拿到角色名/性格/事件完整信息
        state["pending_event"] = {
            "options": opts,
            "opt_texts": opt_texts,
            "narrative": result.narrative,
            "payload": payload,   # 完整上游 JSON，含 name/personality/event_title 等
            "upstream_type": t,
        }
        opts_display = "\n".join(f"- 选项 {i+1}：**{t}**" for i, t in enumerate(opt_texts))
        return state_display(state), json.dumps(state), \
            f"**Phase 2 收到上游输入（{t}），透传给前端。**\n\n" + \
            f"旁白：{result.narrative}\n\n" + \
            f"前端渲染以下选项，**玩家点选后回调 /phase2_action**：\n{opts_display}\n\n" + \
            "_⬇️ 请在下方点击选项，模拟玩家做出选择，查看 Phase 2 的实际输出。_"

    elif t == "LOCATION_PASSTHROUGH":
        name = payload.get("name", "未知地点")
        log.insert(0, f"🗺️ **[上游输入 → 透传 Phase 4]** {name}")
        state["log"] = log[:15]
        return state_display(state), json.dumps(state), \
            f"**Phase 2 收到 LOCATION，直接透传给 Phase 4，不做任何处理。**\n\n地点：{name}"

    state["log"] = log[:15]

    # 输出面板：清楚区分「Phase 2 收到的输入」和「Phase 2 的处理结果」
    type_labels = {
        "EVENT": "透传前端（Phase 2 不处理，原样转给前端渲染事件卡）",
        "CHARACTER": "透传前端（Phase 2 不处理，原样转给前端渲染 NPC 遭遇卡）",
        "LOCATION_PASSTHROUGH": "透传 Phase 4（Phase 2 不处理）",
        "ITEM": "Phase 2 处理：加入背包 + 执行 immediate_stat_change（Harness 限幅）",
    }
    note = type_labels.get(t, "")
    raw_out = {
        "⬇️ Phase2收到的上游输入": payload,
        "⬆️ Phase2的处理结果": {
            "type": result.type.value,
            "action_type": result.action_type.value,
            "说明": note,
            "narrative（透传或生成）": result.narrative,
            "options（透传）": result.options,
            "stat_changes（仅ITEM有效）": result.stat_changes.model_dump(),
            "inventory_change（仅ITEM有效）": result.inventory_change.model_dump(),
        }
    }
    return state_display(state), json.dumps(state), "```json\n" + json.dumps(raw_out, ensure_ascii=False, indent=2) + "\n```"

def reset_game():
    state = json.loads(json.dumps(DEFAULT_STATE))
    state["log"] = []
    return state_display(state), gr.update(value=""), json.dumps(state), ""

def set_example(example_json):
    return gr.update(value=example_json)

# ══════════════════════════════════════════
# Gradio UI
# ══════════════════════════════════════════
with gr.Blocks(title="Phase 2 测试台", theme=gr.themes.Soft()) as demo:
    gr.Markdown("# 🎮 Phase 2 测试台")
    game_state = gr.State(json.dumps(DEFAULT_STATE))

    with gr.Row():
        # 左：状态面板
        with gr.Column(scale=2):
            status_display = gr.Markdown(state_display(DEFAULT_STATE))
            reset_btn = gr.Button("🔄 重置游戏", size="sm")

        # 右：两个Tab
        with gr.Column(scale=3):
            with gr.Tabs():

                # Tab1：玩家指令
                with gr.TabItem("💬 玩家指令 /phase2_action"):
                    gr.Markdown("主播口述的操作。**预设物品无需 API Key**，其他输入需要配置 `ANTHROPIC_API_KEY`。")
                    gr.Markdown("**示例：** 我喝矿泉水 / 把小明赶走 / 吃下神秘药水 / 让小明帮我修东西")
                    player_input = gr.Textbox(label="输入指令", placeholder="你想做什么？", lines=2)
                    player_btn = gr.Button("▶️ 执行", variant="primary")
                    player_msg = gr.Markdown("")

                # Tab2：上游注入
                with gr.TabItem("📡 上游注入 /phase2_inject（无需 API Key）"):
                    gr.Markdown("**第一步：** 粘贴上游 JSON 点击注入。EVENT/CHARACTER 会出现选项，**第二步：** 点选项模拟玩家选择，查看 Phase 2 实际输出。")
                    with gr.Row():
                        btn_event   = gr.Button("⚡ EVENT 示例")
                        btn_char    = gr.Button("👤 CHARACTER 示例")
                        btn_item    = gr.Button("📦 ITEM 示例")
                        btn_loc     = gr.Button("🗺️ LOCATION 示例")
                    inject_input = gr.Code(label="① 上游 JSON 输入", language="json",
                                          value=EVENT_EXAMPLE, lines=12)
                    inject_btn = gr.Button("▶️ 注入（Phase 2 透传给前端）", variant="primary")
                    inject_output = gr.Markdown("_点击注入查看 Phase 2 处理结果_")
                    gr.Markdown("---")
                    gr.Markdown("### ② 玩家点选（模拟前端回调 /phase2_action）")
                    choice_radio = gr.Radio(label="选择一个选项", choices=[], interactive=True)
                    choice_btn = gr.Button("✅ 确认选择，查看 Phase 2 输出", variant="secondary")

    # 事件绑定
    player_btn.click(player_action,
        inputs=[player_input, game_state],
        outputs=[status_display, player_input, game_state, player_msg])
    player_input.submit(player_action,
        inputs=[player_input, game_state],
        outputs=[status_display, player_input, game_state, player_msg])

    def inject_and_update_choices(payload_str, state_json):
        display, new_state_json, output = upstream_inject(payload_str, state_json)
        state = json.loads(new_state_json)
        pending = state.get("pending_event", {})
        choices = pending.get("opt_texts", [])
        return display, new_state_json, output, gr.update(choices=choices, value=None, visible=bool(choices))

    def player_choose(choice, state_json):
        if not choice:
            return gr.update(), gr.update(), "请先选择一个选项"
        state = json.loads(state_json)
        pending = state.get("pending_event", {})

        has_key = bool(os.environ.get("ANTHROPIC_API_KEY", "").strip())
        if not has_key:
            return state_display(state), json.dumps(state), \
                "⚠️ 需要 ANTHROPIC_API_KEY 才能让 Phase 2 基于上游事件 + 玩家状态动态生成结果。\n\n" \
                "**这正是 Phase 2 的核心增量价值**：同样选「开门查看」，精神值60和精神值20时结果完全不同。"

        from phase2_engine import EventChoiceRequest, phase2_event_choice, HistoryEntry
        # 把完整上游信息拼成 event_narrative，让 LLM 知道角色名/性格/事件背景
        upstream_payload = pending.get("payload", {})
        upstream_type = pending.get("upstream_type", "EVENT")
        if upstream_type == "CHARACTER":
            char_name = upstream_payload.get("name", "未知角色")
            char_personality = upstream_payload.get("personality", "")
            char_intro = upstream_payload.get("dialogue_intro", pending.get("narrative", ""))
            char_hidden = upstream_payload.get("hidden_trait", "")
            event_narrative = (
                f"角色出现：{char_name}\n"
                f"性格：{char_personality}\n"
                f"开场白：{char_intro}\n"
                + (f"隐藏特质（仅AI知道）：{char_hidden}\n" if char_hidden else "")
            )
        else:
            event_narrative = (
                upstream_payload.get("narration") or
                upstream_payload.get("event_title", "") + "\n" +
                pending.get("narrative", "")
            )
        req = EventChoiceRequest(
            event_narrative=event_narrative,
            player_choice=choice,
            current_status=CurrentStatus(**{k: state[k] for k in ["hp","hunger","thirst","sanity"]}),
            companions_list=[Companion(**c) for c in state["companions"]],
            inventory=state["inventory"],
            history=[HistoryEntry(**h) for h in state.get("history", [])],
        )
        try:
            result = phase2_event_choice(req)
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            return state_display(state), json.dumps(state), f"❌ LLM 调用失败：{e}\n\n```\n{tb}\n```"

        apply_stat(state, result.stat_changes)
        state["inventory"].extend(result.inventory_change.add_items)
        append_history(state, f"事件选择：{choice}", result)

        log = state.get("log", [])
        log.insert(0, f"✅ **[玩家选择：{choice}]** {result.narrative}")
        state["log"] = log[:15]
        state.pop("pending_event", None)

        sc = result.stat_changes
        result_md = f"**⬆️ Phase 2 输出（/phase2_event_choice，LLM 基于当前状态动态生成）：**\n\n" \
                    f"- 玩家选择：**{choice}**\n" \
                    f"- 动态旁白：{result.narrative}\n" \
                    f"- 数值变化：hp{sc.hp:+d} 饥饿{sc.hunger:+d} 口渴{sc.thirst:+d} 精神{sc.sanity:+d}\n"
        if result.inventory_change.add_items:
            result_md += f"- 获得物品：{result.inventory_change.add_items}\n"
        result_md += "\n_注：同样的选项，精神值/HP/同伴不同时结果会不同。_"

        return state_display(state), json.dumps(state), result_md

    inject_btn.click(inject_and_update_choices,
        inputs=[inject_input, game_state],
        outputs=[status_display, game_state, inject_output, choice_radio])

    choice_btn.click(player_choose,
        inputs=[choice_radio, game_state],
        outputs=[status_display, game_state, inject_output])

    btn_event.click(lambda: EVENT_EXAMPLE,     outputs=inject_input)
    btn_char.click( lambda: CHARACTER_EXAMPLE, outputs=inject_input)
    btn_item.click( lambda: ITEM_EXAMPLE,      outputs=inject_input)
    btn_loc.click(  lambda: LOCATION_EXAMPLE,  outputs=inject_input)

    reset_btn.click(reset_game,
        outputs=[status_display, player_input, game_state, player_msg])

if __name__ == "__main__":
    demo.launch(inbrowser=True)
