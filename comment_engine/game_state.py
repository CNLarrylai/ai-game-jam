"""
GameState — 游戏状态管理模块 (v2)

数值体系（对齐故事线大纲）：
- 精神值 spirit: 初始60, 满值100, 越高越好, ≤30精神错乱, ≤10疯掉GG
- 健康值 health: 初始50, 满值100, 越高越好, ≤30低体力, =0死亡
- 饥饿值 hunger: 初始30, 满值100, 越低越好(0=吃饱), ≥70低体力, =100饿死
- 口渴值 thirst: 初始30, 满值100, 越低越好(0=不渴), ≥70低体力, =100渴死

每日自然变化：精神不变, 健康conditional(-5/异常项), 饥饿+15, 口渴+30

硬编码道具效果（剧本物品）：
- 矿泉水: 口渴-10
- 鲱鱼罐头: 饥饿-10, 精神-10
- 猫咪罐头: 饥饿-15
- 光头厨师同伴: 每天消耗1瓶水, 所有物资效果翻倍
"""

import json
from dataclasses import dataclass, field, asdict
from typing import Optional, List


@dataclass
class CompanionSkill:
    type: str  # craft|combat|knowledge|social|survival
    description: str
    enables: list = field(default_factory=list)
    narrative_hooks: list = field(default_factory=list)


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
class Companion:
    name: str
    skill: str
    flaw: str
    daily_cost: dict = field(default_factory=dict)  # e.g. {"矿泉水": 1}
    passive_effect: str = ""  # e.g. "所有物资效果翻倍"
    days_together: int = 0
    hidden_trait: str = ""
    revealed: bool = False
    source_comment: str = ""
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
    category: str  # weapon|tool|food|drink|medicine|material|special
    description: str
    durability: int  # -1 = single-use consumable
    effect: dict = field(default_factory=dict)
    is_hardcoded: bool = False  # True = 剧本物品（硬规则效果）, False = AI生成
    usable_at_home: bool = True
    usable_outside: bool = True
    enables: list = field(default_factory=list)
    narrative_hooks: list = field(default_factory=list)
    source_comment: str = ""


@dataclass
class EventRecord:
    day: int
    phase: str
    title: str
    narration: str
    player_action: str  # 玩家说了什么/做了什么（自由输入）
    result: str  # AI生成的结果描述
    stat_changes: dict
    source_comment: str


# ============================================================
# 硬编码道具库（剧本物品，效果固定不走AI）
# ============================================================

HARDCODED_ITEMS = {
    "矿泉水": Item("矿泉水", "💧", "drink", "干净的饮用水", -1,
                  {"thirst": -10}, is_hardcoded=True),
    "鲱鱼罐头": Item("鲱鱼罐头", "🐟", "food", "味道极其刺激的罐头", -1,
                   {"hunger": -10, "spirit": -10}, is_hardcoded=True),
    "猫咪罐头": Item("猫咪罐头", "🐱", "food", "本来是给猫吃的，但现在...", -1,
                   {"hunger": -15}, is_hardcoded=True),
    "冲锋枪": Item("冲锋枪", "🔫", "weapon", "可用性不明", 99,
                  {}, is_hardcoded=True, usable_at_home=False),
}


@dataclass
class GameState:
    # === 核心数值 ===
    day: int = 1
    max_days: int = 100  # "存活100天"
    phase: str = "home_event"
    location: str = "家"

    # 越高越好
    spirit: int = 60     # 精神值 (≤30错乱, ≤10疯掉GG)
    health: int = 50     # 健康值 (≤30低体力, =0死亡)
    # 越低越好 (0=满足, 100=死亡)
    hunger: int = 30     # 饥饿值 (≥70低体力, =100饿死)
    thirst: int = 30     # 口渴值 (≥70低体力, =100渴死)

    action_points: int = 5
    max_action_points: int = 5
    backpack_capacity: int = 6

    # === 容器 ===
    inventory: list = field(default_factory=list)
    companions: list = field(default_factory=list)
    event_history: list = field(default_factory=list)
    visited_locations: list = field(default_factory=list)
    unresolved_threads: list = field(default_factory=list)
    hook_queue: list = field(default_factory=list)         # List[NarrativeHook]
    adopted_comments: list = field(default_factory=list)
    available_maps: list = field(default_factory=lambda: ["废弃工厂", "大型超市"])

    # === 游戏结束 ===
    game_over: bool = False
    game_result: str = ""
    death_cause: str = ""

    def snapshot(self) -> dict:
        return {
            "day": self.day, "max_days": self.max_days,
            "phase": self.phase, "location": self.location,
            "spirit": self.spirit, "health": self.health,
            "hunger": self.hunger, "thirst": self.thirst,
            "action_points": self.action_points,
            "inventory": [asdict(i) if isinstance(i, Item) else i for i in self.inventory],
            "companions": [asdict(c) if isinstance(c, Companion) else c for c in self.companions],
            "event_history": [asdict(e) if isinstance(e, EventRecord) else e for e in self.event_history],
            "visited_locations": self.visited_locations,
            "unresolved_threads": self.unresolved_threads,
            "available_maps": self.available_maps,
            "game_over": self.game_over, "game_result": self.game_result,
        }

    def context_string(self) -> str:
        """生成供 Prompt 注入的 context 文本"""
        s = self.snapshot()
        inv_str = ", ".join(
            f"{i['icon']}{i['name']}(x{i['durability']})" if isinstance(i, dict) and i.get('durability', 0) > 0
            else (f"{i['icon']}{i['name']}" if isinstance(i, dict) else str(i))
            for i in s["inventory"]
        ) or "空"
        comp_str = ", ".join(
            f"{c['name']}({c['skill']}, 缺陷:{c['flaw']}, 每日消耗:{c.get('daily_cost',{})})" if isinstance(c, dict) else str(c)
            for c in s["companions"]
        ) or "无"
        events_str = "\n".join(
            f"Day{e['day']}: {e['title']} → 玩家:{e.get('player_action','')} → 结果:{e.get('result','')}" if isinstance(e, dict) else str(e)
            for e in s["event_history"][-10:]  # 只取最近10条避免context过长
        ) or "无"

        # 状态预警
        warnings = []
        if self.spirit <= 30: warnings.append("⚠️精神错乱中")
        if self.health <= 30: warnings.append("⚠️低体力")
        if self.hunger >= 70: warnings.append("⚠️极度饥饿")
        if self.thirst >= 70: warnings.append("⚠️极度口渴")
        warn_str = " | ".join(warnings) if warnings else "状态正常"

        return f"""CURRENT GAME STATE:
- Day: {s['day']}, Phase: {s['phase']}, Location: {s['location']}
- 精神值(Spirit): {s['spirit']}/100 (越高越好, ≤30精神错乱, ≤10疯掉GG)
- 健康值(Health): {s['health']}/100 (越高越好, =0死亡)
- 饥饿值(Hunger): {s['hunger']}/100 (越低越好, 0=吃饱, ≥70低体力, =100饿死)
- 口渴值(Thirst): {s['thirst']}/100 (越低越好, 0=不渴, ≥70低体力, =100渴死)
- Status: {warn_str}
- Action points: {s['action_points']}/{self.max_action_points}
- Inventory ({len(s['inventory'])}/{self.backpack_capacity}): {inv_str}
- Companions: {comp_str}
- Available maps: {', '.join(s['available_maps'])}
- Visited: {', '.join(s['visited_locations']) or '无'}
- Unresolved threads: {', '.join(s['unresolved_threads']) or '无'}
- Recent event history:
{events_str}

{self.capabilities_string()}

{self.hooks_string()}"""

    # ============================================================
    # 数值变更
    # ============================================================

    def apply_stat_changes(self, changes: dict):
        """
        应用数值变更。
        注意方向：spirit/health 越高越好, hunger/thirst 越低越好。
        所有值钳位到 [0, 100]。
        """
        for key in ("spirit", "health", "hunger", "thirst"):
            if key in changes:
                old = getattr(self, key)
                new = max(0, min(100, old + changes[key]))
                setattr(self, key, new)
        self._check_game_over()

    def use_item(self, item_name: str) -> Optional[dict]:
        """
        使用道具。硬编码道具走固定效果，AI道具走 effect 字段。
        Returns: 生效的 stat_changes dict, 或 None（道具不存在）
        """
        item = None
        item_idx = None
        for i, inv_item in enumerate(self.inventory):
            n = inv_item.name if isinstance(inv_item, Item) else inv_item
            if n == item_name:
                item = inv_item
                item_idx = i
                break
        if item is None:
            return None

        # 检查使用场景
        if isinstance(item, Item):
            if self.phase in ("explore", "choose_map") and not item.usable_outside:
                return None
            if self.phase in ("home_event", "resource_manage") and not item.usable_at_home:
                return None

        # 获取效果
        effect = item.effect if isinstance(item, Item) else {}

        # 同伴加成（光头厨师：所有物资效果翻倍）
        multiplier = 1
        for comp in self.companions:
            if isinstance(comp, Companion) and "翻倍" in comp.passive_effect:
                multiplier = 2

        stat_changes = {}
        for key in ("spirit", "health", "hunger", "thirst"):
            if key in effect:
                stat_changes[key] = effect[key] * multiplier

        self.apply_stat_changes(stat_changes)

        # 消耗道具（single-use）
        if isinstance(item, Item) and item.durability == -1:
            self.inventory.pop(item_idx)
        elif isinstance(item, Item) and item.durability > 0:
            item.durability -= 1
            if item.durability <= 0:
                self.inventory.pop(item_idx)

        return stat_changes

    # ============================================================
    # 每日结算
    # ============================================================

    def advance_day(self):
        """推进到下一天，应用每日自然变化"""
        self.day += 1
        self.phase = "home_event"
        self.action_points = self.max_action_points
        self.location = "家"

        # 每日自然变化
        self.hunger = min(100, self.hunger + 15)
        self.thirst = min(100, self.thirst + 30)

        # 健康值：每项异常数值扣5（可叠加）
        health_penalty = 0
        if self.spirit <= 30: health_penalty += 5
        if self.hunger >= 70: health_penalty += 5
        if self.thirst >= 70: health_penalty += 5
        self.health = max(0, self.health - health_penalty)

        # 同伴每日消耗
        for comp in self.companions:
            if isinstance(comp, Companion) and comp.daily_cost:
                for item_name, count in comp.daily_cost.items():
                    for _ in range(count):
                        removed = self.remove_item(item_name)
                        if removed is None:
                            pass  # 没有足够物资，可以触发同伴离开事件

        # 同伴天数+1
        for c in self.companions:
            if isinstance(c, Companion):
                c.days_together += 1

        self._check_game_over()

    def _check_game_over(self):
        """检查游戏结束条件"""
        if self.health <= 0:
            self.game_over, self.game_result = True, "defeat"
            self.death_cause = "健康值归零，你倒下了"
        elif self.hunger >= 100:
            self.game_over, self.game_result = True, "defeat"
            self.death_cause = "你被活活饿死了"
        elif self.thirst >= 100:
            self.game_over, self.game_result = True, "defeat"
            self.death_cause = "你被活活渴死了"
        elif self.spirit <= 10:
            self.game_over, self.game_result = True, "defeat"
            self.death_cause = "你彻底疯了，在末日中失去了最后的理智"

    # ============================================================
    # 容器操作
    # ============================================================

    def add_item(self, item: Item) -> bool:
        if len(self.inventory) >= self.backpack_capacity:
            return False
        self.inventory.append(item)
        return True

    def remove_item(self, name: str) -> Optional[Item]:
        for i, item in enumerate(self.inventory):
            item_name = item.name if isinstance(item, Item) else item
            if item_name == name:
                return self.inventory.pop(i)
        return None

    def add_companion(self, companion: Companion) -> bool:
        if len(self.companions) >= 3:
            return False
        self.companions.append(companion)
        return True

    def add_map(self, location_name: str):
        """评论生成的新地点加入可选地图"""
        if location_name not in self.available_maps:
            self.available_maps.append(location_name)

    def record_event(self, event: EventRecord):
        self.event_history.append(event)

    def record_adopted_comment(self, username: str, comment: str, category: str, result_title: str):
        self.adopted_comments.append({
            "day": self.day, "username": username,
            "comment": comment, "category": category,
            "result_title": result_title,
        })

    def set_phase(self, phase: str):
        self.phase = phase

    def set_location(self, location: str):
        self.location = location
        if location not in self.visited_locations:
            self.visited_locations.append(location)

    # === 能力驱动系统 ===

    def get_capabilities(self) -> dict:
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
        hook_id = f"hook_{len(self.hook_queue) + 1:03d}"
        self.hook_queue.append(NarrativeHook(
            hook_id=hook_id, setup=setup, setup_day=self.day,
            min_delay=min_delay, max_delay=max_delay, suggested_payoffs=suggested_payoffs,
        ))

    def resolve_hook(self, hook_id: str):
        for h in self.hook_queue:
            if isinstance(h, NarrativeHook) and h.hook_id == hook_id:
                h.resolved = True

    def hooks_string(self) -> str:
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
