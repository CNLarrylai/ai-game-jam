"""
CommentPool — 评论收集与排序模块
在30秒窗口期内收集已分类的评论，按优先级排序，选出最佳评论。
"""

import time
from dataclasses import dataclass, field
from typing import List, Optional
from classifier import ClassifyResult


@dataclass
class PooledComment:
    username: str
    raw_text: str
    classify_result: ClassifyResult
    timestamp: float = field(default_factory=time.time)
    creativity_score: float = 0.0  # 由 AI 或规则打分，0-10


class CommentPool:
    def __init__(self, window_seconds: int = 30):
        self.window_seconds = window_seconds
        self._pool: List[PooledComment] = []
        self._window_start: float = 0

    def open_window(self):
        """开启新的采集窗口"""
        self._pool = []
        self._window_start = time.time()

    def is_window_open(self) -> bool:
        """窗口是否仍在开放"""
        return (time.time() - self._window_start) < self.window_seconds

    def remaining_seconds(self) -> float:
        return max(0, self.window_seconds - (time.time() - self._window_start))

    def add(self, username: str, raw_text: str, result: ClassifyResult):
        """添加一条已分类的评论到池中"""
        if result.category == "IRRELEVANT":
            return  # 无关评论不入池
        if not result.phase_compatible:
            return  # 阶段不兼容的不入池
        if result.confidence < 0.5:
            return  # 置信度太低的不入池

        # 去重：同一用户同类评论只保留最后一条
        self._pool = [
            p for p in self._pool
            if not (p.username == username and p.classify_result.category == result.category)
        ]

        self._pool.append(PooledComment(
            username=username,
            raw_text=raw_text,
            classify_result=result,
        ))

    def get_best(self, category: Optional[str] = None, top_n: int = 1) -> List[PooledComment]:
        """
        获取最佳评论。

        Args:
            category: 可选，只从特定类别中选取
            top_n: 返回前N条

        Returns:
            按优先级排序的评论列表
        """
        candidates = self._pool
        if category:
            candidates = [p for p in candidates if p.classify_result.category == category]

        # 排序：置信度 * 0.4 + 创意度 * 0.6（创意度默认 0，由外部打分）
        # 如果没有创意度评分，退化为按置信度排序
        candidates.sort(
            key=lambda p: p.classify_result.confidence * 0.4 + p.creativity_score * 0.06,
            reverse=True,
        )

        return candidates[:top_n]

    def get_all_valid(self) -> List[PooledComment]:
        """获取所有有效评论（用于展示）"""
        return sorted(self._pool, key=lambda p: p.timestamp)

    def size(self) -> int:
        return len(self._pool)

    def clear(self):
        self._pool = []
