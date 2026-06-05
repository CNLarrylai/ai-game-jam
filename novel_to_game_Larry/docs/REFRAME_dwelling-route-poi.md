# 给团队:游戏形态 reframe — 住所 + 路线 + POI(收编"基地 + 探索")

## 问题
"固定基地 + 出门探索找物资"适合沙盒生存(困守型),但**大多数可爬小说没有不动的家**(旅程 / 群像)。《最后的人》《世界大战》都是旅程,固定不到一个地点,物资也刷不出。

## 解法(不推翻 cheney 的工作,而是抽象一层)
- **基地 → 可移动的住所(Dwelling)**:马车 / 营寨 / 房车 / 船 / 临时避难所;有耐久 / 容量 / 暴露度,会升级 / 受损 / 丢失 / 更换。**cheney 的固定基地 = 不移动的 Dwelling(holdout 特例),完全保留。**
- **探索地点 → 沿途 POI**:路线分"程",每程挂可选据点(废屋 / 营地 / 坠落坑)。
- **物资 / 惊喜 / 观众生成不变**,只是从"刷固定地图"挪到"旅程沿途 POI"。

## 对齐点(给 comment_engine)
- 把 generator 的"生成 地点/事件/道具"挂到 **POI** 上:`world` 切题材,`context` 注入"当前程 + 住所状态";生成结果作为某 POI 的内容。
- `spine_type` 决定住所是否移动、地图隐喻;数值映射见 `INTEGRATION_comment-engine.md`。

## 落地
- world_bible 增产 `spine_type / dwelling / route / poi_bank`(见 `specs/WORLDBIBLE.md` 新增字段)。
- 游戏壳:journey = 旅程图 + POI;holdout = 基地 + 周边(cheney 现有形态)。
- `game-v2` 将把"采纳"升级为"沿途 POI 际遇"作可玩证明。
