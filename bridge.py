"""
bridge.py — 连接 WebSocket 服务 和 comment_engine 的桥梁

功能：
1. 以 WebSocket 客户端连接 ws-server.js（端口 3002）
2. 监听用户评论，灌入 comment_engine 的 CommentPool
3. 每 30s 窗口结束时，调用 generator 生成内容
4. 生成结果推回 ws-server 广播给主播端和所有用户

启动: cd ai-game-jam && python3 bridge.py
"""

import os
import sys
import json
import asyncio
import time

# 设置环境变量
from dotenv import load_dotenv
load_dotenv('.env.local')
load_dotenv('.env')

# 把 comment_engine 加入 path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'comment_engine'))

import websockets
from classifier import classify
from comment_pool import CommentPool
from generator import generate
from game_state import GameState, EventRecord
from narrative_safety import check_narrative_safety, clean_orphan_hooks

# ============================================================
# 配置
# ============================================================
WS_URL = "ws://localhost:3002"
WINDOW_SECONDS = 30

# ============================================================
# 全局状态
# ============================================================
pool = CommentPool(window_seconds=WINDOW_SECONDS)
state = GameState()
ws_connection = None
comment_buffer = []  # 原始评论缓存（给前端展示用）


async def connect():
    """连接 WebSocket 服务器，注册为 engine 角色"""
    global ws_connection
    while True:
        try:
            ws_connection = await websockets.connect(WS_URL)
            # 注册为特殊角色 "engine"
            await ws_connection.send(json.dumps({
                "type": "register",
                "role": "viewer",  # 复用 viewer 身份
                "uid": "engine_001",
                "name": "🧠 AI Engine",
                "avatar": "🧠"
            }))
            print(f"🧠 [BRIDGE] 已连接 ws-server ({WS_URL})")
            return ws_connection
        except Exception as e:
            print(f"🧠 [BRIDGE] 连接失败: {e}，3秒后重试...")
            await asyncio.sleep(3)


async def listen(ws):
    """监听 WebSocket 消息"""
    async for raw in ws:
        try:
            msg = json.loads(raw)
        except:
            continue

        if msg["type"] == "new_comment":
            on_comment(msg)
        elif msg["type"] == "host_action":
            on_host_action(msg)
        elif msg["type"] == "state_sync":
            on_state_sync(msg)


def on_comment(msg):
    """收到用户评论 → 分类 → 入池"""
    text = msg.get("text", "")
    username = msg.get("name", "匿名")
    uid = msg.get("uid", "")

    if not text.strip():
        return

    # 分类
    result = classify(text, phase=state.phase)
    if not pool.is_window_open():
        pool.open_window()
    pool.add(username, text, result)
    comment_buffer.append({
        "uid": uid,
        "username": username,
        "text": text,
        "category": result.category,
        "confidence": result.confidence,
        "time": time.time()
    })

    print(f"💬 [{result.category}] {username}: {text} (conf={result.confidence:.2f})")


def on_host_action(msg):
    """主播操作 → 更新游戏状态"""
    action = msg.get("action", "")
    data = msg.get("data", {})

    if action == "scene_change":
        state.phase = data.get("scene", state.phase)
        print(f"🎮 [HOST] 场景切换: {state.phase}")
    elif action == "stat_change":
        for k, v in data.get("delta", {}).items():
            if hasattr(state, k):
                setattr(state, k, max(0, min(100, getattr(state, k, 50) + v)))


def on_state_sync(msg):
    """主播端同步完整状态"""
    data = msg.get("data", {})
    if "day" in data:
        state.day = data["day"]
    if "stats" in data:
        for k, v in data["stats"].items():
            if hasattr(state, k):
                setattr(state, k, v)
    if "scene" in data:
        state.phase = data["scene"]


async def generation_loop():
    """每 30s 触发一次内容生成"""
    global comment_buffer

    while True:
        await asyncio.sleep(WINDOW_SECONDS)

        # 从池中取最佳评论
        if not pool.is_window_open():
            pool.open_window()
        # Map host scene names to engine phases; fallback to 'explore' which accepts all categories
        phase_map = {'home': 'home_event', 'organize': 'resource', 'destination': 'choose_destination', 'explore': 'explore'}
        phase = phase_map.get(state.phase, 'explore')
        best = pool.select_adoptions(phase=phase)

        if not best:
            print(f"🧠 [GEN] 本轮无有效评论，跳过")
            # 广播倒计时重置
            await send_ws({
                "type": "comment",
                "name": "🧠 AI Engine",
                "avatar": "🧠",
                "text": f"📊 本轮收集 {len(comment_buffer)} 条评论，无有效创意，等待下一轮..."
            })
            comment_buffer = []
            continue

        pick = best[0]
        total = len(comment_buffer)
        comment_buffer = []

        print(f"\n🧠 [GEN] ===== 开始生成 =====")
        print(f"   选中: {pick.username} 「{pick.raw_text}」 ({pick.classify_result.category})")
        print(f"   本轮评论: {total} 条")

        # 广播"正在生成"
        await send_ws({
            "type": "comment",
            "name": "🧠 AI Engine",
            "avatar": "🧠",
            "text": f"✨ 本轮采集完成！共 {total} 条评论 · 选中 @{pick.username} 的创意 · 正在生成..."
        })

        # 调用 Claude API 生成
        try:
            context = state.context_string()
            result = generate(
                category=pick.classify_result.category,
                comment=pick.raw_text,
                username=pick.username,
                context=context,
            )

            if result:
                # 安全检查
                safety = check_narrative_safety(result, state, pick.classify_result.category)
                if not safety.passed:
                    print(f"   ⚠️ 安全检查未通过 (score={safety.score}): {safety.issues}")
                    await send_ws({
                        "type": "comment",
                        "name": "🧠 AI Engine",
                        "avatar": "🧠",
                        "text": f"⚠️ 生成内容未通过安全检查，使用兜底事件"
                    })
                    continue

                print(f"   ✅ 生成成功 (safety_score={safety.score})")
                print(f"   类型: {result.get('type', 'unknown')}")

                # 广播采纳通知（自见 → 全场）
                await send_ws({
                    "type": "comment_adopted",
                    "authorUid": pick.username,  # 简化：用 username 匹配
                    "data": {
                        "text": f"你的创意被采纳了！",
                        "detail": f"「{pick.raw_text}」正在融入游戏世界...",
                        "banner": {
                            "big": True,
                            "icon": "✨",
                            "html": f"<b>@{pick.username}</b> 的创意生效了！「{result.get('title', pick.raw_text)}」"
                        },
                        "delay": 3000
                    }
                })

                # 广播生成结果给主播端渲染
                await send_ws({
                    "type": "host_action",
                    "action": "ai_generated",
                    "data": {
                        "source_user": pick.username,
                        "source_text": pick.raw_text,
                        "category": pick.classify_result.category,
                        "generated": result,
                    }
                })

        except Exception as e:
            print(f"   ❌ 生成失败: {e}")
            await send_ws({
                "type": "comment",
                "name": "🧠 AI Engine",
                "avatar": "🧠",
                "text": f"⚠️ AI 生成遇到问题，使用兜底剧情"
            })


async def send_ws(msg):
    """发送消息到 ws-server"""
    global ws_connection
    if ws_connection and ws_connection.state.name == 'OPEN':
        try:
            await ws_connection.send(json.dumps(msg))
        except:
            pass


async def main():
    print("🧠 ============================================")
    print("🧠  WASTELAND LIVE — AI Bridge")
    print(f"🧠  评论窗口: {WINDOW_SECONDS}s")
    print(f"🧠  API Key: {os.environ.get('ANTHROPIC_API_KEY', 'NOT SET')[:20]}...")
    print("🧠 ============================================\n")

    ws = await connect()

    # 并行运行：监听消息 + 30s 生成循环
    await asyncio.gather(
        listen(ws),
        generation_loop(),
    )


if __name__ == "__main__":
    asyncio.run(main())
