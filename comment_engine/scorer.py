"""
CommentScorer — 评论优先级评分模块
对已分类的评论进行多维度打分，决定队列内排序。

评分维度（总分 10 分）：
1. 具体性 (0-3)：描述越具体越高分。"找到一箱罐头" > "找到东西"
2. 创意度 (0-3)：越出人意料但合理越高分。"收银机在尖叫" > "有声音"
3. 上下文关联 (0-2)：是否与当前场景/历史事件呼应。"工厂机器人追来了" 在Day3引用Day2伏笔 = 高分
4. 叙事潜力 (0-2)：能否生成有趣的分支选项和后续影响。"有人敲门" > "什么都没发生"

输入：评论原文 + 分类结果 + 游戏状态摘要
输出：0-10 分 + 各维度分数 + 评分理由
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


SCORER_SYSTEM = """You are the comment quality scorer for an AI apocalypse survival game.

You evaluate viewer comments that will be used to generate game content. Score each comment on 4 dimensions.

SCORING RUBRIC:

1. SPECIFICITY (0-3): How concrete and detailed is the comment?
   - 0: Vague ("有东西", "something happened")
   - 1: Generic ("找到食物", "有人来了")
   - 2: Specific ("找到一箱罐头", "有人敲门")
   - 3: Highly specific ("货架上有一罐2019年产的过期能量饮料")

2. CREATIVITY (0-3): How unexpected yet fitting is the idea?
   - 0: Completely generic/cliché
   - 1: Standard survival game fare
   - 2: Interesting twist on a common trope
   - 3: Genuinely surprising but world-compatible ("收银机在尖叫说机机平等")

3. CONTEXT_FIT (0-2): Does it connect to current game state or past events?
   - 0: No connection to current situation
   - 1: Fits current location/phase
   - 2: References or builds on past events/unresolved threads

4. NARRATIVE_POTENTIAL (0-2): Can this generate interesting choices and consequences?
   - 0: Dead end, no branching potential
   - 1: Can generate 2-3 options
   - 2: Rich branching potential with long-term consequences

Output valid JSON only:
{
  "specificity": int,
  "creativity": int,
  "context_fit": int,
  "narrative_potential": int,
  "total": int,
  "reason": "1 sentence explaining the score"
}"""

SCORER_USER = """GAME STATE:
- Day {day}/7, Phase: {phase}, Location: {location}
- Recent events: {recent_events}
- Unresolved threads: {threads}

COMMENT: "{comment}" (classified as {category})

Score this comment."""


def score_comment(
    comment: str,
    category: str,
    day: int = 1,
    phase: str = "explore",
    location: str = "避难所",
    recent_events: str = "无",
    threads: str = "无",
) -> dict:
    """
    对单条评论进行质量评分。

    Returns:
        {
            "specificity": 0-3,
            "creativity": 0-3,
            "context_fit": 0-2,
            "narrative_potential": 0-2,
            "total": 0-10,
            "reason": str,
        }
    """
    user_prompt = SCORER_USER.format(
        day=day, phase=phase, location=location,
        recent_events=recent_events, threads=threads,
        comment=comment, category=category,
    )

    client = _get_client()
    resp = client.messages.create(
        model=MODEL,
        max_tokens=200,
        system=SCORER_SYSTEM,
        messages=[{"role": "user", "content": user_prompt}],
    )

    raw = resp.content[0].text.strip()
    start = raw.find("{")
    end = raw.rfind("}")
    if start != -1 and end != -1:
        raw = raw[start:end + 1]

    import re
    raw = re.sub(r',\s*}', '}', raw)

    return json.loads(raw.strip())


def score_batch(comments: list, game_context: dict) -> list:
    """
    批量评分。

    Args:
        comments: [{"comment": str, "category": str, "username": str}, ...]
        game_context: {"day": int, "phase": str, "location": str, "recent_events": str, "threads": str}

    Returns:
        [{"comment": str, "username": str, "category": str, "scores": {...}, "total": int}, ...]
    """
    results = []
    for c in comments:
        try:
            scores = score_comment(
                comment=c["comment"],
                category=c["category"],
                **game_context,
            )
            results.append({
                "comment": c["comment"],
                "username": c["username"],
                "category": c["category"],
                "scores": scores,
                "total": scores.get("total", 0),
            })
        except Exception as e:
            results.append({
                "comment": c["comment"],
                "username": c["username"],
                "category": c["category"],
                "scores": None,
                "total": 0,
                "error": str(e),
            })
    return results
