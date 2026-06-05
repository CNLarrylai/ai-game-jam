"""
CommentClassifier — 评论分类模块
将直播间评论分为 5 类：EVENT / CHARACTER / ITEM / LOCATION / IRRELEVANT
输入：原始评论文本 + 当前游戏阶段
输出：ClassifyResult（标准 dataclass，可序列化为 JSON）
"""

import re
from dataclasses import dataclass, asdict
from typing import List

# ============================================================
# 世界观关键词库（可独立维护/热更新）
# ============================================================

EVENT_KEYWORDS = {
    "敲门", "爆炸", "枪声", "尖叫", "警报", "地震", "坍塌", "停电",
    "着火", "淹水", "暴风雪", "信号", "广播", "敲击", "脚步声",
    "knock", "explosion", "scream", "alarm", "earthquake", "fire",
    "flood", "storm", "signal", "broadcast", "footstep", "collapse",
    "突然", "发现", "听到", "看到", "闯入", "入侵", "袭击",
    "suddenly", "heard", "found", "attacked", "invaded", "broke in",
    "下雨", "下雪", "起雾", "刮风", "打雷", "天黑",
    "rain", "snow", "fog", "wind", "thunder", "dark",
}

CHARACTER_KEYWORDS = {
    "老兵", "小孩", "医生", "科学家", "商人", "流浪汉", "士兵",
    "黑客", "幸存者", "老人", "女孩", "男人", "女人", "机器人",
    "robot", "soldier", "doctor", "scientist", "hacker", "survivor",
    "trader", "merchant", "child", "veteran", "old man", "stranger",
    "老头", "大叔", "少年", "大妈", "护士", "工程师", "机械师", "修理工",
    "狗", "猫", "机械狗", "变异", "怪物", "龙", "蛇", "鸟", "虫",
    "dog", "cat", "mechanical", "mutant", "creature", "monster", "dragon", "snake", "bird",
}

ITEM_KEYWORDS = {
    "枪", "刀", "剑", "弩", "棍", "斧", "弓",
    "gun", "knife", "sword", "axe", "bow", "weapon",
    "手电筒", "绳子", "钥匙", "地图", "指南针", "收音机", "对讲机",
    "flashlight", "rope", "key", "map", "compass", "radio", "walkie",
    "罐头", "水", "食物", "药品", "绷带", "电池", "汽油", "弹药",
    "can", "water", "food", "medicine", "bandage", "battery", "fuel", "ammo",
    "背包", "防毒面具", "防弹衣", "头盔",
    "backpack", "gas mask", "armor", "helmet",
    "宝箱", "箱子", "保险柜", "抽屉",
    "chest", "box", "safe", "drawer",
    "ak", "ak47", "m16", "手雷", "炸弹", "弹弓",
    "grenade", "bomb", "slingshot",
}

LOCATION_KEYWORDS = {
    "超市", "工厂", "医院", "学校", "停车场", "教堂", "地铁站",
    "仓库", "军营", "实验室", "图书馆", "加油站", "屋顶", "地下室",
    "暗门", "密道", "隧道", "桥", "河", "山", "森林", "废墟",
    "supermarket", "factory", "hospital", "school", "parking", "church",
    "subway", "warehouse", "military", "lab", "library", "gas station",
    "rooftop", "basement", "tunnel", "bridge", "river", "mountain", "forest",
    "ruins", "shelter", "bunker",
}

IRRELEVANT_PATTERNS = [
    r'^(哈哈|哈)+$',
    r'^6{2,}$',
    r'^[!！?？.。]+$',
    r'^(加油|冲|牛|nb|gg|ggs|lol|lmao|omg|wow)$',
    r'^主播(加油|牛|厉害|nb)',
    r'^(好看|好玩|有意思)',
    r'^(第一|first|hi|hello|你好)',
]

# ============================================================
# 分类结果
# ============================================================

@dataclass
class ClassifyResult:
    category: str          # EVENT | CHARACTER | ITEM | LOCATION | IRRELEVANT
    confidence: float      # 0.0 - 1.0
    extracted_element: str  # 提取的关键游戏元素
    matched_keywords: List[str]
    phase_compatible: bool  # 是否与当前阶段兼容

    def to_dict(self) -> dict:
        return asdict(self)

    def to_json(self) -> str:
        return __import__("json").dumps(asdict(self), ensure_ascii=False)


# ============================================================
# 分类器
# ============================================================

def classify(comment: str, phase: str = "explore") -> ClassifyResult:
    """
    对单条评论进行意图分类。

    Args:
        comment: 原始评论文本
        phase: 当前游戏阶段 (home_event|resource_manage|equip|choose_map|explore|rest)

    Returns:
        ClassifyResult
    """
    text = comment.strip().lower()

    # Step 1: 快速过滤无关评论
    for pattern in IRRELEVANT_PATTERNS:
        if re.match(pattern, text, re.IGNORECASE):
            return ClassifyResult("IRRELEVANT", 0.95, "", [], True)

    if len(re.sub(r'[\s\U0001F000-\U0001FFFF]', '', text)) < 2:
        return ClassifyResult("IRRELEVANT", 0.8, "", [], True)

    # Step 2: 关键词匹配计分
    scores = {"EVENT": 0, "CHARACTER": 0, "ITEM": 0, "LOCATION": 0}
    matches = {"EVENT": [], "CHARACTER": [], "ITEM": [], "LOCATION": []}

    for kw in EVENT_KEYWORDS:
        if kw in text:
            scores["EVENT"] += 1
            matches["EVENT"].append(kw)
    for kw in CHARACTER_KEYWORDS:
        if kw in text:
            scores["CHARACTER"] += 1
            matches["CHARACTER"].append(kw)
    for kw in ITEM_KEYWORDS:
        if kw in text:
            scores["ITEM"] += 1
            matches["ITEM"].append(kw)
    for kw in LOCATION_KEYWORDS:
        if kw in text:
            scores["LOCATION"] += 1
            matches["LOCATION"].append(kw)

    # Step 3: 语义增强
    if re.search(r'(来个|出现|遇到|碰到|招募).{0,5}(人|兵|医|孩|狗|猫|机器)', text):
        scores["CHARACTER"] += 2

    if re.search(r'(找到|捡到|地上有|获得|给他|拿到|有个|里有)', text):
        if scores["ITEM"] > 0:
            scores["ITEM"] += 2
        elif scores["CHARACTER"] == 0 and scores["LOCATION"] == 0:
            scores["ITEM"] += 1

    if re.search(r'(去|前往|探索|进入).{0,5}', text) and scores["LOCATION"] > 0:
        scores["LOCATION"] += 2

    if re.search(r'(突然|听到|有人|发生|出现了)', text) and max(scores.values()) <= 1:
        scores["EVENT"] += 1.5

    # Step 3.5: 混合仲裁（角色 > 道具）
    if scores["CHARACTER"] > 0 and scores["ITEM"] > 0:
        char_kws = '|'.join(k for k in CHARACTER_KEYWORDS if k in text)
        if char_kws and re.search(r'(有个|来个|遇到|碰到|出现|拿|带|持|穿).{0,8}(' + char_kws + ')', text):
            scores["CHARACTER"] += 2
        elif re.search(r'(的|拿着|带着|持着|穿着|戴着)', text):
            scores["CHARACTER"] += 1.5

    # Step 4: 选最高
    max_score = max(scores.values())
    if max_score == 0:
        if re.search(r'[\u4e00-\u9fff]{2,}', text) and len(text) > 4:
            return ClassifyResult("EVENT", 0.4, text, [], True)
        return ClassifyResult("IRRELEVANT", 0.6, "", [], True)

    best_cat = max(scores, key=scores.get)
    confidence = min(0.95, 0.5 + max_score * 0.15)

    # Step 5: Phase 兼容性
    phase_compatible = True
    if phase == "home_event" and best_cat == "LOCATION":
        phase_compatible = False
    if phase in ("resource_manage", "equip", "rest"):
        phase_compatible = False

    extracted = matches[best_cat][0] if matches[best_cat] else text[:20]

    return ClassifyResult(best_cat, confidence, extracted, matches[best_cat], phase_compatible)
