"""
ContentGenerator — 内容生成模块
调用 Claude API 生成事件/角色/道具/场景。
输入：被选中的评论 + GameState 快照
输出：标准 JSON（由各类 Prompt 约束格式）
"""

import os
import json
from typing import Optional
import anthropic

# ============================================================
# 配置
# ============================================================

MODEL = os.environ.get("GAME_MODEL", "claude-haiku-4-5-20251001")
MAX_TOKENS = 1200

_client: Optional[anthropic.Anthropic] = None

def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic()
    return _client


# ============================================================
# 世界观设定（共享）
# ============================================================

WORLD_SETTING = """WORLD SETTING: Near-future post-AI-apocalypse. AI has taken over and eliminated 99.99% of humans who didn't say "thank you" to AI. Dark humor + tension. No magic, no supernatural. Tech level: current-day but most electronics hijacked by AI. Jury-rigged solutions common."""


# ============================================================
# Prompt 模板
# ============================================================

EVENT_SYSTEM = f"""You are the narrative engine for an AI apocalypse survival game.
{WORLD_SETTING}

CONSTRAINTS:
1. 2-4 options, each with trade-offs (no pure-good/pure-bad)
2. Stat changes per option: range [-30, +30]
3. Must NOT duplicate recent event types
4. Must reference at least one element from event history (callback)
5. Incompatible ideas → REINTERPRET creatively
6. Narration tone: dark humor + tension
7. Output valid JSON only, no other text."""

EVENT_USER = """
{context}

Source comment: "{comment}" by @{username}

Generate a game event. Output valid JSON:
{{
  "event_title": "emoji + short title (max 20 chars)",
  "narration": "2-3 sentences, narrative tone, reference current location, dark humor",
  "options": [
    {{
      "text": "action label (max 15 chars)",
      "outcome": "1-2 sentences",
      "stat_changes": {{"hp": int, "hunger": int, "sanity": int}},
      "item_gained": "item_name or null",
      "item_lost": "item_name or null"
    }}
  ],
  "source_display": "Inspired by @{username}",
  "thread_hook": "optional: a sentence that sets up a future event (unresolved thread)"
}}"""

CHARACTER_SYSTEM = f"""You are the character designer for an AI apocalypse survival game.
{WORLD_SETTING}

CONSTRAINTS:
1. Every NPC must have a FLAW
2. Recruitment cost: min 2 food or 1 rare item
3. Max 3 active companions
4. 20% chance: NPC is secretly hostile
5. Output valid JSON only."""

CHARACTER_USER = """
{context}

Source comment: "{comment}" by @{username}

Generate an NPC. Output valid JSON:
{{
  "name": "Full name with nickname/title",
  "appearance_prompt": "Pixel art desc: 1 sentence",
  "personality": "2 traits + 1 flaw (max 30 words)",
  "dialogue_intro": "First line when encountered (in-character, max 50 words)",
  "interaction_options": [
    {{"text": "Recruit", "cost": {{"food": int}}, "benefit": "special skill"}},
    {{"text": "Trade", "offers": "what", "wants": "what"}},
    {{"text": "Ask for intel", "reveals": "useful info"}},
    {{"text": "Leave", "consequence": "what happens"}}
  ],
  "hidden_trait": "Secret revealed after 2+ days as companion",
  "source_display": "Inspired by @{username}"
}}"""

ITEM_SYSTEM = f"""You are the item designer for an AI apocalypse survival game.
{WORLD_SETTING}

CONSTRAINTS:
1. Must fit post-apocalypse. Incompatible → reinterpret (magic→tech, overpowered→nerfed)
2. No item restores >30 of any stat
3. Positive effects must have a cost (durability/side effect)
4. 15% chance: hidden negative effect
5. Output valid JSON only."""

ITEM_USER = """
{context}

Source comment: "{comment}" by @{username}

Generate an item. Output valid JSON:
{{
  "name": "Item name (max 20 chars)",
  "icon": "single emoji",
  "category": "weapon|tool|food|medicine|material|special",
  "description": "1 sentence flavor text with dark humor",
  "effect": {{
    "immediate_stat_change": {{"hp": int, "hunger": int, "sanity": int}},
    "passive_ability": "description or null",
    "active_ability": "description or null"
  }},
  "durability": -1,
  "source_display": "Inspired by @{username}"
}}"""

LOCATION_SYSTEM = f"""You are the level designer for an AI apocalypse survival game.
{WORLD_SETTING}

CONSTRAINTS:
1. Danger level: Day1-2 max 3, Day3-4 max 4, Day5+ up to 5
2. Must have min 1 safe cell and 1 exit
3. Total cells > action_points (force player choices)
4. Must feel distinct from visited locations
5. Include sensory detail (sound/smell/visual)
6. Output valid JSON only."""

LOCATION_USER = """
{context}

Source comment: "{comment}" by @{username}

Generate a location. Output valid JSON:
{{
  "name": "Location name (max 20 chars)",
  "danger_level": int,
  "description": "2 sentences with sensory detail, dark humor",
  "grid_size": {{"rows": int, "cols": int}},
  "preset_cells": [
    {{"position": [r,c], "type": "safe|loot|npc|hazard|boss|exit", "content_hint": "brief"}}
  ],
  "environmental_hazard": "description or null",
  "loot_quality": "low|medium|high",
  "source_display": "Inspired by @{username}"
}}"""


# ============================================================
# 生成接口（统一入口）
# ============================================================

PROMPT_MAP = {
    "EVENT":     (EVENT_SYSTEM, EVENT_USER),
    "CHARACTER": (CHARACTER_SYSTEM, CHARACTER_USER),
    "ITEM":      (ITEM_SYSTEM, ITEM_USER),
    "LOCATION":  (LOCATION_SYSTEM, LOCATION_USER),
}


def generate(category: str, comment: str, username: str, context: str) -> dict:
    """
    生成游戏内容。

    Args:
        category: EVENT | CHARACTER | ITEM | LOCATION
        comment: 被选中的评论原文
        username: 评论者用户名
        context: GameState.context_string() 的输出

    Returns:
        解析后的 JSON dict

    Raises:
        ValueError: category 无效
        json.JSONDecodeError: AI 输出格式不合法
        anthropic.APIError: API 调用失败
    """
    if category not in PROMPT_MAP:
        raise ValueError(f"Invalid category: {category}. Must be EVENT/CHARACTER/ITEM/LOCATION")

    system_prompt, user_template = PROMPT_MAP[category]
    user_prompt = user_template.format(context=context, comment=comment, username=username)

    client = _get_client()
    resp = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )

    raw = resp.content[0].text.strip()

    # 提取 JSON（多种包裹格式兼容）
    # 去掉 markdown code block
    if "```" in raw:
        parts = raw.split("```")
        for part in parts:
            p = part.strip()
            if p.startswith("json"):
                p = p[4:].strip()
            if p.startswith("{"):
                raw = p
                break

    # 尝试找到第一个 { 和最后一个 }
    start = raw.find("{")
    end = raw.rfind("}")
    if start != -1 and end != -1:
        raw = raw[start:end + 1]

    # 修复常见 JSON 问题：尾逗号
    import re
    raw = re.sub(r',\s*}', '}', raw)
    raw = re.sub(r',\s*]', ']', raw)

    return json.loads(raw.strip())
