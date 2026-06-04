"""
GameLoop — 游戏主循环
协调所有模块，驱动 30s 窗口制的游戏流程。
这是合码时的核心集成点——输入源和输出端可替换。
"""

import time
import json
from typing import Callable, Optional

from game_state import GameState, Item, Companion, EventRecord
from classifier import classify
from comment_pool import CommentPool
from generator import generate


class GameLoop:
    def __init__(
        self,
        state: Optional[GameState] = None,
        window_seconds: int = 30,
        comment_source: Optional[Callable] = None,
        render_callback: Optional[Callable] = None,
    ):
        """
        Args:
            state: 游戏状态，默认新建
            window_seconds: 评论采集窗口时长
            comment_source: 评论输入函数，签名 () -> list[dict{username, text}]
                           默认从 stdin 读取（Mock 模式）
            render_callback: 渲染回调，签名 (event_type: str, data: dict) -> None
                            默认 print JSON（Mock 模式）
        """
        self.state = state or GameState()
        self.pool = CommentPool(window_seconds=window_seconds)
        self._comment_source = comment_source or self._stdin_comments
        self._render = render_callback or self._print_render

    # ============================================================
    # 可替换的输入/输出接口
    # ============================================================

    @staticmethod
    def _stdin_comments() -> list:
        """Mock 模式：从 stdin 一次性读取评论（逗号分隔）"""
        raw = input("\n💬 输入评论（格式: 用户名:评论, 用户名:评论）: ").strip()
        if not raw:
            return []
        comments = []
        for part in raw.split(","):
            part = part.strip()
            if ":" in part:
                u, t = part.split(":", 1)
                comments.append({"username": u.strip(), "text": t.strip()})
        return comments

    @staticmethod
    def _print_render(event_type: str, data: dict):
        """Mock 模式：打印 JSON 到终端"""
        print(f"\n{'='*50}")
        print(f"🎮 [{event_type}]")
        print(json.dumps(data, ensure_ascii=False, indent=2))
        print(f"{'='*50}")

    # ============================================================
    # 核心流程
    # ============================================================

    def collect_and_classify(self):
        """收集评论并分类入池"""
        comments = self._comment_source()
        for c in comments:
            result = classify(c["text"], phase=self.state.phase)
            self.pool.add(c["username"], c["text"], result)
            # 渲染分类反馈
            self._render("CLASSIFY", {
                "username": c["username"],
                "text": c["text"],
                "category": result.category,
                "confidence": result.confidence,
                "phase_compatible": result.phase_compatible,
            })

    def generate_from_pool(self, category: Optional[str] = None) -> Optional[dict]:
        """从评论池选取最佳评论，生成内容"""
        best = self.pool.get_best(category=category, top_n=1)
        if not best:
            self._render("NO_COMMENTS", {"message": "没有有效评论，跳过生成"})
            return None

        pick = best[0]
        context = self.state.context_string()

        self._render("GENERATING", {
            "username": pick.username,
            "comment": pick.raw_text,
            "category": pick.classify_result.category,
        })

        result = generate(
            category=pick.classify_result.category,
            comment=pick.raw_text,
            username=pick.username,
            context=context,
        )

        # 记录被采纳的评论
        self.state.record_adopted_comment(
            username=pick.username,
            comment=pick.raw_text,
            category=pick.classify_result.category,
            result_title=result.get("event_title") or result.get("name", ""),
        )

        self._render("GENERATED", {
            "category": pick.classify_result.category,
            "source": f"@{pick.username}: {pick.raw_text}",
            "result": result,
        })

        return result

    def apply_choice(self, generated_result: dict, choice_index: int):
        """主播做出选择后，应用结果到游戏状态"""
        options = generated_result.get("options", [])
        if not options or choice_index >= len(options):
            return

        chosen = options[choice_index]

        # 应用数值变化
        stat_changes = chosen.get("stat_changes", {})
        self.state.apply_stat_changes(stat_changes)

        # 应用道具变化
        if chosen.get("item_gained"):
            item = Item(
                name=chosen["item_gained"],
                icon="📦",
                category="special",
                description="从事件中获得",
                durability=3,
            )
            self.state.add_item(item)

        if chosen.get("item_lost"):
            self.state.remove_item(chosen["item_lost"])

        # 记录事件
        self.state.record_event(EventRecord(
            day=self.state.day,
            phase=self.state.phase,
            title=generated_result.get("event_title", ""),
            narration=generated_result.get("narration", ""),
            choice_made=chosen.get("text", ""),
            stat_changes=stat_changes,
            source_comment=generated_result.get("source_display", ""),
        ))

        # 记录伏笔
        if generated_result.get("thread_hook"):
            self.state.unresolved_threads.append(generated_result["thread_hook"])

        self._render("CHOICE_APPLIED", {
            "choice": chosen["text"],
            "outcome": chosen.get("outcome", ""),
            "stat_changes": stat_changes,
            "current_stats": {
                "hp": self.state.hp,
                "hunger": self.state.hunger,
                "sanity": self.state.sanity,
            },
            "game_over": self.state.game_over,
            "game_result": self.state.game_result,
        })

    # ============================================================
    # 单轮循环（一个30s窗口）
    # ============================================================

    def run_one_round(self, category: Optional[str] = None) -> Optional[dict]:
        """
        执行一轮完整循环：开窗 → 收集评论 → 分类 → 生成 → 等待主播选择

        Returns:
            生成的内容 dict，或 None（无有效评论）
        """
        self._render("WINDOW_OPEN", {
            "phase": self.state.phase,
            "day": self.state.day,
            "seconds": self.pool.window_seconds,
        })

        self.pool.open_window()
        self.collect_and_classify()

        result = self.generate_from_pool(category=category)
        self.pool.clear()

        return result


# ============================================================
# 快速测试
# ============================================================

def demo():
    """交互式 Demo：手动输入评论，体验完整流程"""
    state = GameState()
    # 预设一些历史
    state.event_history.append("Day1: 收留了受伤的程序员小李")
    state.inventory.append(Item("罐头", "🥫", "food", "普通罐头", 1))
    state.inventory.append(Item("绷带", "🩹", "medicine", "基础绷带", 1))

    loop = GameLoop(state=state, window_seconds=30)

    print("🎮 AI末日互动游戏 — Demo 模式")
    print(f"Day {state.day}, Phase: {state.phase}, Location: {state.location}")
    print("输入评论格式: 用户名:评论内容, 用户名:评论内容")
    print("输入 'quit' 退出\n")

    while not state.game_over:
        result = loop.run_one_round()
        if result and result.get("options"):
            print(f"\n🎯 选择一个选项 (1-{len(result['options'])}):")
            for i, opt in enumerate(result["options"]):
                print(f"  [{i+1}] {opt['text']}")
            try:
                choice = int(input("你的选择: ")) - 1
                loop.apply_choice(result, choice)
            except (ValueError, EOFError):
                print("跳过选择")

        cont = input("\n继续下一轮? (y/n/quit): ").strip().lower()
        if cont in ("n", "quit", "q"):
            break


if __name__ == "__main__":
    demo()
