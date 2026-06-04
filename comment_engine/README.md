# 评论识别 + 剧情生成引擎 (Comment Engine)

直播间评论 → 意图分类 → 内容生成（事件/角色/道具/场景）的完整管线。

## 架构

```
[评论流 Mock/SDK] → [classifier] → [comment_pool(30s窗口)]
                                         ↓
[game_state] ← [game_loop] → [generator(Claude API)] → 生成结果JSON → [前端渲染]
```

## 文件

| 文件 | 职责 |
|------|------|
| `classifier.py` | 评论分类器：5类意图（EVENT/CHARACTER/ITEM/LOCATION/IRRELEVANT） |
| `comment_pool.py` | 30s窗口评论池：收集、去重、优先级排序 |
| `generator.py` | Claude API 内容生成：4类 Prompt（事件/角色/道具/场景） |
| `game_state.py` | 游戏状态管理：数值/背包/同伴/事件历史 |
| `game_loop.py` | 主循环：协调所有模块，可替换输入源和输出端 |

## 合码接口

合码时只需替换两个东西：

```python
loop = GameLoop(
    comment_source=你们的SDK回调,    # 替换默认的 stdin Mock
    render_callback=你们的前端渲染,   # 替换默认的 print JSON
)
```

所有模块之间通过标准 JSON 通信，不依赖任何 UI 框架。

## 快速测试

```bash
export ANTHROPIC_API_KEY="your-key"
python3 game_loop.py  # 交互式 Demo
```

## 测试结果

- 分类器：49/49 测试用例通过（100%）
- 生成 Prompt：8/8 API 测试通过（100%），覆盖事件/角色/道具/场景
- 端到端：完整 Day 循环跑通（分类→生成→选择→状态更新→阶段切换）
