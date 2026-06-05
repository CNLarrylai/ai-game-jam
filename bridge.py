"""
bridge.py v2 — Phase 1 → Phase 2 → 前端 串联层

数据流:
  观众评论 → WebSocket → Phase 1 (classifier + filter + generator)
  → Phase 2 (phase2_engine: inject/event_choice/action)
  → WebSocket → 前端渲染

职责:
  1. WebSocket 监听评论和主播操作
  2. 维护 GameState（唯一状态源）
  3. 维护 history（每次操作后追加 HistoryEntry）
  4. 调用 Phase 1 生成 → Phase 2 注入 → 推前端
  5. 字段映射: spirit↔sanity, health↔hp

启动: python3 bridge.py
依赖: ws-server.js (:3002) + uvicorn phase2_engine:app (:8000)
"""

import os
import sys
import json
import asyncio
import time
import aiohttp

from dotenv import load_dotenv
load_dotenv('.env.local')
load_dotenv('.env')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'comment_engine'))

import websockets
from classifier import classify
from comment_pool import CommentPool
from generator import generate
from game_state import GameState, Item, Companion, CompanionSkill, EventRecord, NarrativeHook
from narrative_safety import check_narrative_safety, clean_orphan_hooks, compress_history

# ============================================================
# 配置
# ============================================================
WS_PORT = os.environ.get("PORT", "3002")
WS_URL = f"ws://localhost:{WS_PORT}"
PHASE2_URL = "http://localhost:8000"
WINDOW_SECONDS = 30

# ============================================================
# 全局状态
# ============================================================
pool = CommentPool(window_seconds=WINDOW_SECONDS)
state = GameState()
ws_connection = None
comment_buffer = []
history = []  # List[dict] — HistoryEntry for Phase 2
turn_counter = 0
pending_event = None  # 当前待选择的事件


# ============================================================
# 字段映射: cheney (spirit/health) ↔ charlotte (sanity/hp)
# ============================================================

def state_to_phase2():
    """GameState → Phase 2 入参格式"""
    return {
        "current_status": {
            "hp": state.health,
            "hunger": state.hunger,
            "thirst": state.thirst,
            "sanity": state.spirit,
        },
        "companions_list": [
            {
                "name": c.name if isinstance(c, Companion) else str(c),
                "personality": c.skill if isinstance(c, Companion) else "",
                "loyalty": 60,
            }
            for c in state.companions
        ],
        "inventory": [
            i.name if isinstance(i, Item) else str(i)
            for i in state.inventory
        ],
        "history": history[-20:],
    }


def apply_phase2_response(resp: dict):
    """Phase2Response → 更新 GameState + 追加 history"""
    global turn_counter

    sc = resp.get("stat_changes", {})
    state.spirit = max(0, min(100, state.spirit + sc.get("sanity", 0)))
    state.health = max(0, min(100, state.health + sc.get("hp", 0)))
    state.hunger = max(0, min(100, state.hunger + sc.get("hunger", 0)))
    state.thirst = max(0, min(100, state.thirst + sc.get("thirst", 0)))

    inv_change = resp.get("inventory_change", {})
    for item_name in inv_change.get("remove_items", []):
        state.remove_item(item_name)
    for item_name in inv_change.get("add_items", []):
        state.add_item(Item(
            name=item_name, icon="📦", category="special",
            description="", durability=3,
        ))

    turn_counter += 1
    delta_parts = []
    for k, v in sc.items():
        if v: delta_parts.append(f"{k}{v:+d}")
    history.append({
        "turn": turn_counter,
        "action": resp.get("narrative", "")[:40],
        "narrative": resp.get("narrative", ""),
        "items_gained": inv_change.get("add_items", []),
        "items_lost": inv_change.get("remove_items", []),
        "stat_delta": " ".join(delta_parts) or None,
    })
    if len(history) > 20:
        history[:] = history[-20:]

    state._check_game_over()


# ============================================================
# Phase 2 HTTP 调用
# ============================================================

async def call_phase2_inject(generated: dict) -> dict:
    payload = {"upstream_payload": generated, **state_to_phase2()}
    async with aiohttp.ClientSession() as session:
        async with session.post(f"{PHASE2_URL}/phase2_inject", json=payload) as resp:
            return await resp.json()


async def call_phase2_event_choice(event_narrative: str, choice: str) -> dict:
    payload = {"event_narrative": event_narrative, "player_choice": choice, **state_to_phase2()}
    async with aiohttp.ClientSession() as session:
        async with session.post(f"{PHASE2_URL}/phase2_event_choice", json=payload) as resp:
            return await resp.json()


async def call_phase2_action(player_input: str) -> dict:
    payload = {"player_input": player_input, **state_to_phase2()}
    async with aiohttp.ClientSession() as session:
        async with session.post(f"{PHASE2_URL}/phase2_action", json=payload) as resp:
            return await resp.json()


# ============================================================
# WebSocket
# ============================================================

async def connect():
    global ws_connection
    while True:
        try:
            ws_connection = await websockets.connect(WS_URL)
            await ws_connection.send(json.dumps({
                "type": "register", "role": "viewer",
                "uid": "engine_001", "name": "🧠 AI Engine", "avatar": "🧠"
            }))
            print(f"🧠 [BRIDGE] 已连接 ws-server ({WS_URL})")
            return ws_connection
        except Exception as e:
            print(f"🧠 [BRIDGE] 连接失败: {e}，3秒后重试...")
            await asyncio.sleep(3)


async def send_ws(msg):
    global ws_connection
    if ws_connection:
        try:
            await ws_connection.send(json.dumps(msg, ensure_ascii=False))
        except:
            pass


# ============================================================
# 消息处理
# ============================================================

async def listen(ws):
    async for raw in ws:
        try:
            msg = json.loads(raw)
        except:
            continue
        if msg["type"] == "new_comment":
            on_comment(msg)
        elif msg["type"] == "host_action":
            await on_host_action(msg)
        elif msg["type"] == "state_sync":
            on_state_sync(msg)


def on_comment(msg):
    text = msg.get("text", "")
    username = msg.get("name", "匿名")
    uid = msg.get("uid", "")
    if not text.strip():
        return
    # Ignore our own system messages
    if username == "🧠 AI Engine" or uid == "engine_001":
        return
    # Always classify with 'explore' phase — most permissive, accepts all categories.
    # Phase filtering at selection time is enough; no need to reject at classification.
    result = classify(text, phase='explore')
    # Force phase_compatible = True so all comments enter the pool
    result.phase_compatible = True
    # Don't call open_window here — it clears the pool! Window is managed by generation_loop.

    # Check rejection reasons BEFORE adding
    reason = None
    if result.category not in pool._queues:
        reason = "闲聊内容不参与剧情生成"
    elif not result.phase_compatible:
        reason = "当前阶段不适合这类创意"
    elif result.confidence < 0.3:
        reason = "描述不够具体，试试更详细的场景描述"

    pool.add(username, text, result)
    comment_buffer.append({"username": username, "text": text, "category": result.category, "confidence": result.confidence})
    print(f"💬 [{result.category}] {username}: {text} (conf={result.confidence:.2f} pool={pool.total_size()} {'REJECT:'+reason if reason else 'OK'})")

    # Send feedback to the commenter
    if reason:
        asyncio.ensure_future(send_ws({
            "type": "comment_feedback",
            "uid": uid,
            "username": username,
            "text": text,
            "category": result.category,
            "reason": reason,
        }))
    else:
        asyncio.ensure_future(send_ws({
            "type": "comment_feedback",
            "uid": uid,
            "username": username,
            "text": text,
            "category": result.category,
            "accepted": True,
        }))


async def on_host_action(msg):
    global pending_event
    action = msg.get("action", "")
    data = msg.get("data", {})

    if action == "scene_change":
        state.phase = data.get("scene", state.phase)

    elif action == "choice":
        choice_text = data.get("choice", "")
        if pending_event:
            print(f"🎮 主播选择: \"{choice_text}\"")
            try:
                event_info = pending_event.get("narration", "")
                generated = pending_event.get("generated", {})
                if generated.get("type") == "CHARACTER":
                    event_info = json.dumps(generated, ensure_ascii=False)

                resp = await call_phase2_event_choice(event_info, choice_text)
                apply_phase2_response(resp)
                await send_ws({"type": "choice_result", "data": resp})
                print(f"  ✅ {resp.get('narrative', '')[:60]}")
            except Exception as e:
                print(f"  ❌ Phase 2 event_choice 失败: {e}")
            pending_event = None

    elif action == "player_action":
        player_input = data.get("input", "")
        if player_input:
            print(f"🎮 主播操作: \"{player_input}\"")
            try:
                resp = await call_phase2_action(player_input)
                apply_phase2_response(resp)
                await send_ws({"type": "action_result", "data": resp})
                print(f"  ✅ {resp.get('narrative', '')[:60]}")
            except Exception as e:
                print(f"  ❌ Phase 2 action 失败: {e}")


def on_state_sync(msg):
    data = msg.get("data", {})
    if "day" in data: state.day = data["day"]
    if "stats" in data:
        s = data["stats"]
        state.spirit = s.get("spirit", s.get("sanity", state.spirit))
        state.health = s.get("health", s.get("hp", state.health))
        state.hunger = s.get("hunger", state.hunger)
        state.thirst = s.get("thirst", state.thirst)
    if "scene" in data: state.phase = data["scene"]


# ============================================================
# 评论生成循环: Phase 1 → Phase 2 → 前端
# ============================================================

async def generation_loop():
    global comment_buffer, pending_event

    COOLDOWN = 8  # seconds between generations
    pool.open_window()

    while True:
        await asyncio.sleep(3)  # check every 3s instead of waiting 30s

        if pool.total_size() == 0:
            continue  # nothing to process

        phase_map = {"home": "home_event", "organize": "resource_manage", "destination": "choose_map", "explore": "explore"}
        phase = phase_map.get(state.phase, "explore")
        best = pool.select_adoptions(phase=phase)
        total = len(comment_buffer)
        comment_buffer = []
        pool.open_window()

        if not best:
            continue  # no valid comments, stay quiet

        pick = best[0]
        print(f"\n🧠 ===== Phase 1 → Phase 2 =====")
        print(f"  @{pick.username}: 「{pick.raw_text}」 ({pick.classify_result.category})")

        await send_ws({"type": "comment", "name": "🧠 AI Engine", "avatar": "🧠", "text": f"✨ {total}条评论 · @{pick.username} · 生成中..."})

        # ── Phase 1: 生成 ──
        try:
            generated = generate(
                category=pick.classify_result.category,
                comment=pick.raw_text,
                username=pick.username,
                context=state.context_string(),
            )
            if not generated:
                await send_ws({"type": "comment", "name": "🧠 AI Engine", "avatar": "🧠", "text": "❌ Phase 1 返回空结果"})
                continue
            safety = check_narrative_safety(generated, state, pick.classify_result.category)
            if not safety.passed:
                print(f"  ⚠️ 安全检查: {safety.issues}")
            generated["type"] = pick.classify_result.category
            print(f"  ✅ Phase 1: {generated.get('event_title') or generated.get('name', '?')}")
        except Exception as e:
            print(f"  ❌ Phase 1 失败: {e}")
            import traceback; traceback.print_exc()
            await send_ws({"type": "comment", "name": "🧠 AI Engine", "avatar": "🧠", "text": f"❌ 生成失败: {str(e)[:80]}"})
            continue

        # ── Phase 2: 注入 ──
        try:
            resp = await call_phase2_inject(generated)
            print(f"  ✅ Phase 2: {resp.get('final_category')}")

            # 采纳通知
            await send_ws({
                "type": "comment_adopted", "authorUid": pick.username,
                "data": {"banner": {"big": True, "icon": "✨", "html": f"<b>@{pick.username}</b> 的创意生效了！「{generated.get('event_title') or generated.get('name', '')}」"}}
            })

            final_cat = resp.get("final_category", "")
            # Always set pending_event so host choices get processed
            pending_event = {"narration": resp.get("narrative", ""), "options": resp.get("options", []), "generated": generated}
            resp["source_user"] = pick.username
            # Merge Phase 1 fields into response so host has full info (name, danger, etc)
            if generated.get("name"): resp["event_title"] = generated["name"]
            if generated.get("danger_level"): resp["danger_level"] = generated["danger_level"]
            if generated.get("entry_narration") and not resp.get("narrative"): resp["narrative"] = generated["entry_narration"]
            await send_ws({"type": "game_event", "data": resp})
            if resp.get("options"):
                print(f"  📺 等待主播选择...")
            else:
                print(f"  📺 事件已推送 ({final_cat})")

        except Exception as e:
            print(f"  ❌ Phase 2 失败: {e}，降级推送 Phase 1 结果")
            await send_ws({"type": "host_action", "action": "ai_generated", "data": {"category": pick.classify_result.category, "generated": generated}})


# ============================================================
# 入口
# ============================================================

async def main():
    print("🧠 ============================================")
    print("🧠  WASTELAND LIVE — Bridge v2")
    print(f"🧠  Phase 1: comment_engine (本地)")
    print(f"🧠  Phase 2: {PHASE2_URL}")
    print(f"🧠  WebSocket: {WS_URL}")
    print(f"🧠  窗口: {WINDOW_SECONDS}s")
    print("🧠 ============================================\n")
    ws = await connect()
    await asyncio.gather(listen(ws), generation_loop())

if __name__ == "__main__":
    asyncio.run(main())
