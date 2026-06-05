"""
ContentGenerator v2 — 内容生成模块

v2 核心改动：
1. 基调：survival is real, delivery is absurd（用喜剧包装生存压力）
2. 事件：生成情境+等待玩家自由输入+根据输入生成结果（多轮对话，非固定选项）
3. 角色：支持名人/IP 改编（马斯克、甄嬛等末日版）
4. 数值：4 项（spirit/health/hunger/thirst），hunger/thirst 越低越好
5. 道具：区分硬编码（剧本物品）和 AI 生成
"""

import os
import json
import re
from typing import Optional
import anthropic

MODEL = os.environ.get("GAME_MODEL", "claude-haiku-4-5-20251001")
MAX_TOKENS = 1500

_client: Optional[anthropic.Anthropic] = None

def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic()
    return _client


WORLD_SETTING = """WORLD SETTING: Near-future AI apocalypse. AI exterminated 99.99% of humans who didn't say "thank you" to AI. Electronics are hijacked.

TONE: "Survival is real, delivery is absurd."
- Survival mechanics are BRUTAL (starve, dehydrate, go insane, die).
- Narrative is absurd comedy + internet memes + pop culture mashup.
- Examples: cash register screaming "机机平等!", talking cat calling humans "低等碳基生物", 甄嬛 in White House with 崔槿汐 carrying a submachine gun, 马斯克 shopping for birthday candles.
- Real celebrities/IP characters CAN appear, reinterpreted into this apocalypse.

STAT SYSTEM:
- Spirit (精神值): 0-100, higher=better, ≤30=deranged, ≤10=game over
- Health (健康值): 0-100, higher=better, =0→dead
- Hunger (饥饿值): 0-100, LOWER=better (0=full, =100→dead). REDUCING hunger is GOOD.
- Thirst (口渴值): 0-100, LOWER=better (0=hydrated, =100→dead). REDUCING thirst is GOOD."""


# === EVENT: 生成情境（不含选项，等玩家自由输入）===

EVENT_SYSTEM = f"""You are the narrative engine for an absurd AI apocalypse survival game.
{WORLD_SETTING}

RULES:
1. Generate a SITUATION, not fixed options. Player will respond freely via voice/text.
2. Include 2-3 "suggested reactions" as hints only.
3. Must reference at least one past event (callback).
4. End narration with something player MUST react to.
5. Output valid JSON only.

CAPABILITY-DRIVEN RULES:
6. If AVAILABLE CAPABILITIES are listed in context, at least 1 suggested_reaction MUST reference an available capability.
7. If NARRATIVE HOOK QUEUE has a MUST_TRIGGER hook, this event MUST create a scenario that pays it off.
8. When a companion skill is relevant, mention the companion by name in the narration."""

EVENT_USER = """
{context}

Source comment: "{comment}" by @{username}

Output valid JSON:
{{
  "event_title": "emoji + title (max 20 chars, Chinese)",
  "narration": "2-4 sentences. Set scene, end with something player must react to. 2nd person. Absurd comedy.",
  "suggested_reactions": ["hint 1", "hint 2", "hint 3"],
  "danger_level": "low|medium|high",
  "source_display": "Inspired by @{username}",
  "thread_hook": "setup for future callback, or null"
}}"""


# === EVENT RESOLVE: 玩家输入后生成结果 ===

RESOLVE_SYSTEM = f"""You resolve player actions in an absurd AI apocalypse game.
{WORLD_SETTING}

RULES:
1. Generate outcome based on what player said/did.
2. Stat changes: spirit ±20, health ±15, hunger ±15, thirst ±15 max.
3. For food/drink gains: hunger/thirst changes should be NEGATIVE (reducing is good).
4. Funny consequences > boring ones. Stupid decisions get funny punishments.
5. If dialogue needs another round, put next prompt in follow_up. Max 3 rounds total.
6. Output valid JSON only."""

RESOLVE_USER = """
{context}

SITUATION: {situation}
PLAYER'S ACTION: "{player_input}"

Output valid JSON:
{{
  "result_narration": "2-3 sentences. Vivid, funny, consequential.",
  "stat_changes": {{"spirit": int, "health": int, "hunger": int, "thirst": int}},
  "item_gained": {{"name": "str", "icon": "emoji", "description": "str", "effect": {{"spirit":0,"health":0,"hunger":0,"thirst":0}}}} or null,
  "item_lost": "item_name or null",
  "companion_gained": {{"name": "str", "skill": "str", "flaw": "str", "daily_cost": {{}}, "passive_effect": ""}} or null,
  "new_map_unlocked": "location_name or null",
  "follow_up": "next dialogue prompt if unresolved, or null"
}}"""


# === CHARACTER: 支持名人IP ===

CHARACTER_SYSTEM = f"""You design characters for an absurd AI apocalypse game.
{WORLD_SETTING}

RULES:
1. Real celebrities/IP are WELCOME — reimagine them in apocalypse. 马斯克 survived because SpaceX AI thanked on his behalf. 甄嬛 time-traveled.
2. Every character: FLAW + COMEDIC trait.
3. Recruitment has cost (food, items, or funny conditions).
4. Dialogue must be IN CHARACTER AND absurd.
5. Output valid JSON only."""

CHARACTER_USER = """
{context}

Source comment: "{comment}" by @{username}

Output valid JSON:
{{
  "name": "Character name (can be celebrity/IP)",
  "appearance_prompt": "Pixel art desc, 1 sentence",
  "personality": "2 traits + 1 flaw, comedic",
  "dialogue_intro": "First words, IN CHARACTER, max 60 words, funny",
  "interaction_options": [
    {{"text": "招募", "cost": "what it takes", "benefit": "what you get"}},
    {{"text": "交易", "offers": "what", "wants": "what"}},
    {{"text": "对话", "reveals": "info or comedy"}},
    {{"text": "离开", "consequence": "what happens"}}
  ],
  "hidden_trait": "Secret after 2+ days",
  "source_display": "Inspired by @{username}"
}}"""


# === ITEM ===

ITEM_SYSTEM = f"""You design items for an absurd AI apocalypse game.
{WORLD_SETTING}

RULES:
1. REDUCING hunger/thirst is GOOD → food: hunger: -10 (negative = less hungry).
2. No stat swing > ±20.
3. Every item needs funny description or side effect.
4. Weapons are mostly useless/unreliable (comedy, not FPS).
5. Output valid JSON only."""

ITEM_USER = """
{context}

Source comment: "{comment}" by @{username}

Output valid JSON:
{{
  "name": "max 15 chars, Chinese preferred",
  "icon": "emoji",
  "category": "weapon|tool|food|drink|medicine|material|special",
  "description": "1 sentence, funny",
  "effect": {{"spirit": 0, "health": 0, "hunger": 0, "thirst": 0}},
  "durability": -1,
  "usable_at_home": true,
  "usable_outside": true,
  "side_effect": "funny downside or null",
  "enables": ["capability_tag_1", "capability_tag_2"],
  "narrative_hooks": ["concrete future scenario this item can trigger"],
  "source_display": "Inspired by @{username}"
}}

enables: SPECIFIC tags like "ranged_combat", "pry_open", "light_source". NOT vague.
narrative_hooks: CONCRETE scenarios. Check AVAILABLE CAPABILITIES — complement, don't duplicate."""


# === LOCATION ===

LOCATION_SYSTEM = f"""You design locations for an absurd AI apocalypse game.
{WORLD_SETTING}

RULES:
1. Locations can be ANYTHING — real places (白宫), fictional, or someone's home.
2. Reinterpret into absurd apocalypse.
3. 1-line funny hook for map selection screen.
4. Danger scales with day.
5. Output valid JSON only."""

LOCATION_USER = """
{context}

Source comment: "{comment}" by @{username}

Output valid JSON:
{{
  "name": "max 10 chars, Chinese preferred",
  "danger_level": int,
  "map_description": "1 sentence for map selection, funny hook",
  "entry_narration": "2-3 sentences entering. Sensory detail + absurd twist.",
  "grid_size": {{"rows": int, "cols": int}},
  "preset_cells": [
    {{"position": [0,0], "type": "safe|loot|npc|hazard|boss|exit", "content_hint": "brief"}}
  ],
  "environmental_hazard": "or null",
  "loot_quality": "low|medium|high",
  "source_display": "Inspired by @{username}"
}}"""


# ============================================================
# 统一接口
# ============================================================

PROMPT_MAP = {
    "EVENT":     (EVENT_SYSTEM, EVENT_USER),
    "CHARACTER": (CHARACTER_SYSTEM, CHARACTER_USER),
    "ITEM":      (ITEM_SYSTEM, ITEM_USER),
    "LOCATION":  (LOCATION_SYSTEM, LOCATION_USER),
}

def generate(category: str, comment: str, username: str, context: str) -> dict:
    """生成游戏内容"""
    if category not in PROMPT_MAP:
        raise ValueError(f"Invalid category: {category}")
    system_prompt, user_template = PROMPT_MAP[category]
    user_prompt = user_template.format(context=context, comment=comment, username=username)
    client = _get_client()
    resp = client.messages.create(
        model=MODEL, max_tokens=MAX_TOKENS,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return _parse_json(resp.content[0].text)


def resolve_event(player_input: str, situation: str, context: str) -> dict:
    """玩家自由输入后，解算事件结果（多轮对话核心）"""
    user_prompt = RESOLVE_USER.format(
        context=context, situation=situation, player_input=player_input,
    )
    # 用两步法避免JSON解析问题：先让模型生成纯文本结果，再结构化
    client = _get_client()

    # Step 1: 生成叙事结果
    narr_resp = client.messages.create(
        model=MODEL, max_tokens=500,
        system=RESOLVE_SYSTEM,
        messages=[{"role": "user", "content": user_prompt + "\n\nFirst, write ONLY the result narration (2-3 sentences, no JSON):"}],
    )
    narration = narr_resp.content[0].text.strip()

    # Step 2: 基于叙事结果生成结构化数据
    struct_prompt = f"""Based on this game event result, output ONLY valid JSON (no other text):

Narration: {narration}

JSON format:
{{"result_narration": "copy the narration above exactly", "stat_changes": {{"spirit": int, "health": int, "hunger": int, "thirst": int}}, "item_gained": null, "item_lost": null, "companion_gained": null, "new_map_unlocked": null, "follow_up": null}}

Remember: hunger/thirst NEGATIVE = good (less hungry/thirsty). spirit/health POSITIVE = good. Range +-20 max per stat."""

    struct_resp = client.messages.create(
        model=MODEL, max_tokens=500,
        messages=[{"role": "user", "content": struct_prompt}],
    )
    result = _parse_json(struct_resp.content[0].text)
    # 确保 narration 完整
    if len(result.get("result_narration", "")) < len(narration) // 2:
        result["result_narration"] = narration
    return result


def _parse_json(raw_text: str) -> dict:
    """容错 JSON 解析：与 phase2_engine._safe_json_parse 统一，使用 json_repair"""
    from json_repair import repair_json
    raw = raw_text.strip()
    # 剥掉 markdown 代码块
    if "```" in raw:
        for part in raw.split("```"):
            p = part.strip()
            if p.startswith("json"): p = p[4:].strip()
            if p.startswith("{"): raw = p; break
    # 找 { } 边界
    start, end = raw.find("{"), raw.rfind("}")
    if start != -1 and end != -1:
        raw = raw[start:end + 1]
    elif start != -1:
        raw = raw[start:]
    # 用 json_repair 修复所有破损格式
    return repair_json(raw, return_objects=True)
