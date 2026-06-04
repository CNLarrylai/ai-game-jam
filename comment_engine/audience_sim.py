"""
AudienceSim — AI 观众模拟器
模拟直播间观众群体，生成不同性格的观众评论。

两种模式：
1. 自主评论：基于当前游戏状态，AI观众主动发表看法/建议
2. 回应评论：对真人评论或游戏事件做出反应（附和/反对/接梗/起哄）

设计原则：
- 每个AI观众有固定性格，行为一致
- 评论风格模拟真实直播间（短句、口语化、带emoji）
- 有效评论（能触发生成的）占比 ~30%，其余是氛围评论
"""

import os
import json
import random
from typing import List, Optional
import anthropic

MODEL = os.environ.get("GAME_MODEL", "claude-haiku-4-5-20251001")

_client: Optional[anthropic.Anthropic] = None

def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic()
    return _client


# ============================================================
# 预设观众人格
# ============================================================

AUDIENCE_PERSONAS = [
    {
        "name": "勇敢的阿坤",
        "personality": "冲动冒险型，永远选最危险的选项",
        "style": "短句+感叹号多，爱用💪🔥",
        "tendency": "aggressive",  # 倾向产生 EVENT/ITEM(weapon) 评论
    },
    {
        "name": "谨慎的小鱼",
        "personality": "胆小谨慎型，什么都觉得危险",
        "style": "带问号多，经常说别去/小心/不要",
        "tendency": "cautious",
    },
    {
        "name": "脑洞王老六",
        "personality": "创意鬼才，专门说离谱但好玩的东西",
        "style": "天马行空，经常造新概念",
        "tendency": "creative",  # 倾向产生高创意度评论
    },
    {
        "name": "吃瓜群众阿伟",
        "personality": "纯看热闹，喜欢起哄和玩梗",
        "style": "哈哈哈/666/草 多，偶尔冒出金句",
        "tendency": "spectator",  # 大部分是氛围评论
    },
    {
        "name": "攻略大佬Ace",
        "personality": "理性分析型，总在算数值和最优解",
        "style": "用数字说话，经常说建议/应该/最优",
        "tendency": "strategic",  # 倾向产生 ITEM/LOCATION 评论
    },
    {
        "name": "故事迷Luna",
        "personality": "关注剧情和角色，喜欢编故事",
        "style": "文艺腔，关注NPC和伏笔",
        "tendency": "narrative",  # 倾向产生 CHARACTER/EVENT 评论
    },
    {
        "name": "搞事王铁柱",
        "personality": "专门搞破坏和整活，但偶尔有神来之笔",
        "style": "皮，经常反向操作",
        "tendency": "chaotic",  # 倾向产生需要转译的评论
    },
    {
        "name": "暖心姐姐小诺",
        "personality": "关心主角和同伴的状态，爱提供资源",
        "style": "温柔语气，关注HP/饱腹度",
        "tendency": "supportive",  # 倾向产生 ITEM(food/medicine) 评论
    },
]


# ============================================================
# 生成 Prompt
# ============================================================

SIM_SYSTEM = """You are simulating a group of live stream viewers watching an AI apocalypse survival game. Each viewer has a distinct personality. Generate realistic live chat comments.

CRITICAL RULES:
1. Comments must be SHORT (5-20 characters for Chinese, 3-15 words for mixed). Real viewers type fast.
2. ~30% of comments should contain game-actionable content (items/events/characters/locations). The rest are reactions/chat/hype.
3. Each viewer stays in character. The aggressive one never says "小心", the cautious one never says "冲".
4. When responding to a real viewer's comment or game event, DIRECTLY reference it.
5. Use emojis sparingly but naturally. No walls of emojis.
6. Occasional typos/slang make it feel real.
7. Output as JSON array of {name, comment} objects. No other text."""

AUTONOMOUS_USER = """GAME STATE:
- Day {day}/7 | HP={hp} Hunger={hunger} Sanity={sanity}
- Location: {location} | Phase: {phase}
- Just happened: {last_event}
- Companions: {companions}

VIEWERS TO SIMULATE:
{personas_block}

Generate {count} comments from these viewers reacting to the current game state. Mix actionable suggestions (~30%) with hype/reactions (~70%).

Output JSON array only: [{{"name": "viewer_name", "comment": "评论内容"}}]"""

REACTIVE_USER = """GAME STATE:
- Day {day}/7 | HP={hp} Hunger={hunger} Sanity={sanity}
- Location: {location} | Phase: {phase}

A REAL VIEWER just said: "@{real_username}: {real_comment}"
Game reacted with: {game_reaction}

VIEWERS TO SIMULATE:
{personas_block}

Generate {count} comments from these viewers REACTING to what just happened. They should respond to the real viewer's comment and/or the game's reaction. Some agree, some disagree, some joke about it.

Output JSON array only: [{{"name": "viewer_name", "comment": "评论内容"}}]"""


# ============================================================
# 模拟器
# ============================================================

class AudienceSim:
    def __init__(self, personas: Optional[List[dict]] = None, active_count: int = 5):
        """
        Args:
            personas: 观众人格列表，默认使用预设
            active_count: 同时活跃的观众数量
        """
        all_personas = personas or AUDIENCE_PERSONAS
        self.active_personas = random.sample(all_personas, min(active_count, len(all_personas)))

    def _personas_block(self) -> str:
        lines = []
        for p in self.active_personas:
            lines.append(f"- {p['name']}: {p['personality']}. Style: {p['style']}")
        return "\n".join(lines)

    def generate_autonomous(
        self,
        day: int, hp: int, hunger: int, sanity: int,
        location: str, phase: str,
        last_event: str = "游戏刚开始",
        companions: str = "无",
        count: int = 5,
    ) -> List[dict]:
        """
        AI观众自主发言——基于当前游戏状态。

        Returns:
            [{"name": "观众名", "comment": "评论内容"}, ...]
        """
        prompt = AUTONOMOUS_USER.format(
            day=day, hp=hp, hunger=hunger, sanity=sanity,
            location=location, phase=phase,
            last_event=last_event, companions=companions,
            personas_block=self._personas_block(),
            count=count,
        )

        return self._call_api(prompt)

    def generate_reactive(
        self,
        day: int, hp: int, hunger: int, sanity: int,
        location: str, phase: str,
        real_username: str,
        real_comment: str,
        game_reaction: str = "评论已被游戏采纳",
        count: int = 4,
    ) -> List[dict]:
        """
        AI观众回应真人评论/游戏事件。

        Returns:
            [{"name": "观众名", "comment": "评论内容"}, ...]
        """
        prompt = REACTIVE_USER.format(
            day=day, hp=hp, hunger=hunger, sanity=sanity,
            location=location, phase=phase,
            real_username=real_username, real_comment=real_comment,
            game_reaction=game_reaction,
            personas_block=self._personas_block(),
            count=count,
        )

        return self._call_api(prompt)

    def _call_api(self, user_prompt: str) -> List[dict]:
        client = _get_client()
        resp = client.messages.create(
            model=MODEL,
            max_tokens=600,
            system=SIM_SYSTEM,
            messages=[{"role": "user", "content": user_prompt}],
        )

        raw = resp.content[0].text.strip()
        start = raw.find("[")
        end = raw.rfind("]")
        if start != -1 and end != -1:
            raw = raw[start:end + 1]

        import re
        raw = re.sub(r',\s*]', ']', raw)

        return json.loads(raw.strip())
