# WASTELAND LIVE — API Reference

## Endpoints Overview

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/api/comment` | POST | Submit a viewer comment for AI processing |
| `/api/state` | GET | Get current game state |
| `wss://` | WebSocket | Real-time bidirectional communication |

## Base URLs

| Environment | HTTP | WebSocket |
|-------------|------|-----------|
| Production | `https://wasteland-live-ws.onrender.com` | `wss://wasteland-live-ws.onrender.com` |
| Local | `http://localhost:3002` | `ws://localhost:3002` |

## Frontend URLs

| Page | URL |
|------|-----|
| Host (streamer) | `https://ai-game-jam.vercel.app/wasteland/WASTELAND%20LIVE.html` |
| Viewer (audience) | `https://ai-game-jam.vercel.app/wasteland/WASTELAND%20LIVE%20(Viewer).html` |

---

## HTTP API

### POST /api/comment

Submit a comment that will be processed by the AI engine in the next generation cycle (~10s).

**Request Body:**

```json
{
  "text": "string (required) — comment content",
  "name": "string (optional, default: '外部调用') — display name",
  "avatar": "string (optional, default: '🔌') — emoji avatar"
}
```

**Response (200):**

```json
{
  "ok": true,
  "message": "Comment sent, AI will process in next cycle"
}
```

**Response (400):**

```json
{ "error": "text is required" }
```

**Example:**

```bash
curl -X POST https://wasteland-live-ws.onrender.com/api/comment \
  -H "Content-Type: application/json" \
  -d '{"text": "门口出现一只机械犬", "name": "测试员", "avatar": "🤖"}'
```

**Processing Flow:**
1. Comment is broadcast to all connected clients (host + viewers)
2. Bridge (AI engine) classifies the comment into one of 5 categories: `EVENT / CHARACTER / ITEM / LOCATION / IRRELEVANT`
3. Every ~10s, the engine picks the best comment from its pool and generates game content via Claude API
4. Generated content is pushed to the host as a decision card (game_event)

---

### GET /api/state

Get the current game state snapshot.

**Response (200):**

```json
{
  "ok": true,
  "state": { ... },
  "viewers": 3,
  "hostConnected": true
}
```

- `state` — latest game state object (may be `null` if no state has been broadcast yet)
- `viewers` — number of connected viewer WebSockets
- `hostConnected` — whether the host client is connected

---

### GET /

Health check endpoint.

**Response (200):** `WASTELAND LIVE WS Server OK` (text/plain)

---

## WebSocket Protocol

Connect via WebSocket and exchange JSON messages. All messages have a `type` field.

### Connection

```javascript
const ws = new WebSocket('wss://wasteland-live-ws.onrender.com');
```

### Step 1: Register

After connecting, send a register message to identify your role:

```json
{
  "type": "register",
  "role": "viewer",
  "uid": "unique_id",
  "name": "Display Name",
  "avatar": "🦊"
}
```

- `role`: `"host"` (only one allowed) or `"viewer"`
- `uid`: unique identifier; auto-generated if omitted
- Viewers receive the latest `state_sync` upon registration

### Client → Server Messages

| type | role | description |
|------|------|-------------|
| `register` | any | Register as host or viewer |
| `comment` | viewer | Send a comment: `{ type, text, name, avatar }` |
| `host_action` | host | Host action: `{ type, action, data }` |
| `game_state` | host | Broadcast full state: `{ type, data: {...} }` |
| `banner` | any | Show a banner overlay: `{ type, data }` |
| `comment_adopted` | engine | Notify comment was adopted: `{ type, authorUid, data }` |
| `system_msg` | engine | System message: `{ type, name, avatar, text }` |
| `comment_feedback` | engine | Feedback on comment classification: `{ type, uid, category, accepted?, reason? }` |
| `game_event` | engine | AI-generated game event: `{ type, data }` |
| `choice_result` | engine | Result of host's choice: `{ type, data }` |
| `action_result` | engine | Result of host's free action: `{ type, data }` |
| `game_end` | host | Game over: `{ type, data }` |

### Server → Client Messages

| type | sent to | description |
|------|---------|-------------|
| `state_sync` | viewers | Full state snapshot (on join + periodic heartbeat) |
| `viewer_comment` | host | A viewer sent a comment |
| `viewer_join` | host | A viewer joined: `{ uid, name, avatar, viewerCount }` |
| `viewer_leave` | host | A viewer left: `{ uid, viewerCount }` |
| `new_comment` | all | New comment broadcast |
| `host_action` | viewers | Host performed an action |
| `banner` | all | Banner overlay |
| `comment_feedback` | all | Comment classification feedback |
| `comment_adopted` | all | Comment was adopted by AI |
| `self_notify` | author | Private notification to the comment author |
| `system_msg` | all | AI Engine system message |
| `game_event` | all | AI-generated event with decision card |
| `choice_result` | all | Host's choice outcome |
| `action_result` | all | Host's free action outcome |
| `game_end` | all | Game over |

---

## game_event Data Structure

The most important message type. Sent when the AI engine generates content from a viewer comment.

```json
{
  "type": "game_event",
  "data": {
    "final_category": "EVENT | CHARACTER | ITEM | LOCATION",
    "narrative": "A mysterious mechanical dog appears at your door...",
    "stat_changes": { "hp": 0, "hunger": 0, "thirst": 0, "sanity": -5 },
    "inventory_change": { "remove_items": [], "add_items": [] },
    "options": [
      { "label": "Approach carefully", "sub": "hp-5, sanity+10" },
      { "label": "Drive it away", "sub": "sanity-5" },
      { "label": "Ignore it", "sub": "" }
    ],
    "source_user": "viewer_nickname",
    "event_title": "Mechanical Dog",
    "danger_level": "medium"
  }
}
```

### Category Behavior

| final_category | Frontend behavior |
|----------------|-------------------|
| `EVENT` | Shows decision card with options; host must choose |
| `CHARACTER` | Shows NPC encounter card with interaction options |
| `ITEM` | Shows item card with use/keep/discard options |
| `LOCATION` | Adds a new destination to the map selection screen |

---

## Comment Classification Categories

When a comment is submitted, it's classified into one of these categories:

| Category | Description | Example |
|----------|-------------|---------|
| `EVENT` | Triggers an in-game event | "地震了" "发现密室" |
| `CHARACTER` | Introduces an NPC/companion | "遇到机械犬" "出现神秘商人" |
| `ITEM` | Creates a new item | "捡到激光枪" "发现罐头" |
| `LOCATION` | Adds a new explorable location | "去游乐园" "探索核电站" |
| `IRRELEVANT` | Chat/off-topic (not processed) | "主播好帅" "666" |

---

## Architecture

```
Viewer Browser ──┐
                 │  WebSocket
Viewer Browser ──┼──────────→ ws-server.js (:3002)
                 │               │
Host Browser ────┘               │
                                 ↓
                            bridge.py (AI Engine)
                                 │
                    ┌────────────┼────────────┐
                    ↓            ↓            ↓
              classifier.py  generator.py  phase2_engine.py
              (rule-based)   (Claude API)  (FastAPI :8000)
```

- **ws-server.js** — WebSocket hub + HTTP API, routes messages between host/viewers/engine
- **bridge.py** — Connects as a viewer, monitors comments, runs AI pipeline every ~10s
- **classifier.py** — Rule-based 5-category comment classifier (~1ms)
- **generator.py** — Claude API content generation (~4.5s)
- **phase2_engine.py** — FastAPI service for narrative + stat changes with Harness Guardian

---

## Rate Limits & Timing

- Comment processing cycle: **~10 seconds**
- Only the **top 1 comment per category** is processed per cycle
- Comments are pooled in a **30-second sliding window**
- Claude API calls: ~4.5s (Phase 1) + ~3.5s (Phase 2 on choice)
- Heartbeat state sync: every **5 seconds**
