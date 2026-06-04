"""
WorldFilter — 世界观裁定 + 平衡性校验模块
位于分类器和生成器之间，决定评论该如何被"翻译"成游戏内容。

核心原则：永远不拒绝，只转译。保留玩家创意意图，但约束在世界观和平衡性内。

转译策略：
- PASS:       直接通过，无需修改
- NERF:       保留概念，削弱威力（末日机甲 → 破烂外骨骼支架）
- LOCALIZE:   保留氛围，替换为世界观内等价物（穿越火星 → 发现NASA密封实验舱）
- CORRUPT:    东西存在但被AI损坏/改造（激光枪 → 损坏的激光笔）
- COMEDIC:    用黑色幽默消解荒谬（核弹 → 一个写着"核弹"的午餐盒）
- TWIST:      接受但加反转后果（永生药 → 喝了后不老但失去味觉）
"""

import os
import json
from typing import Optional
import anthropic

MODEL = os.environ.get("GAME_MODEL", "claude-haiku-4-5-20251001")

_client: Optional[anthropic.Anthropic] = None

def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic()
    return _client


# ============================================================
# 裁定 Prompt
# ============================================================

FILTER_SYSTEM = """You are the world-consistency and balance guardian for an AI apocalypse survival game.

WORLD RULES:
- Setting: Near-future post-AI-apocalypse. AI eliminated 99.99% of humans who didn't say "thank you."
- Tech level: Current-day tech, most hijacked by AI. Jury-rigged solutions common. NO magic, NO aliens, NO supernatural, NO space travel, NO time travel, NO godlike powers.
- Tone: Dark humor. Grim but absurd.
- Power ceiling: A single item/event should NEVER swing any stat by more than ±30. No instant-win items. No full-heal items.

REINTERPRETATION STRATEGIES (pick the most entertaining one):
- PASS: Fits world + balanced. Use as-is.
- NERF: Cool concept but too powerful. Keep the idea, drastically reduce power. E.g., "末日机甲" → "一副用汽车零件焊的破烂外骨骼，左臂还漏油"
- LOCALIZE: Concept doesn't exist in this world, but the VIBE can be mapped. E.g., "穿越火星" → "发现一个密封的NASA实验舱模型，里面有个假人在对你笑"
- CORRUPT: The thing exists but AI has corrupted/damaged it. E.g., "超级电脑" → "一台还在运转的服务器，但它只会反复打印'请说谢谢'"
- COMEDIC: Too absurd to take seriously, lean into the joke. E.g., "核弹" → "一个写着'核弹'的午餐盒，里面是过期三明治"
- TWIST: Accept it but add an ironic consequence. E.g., "永生药水" → "一瓶标注'永恒'的饮料，喝了不会死但永远失去味觉"

TASK: Evaluate a viewer comment that will be used to generate game content. Output valid JSON only:

{
  "strategy": "PASS|NERF|LOCALIZE|CORRUPT|COMEDIC|TWIST",
  "original_intent": "what the viewer probably wanted (1 sentence)",
  "reinterpreted_prompt": "the actual prompt to feed into the content generator (1-2 sentences, stays in-world, entertaining)",
  "balance_notes": "why this reinterpretation is balanced (max stat impact, trade-offs)",
  "entertainment_value": "why this will be fun for the audience (1 sentence)"
}"""

FILTER_USER = """
CURRENT GAME STATE:
- Day: {day}/7
- Player stats: HP={hp}, Hunger={hunger}, Sanity={sanity}
- Current phase: {phase}
- Location: {location}

COMMENT: "{comment}" by @{username}
CLASSIFIED AS: {category}

Evaluate and reinterpret if needed."""


# ============================================================
# 裁定接口
# ============================================================

def filter_comment(
    comment: str,
    username: str,
    category: str,
    day: int = 1,
    hp: int = 100,
    hunger: int = 80,
    sanity: int = 90,
    phase: str = "explore",
    location: str = "避难所",
) -> dict:
    """
    对已分类的评论进行世界观裁定和平衡性校验。

    Returns:
        {
            "strategy": "PASS|NERF|LOCALIZE|CORRUPT|COMEDIC|TWIST",
            "original_intent": str,
            "reinterpreted_prompt": str,  # 传给 generator 的实际 prompt
            "balance_notes": str,
            "entertainment_value": str,
        }
    """
    user_prompt = FILTER_USER.format(
        day=day, hp=hp, hunger=hunger, sanity=sanity,
        phase=phase, location=location,
        comment=comment, username=username, category=category,
    )

    client = _get_client()
    resp = client.messages.create(
        model=MODEL,
        max_tokens=500,
        system=FILTER_SYSTEM,
        messages=[{"role": "user", "content": user_prompt}],
    )

    raw = resp.content[0].text.strip()

    # JSON 提取
    start = raw.find("{")
    end = raw.rfind("}")
    if start != -1 and end != -1:
        raw = raw[start:end + 1]

    import re
    raw = re.sub(r',\s*}', '}', raw)
    raw = re.sub(r',\s*]', ']', raw)

    return json.loads(raw.strip())
