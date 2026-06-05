# AI末日：群体意志 — Phase 2 Engine

> Hackathon 项目：AI x 直播 x 游戏。观众评论影响游戏内容的 SDK 核心模块。

## 这是什么

Phase 2 是末日生存游戏的「在家阶段」引擎，负责：
- 玩家主动使用物品、与同伴互动
- 接收上游评论引擎注入的 EVENT / CHARACTER / ITEM / LOCATION
- 基于游戏历史上下文动态生成旁白

## 快速开始

```bash
# 安装依赖
pip3 install fastapi anthropic pydantic gradio json-repair uvicorn

# 设置 API Key
export ANTHROPIC_API_KEY=your_key_here

# 启动可视化测试台
python3 demo.py
# 浏览器打开 http://127.0.0.1:7860
```

## 接口

| 接口 | 说明 |
|---|---|
| `POST /phase2_action` | 玩家口述指令（使用物品、指挥同伴） |
| `POST /phase2_inject` | 上游评论引擎注入（EVENT/CHARACTER/ITEM/LOCATION） |
| `POST /phase2_event_choice` | 玩家选择事件选项后回调，LLM 动态生成结果 |

## 核心特性

- **四层管线**：Input Router → Filter → Generator → Harness Guardian
- **Harness 数值限幅**：每项 stat_change 绝对值 ≤ 30，防止单次翻盘
- **摇号机制**：AI 输出 `rebellion_probability`，代码摇号决定 `companion_agrees`
- **历史上下文**：携带最近 20 条历史，LLM 知道道具来源、同伴关系变化
- **JSON 容错解析**：使用 `json-repair` 处理 LLM 返回的各种破损格式

## 运行测试

```bash
python3 -m pytest test_phase2.py -v
# 21 passed
```
