"""
CommentPool — 多队列评论收集与调度模块

核心设计：
- 4 条独立队列（EVENT / CHARACTER / ITEM / LOCATION），互不竞争
- 每队列内部按 置信度×0.4 + 创意度×0.6 排序，选出队列冠军
- 每个30s窗口最多采纳 N 条（默认2），避免节奏崩盘
- 队列优先级随游戏阶段变化
- 每日总上限控制稀缺性（CHARACTER ≤ 2/天, LOCATION ≤ 1/天）
"""

import time
from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict
from classifier import ClassifyResult


CATEGORIES = ["EVENT", "CHARACTER", "ITEM", "LOCATION"]


@dataclass
class PooledComment:
    username: str
    raw_text: str
    classify_result: ClassifyResult
    timestamp: float = field(default_factory=time.time)
    creativity_score: float = 0.0  # 0-10, 由外部（AI或规则）打分

    def priority_score(self) -> float:
        """综合优先级分数"""
        return self.classify_result.confidence * 0.4 + self.creativity_score * 0.06

    def to_dict(self) -> dict:
        return {
            "username": self.username,
            "raw_text": self.raw_text,
            "category": self.classify_result.category,
            "confidence": self.classify_result.confidence,
            "creativity_score": self.creativity_score,
            "priority_score": round(self.priority_score(), 3),
        }


# ============================================================
# 阶段→队列优先级映射
# ============================================================

PHASE_PRIORITY = {
    # 每个阶段下，队列的优先级排序（越前越优先）
    "home_event":      ["EVENT", "CHARACTER", "ITEM", "LOCATION"],
    "resource_manage":  [],  # 不触发
    "equip":           [],  # 不触发
    "choose_map":      ["LOCATION", "EVENT", "CHARACTER", "ITEM"],
    "explore":         ["EVENT", "ITEM", "CHARACTER", "LOCATION"],
    "rest":            [],  # 不触发
}

# ============================================================
# 每日采纳上限
# ============================================================

DAILY_LIMITS = {
    "EVENT": 99,      # 事件不限（核心玩法）
    "CHARACTER": 2,   # 每天最多遇到2个NPC（稀缺才珍贵）
    "ITEM": 5,        # 道具适度
    "LOCATION": 1,    # 每天只能生成1个新地点
}


class CommentPool:
    def __init__(self, window_seconds: int = 30, max_adoptions_per_window: int = 2):
        """
        Args:
            window_seconds: 采集窗口时长
            max_adoptions_per_window: 每个窗口最多采纳几条评论
        """
        self.window_seconds = window_seconds
        self.max_adoptions = max_adoptions_per_window

        # 4条独立队列
        self._queues: Dict[str, List[PooledComment]] = {c: [] for c in CATEGORIES}
        self._window_start: float = 0

        # 每日采纳计数（由外部在 advance_day 时重置）
        self.daily_counts: Dict[str, int] = {c: 0 for c in CATEGORIES}

    def open_window(self):
        """开启新的采集窗口，清空所有队列"""
        for c in CATEGORIES:
            self._queues[c] = []
        self._window_start = time.time()

    def is_window_open(self) -> bool:
        return (time.time() - self._window_start) < self.window_seconds

    def remaining_seconds(self) -> float:
        return max(0, self.window_seconds - (time.time() - self._window_start))

    def add(self, username: str, raw_text: str, result: ClassifyResult):
        """添加一条已分类的评论到对应队列"""
        cat = result.category
        if cat not in self._queues:
            return  # IRRELEVANT 等无效类别
        if not result.phase_compatible:
            return
        if result.confidence < 0.5:
            return

        queue = self._queues[cat]

        # 去重：同一用户同一队列只保留最后一条
        self._queues[cat] = [p for p in queue if p.username != username]

        self._queues[cat].append(PooledComment(
            username=username,
            raw_text=raw_text,
            classify_result=result,
        ))

    def select_adoptions(self, phase: str = "explore") -> List[PooledComment]:
        """
        窗口关闭后调用：从各队列中选出本轮要采纳的评论。

        逻辑：
        1. 按阶段优先级排序队列
        2. 每个队列取第1名（队列冠军）
        3. 检查每日上限，超限的跳过
        4. 按优先级取前 max_adoptions 个

        Returns:
            被采纳的评论列表（最多 max_adoptions 条）
        """
        priority_order = PHASE_PRIORITY.get(phase, CATEGORIES)
        if not priority_order:
            return []  # 该阶段不触发

        champions = []
        for cat in priority_order:
            queue = self._queues.get(cat, [])
            if not queue:
                continue

            # 检查每日上限
            if self.daily_counts.get(cat, 0) >= DAILY_LIMITS.get(cat, 99):
                continue

            # 队列内排序，取第1名
            queue.sort(key=lambda p: p.priority_score(), reverse=True)
            champions.append(queue[0])

        # 按综合优先级排序，取前 N 个
        # 但保持阶段优先级权重：越靠前的队列加 0.1 bonus
        for i, champ in enumerate(champions):
            champ._phase_bonus = (len(champions) - i) * 0.1  # type: ignore

        champions.sort(
            key=lambda p: p.priority_score() + getattr(p, '_phase_bonus', 0),
            reverse=True,
        )

        adopted = champions[:self.max_adoptions]

        # 更新每日计数
        for p in adopted:
            cat = p.classify_result.category
            self.daily_counts[cat] = self.daily_counts.get(cat, 0) + 1

        return adopted

    def reset_daily_counts(self):
        """新的一天开始时重置"""
        self.daily_counts = {c: 0 for c in CATEGORIES}

    # ============================================================
    # 查询方法
    # ============================================================

    def get_queue_summary(self) -> Dict[str, int]:
        """各队列当前评论数"""
        return {c: len(q) for c, q in self._queues.items()}

    def get_daily_remaining(self) -> Dict[str, int]:
        """各类别今日剩余采纳额度"""
        return {c: max(0, DAILY_LIMITS[c] - self.daily_counts.get(c, 0)) for c in CATEGORIES}

    def get_all_valid(self) -> List[PooledComment]:
        """获取所有队列中的评论（用于展示）"""
        all_comments = []
        for q in self._queues.values():
            all_comments.extend(q)
        return sorted(all_comments, key=lambda p: p.timestamp)

    def total_size(self) -> int:
        return sum(len(q) for q in self._queues.values())

    def clear(self):
        for c in CATEGORIES:
            self._queues[c] = []
