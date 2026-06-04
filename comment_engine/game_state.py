"""
GameState — 游戏状态管理模块
维护完整的游戏状态，提供快照和状态变更接口。
所有其他模块通过 state.snapshot() 获取当前状态，通过 state.apply_changes() 提交变更。
"""

import json
from dataclasses import dataclass, field, asdict
from typing import Optional


@dataclass
class CompanionSkill:
    type: str  # craft|combat|knowledge|social|survival
    description: str
    enables: list = field(default_factory=list)
    narrative_hooks: list = field(default_factory=list)


@dataclass
class Companion:
    name: str
    skill: str  # legacy: one-line summary
    flaw: str
    days_together: int = 0
    hidden_trait: str = ""
    revealed: bool = False
    skills: list = field(default_factory=list)  # List[CompanionSkill]

    def get_enables(self) -> list:
        """返回该同伴的所有能力标签"""
        tags = []
        for s in self.skills:
            if isinstance(s, CompanionSkill):
                tags.extend(s.enables)
            elif isinstance(s, dict):
                tags.extend(s.get("enables", []))
        return tags


@dataclass
class Item:
    name: str
    icon: str
    category: str  # weapon|tool|food|medicine|material|special
    description: str
    durability: int  # -1 = single-use
    effect: dict = field(default_factory=dict)
    enables: list = field(default_factory=list)
    narrative_hooks: list = field(default_factory=list)
    source_comment: str = ""


@dataclass
class NarrativeHook:
    hook_id: str
    setup: str
    setup_day: int
    min_delay: int = 1
    max_delay: int = 3
    suggested_payoffs: list = field(default_factory=list)
    resolved: bool = False


@dataclass
class EventRecord:
    day: int
    phase: str
    title: str
    narration: str
    choice_made: str
    stat_changes: dict
    source_comment: str


@dataclass
class GameState:
    # === 核心数值 ===
    day: int = 1
    max_days: int = 7
    phase: str = "home_event"
    # home_event | resource_manage | equip | choose_map | explore | rest
    location: str = "避难所"

    hp: int = 100
    hunger: int = 80
    sanity: int = 90
    action_points: int = 5
    max_action_points: int = 5
    backpack_capacity: int = 6

    # === 容器 ===
    inventory: list = field(default_factory=list)       # List[Item]
    companions: list = field(default_factory=list)       # List[Companion]
    event_history: list = field(default_factory=list)     # List[EventRecord]
    visited_locations: list = field(default_factory=list) # List[str]
    unresolved_threads: list = field(default_factory=list)# List[str]
    hook_queue: list = field(default_factory=list)         # List[NarrativeHook]
    adopted_comments: list = field(default_factory=list)  # List[dict] 被采纳的评论记录

    # === 游戏结束标志 ===
    game_over: bool = False
    game_result: str = ""  # "victory" | "defeat" | ""

    def snapshot(self) -> dict:
        """返回当前状态的完整快照（供 Prompt context 使用）"""
        return {
            "day": self.day,
            "max_days": self.max_days,
            "phase": self.phase,
            "location": self.location,
            "hp": self.hp,
            "hunger": self.hunger,
            "sanity": self.sanity,
            "action_points": self.action_points,
            "inventory": [asdict(i) if isinstance(i, Item) else i for i in self.inventory],
            "companions": [asdict(c) if isinstance(c, Companion) else c for c in self.companions],
            "event_history": [
                asdict(e) if isinstance(e, EventRecord) else e for e in self.event_history
            ],
            "visited_locations": self.visited_locations,
            "unresolved_threads": self.unresolved_threads,
            "game_over": self.game_over,
            "game_result": self.game_result,
        }

    def context_string(self) -> str:
        """生成供 Prompt 注入的 context 文本"""
        s = self.snapshot()
        inv_str = ", ".join(
            f"{i['icon']}{i['name']}(耐久{i['durability']})" if isinstance(i, dict) else str(i)
            for i in s["inventory"]
        ) or "空"
        comp_str = ", ".join(
            f"{c['name']}({c['skill']}, 缺陷:{c['flaw']})" if isinstance(c, dict) else str(c)
            for c in s["companions"]
        ) or "无"
        events_str = "\n".join(
            f"Day{e['day']}: {e['title']} - {e['choice_made']}" if isinstance(e, dict) else str(e)
            for e in s["event_history"]
        ) or "无"
        threads_str = ", ".join(s["unresolved_threads"]) or "无"

        return f"""CURRENT GAME STATE:
- Day: {s['day']}/{s['max_days']}, Phase: {s['phase']}, Location: {s['location']}
- Player stats: HP={s['hp']}, Hunger={s['hunger']}, Sanity={s['sanity']}
- Action points: {s['action_points']}/{self.max_action_points}
- Inventory ({len(s['inventory'])}/{self.backpack_capacity}): {inv_str}
- Companions ({len(s['companions'])}/3): {comp_str}
- Visited locations: {', '.join(s['visited_locations']) or '无'}
- Unresolved threads: {threads_str}
- Full event history:
{events_str}

{self.capabilities_string()}

{self.hooks_string()}"""

    def apply_stat_changes(self, changes: dict):
        """应用数值变更，自动钳位到 [0, 100]"""
        for key in ("hp", "hunger", "sanity"):
            if key in changes:
                old = getattr(self, key)
                new = max(0, min(100, old + changes[key]))
                setattr(self, key, new)
        self._check_game_over()

    def add_item(self, item: Item) -> bool:
        """添加道具，返回是否成功（背包满则失败）"""
        if len(self.inventory) >= self.backpack_capacity:
            return False
        self.inventory.append(item)
        return True

    def remove_item(self, name: str) -> Optional[Item]:
        """移除道具，返回被移除的道具"""
        for i, item in enumerate(self.inventory):
            item_name = item.name if isinstance(item, Item) else item
            if item_name == name:
                return self.inventory.pop(i)
        return None

    def add_companion(self, companion: Companion) -> bool:
        """添加同伴，上限 3 人"""
        if len(self.companions) >= 3:
            return False
        self.companions.append(companion)
        return True

    def record_event(self, event: EventRecord):
        """记录事件"""
        self.event_history.append(event)

    def record_adopted_comment(self, username: str, comment: str, category: str, result_title: str):
        """记录被采纳的评论"""
        self.adopted_comments.append({
            "day": self.day,
            "username": username,
            "comment": comment,
            "category": category,
            "result_title": result_title,
        })

    def advance_day(self):
        """推进到下一天"""
        self.day += 1
        self.phase = "home_event"
        self.action_points = self.max_action_points
        self.location = "避难所"
        # 每天同伴天数+1
        for c in self.companions:
            if isinstance(c, Companion):
                c.days_together += 1
        # 每天 hunger 自然下降
        self.hunger = max(0, self.hunger - 10)
        self._check_game_over()

    def _check_game_over(self):
        """检查游戏结束条件"""
        if self.hp <= 0 or self.hunger <= 0 or self.sanity <= 0:
            self.game_over = True
            self.game_result = "defeat"
        elif self.day > self.max_days:
            self.game_over = True
            self.game_result = "defeat"  # 也可以是 victory，取决于是否完成目标

    def set_phase(self, phase: str):
        self.phase = phase

    def set_location(self, location: str):
        self.location = location
        if location not in self.visited_locations:
            self.visited_locations.append(location)

    # === 能力驱动系统 ===

    def get_capabilities(self) -> dict:
        """构建当前可用能力清单"""
        caps = {"from_inventory": {}, "from_companions": {}}
        for item in self.inventory:
            if isinstance(item, Item) and item.enables:
                caps["from_inventory"][item.name] = item.enables
        for comp in self.companions:
            if isinstance(comp, Companion):
                enables = comp.get_enables()
                if enables:
                    caps["from_companions"][comp.name] = enables
        return caps

    def capabilities_string(self) -> str:
        """生成供 Prompt 注入的能力清单文本"""
        caps = self.get_capabilities()
        lines = ["AVAILABLE CAPABILITIES:"]
        if caps["from_inventory"]:
            lines.append("From Inventory:")
            for name, tags in caps["from_inventory"].items():
                lines.append(f"  - [{name}] {' / '.join(tags)}")
        if caps["from_companions"]:
            lines.append("From Companions:")
            for name, tags in caps["from_companions"].items():
                lines.append(f"  - [{name}] {' / '.join(tags)}")
        return "\n".join(lines)

    def add_hook(self, setup: str, suggested_payoffs: list, min_delay: int = 1, max_delay: int = 3):
        """添加一个剧情钩子"""
        hook_id = f"hook_{len(self.hook_queue) + 1:03d}"
        self.hook_queue.append(NarrativeHook(
            hook_id=hook_id,
            setup=setup,
            setup_day=self.day,
            min_delay=min_delay,
            max_delay=max_delay,
            suggested_payoffs=suggested_payoffs,
        ))

    def resolve_hook(self, hook_id: str):
        """标记钩子为已解决"""
        for h in self.hook_queue:
            if isinstance(h, NarrativeHook) and h.hook_id == hook_id:
                h.resolved = True

    def hooks_string(self) -> str:
        """生成供 Prompt 注入的钩子队列文本"""
        active = [h for h in self.hook_queue if isinstance(h, NarrativeHook) and not h.resolved]
        if not active:
            return "NARRATIVE HOOK QUEUE: empty"
        lines = ["NARRATIVE HOOK QUEUE:"]
        for h in active:
            waiting = self.day - h.setup_day
            if waiting >= h.max_delay:
                status = "MUST_TRIGGER"
            elif waiting >= h.min_delay:
                status = "CAN_TRIGGER"
            else:
                status = "WAITING"
            lines.append(f"  - [{h.hook_id}] {h.setup} (waiting {waiting}d, status={status})")
            lines.append(f"    payoffs: {', '.join(h.suggested_payoffs)}")
        return "\n".join(lines)
